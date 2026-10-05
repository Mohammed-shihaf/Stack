import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "@jest/globals";
import { serializeHtmlFinding } from "../src/output/html-reporter.js";
import {
  buildMultiFolderReportData,
  writeMultiFolderHtmlReport,
} from "../src/output/multi-folder-html-reporter.js";
import type { SerializedFinding } from "../src/output/html-reporter.js";
import type { MultiFolderScanResult } from "../src/scan/multi-folder-scan.js";
import type { Finding, ScanCompleteness } from "../src/types.js";
import type { OverrideFinding } from "../src/overrides/types.js";
import type { MaintenanceFinding } from "../src/maintenance/types.js";

const tempDirs: string[] = [];

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

function makeFinding(name = "lodash"): Finding {
  return {
    pkg: { name, version: "4.17.20", ecosystem: "npm" },
    vulnerabilities: [{ id: "GHSA-xxx", aliases: ["CVE-2021-23337"], summary: "test" }],
    severity: "high",
    cveAliases: ["CVE-2021-23337"],
    dependencyPaths: [["project", name]],
    relationship: "direct",
    firstFixedVersion: "4.17.21",
  };
}

function makeOverride(): OverrideFinding {
  return {
    ruleId: "OA001",
    severity: "high",
    package: { name: "gone" },
    location: { file: "package.json", jsonPath: "/overrides/gone" },
    message: "Override target not in resolved tree",
  };
}

function makeMaintenance(): MaintenanceFinding {
  return {
    ruleId: "DM001",
    severity: "high",
    package: { name: "gray-matter", version: "4.0.3" },
    drag: [],
    message: "maintenance risk",
  };
}

function makeResult(
  subfolder: string,
  overrides: Partial<MultiFolderScanResult> = {},
): MultiFolderScanResult {
  const completeness: ScanCompleteness = overrides.completeness ?? { complete: true, diagnostics: [] };
  return {
    subfolder,
    scanInput: {
      mode: "resolved-lockfile",
      source: "package-lock",
      filePath: `/project/${subfolder}/package-lock.json`,
      packages: [{ name: "lodash", version: "4.17.20", ecosystem: "npm" }],
      notes: [],
      warnings: [],
      skippedDependencies: [],
    },
    sorted: [makeFinding()],
    suggestedFixCommands: null,
    coverage: [],
    minSeverity: "medium",
    tableFindings: [makeFinding()],
    allPackages: [{ name: "lodash", version: "4.17.20", ecosystem: "npm" }],
    completeness,
    overrideFindings: [],
    maintenanceFindings: [],
    suppressedCount: 0,
    ...overrides,
  };
}

describe("multi-folder completeness HTML", () => {
  it("renders the aggregate banner and each folder banner", async () => {
    const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), "cve-lite-multi-html-"));
    tempDirs.push(outputDir);
    const detectionMessage = '<script>alert("x")</script>';
    const remediationMessage = "1 packument fetch failed";

    const { reportPath } = await writeMultiFolderHtmlReport({
      outputDir,
      projectPath: "/project",
      cliVersion: "1.18.1",
      autoOpen: false,
      results: [
        makeResult("api", {
          sorted: [],
          tableFindings: [],
          completeness: {
            complete: false,
            diagnostics: [{
              code: "OSV_DETAIL_TRANSIENT_FAILURE",
              severity: "warning",
              message: detectionMessage,
              impact: "detection",
              count: 1,
            }],
          },
        }),
        makeResult("web", {
          sorted: [],
          tableFindings: [],
          completeness: {
            complete: false,
            diagnostics: [{
              code: "PACKUMENT_FETCH_FAILURE",
              severity: "warning",
              message: remediationMessage,
              impact: "remediation",
              count: 1,
            }],
          },
        }),
      ],
    });

    const html = fs.readFileSync(reportPath, "utf8");
    // Only the global aggregate banner appears; per-folder banners were removed to avoid duplication
    expect(html.match(/<div class="completeness-banner">/g)).toHaveLength(1);
    expect(html.indexOf("Scan data is incomplete")).toBeLessThan(html.indexOf("<details"));

    // Global banner aggregates both detection + remediation impacts into the combined message
    expect(html).toContain("Some vulnerability findings may be incomplete, and some remediation guidance may also be unavailable");
    // Both folders' diagnostic messages appear in the global banner's list
    expect(html).toContain(remediationMessage);

    expect(html).toContain("&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;");
    expect(html).not.toContain('<li class="diag-item warning detection"><script>');
  });
});

