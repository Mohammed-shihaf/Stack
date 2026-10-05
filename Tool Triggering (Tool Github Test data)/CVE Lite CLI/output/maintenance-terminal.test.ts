import { renderMaintenanceFindings } from "../../src/output/maintenance-terminal.js";
import type { MaintenanceFinding } from "../../src/maintenance/types.js";

function makeFinding(overrides: Partial<MaintenanceFinding> = {}): MaintenanceFinding {
  return {
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
    ...overrides,
  };
}

describe("renderMaintenanceFindings", () => {
  it("returns no-findings message for empty array", () => {
    const output = renderMaintenanceFindings([]);
    expect(output).toContain("✔ No maintenance risk findings.");
  });

  it("renders section header", () => {
    const output = renderMaintenanceFindings([makeFinding()]);
    expect(output).toContain("Maintenance Risk");
  });

  it("renders severity group label", () => {
    const output = renderMaintenanceFindings([makeFinding()]);
    expect(output).toMatch(/HIGH/);
  });

  it("renders package name and version in package column", () => {
    const output = renderMaintenanceFindings([makeFinding()]);
    expect(output).toContain("gray-matter@4.0.3");
  });

  it("renders drag detail with constrained package, installed version, fix version and parent upgrade target", () => {
    const output = renderMaintenanceFindings([makeFinding()]);
    expect(output).toContain("js-yaml@3.14.1");
    expect(output).toContain("4.0.0");
    expect(output).toContain("5.0.0");
  });

  it("renders a bare 'Deprecated' flag for a generic message, dropping the URL", () => {
    const finding = makeFinding({
      deprecated: { message: "request has been deprecated, see https://github.com/request/request/issues/3142" },
    });
    const output = renderMaintenanceFindings([finding]);
    expect(output).toContain("Deprecated");
    // a generic "<pkg> has been deprecated" + URL truncates to a useless
    // "https://gi…" in the cell; the full message stays in HTML/JSON/SARIF
    expect(output).not.toContain("has been deprecated");
    expect(output).not.toContain("https://");
  });

  it("keeps a 'use X instead' replacement hint in the Deprecated flag, still dropping the URL", () => {
    const finding = makeFinding({
      deprecated: { message: "Use gray-matter v5 instead, see https://example.com/x" },
    });
    const output = renderMaintenanceFindings([finding]);
    expect(output).toContain("Deprecated: Use gray-matter v5 instead");
    expect(output).not.toContain("https://");
  });

  it("renders a staleness line with year and age when present", () => {
    const finding = makeFinding({
      drag: undefined,
      staleness: { lastPublish: "2019-03-01T00:00:00.000Z", ageYears: 7 },
      message: "Package has not published a release in over 5 years",
    });
    const output = renderMaintenanceFindings([finding]);
    expect(output).toContain("Last release: 2019 (7 years ago)");
  });

  it("renders the staleness year in UTC, not local time (midnight-boundary regression)", () => {
    // 2019-01-01T00:00:00Z falls on 2018-12-31 in any UTC-negative local timezone
    // (e.g. US Eastern). getFullYear() would render 2018; the display must use
    // getUTCFullYear() so the year matches the ISO date's actual (UTC) year.
    const finding = makeFinding({
      drag: undefined,
      staleness: { lastPublish: "2019-01-01T00:00:00Z", ageYears: 7 },
      message: "Package has not published a release in over 5 years",
    });
    const output = renderMaintenanceFindings([finding]);
    expect(output).toContain("Last release: 2019 (7 years ago)");
  });

  it("does not render a staleness line when absent", () => {
    const output = renderMaintenanceFindings([makeFinding()]);
    expect(output).not.toContain("Last release:");
  });

  it("renders medium severity group for deprecated-only findings", () => {
    const deprecatedOnly = makeFinding({
      severity: "medium",
      drag: undefined,
      deprecated: { message: "Package deprecated" },
      message: "Package is deprecated on npm",
    });
    const output = renderMaintenanceFindings([deprecatedOnly]);
    expect(output).toMatch(/MEDIUM/);
  });

  it("renders table borders", () => {
    const output = renderMaintenanceFindings([makeFinding()]);
    expect(output).toContain("┌");
    expect(output).toContain("┐");
    expect(output).toContain("└");
    expect(output).toContain("┘");
  });

  it("renders DM001 rule id in rule column", () => {
    const output = renderMaintenanceFindings([makeFinding()]);
    expect(output).toContain("DM001");
  });

  it("renders multiple drag signals as separate detail lines", () => {
    const finding = makeFinding({
      drag: [
        { constrainedPackage: "js-yaml", installedVersion: "3.14.1", fixVersion: "4.0.0", parentTargetVersion: "5.0.0", cveId: "CVE-2023-1234" },
        { constrainedPackage: "another-dep", installedVersion: "1.0.0", fixVersion: "1.5.0", parentTargetVersion: "2.0.0", cveId: "CVE-2023-5678" },
      ],
    });
    const output = renderMaintenanceFindings([finding]);
    expect(output).toContain("js-yaml@3.14.1");
    expect(output).toContain("another-dep@1.0.0");
  });

  it("wraps a long detail line onto continuation rows instead of truncating the actionable tail", () => {
    const finding = makeFinding({
      drag: [{
        constrainedPackage: "some-transitive-package-with-a-longish-name",
        installedVersion: "5.0.4",
        fixVersion: "1.1.13",
        parentTargetVersion: "9.9.9",
        cveId: "GHSA-x",
      }],
    });
    const output = renderMaintenanceFindings([finding]);
    // the drag line exceeds the details column; the upgrade target was being
    // chopped to "upgrade to 1…" - it must now survive in full via wrapping,
    // with no ellipsis in the details
    expect(output).toContain("9.9.9");
    expect(output).not.toContain("…");
  });

  it("renders a bare header with no separator lines in verbose mode", () => {
    const output = renderMaintenanceFindings([makeFinding()], { verbose: true });
    const lines = output.split("\n");
    expect(lines[0]).not.toContain("─");
    expect(lines[0]).toContain("Maintenance Risk");
  });

  it("wraps the header in separator lines in compact (non-verbose) mode", () => {
    const output = renderMaintenanceFindings([makeFinding()], { verbose: false });
    const lines = output.split("\n");
    expect(lines[0]).toMatch(/^─+$/);
    expect(lines[1]).toContain("Maintenance Risk");
    expect(lines[2]).toMatch(/^─+$/);
  });

  it("defaults to compact (separator-wrapped) header when no options are passed", () => {
    const output = renderMaintenanceFindings([makeFinding()]);
    const lines = output.split("\n");
    expect(lines[0]).toMatch(/^─+$/);
  });

  it("ends with a colored issue-count summary and a closing separator", () => {
    const output = renderMaintenanceFindings([makeFinding()]);
    const lines = output.split("\n").filter(l => l.length > 0 || true);
    expect(output).toContain("1 maintenance risk issue found.");
    const lastNonEmpty = [...lines].reverse().find(l => l.trim() !== "");
    expect(lastNonEmpty).toMatch(/^─+$/);
  });

  it("pluralizes the summary line for multiple findings", () => {
    const second = makeFinding({ package: { name: "left-pad", version: "1.3.0" } });
    const output = renderMaintenanceFindings([makeFinding(), second]);
    expect(output).toContain("2 maintenance risk issues found.");
  });

  it("ends the returned string on real content, not a trailing newline from a bare blank element", () => {
    const output = renderMaintenanceFindings([makeFinding()]);
    expect(output.endsWith("\n")).toBe(false);
    expect(output.endsWith("─")).toBe(true);
  });
});
