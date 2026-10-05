import { buildCycloneDxBom, buildPurl } from "../src/output/cyclonedx.js";
import type { Finding, PackageRef } from "../src/types.js";

function makePackage(name: string, version: string): PackageRef {
  return { name, version, ecosystem: "npm" };
}

function makeFinding(name: string, version: string, cveId: string, severity: "critical" | "high" | "medium" | "low" | "unknown" = "high"): Finding {
  return {
    pkg: makePackage(name, version),
    vulnerabilities: [{ id: cveId }],
    severity,
    cveAliases: [cveId],
    dependencyPaths: [[name]],
    relationship: "direct",
    firstFixedVersion: "2.0.0",
    validatedFirstFixedVersion: "2.0.0",
  };
}

describe("buildPurl", () => {
  it("builds purl for unscoped package", () => {
    expect(buildPurl("lodash", "4.17.21")).toBe("pkg:npm/lodash@4.17.21");
  });

  it("encodes scoped package @ prefix", () => {
    expect(buildPurl("@babel/core", "7.0.0")).toBe("pkg:npm/%40babel/core@7.0.0");
  });
});

describe("buildCycloneDxBom", () => {
  const allPackages = [
    makePackage("lodash", "4.17.21"),
    makePackage("@babel/core", "7.0.0"),
    makePackage("express", "4.18.0"),
  ];

  it("has valid top-level shape", () => {
    const bom = buildCycloneDxBom(allPackages, [], null, "1.0.0");
    expect(bom.bomFormat).toBe("CycloneDX");
    expect(bom.specVersion).toBe("1.6");
    expect(bom.serialNumber).toMatch(/^urn:uuid:/);
    expect(bom.metadata).toBeDefined();
    expect(Array.isArray(bom.components)).toBe(true);
    expect(Array.isArray(bom.vulnerabilities)).toBe(true);
  });

  it("includes all packages as components, not just vulnerable ones", () => {
    const findings = [makeFinding("lodash", "4.17.21", "CVE-2021-1234")];
    const bom = buildCycloneDxBom(allPackages, findings, null, "1.0.0");
    expect(bom.components).toHaveLength(3);
    const names = bom.components.map(c => c.name);
    expect(names).toContain("lodash");
    expect(names).toContain("@babel/core");
    expect(names).toContain("express");
  });

  it("sets correct bom-ref and purl on components", () => {
    const bom = buildCycloneDxBom(allPackages, [], null, "1.0.0");
    const scoped = bom.components.find(c => c.name === "@babel/core")!;
    expect(scoped["bom-ref"]).toBe("pkg:npm/%40babel/core@7.0.0");
    expect(scoped.purl).toBe("pkg:npm/%40babel/core@7.0.0");
  });

  it("emits one vulnerability entry per CVE ID", () => {
    const findings = [
      makeFinding("lodash", "4.17.21", "CVE-2021-1111"),
      makeFinding("express", "4.18.0", "CVE-2021-2222"),
    ];
    const bom = buildCycloneDxBom(allPackages, findings, null, "1.0.0");
    expect(bom.vulnerabilities).toHaveLength(2);
  });

  it("deduplicates CVE shared across multiple components into one entry with multiple affects", () => {
    const pkgs = [makePackage("a", "1.0.0"), makePackage("b", "2.0.0")];
    const findings = [
      makeFinding("a", "1.0.0", "CVE-2021-9999"),
      makeFinding("b", "2.0.0", "CVE-2021-9999"),
    ];
    const bom = buildCycloneDxBom(pkgs, findings, null, "1.0.0");
    expect(bom.vulnerabilities).toHaveLength(1);
    expect(bom.vulnerabilities[0].affects).toHaveLength(2);
  });

  it("uses runnableFixCommand as recommendation when available", () => {
    const findings = [makeFinding("lodash", "4.17.21", "CVE-2021-1234")];
    const fixCommand = "npm install lodash@2.0.0";
    const plan = {
      packageManager: "npm" as const,
      sourceLabel: "package-lock.json",
      command: fixCommand,
      sections: [],
      targets: [
        {
          package: "lodash",
          currentVersion: "4.17.21",
          targetVersion: "2.0.0",
          kind: "direct" as const,
          urgent: true,
          severity: "high" as const,
          adjusted: false,
          adjustmentNote: null,
          reason: "Direct upgrade target for lodash@4.17.21",
          command: fixCommand,
        },
      ],
      skipped: [],
    };
    const bom = buildCycloneDxBom(allPackages, findings, null, "1.0.0", plan);
    expect(bom.vulnerabilities[0].recommendation).toBe(fixCommand);
  });

  it("produces valid BOM with zero vulnerabilities when findings is empty", () => {
    const bom = buildCycloneDxBom(allPackages, [], null, "1.0.0");
    expect(bom.components).toHaveLength(3);
    expect(bom.vulnerabilities).toHaveLength(0);
  });

  it("populates metadata.component from projectMeta", () => {
    const bom = buildCycloneDxBom(allPackages, [], { name: "my-app", version: "1.2.3" }, "1.0.0");
    expect(bom.metadata.component?.name).toBe("my-app");
    expect(bom.metadata.component?.version).toBe("1.2.3");
  });

  it("omits metadata.component when projectMeta is null", () => {
    const bom = buildCycloneDxBom(allPackages, [], null, "1.0.0");
    expect(bom.metadata.component).toBeUndefined();
  });

  it("emits metadata.tools in the CycloneDX 1.6 tools.components form", () => {
    const bom = buildCycloneDxBom(allPackages, [], null, "1.33.0");
    expect(Array.isArray(bom.metadata.tools)).toBe(false);
    expect(bom.metadata.tools).toEqual({
      components: [
        {
          type: "application",
          name: "CVE Lite CLI",
          version: "1.33.0",
          publisher: "OWASP",
        },
      ],
    });
  });
});

