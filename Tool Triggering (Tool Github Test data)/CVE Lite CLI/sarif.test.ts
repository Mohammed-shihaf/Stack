import { buildSarifOutput } from "../src/output/sarif.js";
import { getRecommendedAction } from "../src/output/formatters.js";
import type { Finding } from "../src/types.js";
import type { SuggestedFixCommandPlan } from "../src/remediation/fix-commands.js";
import type { MaintenanceFinding } from "../src/maintenance/types.js";
import type { OverrideFinding } from "../src/overrides/types.js";

function makeMinimalFinding(overrides: Partial<Finding> = {}): Finding {
  return {
    pkg: { name: "undici", version: "6.24.1", ecosystem: "npm", paths: [["project", "axios", "undici"]] },
    vulnerabilities: [{ id: "CVE-2026-12151" }],
    severity: "high",
    cveAliases: ["CVE-2026-12151"],
    dependencyPaths: [["undici"]],
    relationship: "transitive",
    firstFixedVersion: "6.27.0",
    validatedFirstFixedVersion: "6.27.0",
    ...overrides,
  };
}

function makeEnrichedFinding(overrides: Partial<Finding> = {}): Finding {
  return {
    pkg: { name: "undici", version: "6.24.1", ecosystem: "npm", paths: [["project", "axios", "undici"]] },
    vulnerabilities: [
      {
        id: "GHSA-p88m-4jf-68fv",
        aliases: ["CVE-2026-12151"],
        summary: "undici vulnerable to HTTP header injection via Set-Cookie percent-decoding",
        details: "undici's cookie parser percent-decodes cookie values via qsUnescape, turning encoded sequences like %0D%0A into their literal byte equivalents.",
        severity: [{ type: "CVSS_V3", score: "CVSS:3.1/AV:N/AC:H/PR:N/UI:N/S:U/C:N/I:H/A:N" }],
        database_specific: { cwe_ids: ["CWE-93"] },
        affected: [
          {
            ranges: [
              {
                type: "SEMVER",
                events: [{ introduced: "0" }, { fixed: "6.27.0" }],
              },
            ],
          },
        ],
      },
    ],
    severity: "high",
    cveAliases: ["CVE-2026-12151"],
    dependencyPaths: [["undici"]],
    relationship: "transitive",
    firstFixedVersion: "6.27.0",
    validatedFirstFixedVersion: "6.27.0",
    ...overrides,
  };
}

describe("getRecommendedAction — within-range fix message", () => {
  it("tells the user to run npm install rather than a vague lockfile refresh", () => {
    const finding = makeMinimalFinding({
      recommendedNpmTransitiveRemediation: {
        kind: "update-parent-within-range",
        package: "axios",
        currentVersion: "0.21.1",
        viaPath: ["axios"],
        reason: "axios already permits undici@6.27.0",
        targetChildVersion: "6.27.0",
      },
    });
    const action = getRecommendedAction(finding);
    expect(action).toContain("npm install");
    expect(action).not.toContain("lockfile refresh command");
  });
});

describe("buildSarifOutput — rule enrichment", () => {
  let rule: any;

  beforeAll(() => {
    const sarif = buildSarifOutput([makeEnrichedFinding()], "package-lock.json", "1.0.0", null);
    rule = sarif.runs[0]!.tool.driver.rules[0]!;
  });

  it("uses vuln summary as rule name and shortDescription", () => {
    expect(rule.name).toBe("undici vulnerable to HTTP header injection via Set-Cookie percent-decoding");
    expect(rule.shortDescription.text).toBe("undici vulnerable to HTTP header injection via Set-Cookie percent-decoding");
  });

  it("uses vuln details as fullDescription", () => {
    expect(rule.fullDescription.text).toContain("percent-decodes cookie values");
  });

  it("populates help.markdown with CVSS vector", () => {
    expect(rule.help?.markdown).toContain("CVSS:3.1/AV:N/AC:H/PR:N/UI:N/S:U/C:N/I:H/A:N");
  });

  it("populates help.markdown with CWE", () => {
    expect(rule.help?.markdown).toContain("CWE-93");
  });

  it("populates help.markdown with affected and patched versions", () => {
    expect(rule.help?.markdown).toContain("< 6.27.0");
    expect(rule.help?.markdown).toContain("6.27.0");
  });

  it("populates help.markdown with dependency path", () => {
    expect(rule.help?.markdown).toContain("project → axios → undici");
  });

  it("populates help.markdown with the recommended fix action", () => {
    expect(rule.help?.markdown).toContain("## Fix");
  });
});

