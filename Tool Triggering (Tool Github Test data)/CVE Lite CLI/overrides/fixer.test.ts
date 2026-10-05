import { mkdtempSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { applyFix } from "../../src/overrides/fixer.js";
import type { OverrideFinding } from "../../src/overrides/types.js";
import { NULL_AUDIT_LOG } from "../../src/audit-log/index.js";

function findingOf(
  ruleId: OverrideFinding["ruleId"],
  pkg: string,
  patch: OverrideFinding["fix"]["patch"]
): OverrideFinding {
  return {
    ruleId,
    severity: "high",
    package: { name: pkg },
    location: { file: "package.json", jsonPath: `/overrides/${pkg}` },
    message: "x",
    fix: { type: "rfc6902", patch },
  };
}

describe("applyFix (RFC 6902 to package.json)", () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "fixer-test-"));
  });
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  it("applies a remove patch to package.json", () => {
    const pkgPath = join(dir, "package.json");
    writeFileSync(
      pkgPath,
      JSON.stringify({ name: "x", overrides: { gone: "1.0.0" } }, null, 2)
    );

    const finding = findingOf("OA001", "gone", [
      { op: "remove", path: "/overrides/gone" },
    ]);

    const report = applyFix({
      projectPath: dir,
      findings: [finding],
      auditLog: NULL_AUDIT_LOG,
      dryRun: false,
    });

    expect(report.appliedPatches).toHaveLength(1);
    const updated = JSON.parse(readFileSync(pkgPath, "utf8"));
    expect(updated.overrides?.gone).toBeUndefined();
  });

  it("removes the overrides container when the last entry is removed", () => {
    const pkgPath = join(dir, "package.json");
    writeFileSync(
      pkgPath,
      JSON.stringify({ name: "x", overrides: { only: ">=1.0.0" } }, null, 2)
    );
    const finding = findingOf("OA009", "only", [{ op: "remove", path: "/overrides/only" }]);
    applyFix({ projectPath: dir, findings: [finding], auditLog: NULL_AUDIT_LOG, dryRun: false });
    const updated = JSON.parse(readFileSync(pkgPath, "utf8"));
    expect(updated.overrides).toBeUndefined();
  });

  it("keeps overrides container when other entries remain", () => {
    const pkgPath = join(dir, "package.json");
    writeFileSync(
      pkgPath,
      JSON.stringify({ name: "x", overrides: { a: ">=1.0.0", b: "2.0.0" } }, null, 2)
    );
    const finding = findingOf("OA009", "a", [{ op: "remove", path: "/overrides/a" }]);
    applyFix({ projectPath: dir, findings: [finding], auditLog: NULL_AUDIT_LOG, dryRun: false });
    const updated = JSON.parse(readFileSync(pkgPath, "utf8"));
    expect(updated.overrides).toEqual({ b: "2.0.0" });
  });

  it("removes pnpm.overrides container when the last entry is removed", () => {
    const pkgPath = join(dir, "package.json");
    writeFileSync(
      pkgPath,
      JSON.stringify({ name: "x", pnpm: { overrides: { only: ">=1.0.0" } } }, null, 2)
    );
    const finding = findingOf("OA009", "only", [{ op: "remove", path: "/pnpm/overrides/only" }]);
    applyFix({ projectPath: dir, findings: [finding], auditLog: NULL_AUDIT_LOG, dryRun: false });
    const updated = JSON.parse(readFileSync(pkgPath, "utf8"));
    expect(updated.pnpm).toBeUndefined();
  });

  it("refuses a move into an already-occupied destination instead of overwriting", () => {
    const pkgPath = join(dir, "package.json");
    writeFileSync(
      pkgPath,
      JSON.stringify(
        { name: "x", overrides: { dep: "2.0.0" }, pnpm: { overrides: { dep: "1.0.0" } } },
        null,
        2
      )
    );

    // The key set shrinks (pnpm.overrides.dep removed), so the chokepoint guard
    // would not catch this - the destination guard must.
    const finding = findingOf("OA003", "dep", [
      { op: "move", from: "/pnpm/overrides/dep", path: "/overrides/dep" },
    ]);

    const report = applyFix({
      projectPath: dir,
      findings: [finding],
      auditLog: NULL_AUDIT_LOG,
      dryRun: false,
    });

    expect(report.appliedPatches).toHaveLength(0);
    expect(report.skipped).toHaveLength(1);
    expect(report.skipped[0].reason).toMatch(/already exists/);

    // Both values left untouched.
    const updated = JSON.parse(readFileSync(pkgPath, "utf8"));
    expect(updated.overrides.dep).toBe("2.0.0");
    expect(updated.pnpm.overrides.dep).toBe("1.0.0");
  });

  it("dryRun does not modify the file", () => {
    const pkgPath = join(dir, "package.json");
    const before = JSON.stringify(
      { name: "x", overrides: { gone: "1.0.0" } },
      null,
      2
    );
    writeFileSync(pkgPath, before);

    const finding = findingOf("OA001", "gone", [
      { op: "remove", path: "/overrides/gone" },
    ]);

    const report = applyFix({
      projectPath: dir,
      findings: [finding],
      auditLog: NULL_AUDIT_LOG,
      dryRun: true,
    });

    expect(report.appliedPatches).toHaveLength(1);
    expect(report.dryRun).toBe(true);
    expect(readFileSync(pkgPath, "utf8")).toBe(before);
  });

  it("skips findings without a fix and reports them", () => {
    const pkgPath = join(dir, "package.json");
    writeFileSync(pkgPath, JSON.stringify({ name: "x" }, null, 2));

    const finding: OverrideFinding = {
      ruleId: "OA002",
      severity: "medium",
      package: { name: "react" },
      location: { file: "package.json", jsonPath: "/overrides/react" },
      message: "tag pin",
    };

    const report = applyFix({
      projectPath: dir,
      findings: [finding],
      auditLog: NULL_AUDIT_LOG,
      dryRun: false,
    });
    expect(report.appliedPatches).toHaveLength(0);
    expect(report.skipped).toHaveLength(1);
    expect(report.skipped[0].reason).toMatch(/no fix/i);
  });
});