describe("buildCycloneDxBom - CycloneDX 1.6 schema conformance", () => {
  // Asserts the required fields from the 1.6 schema directly, without adding
  // a schema-validation dependency. Each test pins specVersion to 1.6 first:
  // component type/name, affects[].ref, and the scoreMethod enum values were
  // already required/valid under 1.4, so without the explicit specVersion
  // assertion these would pass unchanged on a regression back to 1.4.
  const allPackages = [makePackage("lodash", "4.17.21")];
  const findings = [makeFinding("lodash", "4.17.21", "CVE-2021-1234")];

  it("declares the current default CycloneDX spec version", () => {
    const bom = buildCycloneDxBom(allPackages, findings, null, "1.0.0");
    expect(bom.bomFormat).toBe("CycloneDX");
    expect(bom.specVersion).toBe("1.6");
  });

  it("on CycloneDX 1.6, every component satisfies the required component fields (type, name)", () => {
    const bom = buildCycloneDxBom(allPackages, findings, null, "1.0.0");
    expect(bom.specVersion).toBe("1.6");
    for (const component of bom.components) {
      expect(component.type).toBeTruthy();
      expect(component.name).toBeTruthy();
    }
  });

  it("on CycloneDX 1.6, every vulnerability.affects entry satisfies the required affects field (ref)", () => {
    const bom = buildCycloneDxBom(allPackages, findings, null, "1.0.0");
    expect(bom.specVersion).toBe("1.6");
    for (const vuln of bom.vulnerabilities) {
      expect(vuln.affects.length).toBeGreaterThan(0);
      for (const affect of vuln.affects) {
        expect(affect.ref).toBeTruthy();
      }
    }
  });

  it("on CycloneDX 1.6, metadata.tools uses components with publisher (not the deprecated vendor array)", () => {
    const bom = buildCycloneDxBom(allPackages, findings, null, "1.0.0");
    expect(bom.specVersion).toBe("1.6");
    expect(Array.isArray(bom.metadata.tools)).toBe(false);
    const tool = bom.metadata.tools.components[0];
    expect(tool.type).toBe("application");
    expect(tool.name).toBe("CVE Lite CLI");
    expect(tool.version).toBe("1.0.0");
    expect(tool.publisher).toBe("OWASP");
    expect((tool as { vendor?: string }).vendor).toBeUndefined();
  });

  it("on CycloneDX 1.6, every rating.method is one of the scoreMethod enum values, including 1.6-only additions", () => {
    // CVSSv4 and SSVC are 1.6 additions; they are absent from the 1.4
    // scoreMethod enum, so this list itself is version-specific.
    const validMethods = ["CVSSv2", "CVSSv3", "CVSSv31", "CVSSv4", "OWASP", "SSVC", "other"];
    const bom = buildCycloneDxBom(allPackages, findings, null, "1.0.0");
    expect(bom.specVersion).toBe("1.6");
    for (const vuln of bom.vulnerabilities) {
      for (const rating of vuln.ratings) {
        expect(validMethods).toContain(rating.method);
      }
    }
  });
});