describe("buildSarifOutput — graceful degradation", () => {
  it("falls back to ruleId for name/shortDescription when no matching vuln", () => {
    const finding = makeMinimalFinding({ cveAliases: ["CVE-9999-0000"], vulnerabilities: [] });
    const sarif = buildSarifOutput([finding], "package-lock.json", "1.0.0", null);
    const rule = sarif.runs[0]!.tool.driver.rules[0]!;
    expect(rule.name).toBe("CVE-9999-0000");
    expect(rule.shortDescription.text).toBe("CVE-9999-0000");
  });

  it("omits help field when no matching vuln found", () => {
    const finding = makeMinimalFinding({ cveAliases: ["CVE-9999-0000"], vulnerabilities: [] });
    const sarif = buildSarifOutput([finding], "package-lock.json", "1.0.0", null);
    const rule = sarif.runs[0]!.tool.driver.rules[0]!;
    expect(rule.help).toBeUndefined();
  });

  it("falls back to ruleId when vuln has no summary", () => {
    const finding = makeMinimalFinding({
      vulnerabilities: [{ id: "CVE-2026-12151" }],
      cveAliases: ["CVE-2026-12151"],
    });
    const sarif = buildSarifOutput([finding], "package-lock.json", "1.0.0", null);
    const rule = sarif.runs[0]!.tool.driver.rules[0]!;
    expect(rule.name).toBe("CVE-2026-12151");
  });

  it("omits CVSS line from help when severity is absent", () => {
    const finding = makeEnrichedFinding();
    finding.vulnerabilities[0]!.severity = undefined;
    const sarif = buildSarifOutput([finding], "package-lock.json", "1.0.0", null);
    const rule = sarif.runs[0]!.tool.driver.rules[0]!;
    expect(rule.help?.markdown).not.toContain("**CVSS:**");
  });

  it("omits CWE line from help when database_specific has no cwe_ids", () => {
    const finding = makeEnrichedFinding();
    finding.vulnerabilities[0]!.database_specific = {};
    const sarif = buildSarifOutput([finding], "package-lock.json", "1.0.0", null);
    const rule = sarif.runs[0]!.tool.driver.rules[0]!;
    expect(rule.help?.markdown).not.toContain("**CWE:**");
  });

  it("omits affected/patched lines when no SEMVER range with a fixed event exists", () => {
    const finding = makeEnrichedFinding();
    finding.vulnerabilities[0]!.affected = [];
    const sarif = buildSarifOutput([finding], "package-lock.json", "1.0.0", null);
    const rule = sarif.runs[0]!.tool.driver.rules[0]!;
    expect(rule.help?.markdown).not.toContain("**Affected versions:**");
    expect(rule.help?.markdown).not.toContain("**Patched version:**");
  });
});

describe("buildSarifOutput: SARIF 2.1.0 result fields", () => {
  let sarif: ReturnType<typeof buildSarifOutput>;

  beforeAll(() => {
    sarif = buildSarifOutput([makeEnrichedFinding()], "package-lock.json", "1.0.0", null);
  });

  it("result has kind: open", () => {
    const result = sarif.runs[0]!.results[0]!;
    expect((result as any).kind).toBe("open");
  });

  it("result has ruleIndex matching its position in driver.rules", () => {
    const result = sarif.runs[0]!.results[0]! as any;
    const rules = sarif.runs[0]!.tool.driver.rules;
    expect(typeof result.ruleIndex).toBe("number");
    expect(rules[result.ruleIndex]).toBeDefined();
    expect(rules[result.ruleIndex]!.id).toBe(result.ruleId);
  });

  it("result has partialFingerprints.primaryLocationLineHash as a non-empty hex string", () => {
    const result = sarif.runs[0]!.results[0]! as any;
    const hash = result.partialFingerprints?.primaryLocationLineHash;
    expect(typeof hash).toBe("string");
    expect(hash.length).toBeGreaterThan(0);
    expect(/^[0-9a-f]+$/.test(hash)).toBe(true);
  });

  it("primaryLocationLineHash is stable for the same ruleId+pkg across calls", () => {
    const sarif2 = buildSarifOutput([makeEnrichedFinding()], "package-lock.json", "1.0.0", null);
    const h1 = (sarif.runs[0]!.results[0]! as any).partialFingerprints.primaryLocationLineHash;
    const h2 = (sarif2.runs[0]!.results[0]! as any).partialFingerprints.primaryLocationLineHash;
    expect(h1).toBe(h2);
  });

  it("primaryLocationLineHash differs for different ruleId+pkg combinations", () => {
    const sarif2 = buildSarifOutput(
      [makeEnrichedFinding({ pkg: { name: "other-pkg", version: "1.0.0", ecosystem: "npm", paths: [] } })],
      "package-lock.json", "1.0.0", null,
    );
    const h1 = (sarif.runs[0]!.results[0]! as any).partialFingerprints.primaryLocationLineHash;
    const h2 = (sarif2.runs[0]!.results[0]! as any).partialFingerprints.primaryLocationLineHash;
    expect(h1).not.toBe(h2);
  });

  it("$schema points to the stable OASIS errata URL", () => {
    expect(sarif.$schema).toBe(
      "https://docs.oasis-open.org/sarif/sarif/v2.1.0/errata01/os/schemas/sarif-schema-2.1.0.json"
    );
  });
});

