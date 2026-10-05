import { detect } from '../../../src/overrides/detectors/pd001-override-only-phantom.js';
import type { OverrideContext, OverrideEntry } from '../../../src/overrides/context.js';
import { NULL_AUDIT_LOG } from '../../../src/audit-log/index.js';

const noopLogger = { info: () => {}, warn: () => {}, error: () => {}, debug: () => {} } as any;

function ctxOf(overrides: string[], declared: Record<string, string>, imported: [string, string[]][]): OverrideContext {
  const overrideEntries: OverrideEntry[] = overrides.map((name) => ({
    key: name, packageName: name, value: ">=1.0.0",
    path: ["overrides", name], container: "overrides" as const,
  }));
  return {
    projectPath: "/x",
    packageJson: { name: "x", dependencies: declared },
    packageJsonRaw: "{}",
    packageManager: "npm",
    overrideEntries,
    lockfilePackageNames: new Set(overrides),
    installedVersions: new Map(),
    installedCopies: new Map(),
    parentDeclarations: new Map(),
    registryDistTags: new Map(),
    skippedDetectors: [],
    importedPackageNames: new Map(imported),
    auditLog: NULL_AUDIT_LOG,
    logger: noopLogger,
  };
}

describe("PD001 - override-only phantom", () => {
  it("fires when package is in overrides and imported but not declared", () => {
    const findings = detect(ctxOf(
      ["js-yaml"],
      {},
      [["js-yaml", ["src/yaml-engine.ts"]]],
    ));
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({
      ruleId: "PD001",
      severity: "high",
      package: { name: "js-yaml" },
    });
    expect(findings[0]!.message).toContain("js-yaml");
    expect(findings[0]!.details).toContain("src/yaml-engine.ts");
  });

  it("does NOT fire when package is declared in dependencies", () => {
    const findings = detect(ctxOf(
      ["js-yaml"],
      { "js-yaml": "^4.0.0" },
      [["js-yaml", ["src/index.ts"]]],
    ));
    expect(findings).toHaveLength(0);
  });

  it("does NOT fire when package is in overrides but not imported", () => {
    const findings = detect(ctxOf(
      ["js-yaml"],
      {},
      [], // no imports
    ));
    expect(findings).toHaveLength(0);
  });

  it("does NOT fire when package is imported but not in overrides (PD002 territory)", () => {
    const findings = detect(ctxOf(
      [], // no overrides
      {},
      [["lodash", ["src/utils.ts"]]],
    ));
    expect(findings).toHaveLength(0);
  });

  it("includes npm install command in details for npm projects", () => {
    const findings = detect(ctxOf(["js-yaml"], {}, [["js-yaml", ["src/index.ts"]]]));
    expect(findings[0]!.details).toContain("npm install js-yaml");
  });

  it("uses pnpm add command for pnpm projects", () => {
    const ctx = ctxOf(["js-yaml"], {}, [["js-yaml", ["src/index.ts"]]]);
    ctx.packageManager = "pnpm";
    const findings = detect(ctx);
    expect(findings[0]!.details).toContain("pnpm add js-yaml");
  });

  it("returns empty when importedPackageNames is empty", () => {
    const findings = detect(ctxOf(["js-yaml"], {}, []));
    expect(findings).toHaveLength(0);
  });

  it("respects skippedDetectors when PD001 is listed", () => {
    const ctx = ctxOf(["js-yaml"], {}, [["js-yaml", ["src/index.ts"]]]);
    ctx.skippedDetectors = [{ ruleId: "PD001", reason: "no source files" }];
    expect(detect(ctx)).toHaveLength(0);
  });

  describe("workspace roots (#966)", () => {
    it("does NOT fire when the importing workspace member declares the package", () => {
      const ctx = ctxOf(["js-yaml"], {}, [["js-yaml", ["apps/web/src/index.ts"]]]);
      ctx.workspaceMembers = [{ dir: "apps/web", declared: new Set(["js-yaml"]) }];
      expect(detect(ctx)).toHaveLength(0);
    });

    it("fires for a member that imports the package without declaring it", () => {
      const ctx = ctxOf(["js-yaml"], {}, [["js-yaml", ["apps/api/src/index.ts"]]]);
      ctx.workspaceMembers = [
        { dir: "apps/web", declared: new Set(["js-yaml"]) },
        { dir: "apps/api", declared: new Set() },
      ];
      const findings = detect(ctx);
      expect(findings).toHaveLength(1);
      expect(findings[0]!.details).toContain("apps/api/src/index.ts");
    });

    it("only lists the files whose member does not declare the package", () => {
      const ctx = ctxOf(["js-yaml"], {}, [["js-yaml", ["apps/web/src/index.ts", "apps/api/src/index.ts", "scripts/build.ts"]]]);
      ctx.workspaceMembers = [
        { dir: "apps/web", declared: new Set(["js-yaml"]) },
        { dir: "apps/api", declared: new Set() },
      ];
      const findings = detect(ctx);
      expect(findings).toHaveLength(1);
      expect(findings[0]!.details).toContain("apps/api/src/index.ts");
      expect(findings[0]!.details).toContain("scripts/build.ts");
      expect(findings[0]!.details).not.toContain("apps/web/src/index.ts");
    });
  });
});
