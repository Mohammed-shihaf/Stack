/**
 * Plan 8: end-to-end coverage for the --fix tiering gate, post-fix exit codes,
 * and the audit-log + scan integration surfaces. Spawns the real built CLI and
 * asserts on files written to disk, NDJSON contents, and exit codes.
 *
 * Notes on coverage gaps (documented, not faked):
 *  - Exit 2 (EXIT_VERIFY_FAILED, post-fix verify failure) is not reachable from
 *    the spawnable `overrides --fix` path: that path returns EXIT_OK/EXIT_FINDINGS
 *    and never runs the verify hook. The verify-failure substrate (verifyOk=false)
 *    is exercised in-process in tests/cli/fix-overrides-hook.test.ts.
 */

import { readFileSync, readdirSync, unlinkSync } from "node:fs";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  runCli,
  mkProject,
  rmProject,
  npmProject,
  installedManifest,
  SAFE_PKG,
  SAFE_PLATFORM_PARENT,
  SAFE_PLATFORM_BINARY,
} from "./harness.js";

/** Read the project package.json back off disk after the CLI mutated it. */
function readPkg(dir: string): Record<string, unknown> {
  return JSON.parse(readFileSync(join(dir, "package.json"), "utf8"));
}

/** Read the JSON file written by `overrides --json`, parse it, and clean up. */
function readOverridesJson(stdout: string, cwd: string): Record<string, unknown> {
  const match = stdout.match(/cve-lite-overrides-[^\s]+\.json/);
  if (!match) throw new Error(`overrides --json did not emit a filename.\nstdout:\n${stdout}`);
  const filePath = join(cwd, match[0]);
  const parsed = JSON.parse(readFileSync(filePath, "utf8")) as Record<string, unknown>;
  unlinkSync(filePath);
  return parsed;
}

/** Parse an NDJSON audit-log file into an array of events. */
function readNdjson(path: string): Array<Record<string, unknown>> {
  return readFileSync(path, "utf8")
    .trim()
    .split("\n")
    .filter((l) => l.length > 0)
    .map((l) => JSON.parse(l) as Record<string, unknown>);
}

/**
 * Project that triggers OA006 (coupled platform binary) in isolation. The override
 * pins the platform binary to 0.0.1, but its installed parent exact-pins the binary
 * to 0.0.2. node_modules exists (the parent is installed, so the detector is not
 * pre-skipped) but the optional platform binary itself is NOT materialized - the
 * common wrong-platform case - so there is no on-disk proof the override took. OA006
 * fires on the latent coupling. Per issue #37 it suppresses only when a materialized
 * copy actually satisfies the override; with the binary absent, OA004 (needs a
 * surpassing installed version) and OA008 (needs a below-floor copy) both stay
 * silent, isolating the tier-2 (proposed) relocate fix.
 *
 * The parent/binary use fixture-only names so the CVE scan stays clean regardless of
 * the advisory DB state (issue #726). looksLikePlatformBinary() keys off the "linux"
 * token, not the package identity, so the synthetic binary still drives OA006.
 */
function makeOa006Project(): string {
  const dir = mkProject(
    npmProject(
      { name: "oa6", overrides: { [SAFE_PLATFORM_BINARY]: "0.0.1" } },
      { [SAFE_PLATFORM_PARENT]: "0.0.2", [SAFE_PLATFORM_BINARY]: "0.0.1" }
    )
  );
  installedManifest(dir, SAFE_PLATFORM_PARENT, {
    name: SAFE_PLATFORM_PARENT,
    version: "0.0.2",
    optionalDependencies: { [SAFE_PLATFORM_BINARY]: "0.0.2" },
  });
  return dir;
}

/** Project with a single orphan override (OA001): `gone` is not in the lockfile.
 *  The resolved dependency is a fixture-only name so the CVE scan stays clean
 *  regardless of the advisory DB state (issue #726); OA001 still fires because
 *  `gone` is absent from the tree, which is the only thing this fixture asserts. */
function makeOrphanProject(): string {
  return mkProject(
    npmProject({ name: "x", overrides: { gone: "1.0.0" } }, { [SAFE_PKG]: "1.0.0" })
  );
}