function planWithCooldownTarget(): SuggestedFixCommandPlan {
  return {
    packageManager: "npm",
    sourceLabel: "package-lock.json",
    command: null,
    sections: [],
    targets: [
      {
        package: "undici",
        targetVersion: "6.27.0",
        kind: "direct",
        urgent: false,
        severity: "high",
        adjusted: false,
        reason: "upgrade undici to 6.27.0",
        fixVersionPublishedAt: "2026-07-20T00:00:00.000Z",
        cooldownWarning: {
          publishedAt: "2026-07-20T00:00:00.000Z",
          windowLabel: "365 day",
          sourceFile: ".npmrc",
        },
      },
    ],
    skipped: [],
    coveredFindingCount: 1,
    totalFindingCount: 1,
  };
}

describe("buildSarifOutput - cooldown warning", () => {
  it("surfaces a cooldown warning on the matching CVE result (message text + property)", () => {
    const finding = makeMinimalFinding();
    const sarif = buildSarifOutput([finding], "package-lock.json", "1.0.0", planWithCooldownTarget());
    const result = sarif.runs[0]!.results.find(r => r.ruleId === "CVE-2026-12151") as any;
    expect(result).toBeDefined();
    expect(result.message.text.toLowerCase()).toContain("cooldown");
    expect(result.properties?.cooldownWarning).toMatchObject({
      publishedAt: "2026-07-20T00:00:00.000Z",
      windowLabel: "365 day",
      sourceFile: ".npmrc",
    });
  });

  it("adds no cooldown info when there is no plan or no cooldown warning", () => {
    const finding = makeMinimalFinding();
    const sarif = buildSarifOutput([finding], "package-lock.json", "1.0.0", null);
    const result = sarif.runs[0]!.results.find(r => r.ruleId === "CVE-2026-12151") as any;
    expect(result.message.text.toLowerCase()).not.toContain("cooldown");
    expect(result.properties?.cooldownWarning).toBeUndefined();
  });
});