describe("applyFix: relocate op and the chokepoint guard (Plan 6.5)", () => {
  let dir: string;
  beforeEach(() => { dir = mkdtempSync(join(tmpdir(), "fixer-relocate-")); });
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  it("relocate retires the child override and writes a parent dependency floor", () => {
    const pkgPath = join(dir, "package.json");
    writeFileSync(pkgPath, JSON.stringify({
      name: "x",
      dependencies: { other: "^1.0.0" },
      overrides: { "@esbuild/linux-x64": "latest" },
    }, null, 2));

    const finding = findingOf("OA006", "@esbuild/linux-x64", [
      { op: "relocate", fromChild: "/overrides/@esbuild~1linux-x64", toParent: "esbuild", floor: ">=0.25.12" } as any,
    ]);

    const report = applyFix({ projectPath: dir, findings: [finding], auditLog: NULL_AUDIT_LOG, dryRun: false });
    expect(report.appliedPatches).toHaveLength(1);

    const after = JSON.parse(readFileSync(pkgPath, "utf8"));
    // The override is gone; the constraint is now a parent dependency floor.
    expect(after.overrides?.["@esbuild/linux-x64"]).toBeUndefined();
    expect(after.dependencies?.esbuild).toBe(">=0.25.12");
    // No new override key was invented.
    expect(after.overrides ?? {}).toEqual({});
  });

  it("rejects a fix that would invent a new override key (chokepoint guard)", () => {
    const pkgPath = join(dir, "package.json");
    writeFileSync(pkgPath, JSON.stringify({
      name: "x",
      overrides: { existing: "1.0.0" },
    }, null, 2));

    // A replace targeting a non-existent override path would CREATE a new override
    // key - the exact boundary violation the guard exists to stop.
    const finding = findingOf("OA001", "sneaky", [
      { op: "replace", path: "/overrides/sneaky", value: "9.9.9" },
    ]);

    const report = applyFix({ projectPath: dir, findings: [finding], auditLog: NULL_AUDIT_LOG, dryRun: false });
    expect(report.appliedPatches).toHaveLength(0);
    expect(report.skipped).toHaveLength(1);
    expect(report.skipped[0].reason).toMatch(/fix-guard/);

    // The file is untouched: the rejected fix committed nothing.
    const after = JSON.parse(readFileSync(pkgPath, "utf8"));
    expect(after.overrides).toEqual({ existing: "1.0.0" });
  });

  it("emits a fix-guard error event on rejection", () => {
    const pkgPath = join(dir, "package.json");
    writeFileSync(pkgPath, JSON.stringify({ name: "x", overrides: { a: "1" } }, null, 2));

    const events: any[] = [];
    const log = { emit: (e: any) => events.push(e), close: () => {} } as any;

    const finding = findingOf("OA001", "b", [
      { op: "replace", path: "/overrides/b", value: "2" },
    ]);
    applyFix({ projectPath: dir, findings: [finding], auditLog: log, dryRun: false });

    const guardErr = events.find((e) => e.type === "error" && e.phase === "fix-guard");
    expect(guardErr).toBeDefined();
    expect(guardErr.message).toMatch(/override key/);
  });
});