function serializeResults(results: MultiFolderScanResult[]): SerializedFinding[][] {
  return results.map(r => r.sorted.map(f => serializeHtmlFinding(f, r.suggestedFixCommands)));
}

describe("buildMultiFolderReportData", () => {
  it("always includes multiFolder findings tagged by subfolder", () => {
    const results = [makeResult("packages/a"), makeResult("packages/b")];
    const data = buildMultiFolderReportData({
      results,
      serializedByFolder: serializeResults(results),
      projectPath: "/project",
      cliVersion: "1.27.0",
    });

    expect(data.multiFolder).toBe(true);
    expect(data.folders).toEqual(["packages/a", "packages/b"]);
    expect(data.findings).toHaveLength(2);
    expect(data.findings[0].subfolder).toBe("packages/a");
    expect(data.overrideFindings).toBeUndefined();
    expect(data.maintenanceFindings).toBeUndefined();
  });

  it("includes overrideFindings only when includeOverrides is set", () => {
    const results = [makeResult("packages/a", { overrideFindings: [makeOverride()] })];
    const data = buildMultiFolderReportData({
      results,
      serializedByFolder: serializeResults(results),
      projectPath: "/project",
      cliVersion: "1.27.0",
      includeOverrides: true,
    });

    expect(data.overrideFindings).toHaveLength(1);
    expect(data.overrideFindings![0].subfolder).toBe("packages/a");
    expect(data.overrideFindings![0].ruleId).toBe("OA001");
  });

  it("includes maintenanceFindings only when includeMaintenance is set", () => {
    const results = [makeResult("packages/a", { maintenanceFindings: [makeMaintenance()] })];
    const data = buildMultiFolderReportData({
      results,
      serializedByFolder: serializeResults(results),
      projectPath: "/project",
      cliVersion: "1.27.0",
      includeMaintenance: true,
    });

    expect(data.maintenanceFindings).toHaveLength(1);
    expect(data.maintenanceFindings![0].subfolder).toBe("packages/a");
    expect(data.maintenanceFindings![0].ruleId).toBe("DM001");
  });
});

