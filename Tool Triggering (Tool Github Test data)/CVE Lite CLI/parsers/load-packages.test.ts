import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { loadPackages } from "../../src/parsers/index.js";
import { loadFromBunLock } from "../../src/parsers/bun-lock.js";
import { loadNpmLockGraph } from "../../src/parsers/npm-lock-graph.js";
import { loadFromPackageJson } from "../../src/parsers/package-json.js";
import { loadFromPackageLock } from "../../src/parsers/package-lock.js";
import { loadFromPnpmLock } from "../../src/parsers/pnpm-lock.js";
import { loadFromYarnLock } from "../../src/parsers/yarn-lock.js";
import { removeDir } from "../test-utils.js";

function createTempProjectDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "cve-lite-parser-test-"));
}

describe("loadPackages", () => {
  it("detects bun.lock at the root and reports bun-lock source", () => {
    const projectDir = createTempProjectDir();

    fs.writeFileSync(
      path.join(projectDir, "bun.lock"),
      JSON.stringify({
        lockfileVersion: 1,
        workspaces: { "": { name: "fixture", dependencies: { chalk: "^5.0.0" } } },
        packages: { "chalk": ["chalk@5.4.1", "", {}, "sha512-abc"] },
      }),
      "utf8",
    );

    try {
      const result = loadPackages(projectDir, false, 4);

      expect(result.source).toBe("bun-lock");
      expect(path.basename(result.filePath ?? "")).toBe("bun.lock");
      expect(result.mode).toBe("resolved-lockfile");
      expect(result.warnings).toEqual([]);
      expect(result.packages).toEqual(
        expect.arrayContaining([expect.objectContaining({ name: "chalk", version: "5.4.1" })]),
      );
    } finally {
      removeDir(projectDir);
    }
  });

  it("names the lockfile when it cannot be parsed, keeping the underlying error and cause", () => {
    const projectDir = createTempProjectDir();
    const lockPath = path.join(projectDir, "package-lock.json");
    fs.writeFileSync(lockPath, "{\n", "utf8");

    try {
      let error: unknown;
      try {
        loadPackages(projectDir, false, 4);
      } catch (err) {
        error = err;
      }
      expect(error).toBeInstanceOf(Error);
      // Fragment match so the test fails if the underlying parser message is dropped.
      expect((error as Error).message).toMatch(/Failed to read .*package-lock\.json: .*JSON/);
      expect((error as Error).cause).toBeInstanceOf(Error);
    } finally {
      removeDir(projectDir);
    }
  });

  it("names package.json when the manifest fallback cannot be parsed, keeping the underlying error and cause", () => {
    const projectDir = createTempProjectDir();
    const manifestPath = path.join(projectDir, "package.json");
    fs.writeFileSync(manifestPath, "{\"name\":", "utf8");

    try {
      let error: unknown;
      try {
        loadPackages(projectDir, false, 4);
      } catch (err) {
        error = err;
      }
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toMatch(/Failed to read .*package\.json: .*JSON/);
      expect((error as Error).cause).toBeInstanceOf(Error);
    } finally {
      removeDir(projectDir);
    }
  });

  it("prefers a root lockfile over nested lockfiles", () => {
    const projectDir = createTempProjectDir();
    const nestedDir = path.join(projectDir, "packages", "app");
    fs.mkdirSync(nestedDir, { recursive: true });

    fs.writeFileSync(
      path.join(projectDir, "package-lock.json"),
      JSON.stringify({
        lockfileVersion: 3,
        packages: {
          "": {},
          "node_modules/chalk": { version: "5.4.1" },
        },
      }),
      "utf8",
    );

    fs.writeFileSync(
      path.join(nestedDir, "pnpm-lock.yaml"),
      `
lockfileVersion: '9.0'
importers:
  .:
    dependencies:
      react:
        version: 18.2.0
packages:
  react@18.2.0: {}
`,
      "utf8",
    );

    try {
      const result = loadPackages(projectDir, false, 4);

      expect(result.source).toBe("package-lock");
      expect(path.basename(result.filePath ?? "")).toBe("package-lock.json");
      expect(result.warnings).toEqual([]);
      expect(result.packages).toEqual(
        expect.arrayContaining([expect.objectContaining({ name: "chalk", version: "5.4.1" })]),
      );
    } finally {
      removeDir(projectDir);
    }
  });

  it("detects npm-shrinkwrap.json at root and reports npm-shrinkwrap source", () => {
    const projectDir = createTempProjectDir();

    fs.writeFileSync(
      path.join(projectDir, "npm-shrinkwrap.json"),
      JSON.stringify({
        lockfileVersion: 3,
        packages: {
          "": {},
          "node_modules/lodash": { version: "4.17.21" },
        },
      }),
      "utf8",
    );

    try {
      const result = loadPackages(projectDir, false, 4);

      expect(result.source).toBe("npm-shrinkwrap");
      expect(path.basename(result.filePath ?? "")).toBe("npm-shrinkwrap.json");
      expect(result.mode).toBe("resolved-lockfile");
      expect(result.warnings).toEqual([]);
      expect(result.packages).toEqual(
        expect.arrayContaining([expect.objectContaining({ name: "lodash", version: "4.17.21" })]),
      );
    } finally {
      removeDir(projectDir);
    }
  });

  it("prefers npm-shrinkwrap.json over package-lock.json when both exist", () => {
    const projectDir = createTempProjectDir();

    fs.writeFileSync(
      path.join(projectDir, "npm-shrinkwrap.json"),
      JSON.stringify({
        lockfileVersion: 3,
        packages: {
          "": {},
          "node_modules/lodash": { version: "4.17.21" },
        },
      }),
      "utf8",
    );
    fs.writeFileSync(
      path.join(projectDir, "package-lock.json"),
      JSON.stringify({
        lockfileVersion: 3,
        packages: {
          "": {},
          "node_modules/express": { version: "4.18.0" },
        },
      }),
      "utf8",
    );

    try {
      const result = loadPackages(projectDir, false, 4);

      expect(result.source).toBe("npm-shrinkwrap");
      expect(path.basename(result.filePath ?? "")).toBe("npm-shrinkwrap.json");
      expect(result.packages).toEqual(
        expect.arrayContaining([expect.objectContaining({ name: "lodash" })]),
      );
      expect(result.packages.map(p => p.name)).not.toContain("express");
    } finally {
      removeDir(projectDir);
    }
  });

  it("falls back to package.json and surfaces the npmrc package-lock warning", () => {
    const projectDir = createTempProjectDir();

    fs.writeFileSync(
      path.join(projectDir, "package.json"),
      JSON.stringify({
        dependencies: {
          chalk: "5.4.1",
          debug: "^4.3.0",
        },
      }),
      "utf8",
    );
    fs.writeFileSync(path.join(projectDir, ".npmrc"), "package-lock=false\n", "utf8");

    try {
      const result = loadPackages(projectDir, false, 3);

      expect(result.mode).toBe("manifest-fallback");
      expect(result.source).toBe("package-json");
      expect(result.packages).toEqual(
        expect.arrayContaining([expect.objectContaining({ name: "chalk", version: "5.4.1" })]),
      );
      expect(result.skippedDependencies).toContain("dependencies:debug@^4.3.0");
      expect(result.warnings).toEqual(
        expect.arrayContaining([
          "No supported lockfile was found, so the scanner fell back to package.json.",
          expect.stringContaining("This repo disables package-lock generation in .npmrc."),
        ]),
      );
    } finally {
      removeDir(projectDir);
    }
  });
});

