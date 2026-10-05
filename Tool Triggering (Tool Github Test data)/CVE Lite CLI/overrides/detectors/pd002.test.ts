import { detect } from '../../../src/overrides/detectors/pd002-transitive-only-phantom.js';
import type { OverrideContext, OverrideEntry } from '../../../src/overrides/context.js';
import { NULL_AUDIT_LOG } from '../../../src/audit-log/index.js';

const noopLogger = { info: () => {}, warn: () => {}, error: () => {}, debug: () => {} } as any;

function ctxOf(opts: {
  overrides?: string[];
  declared?: Record<string, string>;
  lockfile?: string[];
  imported?: [string, string[]][];
  pm?: OverrideContext["packageManager"];
  workspaceMembers?: OverrideContext["workspaceMembers"];
}): OverrideContext {
  const overrideEntries: OverrideEntry[] = (opts.overrides ?? []).map((name) => ({
    key: name, packageName: name, value: "1.0.0",
    path: ["overrides", name], container: "overrides" as const,
  }));
  return {
    projectPath: "/x",
    packageJson: { name: "x", dependencies: opts.declared ?? {} },
    packageJsonRaw: "{}",
    packageManager: opts.pm ?? "npm",
    overrideEntries,
    lockfilePackageNames: new Set(opts.lockfile ?? []),
    installedVersions: new Map(),
    installedCopies: new Map(),
    parentDeclarations: new Map(),
    registryDistTags: new Map(),
    skippedDetectors: [],
    importedPackageNames: new Map(opts.imported ?? []),
    workspaceMembers: opts.workspaceMembers,
    auditLog: NULL_AUDIT_LOG,
    logger: noopLogger,
  };
}