describe("writeMultiFolderHtmlReport", () => {
  let outputDir: string;

  beforeEach(() => {
    outputDir = fs.mkdtempSync(path.join(os.tmpdir(), "cve-lite-mf-report-"));
    tempDirs.push(outputDir);
  });

  it("writes both index.html and report.json", async () => {
    await writeMultiFolderHtmlReport({
      outputDir,
      results: [makeResult("packages/a")],
      projectPath: "/project",
      cliVersion: "1.27.0",
      autoOpen: false,
    });

    expect(fs.existsSync(path.join(outputDir, "index.html"))).toBe(true);
    expect(fs.existsSync(path.join(outputDir, "report.json"))).toBe(true);
  });

  it("report.json matches MultiFolderReportData shape", async () => {
    await writeMultiFolderHtmlReport({
      outputDir,
      results: [makeResult("packages/a"), makeResult("packages/b")],
      projectPath: "/project",
      cliVersion: "1.27.0",
      autoOpen: false,
    });

    const json = JSON.parse(fs.readFileSync(path.join(outputDir, "report.json"), "utf8"));
    expect(json.multiFolder).toBe(true);
    expect(json.folders).toEqual(["packages/a", "packages/b"]);
    expect(json.findings).toHaveLength(2);
    expect(json.cliVersion).toBe("1.27.0");
    expect(json.overrideFindings).toBeUndefined();
  });

  it("renders override and maintenance panels when flags are set", async () => {
    await writeMultiFolderHtmlReport({
      outputDir,
      results: [
        makeResult("packages/a", {
          overrideFindings: [makeOverride()],
          maintenanceFindings: [makeMaintenance()],
        }),
      ],
      projectPath: "/project",
      cliVersion: "1.27.0",
      autoOpen: false,
      includeOverrides: true,
      includeMaintenance: true,
    });

    const html = fs.readFileSync(path.join(outputDir, "index.html"), "utf8");
    expect(html).toMatch(/Override hygiene/i);
    expect(html).toContain("OA001");
    expect(html).toMatch(/Maintenance risk/i);
    expect(html).toContain("DM001");

    const json = JSON.parse(fs.readFileSync(path.join(outputDir, "report.json"), "utf8"));
    expect(json.overrideFindings).toHaveLength(1);
    expect(json.maintenanceFindings).toHaveLength(1);
  });

  it("omits override/maintenance panels when flags are off", async () => {
    await writeMultiFolderHtmlReport({
      outputDir,
      results: [
        makeResult("packages/a", {
          overrideFindings: [makeOverride()],
          maintenanceFindings: [makeMaintenance()],
        }),
      ],
      projectPath: "/project",
      cliVersion: "1.27.0",
      autoOpen: false,
    });

    const html = fs.readFileSync(path.join(outputDir, "index.html"), "utf8");
    expect(html).not.toMatch(/Override hygiene/i);
    expect(html).not.toMatch(/Maintenance risk/i);

    const json = JSON.parse(fs.readFileSync(path.join(outputDir, "report.json"), "utf8"));
    expect(json.overrideFindings).toBeUndefined();
    expect(json.maintenanceFindings).toBeUndefined();
  });

  it("renders empty override reassurance when includeOverrides is set with no findings", async () => {
    await writeMultiFolderHtmlReport({
      outputDir,
      results: [makeResult("packages/a")],
      projectPath: "/project",
      cliVersion: "1.27.0",
      autoOpen: false,
      includeOverrides: true,
    });

    const html = fs.readFileSync(path.join(outputDir, "index.html"), "utf8");
    expect(html).toMatch(/Override hygiene/i);
    expect(html).toMatch(/No override hygiene findings/i);
  });

  it("adds a Root header and column so cell count matches the header, keeping colspans in sync", async () => {
    const transitiveFinding: Finding = {
      pkg: { name: "qs", version: "6.5.2", ecosystem: "npm" },
      vulnerabilities: [{ id: "GHSA-yyy", aliases: ["CVE-2021-1234"], summary: "test" }],
      severity: "high",
      cveAliases: ["CVE-2021-1234"],
      dependencyPaths: [["project", "express", "qs"]],
      relationship: "transitive",
      firstFixedVersion: "6.11.0",
    };

    await writeMultiFolderHtmlReport({
      outputDir,
      results: [
        makeResult("packages/a", { sorted: [transitiveFinding] }),
        makeResult("packages/b", { sorted: [] }),
      ],
      projectPath: "/project",
      cliVersion: "1.27.0",
      autoOpen: false,
    });

    const html = fs.readFileSync(path.join(outputDir, "index.html"), "utf8");
    expect(html).toContain("<th>Root</th>");
    expect(html).toContain('<span class="root-dep">express</span>');

    // Asserted as an invariant rather than a literal count. The row markup is
    // shared with the single-folder reporter while the headers and colspans live
    // here, so adding a column in one place and not the other misaligns the
    // table (that is what #920 did). Pinning the literal meant this test had to
    // be edited on every column change, which is how it would eventually be
    // "fixed" by just bumping the number.
    const theads = html.match(/<thead>[\s\S]*?<\/thead>/g) ?? [];
    expect(theads.length).toBeGreaterThan(0);
    const headerCounts = theads.map(t => (t.match(/<th[ >]/g) ?? []).length);
    for (const count of headerCounts) expect(count).toBe(headerCounts[0]);
    const columns = headerCounts[0]!;

    const dataRows = html.match(/<tr id="row-\d+"[\s\S]*?<\/tr>/g) ?? [];
    expect(dataRows.length).toBeGreaterThan(0);
    for (const row of dataRows) {
      expect((row.match(/<td[ >]/g) ?? []).length).toBe(columns);
    }

    for (const colspan of html.match(/colspan="(\d+)"/g) ?? []) {
      expect(colspan).toBe(`colspan="${columns}"`);
    }
  });
});
