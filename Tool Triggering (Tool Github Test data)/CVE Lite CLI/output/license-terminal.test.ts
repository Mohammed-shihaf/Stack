import { renderLicenseFindings } from "../../src/output/license-terminal.js";
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
  package: { name: "mystery", version: "0.1.0" },
  license: null,
  relationship: "transitive",
  message: "No license declared - legally ambiguous",
};

describe("renderLicenseFindings", () => {
  it("includes the header line", () => {
    const out = renderLicenseFindings([lc001], { limitedToDirectOnly: false });
    expect(out).toContain("License Issues");
  });

  it("includes the package name and version", () => {
    const out = renderLicenseFindings([lc001], { limitedToDirectOnly: false });
    expect(out).toContain("gpl-lib@1.0.0");
  });

  it("includes the license identifier in the message", () => {
    const out = renderLicenseFindings([lc001], { limitedToDirectOnly: false });
    expect(out).toContain("GPL-3.0");
  });

  it("includes the rule ID", () => {
    const out = renderLicenseFindings([lc002], { limitedToDirectOnly: false });
    expect(out).toContain("LC002");
  });

  it("marks informational in the footer", () => {
    const out = renderLicenseFindings([lc001], { limitedToDirectOnly: false });
    expect(out).toContain("informational");
  });

  it("adds direct-only note when limitedToDirectOnly is true", () => {
    const out = renderLicenseFindings([lc001], { limitedToDirectOnly: true });
    expect(out).toContain("direct dependencies only");
  });

  it("does not add direct-only note for npm full-tree scans", () => {
    const out = renderLicenseFindings([lc001], { limitedToDirectOnly: false });
    expect(out).not.toContain("direct dependencies only");
  });

  it("renders empty findings gracefully", () => {
    const out = renderLicenseFindings([], { limitedToDirectOnly: false });
    expect(out).toContain("No license issues");
  });

  it("renders the relationship for each finding", () => {
    const out = renderLicenseFindings([lc001], { limitedToDirectOnly: false });
    expect(out).toContain("direct");
  });

  it("renders the message for each finding", () => {
    const out = renderLicenseFindings([lc001], { limitedToDirectOnly: false });
    expect(out).toContain("Copyleft license: GPL-3.0");
  });

  it("counts high and medium findings in the footer", () => {
    const out = renderLicenseFindings([lc001, lc002], { limitedToDirectOnly: false });
    expect(out).toContain("1 high");
    expect(out).toContain("1 medium");
  });

  it("ends with the informational footer line when findings are present", () => {
    const out = renderLicenseFindings([lc001], { limitedToDirectOnly: false });
    const lines = out.split("\n").filter(l => l.trim().length > 0);
    const last = lines[lines.length - 1];
    expect(last).toContain("informational");
  });

  it("does not render a closing separator for empty findings", () => {
    const out = renderLicenseFindings([], { limitedToDirectOnly: false });
    // The header has an opening divider but no closing divider should appear after the checkmark
    const lines = out.split("\n");
    const lastNonEmpty = [...lines].reverse().find((l) => l.trim().length > 0) ?? "";
    expect(lastNonEmpty).not.toMatch(/^─+$/);
  });

  it("renders severity label for a high finding", () => {
    const out = renderLicenseFindings([lc001], { limitedToDirectOnly: false });
    expect(out).toMatch(/HIGH/);
  });

  it("renders severity label for a medium finding", () => {
    const out = renderLicenseFindings([lc002], { limitedToDirectOnly: false });
    expect(out).toMatch(/MEDIUM/);
  });
});
