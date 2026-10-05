import type { LicenseFinding } from "../../src/licenses/types.js";

describe("LicenseFinding type", () => {
  it("accepts a valid LC001 finding", () => {
    const f: LicenseFinding = {
      ruleId: "LC001",
      severity: "high",
      package: { name: "left-pad", version: "1.3.0" },
      license: "GPL-3.0",
      relationship: "transitive",
      message: "Copyleft license: GPL-3.0",
    };
    expect(f.ruleId).toBe("LC001");
  });

  it("accepts a valid LC002 finding with null license", () => {
    const f: LicenseFinding = {
      ruleId: "LC002",
      severity: "medium",
      package: { name: "mystery", version: "0.1.0" },
      license: null,
      relationship: "direct",
      message: "No license declared",
    };
    expect(f.license).toBeNull();
  });
});
