import { serializeLicenseFindings } from "../../src/output/license-findings-json.js";
import type { LicenseFinding } from "../../src/licenses/types.js";

const finding: LicenseFinding = {
  ruleId: "LC001",
  severity: "high",
  package: { name: "gpl-lib", version: "1.0.0" },
  license: "GPL-3.0",
  relationship: "direct",
  message: "Copyleft license: GPL-3.0",
};

describe("serializeLicenseFindings", () => {
  it("returns an array of serialized findings", () => {
    const result = serializeLicenseFindings([finding]);
    expect(result).toHaveLength(1);
  });

  it("includes ruleId, severity, package, license, relationship, message", () => {
    const [r] = serializeLicenseFindings([finding]);
    expect(r).toMatchObject({
      ruleId: "LC001",
      severity: "high",
      package: { name: "gpl-lib", version: "1.0.0" },
      license: "GPL-3.0",
      relationship: "direct",
      message: "Copyleft license: GPL-3.0",
    });
  });

  it("serializes null license as null", () => {
    const lc002: LicenseFinding = { ...finding, ruleId: "LC002", license: null, severity: "medium" };
    const [r] = serializeLicenseFindings([lc002]);
    expect(r!.license).toBeNull();
  });

  it("returns empty array for no findings", () => {
    expect(serializeLicenseFindings([])).toEqual([]);
  });
});