describe("root lockfile selection when more than one is present", () => {
  const PNPM_LOCK = `lockfileVersion: '9.0'

importers:
  .:
    dependencies:
      chalk:
        specifier: ^5.0.0
        version: 5.4.1

packages:
  chalk@5.4.1:
    resolution: {integrity: sha512-abc}

snapshots:
  chalk@5.4.1: {}
`;

  // A one-package npm lockfile of the kind a migration leaves behind.
  const STALE_NPM_LOCK = JSON.stringify({
    name: "installer",
    lockfileVersion: 3,
    packages: {
      "": { name: "installer", dependencies: { leftpad: "^1.0.0" } },
      "node_modules/leftpad": { version: "1.0.0", resolved: "https://registry.npmjs.org/leftpad" },
    },
  });

  function writeBothLockfiles(dir: string, manifest: Record<string, unknown>): void {
    fs.writeFileSync(path.join(dir, "pnpm-lock.yaml"), PNPM_LOCK, "utf8");
    fs.writeFileSync(path.join(dir, "package-lock.json"), STALE_NPM_LOCK, "utf8");
    fs.writeFileSync(path.join(dir, "package.json"), JSON.stringify(manifest), "utf8");
  }

  it("uses the lockfile the project declares in packageManager, not filename precedence", () => {
    const projectDir = createTempProjectDir();
    // Exactly the caveman shape: a pnpm workspace with a stale package-lock.json
    // left over from npm. Precedence alone picks the stale one and reports a
    // single package, which reads as a clean project.
    writeBothLockfiles(projectDir, { name: "app", packageManager: "pnpm@10.14.0" });

    try {
      const result = loadPackages(projectDir, false, 4);
      expect(result.source).toBe("pnpm-lock");
      expect(result.packages.map(p => p.name)).toContain("chalk");
      expect(result.packages.map(p => p.name)).not.toContain("leftpad");
    } finally {
      removeDir(projectDir);
    }
  });

  it("says which lockfile it used and why when the root holds more than one", () => {
    const projectDir = createTempProjectDir();
    writeBothLockfiles(projectDir, { name: "app", packageManager: "pnpm@10.14.0" });

    try {
      const result = loadPackages(projectDir, false, 4);
      const note = result.notes.find(n => n.includes("Root also contains"));
      // Names the one it skipped, the one it used, and the field that decided it.
      // Asserting on "pnpm" alone would pass even when the choice is wrong,
      // because "pnpm-lock.yaml" appears in the skipped list either way.
      expect(note).toContain("Root also contains package-lock.json");
      expect(note).toContain("Used pnpm-lock.yaml");
      expect(note).toContain('packageManager "pnpm"');
    } finally {
      removeDir(projectDir);
    }
  });

  it("falls back to precedence when no packageManager is declared, and says so", () => {
    const projectDir = createTempProjectDir();
    writeBothLockfiles(projectDir, { name: "app" });

    try {
      const result = loadPackages(projectDir, false, 4);
      expect(result.source).toBe("package-lock");
      const note = result.notes.find(n => n.includes("Root also contains"));
      expect(note).toContain("no packageManager field declared");
    } finally {
      removeDir(projectDir);
    }
  });

  it("ignores a packageManager naming a lockfile that is not present", () => {
    const projectDir = createTempProjectDir();
    // Declares yarn, but only the pnpm and npm lockfiles exist.
    writeBothLockfiles(projectDir, { name: "app", packageManager: "yarn@4.0.0" });

    try {
      const result = loadPackages(projectDir, false, 4);
      expect(result.source).toBe("package-lock");
    } finally {
      removeDir(projectDir);
    }
  });

  it("adds no note when the root holds a single lockfile", () => {
    const projectDir = createTempProjectDir();
    fs.writeFileSync(path.join(projectDir, "pnpm-lock.yaml"), PNPM_LOCK, "utf8");
    fs.writeFileSync(
      path.join(projectDir, "package.json"),
      JSON.stringify({ name: "app", packageManager: "pnpm@10.14.0" }),
      "utf8",
    );

    try {
      const result = loadPackages(projectDir, false, 4);
      expect(result.notes.some(n => n.includes("Root also contains"))).toBe(false);
    } finally {
      removeDir(projectDir);
    }
  });

  it("survives a package.json that is not valid JSON", () => {
    const projectDir = createTempProjectDir();
    fs.writeFileSync(path.join(projectDir, "pnpm-lock.yaml"), PNPM_LOCK, "utf8");
    fs.writeFileSync(path.join(projectDir, "package-lock.json"), STALE_NPM_LOCK, "utf8");
    fs.writeFileSync(path.join(projectDir, "package.json"), "{ not json", "utf8");

    try {
      const result = loadPackages(projectDir, false, 4);
      expect(result.source).toBe("package-lock");
    } finally {
      removeDir(projectDir);
    }
  });
});
