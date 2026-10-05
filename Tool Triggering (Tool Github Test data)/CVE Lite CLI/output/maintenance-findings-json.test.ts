import { maintenanceFindingsToJson } from "../../src/output/maintenance-findings-json.js";
import type { MaintenanceFinding } from "../../src/maintenance/types.js";

describe("maintenanceFindingsToJson", () => {
  it("returns the findings as a plain array under maintenanceFindings key", () => {
    const f: MaintenanceFinding = {
      ruleId: "DM001",
      severity: "high",
      package: { name: "gray-matter", version: "4.0.3" },
      drag: [{ constrainedPackage: "js-yaml", installedVersion: "3.14.1", fixVersion: "4.2.0", cveId: "GHSA-x" }],
      message: "x",
    };
    const json = maintenanceFindingsToJson([f]);
    expect(json).toEqual({ maintenanceFindings: [f] });
  });

  it("returns empty array on no findings", () => {
    expect(maintenanceFindingsToJson([])).toEqual({ maintenanceFindings: [] });
  });

  it("includes staleness on the finding when present", () => {
    const f: MaintenanceFinding = {
      ruleId: "DM001",
      severity: "high",
      package: { name: "gray-matter", version: "4.0.3" },
      staleness: { lastPublish: "2019-01-01T00:00:00.000Z", ageYears: 7 },
      message: "x",
    };
    const json = maintenanceFindingsToJson([f]);
    expect(json.maintenanceFindings[0].staleness).toEqual({
      lastPublish: "2019-01-01T00:00:00.000Z",
      ageYears: 7,
    });
  });

  it("omits staleness when absent", () => {
    const f: MaintenanceFinding = {
      ruleId: "DM001",
      severity: "high",
      package: { name: "gray-matter", version: "4.0.3" },
      message: "x",
    };
    const json = maintenanceFindingsToJson([f]);
    expect(json.maintenanceFindings[0]).not.toHaveProperty("staleness");
  });
});
