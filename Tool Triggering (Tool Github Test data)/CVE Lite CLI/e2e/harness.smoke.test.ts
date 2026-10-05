/**
 * Plan 8 Task 1: prove the e2e harness works - dist is built (globalSetup) and
 * runCli spawns the real binary.
 */

import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runCli, mkProject, rmProject, npmProject } from "./harness.js";

describe("e2e harness", () => {
  it("spawns the built CLI for --version (exit 0)", () => {
    const r = runCli(["--version"]);
    expect(r.status).toBe(0);
    expect(r.stdout).toMatch(/\d+\.\d+\.\d+/);
  });

  it("mkProject + runCli round-trip: overrides on a clean project exits 0", () => {
    const dir = mkProject(npmProject({ name: "x" }, { lodash: "4.17.21" }));
    const cwd = mkdtempSync(join(tmpdir(), "e2e-smoke-"));
    try {
      const r = runCli(["overrides", dir, "--json"], { cwd });
      expect(r.status).toBe(0);
      const match = r.stdout.match(/cve-lite-overrides-[^\s]+\.json/);
      if (!match) throw new Error(`overrides --json did not emit a filename.\nstdout:\n${r.stdout}`);
      const filePath = join(cwd, match[0]);
      const out = JSON.parse(readFileSync(filePath, "utf8"));
      expect(Array.isArray(out.findings)).toBe(true);
    } finally {
      rmProject(dir);
      rmSync(cwd, { recursive: true, force: true });
    }
  });
});
