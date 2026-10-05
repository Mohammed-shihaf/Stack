import { mkdirSync, mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildOverrideContext } from "../../src/overrides/context-builder.js";
import { NULL_AUDIT_LOG } from "../../src/audit-log/index.js";

function makeNoopLogger() {
  return { info: () => {}, warn: () => {}, error: () => {}, debug: () => {} };
}

describe("buildOverrideContext", () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "ctx-build-test-"));
  });
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  it("builds context for an npm project with one override", () => {
    writeFileSync(join(dir, "package.json"), JSON.stringify({
      name: "x",
      overrides: { postcss: "8.5.15" },
    }));
    writeFileSync(join(dir, "package-lock.json"), JSON.stringify({
      lockfileVersion: 3,
      packages: {
        "": { name: "x" },
        "node_modules/postcss": { version: "8.5.15" },
      },
    }));

    const ctx = buildOverrideContext(dir, {
      auditLog: NULL_AUDIT_LOG,
      logger: makeNoopLogger() as any,
      checkNetwork: false,
    });

    expect(ctx.projectPath).toBe(dir);
    expect(ctx.packageManager).toBe("npm");
    expect(ctx.overrideEntries).toHaveLength(1);
    expect(ctx.overrideEntries[0].packageName).toBe("postcss");
    expect(ctx.lockfilePackageNames.has("postcss")).toBe(true);
  });

  it("does not count imports from example, test, or fixture directories", () => {
    writeFileSync(join(dir, "package.json"), JSON.stringify({
      name: "x",
      overrides: { "js-yaml": "^4.1.0" },
    }));
    writeFileSync(join(dir, "package-lock.json"), JSON.stringify({
      lockfileVersion: 3,
      packages: {
        "": { name: "x" },
        "node_modules/js-yaml": { version: "4.1.0" },
      },
    }));
    mkdirSync(join(dir, "examples", "demo", "src"), { recursive: true });
    mkdirSync(join(dir, "tests"), { recursive: true });
    mkdirSync(join(dir, "fixtures", "project", "src"), { recursive: true });
    mkdirSync(join(dir, "src"), { recursive: true });
    writeFileSync(join(dir, "examples", "demo", "src", "index.ts"), "import yaml from 'js-yaml';");
    writeFileSync(join(dir, "tests", "usage.test.ts"), "const fixture = `import yaml from 'js-yaml';`;");
    writeFileSync(join(dir, "fixtures", "project", "src", "index.ts"), "require('js-yaml');");
    writeFileSync(join(dir, "src", "index.ts"), "import { parse } from 'semver';");

    const ctx = buildOverrideContext(dir, {
      auditLog: NULL_AUDIT_LOG,
      logger: makeNoopLogger() as any,
      checkNetwork: false,
    });

    expect(ctx.importedPackageNames.has("js-yaml")).toBe(false);
    expect(ctx.importedPackageNames.get("semver")).toEqual([expect.stringMatching(/src.index\.ts/)]);
  });

  it("collects workspace members and their declared packages for a pnpm workspace root (#966)", () => {
    writeFileSync(join(dir, "package.json"), JSON.stringify({
      name: "pd002-repro", private: true, version: "1.0.0",
    }));
    writeFileSync(join(dir, "pnpm-workspace.yaml"), "packages:\n  - 'apps/*'\n");
    mkdirSync(join(dir, "apps", "web", "src"), { recursive: true });
    writeFileSync(join(dir, "apps", "web", "package.json"), JSON.stringify({
      name: "@repro/web", dependencies: { "js-yaml": "^4.1.0" }, devDependencies: { vitest: "^2.0.0" },
    }));
    writeFileSync(join(dir, "apps", "web", "src", "index.ts"), "import yaml from 'js-yaml';");

    const ctx = buildOverrideContext(dir, {
      auditLog: NULL_AUDIT_LOG,
      logger: makeNoopLogger() as any,
      checkNetwork: false,
    });

    expect(ctx.workspaceMembers).toHaveLength(1);
    expect(ctx.workspaceMembers![0]!.dir).toBe("apps/web");
    expect([...ctx.workspaceMembers![0]!.declared].sort()).toEqual(["js-yaml", "vitest"]);
    expect(ctx.importedPackageNames.get("js-yaml")).toEqual([expect.stringMatching(/apps.web.src.index\.ts/)]);
  });

  it("collects workspace members from the root manifest's workspaces field", () => {
    writeFileSync(join(dir, "package.json"), JSON.stringify({
      name: "root", workspaces: ["packages/*"],
    }));
    mkdirSync(join(dir, "packages", "a"), { recursive: true });
    mkdirSync(join(dir, "packages", "b"), { recursive: true });
    writeFileSync(join(dir, "packages", "a", "package.json"), JSON.stringify({ name: "a", dependencies: { lodash: "^4" } }));
    writeFileSync(join(dir, "packages", "b", "package.json"), JSON.stringify({ name: "b", peerDependencies: { react: "^18" } }));

    const ctx = buildOverrideContext(dir, {
      auditLog: NULL_AUDIT_LOG,
      logger: makeNoopLogger() as any,
      checkNetwork: false,
    });

    expect(ctx.workspaceMembers!.map((m) => [m.dir, [...m.declared]])).toEqual(
      expect.arrayContaining([["packages/a", ["lodash"]], ["packages/b", ["react"]]]),
    );
  });

  it("leaves workspaceMembers empty for a single-package project", () => {
    writeFileSync(join(dir, "package.json"), JSON.stringify({ name: "x" }));

    const ctx = buildOverrideContext(dir, {
      auditLog: NULL_AUDIT_LOG,
      logger: makeNoopLogger() as any,
      checkNetwork: false,
    });

    expect(ctx.workspaceMembers).toEqual([]);
  });

  it("does not count a JSDoc import() type annotation as an import (#966)", () => {
    writeFileSync(join(dir, "package.json"), JSON.stringify({ name: "x" }));
    writeFileSync(join(dir, "postcss.config.mjs"), [
      "/** @type {import('postcss-load-config').Config} */",
      "const config = { plugins: { tailwindcss: {}, autoprefixer: {} } };",
      "export default config;",
    ].join("\n"));

    const ctx = buildOverrideContext(dir, {
      auditLog: NULL_AUDIT_LOG,
      logger: makeNoopLogger() as any,
      checkNetwork: false,
    });

    expect(ctx.importedPackageNames.has("postcss-load-config")).toBe(false);
  });

  it("flags OA001/OA004/OA006/OA008 as skipped when node_modules is absent", () => {
    writeFileSync(join(dir, "package.json"), JSON.stringify({
      name: "x",
      overrides: { postcss: "8.5.15" },
    }));
    // No lockfile, no node_modules.

    const ctx = buildOverrideContext(dir, {
      auditLog: NULL_AUDIT_LOG,
      logger: makeNoopLogger() as any,
      checkNetwork: false,
    });

    const ids = ctx.skippedDetectors.map((s) => s.ruleId);
    expect(ids).toEqual(expect.arrayContaining(["OA001", "OA004", "OA006", "OA008"]));
  });

  it("reads yarn.lock package names", () => {
    writeFileSync(join(dir, "package.json"), JSON.stringify({
      name: "x",
      resolutions: { lodash: "4.17.21" },
    }));
    writeFileSync(join(dir, "yarn.lock"), [
      "# yarn lockfile v1",
      "",
      "lodash@4.17.21:",
      '  version "4.17.21"',
      '  resolved "https://registry.yarnpkg.com/lodash/-/lodash-4.17.21.tgz"',
      "",
    ].join("\n"));

    const ctx = buildOverrideContext(dir, {
      auditLog: NULL_AUDIT_LOG,
      logger: makeNoopLogger() as any,
      checkNetwork: false,
    });

    expect(ctx.packageManager).toBe("yarn");
    expect(ctx.lockfilePackageNames.has("lodash")).toBe(true);
  });

  it("detects bun package manager when bun.lock exists", () => {
    writeFileSync(join(dir, "package.json"), JSON.stringify({
      name: "x",
      overrides: { lodash: "4.17.21" },
    }));
    // Minimal bun.lock for detection purposes
    writeFileSync(join(dir, "bun.lock"), "");

    const ctx = buildOverrideContext(dir, {
      auditLog: NULL_AUDIT_LOG,
      logger: makeNoopLogger() as any,
      checkNetwork: false,
    });

    expect(ctx.packageManager).toBe("bun");
  });

  it("parses valid pnpm-lock.yaml and does not skip OA001", () => {
    writeFileSync(join(dir, "package.json"), JSON.stringify({
      name: "x",
      overrides: { lodash: "4.17.21" },
    }));
    // Valid pnpm v9 format with snapshots
    writeFileSync(join(dir, "pnpm-lock.yaml"), [
      "lockfileVersion: '9.0'",
      "settings:",
      "  autoInstallPeers: true",
      "importers:",
      "  '.':",
      "    dependencies:",
      "      lodash:",
      "        specifier: 4.17.21",
      "        version: 4.17.21",
      "snapshots:",
      "  lodash@4.17.21: {}",
    ].join("\n"));

    const ctx = buildOverrideContext(dir, {
      auditLog: NULL_AUDIT_LOG,
      logger: makeNoopLogger() as any,
      checkNetwork: false,
    });

    expect(ctx.packageManager).toBe("pnpm");
    expect(ctx.lockfilePackageNames.has("lodash")).toBe(true);
    const oa001Skip = ctx.skippedDetectors.find((s) => s.ruleId === "OA001");
    expect(oa001Skip).toBeUndefined();
  });

  it("skips OA001 with 'lockfile missing or empty' when no lockfile exists", () => {
    writeFileSync(join(dir, "package.json"), JSON.stringify({
      name: "x",
      overrides: { lodash: "4.17.21" },
    }));
    // No lockfile at all

    const ctx = buildOverrideContext(dir, {
      auditLog: NULL_AUDIT_LOG,
      logger: makeNoopLogger() as any,
      checkNetwork: false,
    });

    expect(ctx.packageManager).toBe("unknown");
    expect(ctx.lockfilePackageNames.size).toBe(0);
    const oa001Skip = ctx.skippedDetectors.find((s) => s.ruleId === "OA001");
    expect(oa001Skip).toBeDefined();
    expect(oa001Skip?.reason).toBe("lockfile missing or empty");
  });

  it("skips OA001 with 'lockfile failed to parse' when lockfile is corrupt", () => {
    writeFileSync(join(dir, "package.json"), JSON.stringify({
      name: "x",
      overrides: { lodash: "4.17.21" },
    }));
    // Invalid JSON that will fail to parse
    writeFileSync(join(dir, "package-lock.json"), ":::not valid json:::");

    const warnings: string[] = [];
    const logger = {
      info: () => {},
      warn: (msg: string) => warnings.push(msg),
      error: () => {},
      debug: () => {},
    };

    const ctx = buildOverrideContext(dir, {
      auditLog: NULL_AUDIT_LOG,
      logger: logger as any,
      checkNetwork: false,
    });

    expect(ctx.packageManager).toBe("npm");
    expect(ctx.lockfilePackageNames.size).toBe(0);
    const oa001Skip = ctx.skippedDetectors.find((s) => s.ruleId === "OA001");
    expect(oa001Skip).toBeDefined();
    expect(oa001Skip?.reason).toMatch(/lockfile failed to parse/);
    expect(oa001Skip?.reason).toContain("package-lock.json");
    expect(warnings.length).toBe(1);
    expect(warnings[0]).toMatch(/Lockfile parse error/);
  });

  it("skips OA001 with parse error for corrupt pnpm-lock.yaml", () => {
    writeFileSync(join(dir, "package.json"), JSON.stringify({
      name: "x",
      overrides: { lodash: "4.17.21" },
    }));
    // Invalid YAML that causes a parser error - unclosed quote
    writeFileSync(join(dir, "pnpm-lock.yaml"), "lockfileVersion: \"9.0\nthis is: broken yaml: syntax:");

    const warnings: string[] = [];
    const logger = {
      info: () => {},
      warn: (msg: string) => warnings.push(msg),
      error: () => {},
      debug: () => {},
    };

    const ctx = buildOverrideContext(dir, {
      auditLog: NULL_AUDIT_LOG,
      logger: logger as any,
      checkNetwork: false,
    });

    expect(ctx.packageManager).toBe("pnpm");
    expect(ctx.lockfilePackageNames.size).toBe(0);
    const oa001Skip = ctx.skippedDetectors.find((s) => s.ruleId === "OA001");
    expect(oa001Skip).toBeDefined();
    expect(oa001Skip?.reason).toMatch(/lockfile failed to parse/);
    expect(oa001Skip?.reason).toContain("pnpm-lock.yaml");
    expect(warnings.length).toBe(1);
  });
});