function makeMultiFolderOrphanProject(): string {
  return mkProject({
    "packages/a/package.json": { name: "a", overrides: { gone: "1.0.0" } },
    "packages/a/package-lock.json": {
      lockfileVersion: 3,
      packages: {
        "": { name: "a" },
        "node_modules/lodash": { version: "4.17.21" },
      },
    },
    "packages/b/package.json": { name: "b", overrides: { ghostpkg: "1.0.0" } },
    "packages/b/package-lock.json": {
      lockfileVersion: 3,
      packages: {
        "": { name: "b" },
        "node_modules/lodash": { version: "4.17.21" },
      },
    },
  });
}

describe("e2e: overrides --fix tiering", () => {
  it("Tier 1 auto-apply: orphan override (OA001) is removed by --fix, exit 0", () => {
    const dir = makeOrphanProject();
    const cwd = mkdtempSync(join(tmpdir(), "e2e-fix1-"));
    try {
      // Sanity: OA001 is present before the fix.
      const before = runCli(["overrides", dir, "--json"], { cwd });
      expect(before.status).toBe(0);
      const beforeData = readOverridesJson(before.stdout, cwd);
      expect((beforeData.findings as any[]).map((f: any) => f.ruleId)).toContain(
        "OA001"
      );

      const fix = runCli(["overrides", dir, "--fix"]);
      expect(fix.status).toBe(0);

      // Re-read the on-disk package.json: the orphan override is gone and
      // the now-empty overrides container is removed entirely.
      expect(readPkg(dir).overrides).toBeUndefined();
    } finally {
      rmProject(dir);
      rmSync(cwd, { recursive: true, force: true });
    }
  });

  it("Tier 2 NOT auto-applied: OA006 relocate (proposed) survives --fix", () => {
    const dir = makeOa006Project();
    const cwd = mkdtempSync(join(tmpdir(), "e2e-fix2-"));
    try {
      // OA006 is the only finding and its fix is tier "proposed".
      const before = runCli(["overrides", dir, "--json"], { cwd });
      expect(before.status).toBe(0);
      const beforeFindings = readOverridesJson(before.stdout, cwd).findings as any[];
      expect(beforeFindings.map((f: any) => f.ruleId)).toEqual(["OA006"]);
      expect(beforeFindings[0].fix.tier).toBe("proposed");

      const fix = runCli(["overrides", dir, "--fix"]);
      expect(fix.status).toBe(0);

      // The override must still be present and unrelocated: no /dependencies floor
      // was written, and the binary override value is unchanged.
      const pkg = readPkg(dir);
      const overrides = pkg.overrides as Record<string, unknown>;
      expect(overrides[SAFE_PLATFORM_BINARY]).toBe("0.0.1");
      expect(pkg.dependencies).toBeUndefined();

      // And OA006 still fires on a re-run (the proposed fix was not consumed).
      const after = runCli(["overrides", dir, "--json"], { cwd });
      expect((readOverridesJson(after.stdout, cwd).findings as any[]).map((f: any) => f.ruleId)).toContain(
        "OA006"
      );
    } finally {
      rmProject(dir);
      rmSync(cwd, { recursive: true, force: true });
    }
  });

  it("--fix exits 0 on the clean-after-fix case (orphan removed, nothing left)", () => {
    const dir = makeOrphanProject();
    try {
      const fix = runCli(["overrides", dir, "--fix"]);
      expect(fix.status).toBe(0);
      // A second --fix on the now-clean project is also exit 0.
      const again = runCli(["overrides", dir, "--fix"]);
      expect(again.status).toBe(0);
      // Exit 2 (post-fix verify failure) is not reachable from this spawnable
      // path; the verify-failure substrate is covered in-process in
      // tests/cli/fix-overrides-hook.test.ts (verifyOk=false assertions).
    } finally {
      rmProject(dir);
    }
  });
});