describe("buildSarifOutput — maintenance findings", () => {
  const maintenanceFinding: MaintenanceFinding = {
    ruleId: "DM001",
    severity: "high",
    package: { name: "react", version: "17.0.0" },
    message: "Constrains react-dom below fix requiring major upgrade",
  };

  it("registers DM001 once in an extension component", () => {
    const sarif = buildSarifOutput(
      [makeEnrichedFinding()],
      "package-lock.json",
      "1.0.0",
      null,
      [],
      [maintenanceFinding],
    );

    const run = sarif.runs[0]!;
    const extensions = run.tool.extensions as Array<{ name: string; rules: Array<{ id: string }> }>;
    const maintenanceIndex = extensions.findIndex(component => component.name === "cve-lite-cli-maintenance");
    const dmRule = extensions[maintenanceIndex]!.rules.find(rule => rule.id === "DM001");
    const dmResult = (sarif.runs[0]!.results as any[]).find(result => result.ruleId === "DM001");

    expect(run.tool.driver.rules.find(rule => rule.id === "DM001")).toBeUndefined();
    expect(maintenanceIndex).toBe(0);
    expect(dmRule).toBeDefined();
    expect(dmResult).toBeDefined();
    expect(dmResult!.ruleIndex).toBe(0);
    expect(dmResult!.rule).toEqual({ id: "DM001", toolComponent: { index: maintenanceIndex } });
  });

  it("keeps override and maintenance extension references aligned when both are present", () => {
    const overrideFinding: OverrideFinding = {
      ruleId: "OA001",
      severity: "high",
      package: { name: "postcss" },
      location: { file: "package.json", jsonPath: "/overrides/postcss" },
      message: "Override target not in resolved tree",
    };

    const sarif = buildSarifOutput(
      [makeEnrichedFinding()],
      "package-lock.json",
      "1.0.0",
      null,
      [overrideFinding],
      [maintenanceFinding],
    );

    const run = sarif.runs[0]!;
    const extensions = run.tool.extensions as Array<{ name: string }>;
    const overrideResult = (run.results as any[]).find(result => result.ruleId === "OA001");
    const maintenanceResult = (run.results as any[]).find(result => result.ruleId === "DM001");

    expect(extensions.map(component => component.name)).toEqual([
      "cve-lite-cli-overrides",
      "cve-lite-cli-maintenance",
    ]);
    expect(overrideResult.rule).toEqual({ id: "OA001", toolComponent: { index: 0 } });
    expect(maintenanceResult.rule).toEqual({ id: "DM001", toolComponent: { index: 1 } });
  });
});

// The terminal and HTML render the advisory-vs-recommended gap and the validation
// counts as columns. SARIF consumers get the same data through the 2.1.0 property
// bag, which unknown consumers ignore safely.
describe("buildSarifOutput - fix metadata property bag", () => {
  it("carries the advisory hint, the recommended version, the publish date and the counts", () => {
    const finding = makeMinimalFinding({
      firstFixedVersion: "0.21.2",
      validatedFirstFixedVersion: "0.33.0",
      fixVersionPublishedAt: "2026-06-14T18:07:21.271Z",
      validatedTargetScannedVersions: 23,
      validatedTargetKnownVulnerableVersions: 22,
    });

    const sarif = buildSarifOutput([finding], "package-lock.json", "1.0.0", null);
    const props = sarif.runs[0]!.results[0]!.properties;

    expect(props?.advisoryFixVersion).toBe("0.21.2");
    expect(props?.recommendedFixVersion).toBe("0.33.0");
    expect(props?.fixVersionPublishedAt).toBe("2026-06-14T18:07:21.271Z");
    expect(props?.versionsScanned).toBe(23);
    expect(props?.versionsStillVulnerable).toBe(22);
  });

  it("names the refreshed child on a parent-update target rather than treating the child's version as the parent's", () => {
    const finding = makeMinimalFinding({
      pkg: { name: "form-data", version: "4.0.5", ecosystem: "npm", paths: [["project", "axios", "form-data"]] },
      firstFixedVersion: "4.0.6",
      validatedFirstFixedVersion: "4.0.6",
      relationship: "transitive",
      recommendedNpmTransitiveRemediation: {
        kind: "update-parent-within-range",
        package: "axios",
        currentVersion: "1.16.1",
        targetChildVersion: "4.0.6",
        viaPath: ["project", "axios", "form-data"],
        reason: "axios@1.16.1 already allows form-data@4.0.6 within the current dependency range",
      },
    });
    const plan: SuggestedFixCommandPlan = {
      packageManager: "npm",
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
          kind: "parent-update",
          urgent: true,
          severity: "high",
          adjusted: false,
          reason: "axios@1.16.1 already allows form-data@4.0.6 within the current dependency range",
          command: "npm update axios",
        },
      ],
      skipped: [],
      coveredFindingCount: 1,
      totalFindingCount: 1,
    };

    const sarif = buildSarifOutput([finding], "package-lock.json", "1.0.0", plan);
    const props = sarif.runs[0]!.results[0]!.properties;

    expect(props?.recommendedFixVersion).toBe("4.0.6");
    expect(props?.childPackage).toBe("form-data");
    expect(props?.childTargetVersion).toBe("4.0.6");
  });

  it("omits the property bag entirely when there is nothing to report", () => {
    const finding = makeMinimalFinding({
      firstFixedVersion: undefined,
      validatedFirstFixedVersion: undefined,
    });

    const sarif = buildSarifOutput([finding], "package-lock.json", "1.0.0", null);

    expect(sarif.runs[0]!.results[0]!.properties).toBeUndefined();
  });
});
