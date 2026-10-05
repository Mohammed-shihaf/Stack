import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLI = join(__dirname, "../../dist/index.js");

describe("cve-lite overrides (end-to-end)", () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "overrides-e2e-"));
  });
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  it("returns 0 on a clean project", () => {
    writeFileSync(join(dir, "package.json"), JSON.stringify({ name: "x" }));
    writeFileSync(join(dir, "package-lock.json"), JSON.stringify({
      lockfileVersion: 3,
      packages: { "": { name: "x" } },
    }));
    const outDir = mkdtempSync(join(tmpdir(), "overrides-out-"));
    try {
      const res = spawnSync(process.execPath, [CLI, "overrides", dir, "--json"], { cwd: outDir, encoding: "utf8" });
      expect(res.status).toBe(0);
      const match = res.stdout.match(/cve-lite-overrides-[^\s]+\.json/);
      if (!match) throw new Error(`overrides --json did not emit a filename.\nstdout:\n${res.stdout}`);
      const filePath = join(outDir, match[0]);
      const result = JSON.parse(readFileSync(filePath, "utf8"));
      expect(result.findings).toHaveLength(0);
    } finally {
      rmSync(outDir, { recursive: true, force: true });
    }
  });

  it("returns 1 on a project with an orphan override above --fail-on", () => {
    writeFileSync(join(dir, "package.json"), JSON.stringify({
      name: "x",
      overrides: { gone: "1.0.0" },
    }));
    writeFileSync(join(dir, "package-lock.json"), JSON.stringify({
      lockfileVersion: 3,
      packages: {
        "": { name: "x" },
        "node_modules/lodash": { version: "4.17.21" },
      },
    }));
    const outDir = mkdtempSync(join(tmpdir(), "overrides-out-"));
    let exitCode = 0;
    try {
      execFileSync(process.execPath, [CLI, "overrides", dir, "--json", "--fail-on", "high"], { cwd: outDir });
    } catch (err: any) {
      exitCode = err.status ?? -1;
    } finally {
      rmSync(outDir, { recursive: true, force: true });
    }
    expect(exitCode).toBe(1);
  });
});