describe("PD002 - transitive-only phantom", () => {
  it("fires when package is in lockfile, imported, but not declared or in overrides", () => {
    const findings = detect(ctxOf({
      lockfile: ["lodash", "cross-env"],
      imported: [["lodash", ["src/utils.ts"]]],
    }));
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({
      ruleId: "PD002",
      severity: "medium",
      package: { name: "lodash" },
    });
    expect(findings[0]!.details).toContain("src/utils.ts");
  });

  it("does NOT fire when package is declared in dependencies", () => {
    const findings = detect(ctxOf({
      lockfile: ["lodash"],
      declared: { lodash: "^4.0.0" },
      imported: [["lodash", ["src/index.ts"]]],
    }));
    expect(findings).toHaveLength(0);
  });

  it("does NOT fire when package is in overrides (PD001 owns it)", () => {
    const findings = detect(ctxOf({
      overrides: ["js-yaml"],
      lockfile: ["js-yaml"],
      imported: [["js-yaml", ["src/index.ts"]]],
    }));
    expect(findings).toHaveLength(0);
  });

  it("does NOT fire when package is imported but not in lockfile", () => {
    // Package is not in graph at all - different problem, out of scope.
    const findings = detect(ctxOf({
      lockfile: [],
      imported: [["not-installed", ["src/index.ts"]]],
    }));
    expect(findings).toHaveLength(0);
  });

  it("includes npm install command for npm projects", () => {
    const findings = detect(ctxOf({
      lockfile: ["lodash"],
      imported: [["lodash", ["src/index.ts"]]],
    }));
    expect(findings[0]!.details).toContain("npm install lodash");
  });

  it("uses yarn add for yarn projects", () => {
    const findings = detect(ctxOf({
      lockfile: ["lodash"],
      imported: [["lodash", ["src/index.ts"]]],
      pm: "yarn",
    }));
    expect(findings[0]!.details).toContain("yarn add lodash");
  });

  it("returns empty when importedPackageNames is empty", () => {
    const findings = detect(ctxOf({ lockfile: ["lodash"] }));
    expect(findings).toHaveLength(0);
  });

  it("respects skippedDetectors when PD002 is listed", () => {
    const ctx = ctxOf({
      lockfile: ["lodash"],
      imported: [["lodash", ["src/index.ts"]]],
    });
    ctx.skippedDetectors = [{ ruleId: "PD002", reason: "no source files" }];
    expect(detect(ctx)).toHaveLength(0);
  });

  describe("workspace roots (#966)", () => {
    // Minimal repro from the issue: a pnpm workspace root that declares nothing,
    // apps/web declares js-yaml and imports it. Scanning the root must be clean.
    it("does NOT fire when the importing workspace member declares the package", () => {
      const findings = detect(ctxOf({
        pm: "pnpm",
        lockfile: ["js-yaml"],
        imported: [["js-yaml", ["apps/web/src/index.ts"]]],
        workspaceMembers: [{ dir: "apps/web", declared: new Set(["js-yaml"]) }],
      }));
      expect(findings).toHaveLength(0);
    });

    it("still fires for a member that imports without declaring", () => {
      const findings = detect(ctxOf({
        pm: "pnpm",
        lockfile: ["js-yaml"],
        imported: [["js-yaml", ["apps/api/src/index.ts"]]],
        workspaceMembers: [
          { dir: "apps/web", declared: new Set(["js-yaml"]) },
          { dir: "apps/api", declared: new Set() },
        ],
      }));
      expect(findings).toHaveLength(1);
      expect(findings[0]!.details).toContain("apps/api/src/index.ts");
    });

    it("still fires for files outside any member when the root does not declare", () => {
      const findings = detect(ctxOf({
        lockfile: ["js-yaml"],
        imported: [["js-yaml", ["scripts/release.ts"]]],
        workspaceMembers: [{ dir: "apps/web", declared: new Set(["js-yaml"]) }],
      }));
      expect(findings).toHaveLength(1);
      expect(findings[0]!.details).toContain("scripts/release.ts");
    });

    it("lists only the undeclared files when a package is imported across members", () => {
      const findings = detect(ctxOf({
        lockfile: ["react"],
        imported: [["react", ["apps/web/src/app.tsx", "apps/api/src/render.tsx"]]],
        workspaceMembers: [
          { dir: "apps/web", declared: new Set(["react"]) },
          { dir: "apps/api", declared: new Set() },
        ],
      }));
      expect(findings).toHaveLength(1);
      expect(findings[0]!.details).toContain("apps/api/src/render.tsx");
      expect(findings[0]!.details).not.toContain("apps/web/src/app.tsx");
    });

    it("resolves against the deepest enclosing member for nested workspaces", () => {
      const findings = detect(ctxOf({
        lockfile: ["lodash"],
        imported: [["lodash", ["packages/core/plugins/extra/src/index.ts"]]],
        workspaceMembers: [
          { dir: "packages/core", declared: new Set(["lodash"]) },
          { dir: "packages/core/plugins/extra", declared: new Set() },
        ],
      }));
      expect(findings).toHaveLength(1);
    });

    it("does not treat a sibling directory with a shared prefix as the member", () => {
      const findings = detect(ctxOf({
        lockfile: ["lodash"],
        imported: [["lodash", ["apps/web-admin/src/index.ts"]]],
        workspaceMembers: [{ dir: "apps/web", declared: new Set(["lodash"]) }],
      }));
      expect(findings).toHaveLength(1);
    });

    it("a root declaration satisfies every member", () => {
      const findings = detect(ctxOf({
        declared: { lodash: "^4.0.0" },
        lockfile: ["lodash"],
        imported: [["lodash", ["apps/web/src/index.ts"]]],
        workspaceMembers: [{ dir: "apps/web", declared: new Set() }],
      }));
      expect(findings).toHaveLength(0);
    });

    it("accepts Windows-style separators in import file paths", () => {
      const findings = detect(ctxOf({
        lockfile: ["js-yaml"],
        imported: [["js-yaml", ["apps\\web\\src\\index.ts"]]],
        workspaceMembers: [{ dir: "apps/web", declared: new Set(["js-yaml"]) }],
      }));
      expect(findings).toHaveLength(0);
    });
  });
});