// CycloneDX 1.6 property bag on a vulnerability. Namespaced under "cve-lite:" so
// it cannot collide with another tool's keys, and every value is a string because
// the spec requires that.
describe("buildCycloneDxBom - fix metadata properties", () => {
  it("carries the advisory hint, recommended version, publish date and counts", () => {
    const finding: Finding = {
      ...makeFinding("axios", "0.21.1", "CVE-2026-44495"),
      firstFixedVersion: "0.21.2",
      validatedFirstFixedVersion: "0.33.0",
      fixVersionPublishedAt: "2026-06-14T18:07:21.271Z",
      validatedTargetScannedVersions: 23,
      validatedTargetKnownVulnerableVersions: 22,
    };

    const bom = buildCycloneDxBom([makePackage("axios", "0.21.1")], [finding], null, "1.0.0");
    const props = bom.vulnerabilities[0]!.properties ?? [];
    const byName = Object.fromEntries(props.map(p => [p.name, p.value]));

    expect(byName["cve-lite:advisory-fix-version"]).toBe("0.21.2");
    expect(byName["cve-lite:recommended-fix-version"]).toBe("0.33.0");
    expect(byName["cve-lite:fix-version-published-at"]).toBe("2026-06-14T18:07:21.271Z");
    expect(byName["cve-lite:versions-scanned"]).toBe("23");
    expect(byName["cve-lite:versions-still-vulnerable"]).toBe("22");
    for (const p of props) expect(typeof p.value).toBe("string");
  });

  it("names the refreshed child on a parent-update target rather than treating the child's version as the parent's", () => {
    const finding: Finding = {
      ...makeFinding("form-data", "4.0.5", "CVE-2025-0001"),
      relationship: "transitive",
      firstFixedVersion: "4.0.6",
      validatedFirstFixedVersion: "4.0.6",
      recommendedNpmTransitiveRemediation: {
        kind: "update-parent-within-range",
        package: "axios",
        currentVersion: "1.16.1",
        targetChildVersion: "4.0.6",
        viaPath: ["project", "axios", "form-data"],
        reason: "axios@1.16.1 already allows form-data@4.0.6 within the current dependency range",
      },
    };
    const plan = {
      packageManager: "npm" as const,
      sourceLabel: "package-lock.json",
      command: "npm update axios",
      sections: [],
      targets: [
        {
          package: "axios",
          currentVersion: "1.16.1",
          targetVersion: "1.16.1",
          childPackage: "form-data",
          childTargetVersion: "4.0.6",
          kind: "parent-update" as const,
          urgent: true,
          severity: "high" as const,
          adjusted: false,
          adjustmentNote: null,
          reason: "axios@1.16.1 already allows form-data@4.0.6 within the current dependency range",
          command: "npm update axios",
        },
      ],
      skipped: [],
      coveredFindingCount: 1,
      totalFindingCount: 1,
    };

    const bom = buildCycloneDxBom([makePackage("form-data", "4.0.5"), makePackage("axios", "1.16.1")], [finding], null, "1.0.0", plan);
    const byName = Object.fromEntries((bom.vulnerabilities[0]!.properties ?? []).map(p => [p.name, p.value]));

    expect(byName["cve-lite:recommended-fix-version"]).toBe("4.0.6");
    expect(byName["cve-lite:child-package"]).toBe("form-data");
    expect(byName["cve-lite:child-target-version"]).toBe("4.0.6");
  });

  it("omits properties that have no value rather than emitting empty strings", () => {
    const finding: Finding = {
      ...makeFinding("axios", "0.21.1", "CVE-2026-44495"),
      fixVersionPublishedAt: undefined,
      validatedTargetScannedVersions: undefined,
      validatedTargetKnownVulnerableVersions: undefined,
    };

    const bom = buildCycloneDxBom([makePackage("axios", "0.21.1")], [finding], null, "1.0.0");
    const names = (bom.vulnerabilities[0]!.properties ?? []).map(p => p.name);

    expect(names).not.toContain("cve-lite:fix-version-published-at");
    expect(names).not.toContain("cve-lite:versions-scanned");
    expect(names).toContain("cve-lite:advisory-fix-version");
  });
});
