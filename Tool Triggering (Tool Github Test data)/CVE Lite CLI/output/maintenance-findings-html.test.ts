import { renderMaintenanceFindingsHtml } from "../../src/output/maintenance-findings-html.js";
import type { MaintenanceFinding } from "../../src/maintenance/types.js";

const f = (over: Partial<MaintenanceFinding> = {}): MaintenanceFinding => ({
  ruleId: "DM001",
  severity: "high",
  package: { name: "gray-matter", version: "4.0.3" },
  drag: [{
    constrainedPackage: "js-yaml",
    installedVersion: "3.14.1",
    fixVersion: "4.0.0",
    parentTargetVersion: "5.0.0",
    cveId: "CVE-2023-1234",
  }],
  message: "Constrains js-yaml - blocks CVE fix requiring major upgrade",
  ...over,
});

describe("renderMaintenanceFindingsHtml", () => {
  it("returns a section header even with no findings", () => {
    const html = renderMaintenanceFindingsHtml([]);
    expect(html).toMatch(/Maintenance risk/i);
    expect(html).toMatch(/no maintenance risk findings/i);
  });

  it("renders nothing (empty string) when maintenance checking was not requested", () => {
    // undefined = --check-maintenance was never passed; the report must not show a
    // Maintenance risk panel at all. An empty array (above) means it ran clean.
    expect(renderMaintenanceFindingsHtml(undefined)).toBe("");
  });

  it("renders rows for each finding", () => {
    const html = renderMaintenanceFindingsHtml([f(), f({ package: { name: "left-pad", version: "1.3.0" } })]);
    expect(html).toMatch(/gray-matter/);
    expect(html).toMatch(/left-pad/);
  });

  it("escapes HTML in the deprecated message", () => {
    const html = renderMaintenanceFindingsHtml([
      f({ drag: undefined, deprecated: { message: "<script>alert(1)</script>" } }),
    ]);
    expect(html).not.toContain("<script>");
    expect(html).not.toContain("</script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("escapes upper-case and mixed-case tags too", () => {
    const html = renderMaintenanceFindingsHtml([
      f({ drag: undefined, deprecated: { message: "<SCRIPT>X</ScRiPt>" } }),
    ]);
    expect(html).not.toContain("<SCRIPT>");
    expect(html).not.toContain("</ScRiPt>");
    expect(html).toContain("&lt;SCRIPT&gt;");
  });

  it("renders drag detail with constrained package, fix version and parent target version", () => {
    const html = renderMaintenanceFindingsHtml([f()]);
    expect(html).toContain("js-yaml@3.14.1");
    expect(html).toContain("4.0.0");
    expect(html).toContain("5.0.0");
  });

  it("renders deprecated message when present", () => {
    const html = renderMaintenanceFindingsHtml([
      f({ deprecated: { message: "Use gray-matter v5 instead" } }),
    ]);
    expect(html).toContain("Use gray-matter v5 instead");
  });

  it("renders a staleness line with year and age when present", () => {
    const html = renderMaintenanceFindingsHtml([
      f({ staleness: { lastPublish: "2019-03-01T00:00:00.000Z", ageYears: 7 } }),
    ]);
    expect(html).toContain("Last release: 2019 (7 years ago)");
  });

  it("renders the staleness year in UTC, not local time (midnight-boundary regression)", () => {
    // 2019-01-01T00:00:00Z falls on 2018-12-31 in any UTC-negative local timezone
    // (e.g. US Eastern). getFullYear() would render 2018; the display must use
    // getUTCFullYear() so the year matches the ISO date's actual (UTC) year.
    const html = renderMaintenanceFindingsHtml([
      f({ staleness: { lastPublish: "2019-01-01T00:00:00Z", ageYears: 7 } }),
    ]);
    expect(html).toContain("Last release: 2019 (7 years ago)");
  });

  it("does not render a staleness line when absent", () => {
    const html = renderMaintenanceFindingsHtml([f()]);
    expect(html).not.toContain("Last release:");
  });

  it("row carries a severity class matching the finding, and a severity badge", () => {
    const html = renderMaintenanceFindingsHtml([f({ severity: "high" })]);
    expect(html).toContain('class="finding high"');
    expect(html).toContain('<span class="sev-badge high">high</span>');
  });

  it("sorts findings by severity, most severe first", () => {
    const html = renderMaintenanceFindingsHtml([
      f({ severity: "medium", package: { name: "b-package", version: "1.0.0" } }),
      f({ severity: "high", package: { name: "a-package", version: "1.0.0" } }),
    ]);
    const highIdx = html.indexOf("a-package");
    const mediumIdx = html.indexOf("b-package");
    expect(highIdx).toBeLessThan(mediumIdx);
  });

  it("renders the rule ID as a chip and the package name/version split across two lines, matching the Findings table style", () => {
    const html = renderMaintenanceFindingsHtml([f()]);
    expect(html).toContain('<span class="dep-node">DM001</span>');
    expect(html).toContain('<div class="pkg-name">gray-matter</div><div class="pkg-version">4.0.3</div>');
  });

  it("does not wrap the table in a bordered panel container - table sits flush, matching the Findings table", () => {
    const html = renderMaintenanceFindingsHtml([f()]);
    expect(html).not.toContain("severity-group");
  });
});
