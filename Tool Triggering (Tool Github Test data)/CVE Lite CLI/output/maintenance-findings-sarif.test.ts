import { buildMaintenanceSarifComponent, buildMaintenanceSarifResults } from "../../src/output/maintenance-findings-sarif.js";
import type { MaintenanceFinding } from "../../src/maintenance/types.js";

describe("maintenance-findings-sarif", () => {
  const finding: MaintenanceFinding = {
    ruleId: "DM001",
    severity: "high",
    package: { name: "react", version: "17.0.0" },
    message: "Constrains react-dom below fix requiring major upgrade",
  };

  it("buildMaintenanceSarifComponent includes DM001 rule metadata", () => {
    const c = buildMaintenanceSarifComponent() as { rules: { id: string }[] };
    const ruleIds = c.rules.map(r => r.id);
    expect(ruleIds).toContain("DM001");
  });

  it("links DM001 to the rendered docs page rather than source", () => {
    const c = buildMaintenanceSarifComponent() as { rules: { id: string; helpUri: string }[] };
    const dm001 = c.rules.find(r => r.id === "DM001");
    expect(dm001?.helpUri).toBe("https://owasp.org/cve-lite-cli/docs/maintenance-risk/dm001");
  });

  it("buildMaintenanceSarifResults emits one result per finding with ruleId set", () => {
    const results = buildMaintenanceSarifResults([finding], "package-lock.json");
    expect(results).toHaveLength(1);
    expect(results[0].ruleId).toBe("DM001");
    expect(results[0].rule).toEqual({ id: "DM001", toolComponent: { index: 0 } });
    expect(results[0].level).toMatch(/error|warning|note/);
    expect(results[0].properties?.package).toBe("react");
  });

  it("references the configured extension index when other components precede maintenance", () => {
    const [result] = buildMaintenanceSarifResults([finding], "package-lock.json", 1);
    expect(result.rule).toEqual({ id: "DM001", toolComponent: { index: 1 } });
  });

  it("buildMaintenanceSarifResults uses stable, non-empty fingerprints", () => {
    const [result] = buildMaintenanceSarifResults([finding], "package-lock.json");
    const hash = result.partialFingerprints.primaryLocationLineHash;
    expect(typeof hash).toBe("string");
    expect(hash.length).toBeGreaterThan(0);
    expect(/^[0-9a-f]+$/.test(hash)).toBe(true);
  });

  it("adds lastPublish and ageYears to properties when staleness present", () => {
    const stale: MaintenanceFinding = {
      ...finding,
      staleness: { lastPublish: "2019-01-01T00:00:00.000Z", ageYears: 7 },
    };
    const [result] = buildMaintenanceSarifResults([stale], "package-lock.json");
    expect(result.properties?.lastPublish).toBe("2019-01-01T00:00:00.000Z");
    expect(result.properties?.ageYears).toBe(7);
  });

  it("omits lastPublish and ageYears from properties when staleness absent", () => {
    const [result] = buildMaintenanceSarifResults([finding], "package-lock.json");
    expect(result.properties).not.toHaveProperty("lastPublish");
    expect(result.properties).not.toHaveProperty("ageYears");
  });

  it("buildMaintenanceSarifResults throws for unknown rule ids", () => {
    const bad = { ...finding, ruleId: "DM999" as MaintenanceFinding["ruleId"] };
    expect(() => buildMaintenanceSarifResults([bad], "package-lock.json")).toThrow(/unknown ruleId/);
  });
});