describe("e2e: audit-log + scan integration", () => {
  let logDir: string;
  beforeEach(() => {
    logDir = mkdtempSync(join(tmpdir(), "e2e-log-"));
  });
  afterEach(() => {
    rmSync(logDir, { recursive: true, force: true });
  });

  it("scan --offline --audit-log writes scan.started and scan.finished", () => {
    const dir = makeOrphanProject();
    const logPath = join(logDir, "scan.ndjson");
    try {
      const r = runCli([dir, "--offline", "--audit-log", logPath]);
      expect(r.status).toBe(0);
      const types = new Set(readNdjson(logPath).map((e) => e.type));
      expect(types.has("scan.started")).toBe(true);
      expect(types.has("scan.finished")).toBe(true);
    } finally {
      rmProject(dir);
    }
  });

  it("overrides --audit-log emits oa.detected with ruleId OA001", () => {
    const dir = makeOrphanProject();
    const logPath = join(logDir, "oa.ndjson");
    try {
      const r = runCli(["overrides", dir, "--audit-log", logPath]);
      expect(r.status).toBe(0);
      const events = readNdjson(logPath);
      const detected = events.filter((e) => e.type === "oa.detected");
      expect(detected.length).toBeGreaterThan(0);
      expect(detected.map((e) => e.ruleId)).toContain("OA001");
    } finally {
      rmProject(dir);
    }
  });

  it("--check-overrides --json writes a scan json with overrideFindings (OA001)", () => {
    const dir = makeOrphanProject();
    // The scan json lands in process.cwd(); point cwd at a temp dir so we can
    // find and clean it up.
    const cwd = mkdtempSync(join(tmpdir(), "e2e-cwd-"));
    try {
      const r = runCli([dir, "--offline", "--check-overrides", "--json"], { cwd });
      expect(r.status).toBe(0);

      const scanFiles = readdirSync(cwd).filter((f) =>
        /^cve-lite-scan-.*\.json$/.test(f)
      );
      expect(scanFiles.length).toBe(1);

      const scan = JSON.parse(readFileSync(join(cwd, scanFiles[0]), "utf8"));
      expect(Array.isArray(scan.overrideFindings)).toBe(true);
      expect(scan.overrideFindings.map((f: any) => f.ruleId)).toContain("OA001");
    } finally {
      rmProject(dir);
      rmSync(cwd, { recursive: true, force: true });
    }
  });

  it("--check-overrides renders the override section in the terminal (#35)", () => {
    // Regression guard: --check-overrides must SHOW override findings on screen,
    // not only thread them into --json/--sarif/--report. Plain terminal scan.
    const dir = makeOrphanProject();
    try {
      const r = runCli([dir, "--offline", "--check-overrides"]);
      expect(r.status).toBe(0);
      expect(r.stdout).toMatch(/Override hygiene/i);
      expect(r.stdout).toContain("OA001");
    } finally {
      rmProject(dir);
    }
  });

  it("CVE_LITE_AUDIT_LOG env var writes the same scan events as --audit-log", () => {
    const dir = makeOrphanProject();
    const logPath = join(logDir, "env.ndjson");
    try {
      const r = runCli([dir, "--offline"], {
        env: { CVE_LITE_AUDIT_LOG: logPath },
      });
      expect(r.status).toBe(0);
      const types = new Set(readNdjson(logPath).map((e) => e.type));
      expect(types.has("scan.started")).toBe(true);
      expect(types.has("scan.finished")).toBe(true);
    } finally {
      rmProject(dir);
    }
  });

  it("multi-folder --check-overrides --audit-log writes scan.started, scan.finished, and oa.detected", () => {
    const dir = makeMultiFolderOrphanProject();
    const logPath = join(logDir, "multi-folder.ndjson");
    try {
      const r = runCli([dir, "--offline", "--check-overrides", "--audit-log", logPath]);
      expect(r.status).toBe(0);
      const events = readNdjson(logPath);
      const types = new Set(events.map((e) => e.type));
      const oaDetected = events.filter((e) => e.type === "oa.detected");
      expect(types.has("scan.started")).toBe(true);
      expect(types.has("scan.finished")).toBe(true);
      expect(oaDetected.length).toBeGreaterThan(0);
      expect(oaDetected.map((e: any) => e.ruleId)).toContain("OA001");
    } finally {
      rmProject(dir);
    }
  });
});
