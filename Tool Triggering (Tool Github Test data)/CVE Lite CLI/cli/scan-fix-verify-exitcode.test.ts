import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLI = join(__dirname, "../../dist/index.js");

describe("cve-lite [path] --fix exit codes", () => {
  let dir: string;
  beforeEach(() => { dir = mkdtempSync(join(tmpdir(), "scan-fix-")); });
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  function writeProject(): void {
    writeFileSync(join(dir, "package.json"), JSON.stringify({
      name: "x", overrides: { gone: "1.0.0" },
    }, null, 2));
    writeFileSync(join(dir, "package-lock.json"), JSON.stringify({
      lockfileVersion: 3,
      packages: {
        "": { name: "x" },
        // Fixture-only name so no advisory ever matches it; the exit-0 assertion
        // below must not depend on the synced advisory DB state (issue #726).
        "node_modules/cve-lite-fixture-safe-pkg": { version: "1.0.0" },
      },
    }));
  }

  it("returns 0 when --fix --check-overrides applies OA fixes and verify passes", () => {
    writeProject();

    let exitCode: number = -1;
    try {
      execFileSync(process.execPath, [CLI, dir, "--fix", "--check-overrides", "--offline"], {
        stdio: ["pipe", "pipe", "pipe"],
      });
      exitCode = 0;
    } catch (err: any) {
      exitCode = err.status ?? -1;
    }
    expect(exitCode).toBe(0);

    // Confirm the OA fix landed
    const updated = JSON.parse(readFileSync(join(dir, "package.json"), "utf8"));
    expect(updated.overrides?.gone).toBeUndefined();
  });

  it("does NOT touch overrides on --fix without --check-overrides (additive contract)", () => {
    writeProject();

    try {
      execFileSync(process.execPath, [CLI, dir, "--fix", "--offline"], {
        stdio: ["pipe", "pipe", "pipe"],
      });
    } catch {
      // exit code is irrelevant here; we only care that overrides were left alone.
    }

    // The override-fix hook is gated on --check-overrides, so a plain --fix run
    // must leave package.json overrides untouched.
    const updated = JSON.parse(readFileSync(join(dir, "package.json"), "utf8"));
    expect(updated.overrides?.gone).toBe("1.0.0");
  });
});
