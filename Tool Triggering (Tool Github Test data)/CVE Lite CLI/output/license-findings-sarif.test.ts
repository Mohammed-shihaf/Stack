import {
  buildLicenseSarifComponent,
  buildLicenseSarifResults,
} from "../../src/output/license-findings-sarif.js";
import type { LicenseFinding } from "../../src/licenses/types.js";

const lc001: LicenseFinding = {
  ruleId: "LC001",
  severity: "high",
  package: { name: "gpl-lib", version: "1.0.0" },
  license: "GPL-3.0",
  relationship: "direct",
  message: "Copyleft license: GPL-3.0",
};

const lc002: LicenseFinding = {
  ruleId: "LC002",
  severity: "medium",
  package: { name: "mystery-pkg", version: "2.3.0" },
  license: null,
  relationship: "transitive",
  message: "No license declaration found",
};

describe("buildLicenseSarifComponent", () => {
  it("includes LC001 and LC002 rules", () => {
    const comp = buildLicenseSarifComponent() as { rules: { id: string }[] };
    const ids = comp.rules.map(r => r.id);
    expect(ids).toContain("LC001");
    expect(ids).toContain("LC002");
  });

  it("includes a helpUri for each rule", () => {
    const comp = buildLicenseSarifComponent() as { rules: { id: string; helpUri: string }[] };
    for (const rule of comp.rules) {
      expect(rule.helpUri).toMatch(/^https:\/\//);
    }
  });

  it("includes shortDescription text for each rule", () => {
    const comp = buildLicenseSarifComponent() as {
      rules: { id: string; shortDescription: { text: string } }[];
    };
    for (const rule of comp.rules) {
      expect(typeof rule.shortDescription.text).toBe("string");
      expect(rule.shortDescription.text.length).toBeGreaterThan(0);
    }
  });

  it("reports the tool component name as cve-lite-cli-licenses", () => {
    const comp = buildLicenseSarifComponent() as { name: string };
    expect(comp.name).toBe("cve-lite-cli-licenses");
  });
});

describe("buildLicenseSarifResults", () => {
  it("maps an LC001 finding to a SARIF result", () => {
    const results = buildLicenseSarifResults([lc001], "package-lock.json");
    expect(results).toHaveLength(1);
    expect(results[0].ruleId).toBe("LC001");
    expect(results[0].level).toBe("error");
  });

  it("maps an LC002 finding to a SARIF result", () => {
    const results = buildLicenseSarifResults([lc002], "package-lock.json");
    expect(results).toHaveLength(1);
    expect(results[0].ruleId).toBe("LC002");
    expect(results[0].level).toBe("warning");
  });

  it("sets the toolComponent index on the rule reference", () => {
    const results = buildLicenseSarifResults([lc001], "package-lock.json", 2);
    expect(results[0].rule.toolComponent.index).toBe(2);
  });

  it("defaults toolComponent index to 0 when not specified", () => {
    const results = buildLicenseSarifResults([lc001], "package-lock.json");
    expect(results[0].rule).toEqual({ id: "LC001", toolComponent: { index: 0 } });
  });

  it("includes a partialFingerprint", () => {
    const results = buildLicenseSarifResults([lc001], "package-lock.json");
    expect(results[0].partialFingerprints.primaryLocationLineHash).toBeTruthy();
  });

  it("fingerprints are stable hex strings", () => {
    const [result] = buildLicenseSarifResults([lc001], "package-lock.json");
    const hash = result.partialFingerprints.primaryLocationLineHash;
    expect(typeof hash).toBe("string");
    expect(hash.length).toBeGreaterThan(0);
    expect(/^[0-9a-f]+$/.test(hash)).toBe(true);
  });

  it("fingerprints differ for different package and version combinations", () => {
    const [r1] = buildLicenseSarifResults([lc001], "package-lock.json");
    const [r2] = buildLicenseSarifResults([lc002], "package-lock.json");
    expect(r1.partialFingerprints.primaryLocationLineHash).not.toBe(
      r2.partialFingerprints.primaryLocationLineHash,
    );
  });

  it("sets lockfileUri on the artifact location", () => {
    const [result] = buildLicenseSarifResults([lc001], "subdir/package-lock.json");
    expect(result.locations[0].physicalLocation.artifactLocation.uri).toBe(
      "subdir/package-lock.json",
    );
    expect(result.locations[0].physicalLocation.artifactLocation.uriBaseId).toBe("%SRCROOT%");
  });

  it("includes package, version, license, and severity in properties", () => {
    const [result] = buildLicenseSarifResults([lc001], "package-lock.json");
    expect(result.properties?.package).toBe("gpl-lib");
    expect(result.properties?.version).toBe("1.0.0");
    expect(result.properties?.license).toBe("GPL-3.0");
    expect(result.properties?.severity).toBe("high");
  });

  it("includes null license in properties for LC002", () => {
    const [result] = buildLicenseSarifResults([lc002], "package-lock.json");
    expect(result.properties?.license).toBeNull();
  });

  it("sets kind to open", () => {
    const [result] = buildLicenseSarifResults([lc001], "package-lock.json");
    expect(result.kind).toBe("open");
  });

  it("returns empty array for empty findings", () => {
    const results = buildLicenseSarifResults([], "package-lock.json");
    expect(results).toHaveLength(0);
  });

  it("throws for an unknown ruleId", () => {
    const bad = { ...lc001, ruleId: "LC999" as LicenseFinding["ruleId"] };
    expect(() => buildLicenseSarifResults([bad], "package-lock.json")).toThrow(/unknown ruleId/);
  });

  it("processes multiple findings in order", () => {
    const results = buildLicenseSarifResults([lc001, lc002], "package-lock.json");
    expect(results).toHaveLength(2);
    expect(results[0].ruleId).toBe("LC001");
    expect(results[1].ruleId).toBe("LC002");
  });
});
