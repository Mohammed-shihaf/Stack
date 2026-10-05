import { jest } from "@jest/globals";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  buildReportData,
  collectDuplicatePackages,
  renderDependencyPathChain,
  renderDependencyPathsHtml,
  renderDuplicatePackagesSection,
  renderHtmlReport,
  renderSkippedDependenciesSection,
  writeHtmlReport,
} from "../src/output/html-reporter.js";
import { formatCooldownWarning } from "../src/output/formatters.js";
import type { Finding, OsvVuln } from "../src/types.js";
import type { SuggestedFixCommandPlan } from "../src/remediation/fix-commands.js";

function makeVuln(overrides?: Partial<OsvVuln>): OsvVuln {
  return {
    id: "CVE-2021-23337",
    aliases: ["CVE-2021-23337"],
    summary: "Prototype pollution",
    severity: [{ type: "CVSS_V3", score: "9.8" }],
    ...overrides,
  };
}

function makeFinding(overrides?: Partial<Finding>): Finding {
  return {
    pkg: { name: "lodash", version: "4.17.20", ecosystem: "npm" },
    vulnerabilities: [makeVuln()],
    severity: "critical",
    cveAliases: ["CVE-2021-23337"],
    dependencyPaths: [["my-app", "lodash"]],
    relationship: "direct",
    firstFixedVersion: "4.17.21",
    ...overrides,
  };
}

const BASE_PARAMS = {
  projectPath: "/home/user/my-app",
  cliVersion: "1.8.0",
  packageManager: "npm",
  lockfileSource: "package-lock",
  packageCount: 42,
  findings: [makeFinding()],
  suggestedFixCommands: null,
  notes: ["note1"],
  warnings: [],
  skippedDependencies: [],
};

describe("buildReportData", () => {
  it("maps scalar fields verbatim", () => {
    const data = buildReportData(BASE_PARAMS);
    expect(data.projectPath).toBe("/home/user/my-app");
    expect(data.cliVersion).toBe("1.8.0");
    expect(data.packageManager).toBe("npm");
    expect(data.lockfileSource).toBe("package-lock");
    expect(data.packageCount).toBe(42);
  });

  it("serializes findings", () => {
    const data = buildReportData(BASE_PARAMS);
    expect(data.findings).toHaveLength(1);
    expect(data.findings[0].package).toBe("lodash");
    expect(data.findings[0].version).toBe("4.17.20");
    expect(data.findings[0].severity).toBe("critical");
  });

  it("passes through suggestedFixCommands as null when null", () => {
    const data = buildReportData(BASE_PARAMS);
    expect(data.suggestedFixCommands).toBeNull();
  });

  it("passes through suggestedFixCommands when provided", () => {
    const plan: SuggestedFixCommandPlan = {
      packageManager: "npm",
      sourceLabel: "package-lock.json",
      command: "npm install lodash@4.17.21",
      sections: [],
      targets: [],
      skipped: [],
    };
    const data = buildReportData({ ...BASE_PARAMS, suggestedFixCommands: plan });
    expect(data.suggestedFixCommands).toBe(plan);
  });

  it("produces a valid ISO timestamp for scannedAt", () => {
    const data = buildReportData(BASE_PARAMS);
    expect(() => new Date(data.scannedAt).toISOString()).not.toThrow();
  });

  it("attaches a runnable npm install command to findings that match a plan target", () => {
    const plan: SuggestedFixCommandPlan = {
      packageManager: "npm",
      sourceLabel: "package-lock.json",
      command: "npm install lodash@4.17.21",
      sections: [],
      targets: [
        {
          package: "lodash",
          currentVersion: "4.17.20",
          targetVersion: "4.17.21",
          kind: "direct",
          urgent: true,
          severity: "critical",
          adjusted: false,
          reason: "Direct upgrade target",
        },
      ],
      skipped: [],
    };

    const data = buildReportData({ ...BASE_PARAMS, suggestedFixCommands: plan });
    expect(data.findings[0].runnableFixCommand).toBe("npm install lodash@4.17.21");
  });

  it("emits a null runnableFixCommand for findings with no actionable plan target", () => {
    const finding = makeFinding({
      relationship: "transitive",
      dependencyPaths: [],
    });

    const data = buildReportData({
      ...BASE_PARAMS,
      findings: [finding],
      suggestedFixCommands: {
        packageManager: "npm",
        sourceLabel: "package-lock.json",
        command: null,
        sections: [],
        targets: [],
        skipped: [],
      },
    });

    expect(data.findings[0].runnableFixCommand).toBeNull();
  });
});

describe("skipped manifest dependencies", () => {
  const SKIPPED = ["private-pkg@^1.0.0", "git-dep@github:acme/tool"];

  it("passes skippedDependencies through buildReportData", () => {
    const data = buildReportData({ ...BASE_PARAMS, skippedDependencies: SKIPPED });
    expect(data.skippedDependencies).toEqual(SKIPPED);
  });

  it("renders a section listing every skipped dependency with a count", () => {
    const html = renderHtmlReport(buildReportData({ ...BASE_PARAMS, skippedDependencies: SKIPPED }));
    expect(html).toContain("Skipped manifest dependencies");
    expect(html).toContain(`${SKIPPED.length} skipped`);
    expect(html).toContain("private-pkg@^1.0.0");
    expect(html).toContain("git-dep@github:acme/tool");
  });

  it("HTML-escapes skipped dependency specifiers", () => {
    const html = renderSkippedDependenciesSection(["weird<pkg>@1.0.0"]);
    expect(html).toContain("weird&lt;pkg&gt;@1.0.0");
    expect(html).not.toContain("weird<pkg>");
  });

  it("omits the section entirely when nothing was skipped", () => {
    expect(renderSkippedDependenciesSection([])).toBe("");
    const html = renderHtmlReport(buildReportData({ ...BASE_PARAMS, skippedDependencies: [] }));
    expect(html).not.toContain("Skipped manifest dependencies");
  });
});

describe("duplicate package versions", () => {
  function serialize(findings: Finding[]) {
    return buildReportData({ ...BASE_PARAMS, findings }).findings;
  }

  const lodashDirect = makeFinding({
    pkg: { name: "lodash", version: "4.17.20", ecosystem: "npm" },
    relationship: "direct",
    dependencyPaths: [["my-app", "lodash"]],
  });
  const lodashTransitive = makeFinding({
    pkg: { name: "lodash", version: "4.17.11", ecosystem: "npm" },
    severity: "high",
    relationship: "transitive",
    dependencyPaths: [["my-app", "express", "lodash"]],
  });
  const expressSingle = makeFinding({
    pkg: { name: "express", version: "4.0.0", ecosystem: "npm" },
  });

  it("groups a package installed at two versions and ignores single-version packages", () => {
    const dups = collectDuplicatePackages(serialize([lodashDirect, lodashTransitive, expressSingle]));
    expect(dups).toHaveLength(1);
    expect(dups[0].name).toBe("lodash");
    expect(dups[0].versions.map(v => v.version).sort()).toEqual(["4.17.11", "4.17.20"]);
  });

  it("does not treat two advisories on the same install as duplicate versions", () => {
    const sameVersionTwice = serialize([
      makeFinding(),
      makeFinding({ vulnerabilities: [makeVuln({ id: "CVE-2222-0001" })] }),
    ]);
    expect(collectDuplicatePackages(sameVersionTwice)).toHaveLength(0);
  });

  it("renders a section with the version count and where each version comes from", () => {
    const html = renderHtmlReport(
      buildReportData({ ...BASE_PARAMS, findings: [lodashDirect, lodashTransitive, expressSingle] }),
    );
    expect(html).toContain("Duplicate package versions");
    expect(html).toContain("1 package");
    expect(html).toContain("2 versions");
    expect(html).toContain("4.17.20");
    expect(html).toContain("4.17.11");
    expect(html).toContain("direct dependency");
    expect(html).toContain("via express");
  });

  it("names the top-level parent, not the immediate one, on a deep path", () => {
    // 4-node path: immediate parent is loader-utils, but the responsible
    // top-level dependency is webpack. The card must match the findings table.
    const deep = makeFinding({
      pkg: { name: "lodash", version: "4.17.11", ecosystem: "npm" },
      relationship: "transitive",
      dependencyPaths: [["my-app", "webpack", "loader-utils", "lodash"]],
    });
    const html = renderDuplicatePackagesSection(serialize([lodashDirect, deep]));
    expect(html).toContain("via webpack");
    expect(html).not.toContain("via loader-utils");
  });

  it("does not name the project itself on a hoisted 2-node transitive path", () => {
    // Hoisted install: the path is just project -> lodash with no real parent,
    // so it should read as a plain transitive dependency, not "via my-app".
    const hoisted = makeFinding({
      pkg: { name: "lodash", version: "4.17.11", ecosystem: "npm" },
      relationship: "transitive",
      dependencyPaths: [["my-app", "lodash"]],
    });
    const html = renderDuplicatePackagesSection(serialize([lodashDirect, hoisted]));
    expect(html).toContain("transitive dependency");
    expect(html).not.toContain("via my-app");
  });

  it("HTML-escapes duplicate package names and versions", () => {
    const html = renderDuplicatePackagesSection(
      serialize([
        makeFinding({ pkg: { name: "<pkg>", version: "1.0.0", ecosystem: "npm" }, dependencyPaths: [["my-app", "<pkg>"]] }),
        makeFinding({ pkg: { name: "<pkg>", version: "2.0.0", ecosystem: "npm" }, relationship: "transitive", dependencyPaths: [["my-app", "x", "<pkg>"]] }),
      ]),
    );
    expect(html).toContain("&lt;pkg&gt;");
    expect(html).not.toContain("<pkg>");
  });

  it("omits the section entirely when no package has more than one version", () => {
    expect(renderDuplicatePackagesSection([])).toBe("");
    const html = renderHtmlReport(buildReportData(BASE_PARAMS));
    expect(html).not.toContain("Duplicate package versions");
  });
});

describe("renderHtmlReport", () => {
  const data = buildReportData(BASE_PARAMS);

  it("returns a string starting with <!DOCTYPE html>", () => {
    expect(renderHtmlReport(data)).toMatch(/^<!DOCTYPE html>/);
  });

  it("embeds the project path in the output", () => {
    expect(renderHtmlReport(data)).toContain("my-app");
  });

  it("includes a Download JSON button and handler", () => {
    const html = renderHtmlReport(buildReportData(BASE_PARAMS));
    expect(html).toContain("Download JSON");
    expect(html).toContain("downloadReportJson");
    expect(html).toContain("cve-lite-report.json");
  });

  it("embeds cliVersion in the footer", () => {
    expect(renderHtmlReport(data)).toContain("1.8.0");
  });

  it("shows contextual risk and next-action guidance for direct findings", () => {
    const html = renderHtmlReport(data);
    const recommendedActionIdx = html.indexOf("<h4>Recommended action</h4>");
    const riskSummaryIdx = html.indexOf(
      "<h4 class=\"detail-subheading\">Risk summary</h4>",
    );
    const nextActionIdx = html.indexOf(
      "<h4 class=\"detail-subheading\">Next action</h4>",
    );

    expect(recommendedActionIdx).toBeGreaterThan(-1);
    expect(riskSummaryIdx).toBeGreaterThan(recommendedActionIdx);
    expect(nextActionIdx).toBeGreaterThan(riskSummaryIdx);
    expect(html).toContain(
      "Critical direct dependency. Prioritize this first because the project controls it directly.",
    );
    expect(html).toContain("Upgrade lodash toward 4.17.21.");
  });

  it("shows parent-specific guidance for transitive findings", () => {
    const finding = makeFinding({
      pkg: { name: "qs", version: "6.5.2", ecosystem: "npm" },
      relationship: "transitive",
      dependencyPaths: [["project", "express", "qs"]],
      firstFixedVersion: "6.11.0",
      recommendedNpmTransitiveRemediation: {
        kind: "update-parent-within-range",
        package: "express",
        currentVersion: "4.17.1",
        viaPath: ["project", "express"],
        reason: "Safe child version available within current range",
        targetChildVersion: "6.11.0",
      },
    });

    const html = renderHtmlReport(
      buildReportData({ ...BASE_PARAMS, findings: [finding] }),
    );

    expect(html).toContain(
      "The current parent range can already absorb a safe qs update via express.",
    );
    expect(html).toContain("Lockfile refresh");
    expect(html).toContain("express already permits a safe version.");
  });

  it("shows removal guidance for malicious direct packages", () => {
    const finding = makeFinding({
      firstFixedVersion: null,
      vulnerabilities: [makeVuln({ id: "MAL-2025-21003" })],
    });

    const html = renderHtmlReport(
      buildReportData({ ...BASE_PARAMS, findings: [finding] }),
    );

    expect(html).toContain(
      "This package has a malicious code advisory. Remove it from your dependencies.",
    );
  });

  it("escapes generated guidance before rendering", () => {
    const finding = makeFinding({
      pkg: { name: "<unsafe-package>", version: "1.0.0", ecosystem: "npm" },
      firstFixedVersion: null,
    });

    const html = renderHtmlReport(
      buildReportData({ ...BASE_PARAMS, findings: [finding] }),
    );

    expect(html).toContain(
      "No known fix exists for &lt;unsafe-package&gt;. Consider replacing it",
    );
    expect(html).not.toContain(
      "No known fix exists for <unsafe-package>. Consider replacing it",
    );
  });

  it("embeds reportData as an inline script", () => {
    const html = renderHtmlReport(data);
    expect(html).toContain("const reportData =");
    expect(html).toContain('"lodash"');
  });

  it("contains the logo as a base64 data URI", () => {
    expect(renderHtmlReport(data)).toContain("data:image/png;base64,");
  });

  it("contains the GitHub repo link", () => {
    expect(renderHtmlReport(data)).toContain("github.com/OWASP/cve-lite-cli");
  });

  it("contains the OWASP project link", () => {
    expect(renderHtmlReport(data)).toContain("owasp.org/cve-lite-cli");
  });

  it("links CVE IDs to osv.dev", () => {
    expect(renderHtmlReport(data)).toContain("osv.dev/vulnerability/CVE-2021-23337");
  });

  it("links GHSA IDs to github.com/advisories", () => {
    const ghsaFinding = makeFinding({
      cveAliases: ["GHSA-abcd-1234-efgh"],
      vulnerabilities: [makeVuln({ id: "GHSA-abcd-1234-efgh", aliases: ["GHSA-abcd-1234-efgh"] })],
    });
    const html = renderHtmlReport(buildReportData({ ...BASE_PARAMS, findings: [ghsaFinding] }));
    expect(html).toContain("github.com/advisories/GHSA-abcd-1234-efgh");
  });

  it("renders a runnable fix command with a Copy button when one is available for a finding", () => {
    const plan: SuggestedFixCommandPlan = {
      packageManager: "npm",
      sourceLabel: "package-lock.json",
      command: "npm install lodash@4.17.21",
      sections: [],
      targets: [
        {
          package: "lodash",
          currentVersion: "4.17.20",
          targetVersion: "4.17.21",
          kind: "direct",
          urgent: true,
          severity: "critical",
          adjusted: false,
          reason: "Direct upgrade target",
        },
      ],
      skipped: [],
    };

    const html = renderHtmlReport(buildReportData({ ...BASE_PARAMS, suggestedFixCommands: plan }));

    expect(html).toContain("<code>npm install lodash@4.17.21</code>");
    expect(html).toContain('data-cmd="npm install lodash@4.17.21"');
  });

  it("keeps the fix plan command clean in both display and copy data", () => {
    const plan: SuggestedFixCommandPlan = {
      packageManager: "npm",
      sourceLabel: "package-lock.json",
      command: "npm install lodash@4.17.21",
      sections: [
        {
          key: "urgent:critical",
          kind: "urgent",
          severity: "critical",
          title: "Critical severity fix commands",
          command: "npm install lodash@4.17.21",
          targets: [
            {
              package: "lodash",
              currentVersion: "4.17.20",
              targetVersion: "4.17.21",
              kind: "direct",
              urgent: true,
              severity: "critical",
              adjusted: false,
              reason: "Direct upgrade target",
              fixVersionPublishedAt: "2021-02-20T19:00:00.000Z",
            },
          ],
        },
      ],
      targets: [],
      skipped: [],
    };

    const html = renderHtmlReport(buildReportData({ ...BASE_PARAMS, suggestedFixCommands: plan }));

    // The publish date is a Published column on the findings table now. Appending
    // it to the displayed command duplicated it and made the displayed text differ
    // from what the Copy button actually yields.
    expect(html).toContain('<span class="cmd-text">npm install lodash@4.17.21</span>');
    expect(html).not.toContain("(published 2021-02-20)");
    expect(html).toContain('data-cmd="npm install lodash@4.17.21"');
  });

  it("renders partial path coverage notes for parent-upgrade fix targets", () => {
    const plan: SuggestedFixCommandPlan = {
      packageManager: "pnpm",
      sourceLabel: "pnpm-lock.yaml",
      command: "pnpm add lint-staged@17.0.0",
      sections: [
        {
          key: "urgent:high",
          kind: "urgent",
          severity: "high",
          title: "High severity fix commands",
          command: "pnpm add lint-staged@17.0.0",
          targets: [
            {
              package: "lint-staged",
              currentVersion: "16.4.0",
              targetVersion: "17.0.0",
              kind: "parent-upgrade",
              urgent: true,
              severity: "high",
              adjusted: false,
              reason:
                "Path-specific parent upgrade for project -> lint-staged -> picomatch (picomatch@4.0.3); run this command, then rescan. 1 other known path may still need separate parent upgrades.",
              coverage: "partial",
              coveredPaths: [["project", "lint-staged", "picomatch"]],
              remainingPaths: [["project", "vite", "picomatch"]],
            },
          ],
        },
      ],
      targets: [],
      skipped: [],
    };

    const html = renderHtmlReport(buildReportData({ ...BASE_PARAMS, suggestedFixCommands: plan }));

    expect(html).toContain("Path-specific remediation. Run this command, then rescan; 1 other known path may still need separate parent upgrades.");
  });

  it("renders an escaped cooldown warning for a fix target that has one", () => {
    const cooldownWarning = {
      publishedAt: "2026-07-19T10:00:00.000Z",
      windowLabel: "1440 min",
      sourceFile: "pnpm-workspace.yaml",
    };
    const plan: SuggestedFixCommandPlan = {
      packageManager: "pnpm",
      sourceLabel: "pnpm-lock.yaml",
      command: "pnpm add axios@1.8.0",
      sections: [
        {
          key: "urgent:high",
          kind: "urgent",
          severity: "high",
          title: "High severity fix commands",
          command: "pnpm add axios@1.8.0",
          targets: [
            {
              package: "axios",
              currentVersion: "1.7.7",
              targetVersion: "1.8.0",
              kind: "direct",
              urgent: true,
              severity: "high",
              adjusted: false,
              reason: "Direct upgrade target",
              cooldownWarning,
            },
          ],
        },
      ],
      targets: [],
      skipped: [],
    };

    const html = renderHtmlReport(buildReportData({ ...BASE_PARAMS, suggestedFixCommands: plan }));

    expect(html).toContain(formatCooldownWarning(cooldownWarning));
    // Must appear inside the reusable fix-target-note span, not a new class.
    expect(html).toContain(`<span class="fix-target-note">${formatCooldownWarning(cooldownWarning)}</span>`);
  });

  it("does not render a cooldown warning for a fix target with no cooldownWarning", () => {
    const plan: SuggestedFixCommandPlan = {
      packageManager: "npm",
      sourceLabel: "package-lock.json",
      command: "npm install axios@1.8.0",
      sections: [
        {
          key: "urgent:high",
          kind: "urgent",
          severity: "high",
          title: "High severity fix commands",
          command: "npm install axios@1.8.0",
          targets: [
            {
              package: "axios",
              currentVersion: "1.7.7",
              targetVersion: "1.8.0",
              kind: "direct",
              urgent: true,
              severity: "high",
              adjusted: false,
              reason: "Direct upgrade target",
              cooldownWarning: null,
            },
          ],
        },
      ],
      targets: [],
      skipped: [],
    };

    const html = renderHtmlReport(buildReportData({ ...BASE_PARAMS, suggestedFixCommands: plan }));

    expect(html).not.toContain("release cooldown");
  });

  it("renders an escaped unverified marker for a parent-upgrade fix target that could not be verified", () => {
    const plan: SuggestedFixCommandPlan = {
      packageManager: "npm",
      sourceLabel: "package-lock.json",
      command: "npm install jest@30.4.2",
      sections: [
        {
          key: "urgent:high",
          kind: "urgent",
          severity: "high",
          title: "High severity fix commands",
          command: "npm install jest@30.4.2",
          targets: [
            {
              package: "jest",
              currentVersion: "30.4.1",
              targetVersion: "30.4.2",
              kind: "parent-upgrade",
              urgent: true,
              severity: "high",
              adjusted: false,
              reason: "Parent upgrade for vulnerable brace-expansion@2.1.2",
              confidence: "unverified",
            },
          ],
        },
      ],
      targets: [],
      skipped: [],
      coveredFindingCount: 0,
      totalFindingCount: 1,
    };

    const html = renderHtmlReport(buildReportData({ ...BASE_PARAMS, suggestedFixCommands: plan }));

    expect(html).toContain("unverified - rescan after upgrading to confirm this resolves the finding");
    // Must appear inside the reusable fix-target-note span, not a new class.
    expect(html).toContain(`<span class="fix-target-note">⚠ unverified - rescan after upgrading to confirm this resolves the finding</span>`);
    expect(html).toContain("should fix <strong>0</strong> of <strong>1</strong> findings.");
  });

  it("does not render an unverified marker for a verified parent-upgrade fix target", () => {
    const plan: SuggestedFixCommandPlan = {
      packageManager: "npm",
      sourceLabel: "package-lock.json",
      command: "npm install jest@30.4.2",
      sections: [
        {
          key: "urgent:high",
          kind: "urgent",
          severity: "high",
          title: "High severity fix commands",
          command: "npm install jest@30.4.2",
          targets: [
            {
              package: "jest",
              currentVersion: "30.4.1",
              targetVersion: "30.4.2",
              kind: "parent-upgrade",
              urgent: true,
              severity: "high",
              adjusted: false,
              reason: "Parent upgrade for vulnerable brace-expansion@2.1.2",
              confidence: "verified",
            },
          ],
        },
      ],
      targets: [],
      skipped: [],
      coveredFindingCount: 1,
      totalFindingCount: 1,
    };

    const html = renderHtmlReport(buildReportData({ ...BASE_PARAMS, suggestedFixCommands: plan }));

    expect(html).not.toContain("unverified");
    expect(html).toContain("Running all commands should fix all 1 findings.");
  });

  it("renders the descriptive recommendation without a Copy button when no runnable command exists", () => {
    const finding = makeFinding({
      relationship: "transitive",
      dependencyPaths: [],
    });

    const html = renderHtmlReport(
      buildReportData({
        ...BASE_PARAMS,
        findings: [finding],
        suggestedFixCommands: {
          packageManager: "npm",
          sourceLabel: "package-lock.json",
          command: null,
          sections: [],
          targets: [],
          skipped: [],
        },
      }),
    );

    // The expanded action panel for this finding should be the explanatory note,
    // not a fix-cmd-inline command box with a Copy button.
    expect(html).toContain('<p class="fix-cmd-note">No parent dependency was identified for lodash');
    const recommendedActionIdx = html.indexOf("<h4>Recommended action</h4>");
    const nextHeadingIdx = html.indexOf("</div>", recommendedActionIdx);
    const recommendedActionBlock = html.slice(recommendedActionIdx, nextHeadingIdx);
    expect(recommendedActionBlock).not.toContain("copy-btn");
    expect(recommendedActionBlock).not.toContain("fix-cmd-inline");
  });

  it("escapes </script> sequences in embedded JSON", () => {
    const xssFinding = makeFinding({
      vulnerabilities: [makeVuln({ summary: '</script><img src=x onerror=alert(1)>' })],
    });
    const html = renderHtmlReport(buildReportData({ ...BASE_PARAMS, findings: [xssFinding] }));
    const scriptIdx = html.indexOf("const reportData =");
    const endOfJson = html.indexOf(";", scriptIdx);
    const jsonBlob = html.slice(scriptIdx, endOfJson);
    expect(jsonBlob).not.toContain("</script>");
  });

  describe("transitive context column", () => {
    it("shows ✓ Fix available badge when recommendedNpmTransitiveRemediation is set", () => {
      const finding = makeFinding({
        pkg: { name: "qs", version: "6.5.2", ecosystem: "npm" },
        relationship: "transitive",
        dependencyPaths: [["project", "express", "qs"]],
        firstFixedVersion: "6.11.0",
        recommendedNpmTransitiveRemediation: {
          kind: "update-parent-within-range",
          package: "express",
          currentVersion: "4.17.1",
          viaPath: ["project", "express"],
          reason: "Safe child version available within current range",
          targetChildVersion: "6.11.0",
        },
      });

      const html = renderHtmlReport(
        buildReportData({ ...BASE_PARAMS, findings: [finding], suggestedFixCommands: null }),
      );

      expect(html).toContain("<h4>Context</h4>");
      expect(html).toContain("tier-ok");
      expect(html).toContain("✓ Fix available");
      expect(html).toContain("Root: express");
    });

    it("shows ⚠ No safe version badge when parent is known but no fix is available", () => {
      const finding = makeFinding({
        pkg: { name: "express", version: "4.17.1", ecosystem: "npm" },
        relationship: "transitive",
        dependencyPaths: [["project", "nest-core", "express"]],
        firstFixedVersion: "4.18.2",
      });

      const html = renderHtmlReport(
        buildReportData({ ...BASE_PARAMS, findings: [finding], suggestedFixCommands: null }),
      );

      expect(html).toContain("<h4>Context</h4>");
      expect(html).toContain("tier-warn");
      expect(html).toContain("⚠ No safe version identified");
      expect(html).toContain("Root: nest-core");
    });

    it("shows ✕ No parent badge when no parent is identifiable from the dependency path", () => {
      const finding = makeFinding({
        relationship: "transitive",
        dependencyPaths: [],
      });

      const html = renderHtmlReport(
        buildReportData({ ...BASE_PARAMS, findings: [finding], suggestedFixCommands: null }),
      );

      expect(html).toContain("<h4>Context</h4>");
      expect(html).toContain("tier-err");
      expect(html).toContain("✕ No parent identified");
      expect(html).toContain("npm ls lodash");
    });

    it("lists every root dependency (not just the first) in the Context column when multiple roots pull in the same finding", () => {
      const finding = makeFinding({
        pkg: { name: "qs", version: "6.5.2", ecosystem: "npm" },
        relationship: "transitive",
        dependencyPaths: [
          ["project", "express", "qs"],
          ["project", "koa", "qs"],
        ],
        firstFixedVersion: "6.11.0",
      });

      const html = renderHtmlReport(
        buildReportData({ ...BASE_PARAMS, findings: [finding], suggestedFixCommands: null }),
      );

      expect(html).toContain("Root: express, koa");
    });
  });

  it("shows ⚠ No fix in the fix column when no fixed version is available", () => {
    const finding = makeFinding({ firstFixedVersion: null });
    const html = renderHtmlReport(buildReportData({ ...BASE_PARAMS, findings: [finding] }));
    expect(html).toContain("⚠ No fix");
    expect(html).toContain('title="No known fix — consider replacing this package"');
  });

  it("shows malicious tooltip when finding has MAL-* advisory", () => {
    const finding = makeFinding({
      firstFixedVersion: null,
      vulnerabilities: [makeVuln({ id: "MAL-2025-21003" })],
    });
    const html = renderHtmlReport(buildReportData({ ...BASE_PARAMS, findings: [finding] }));
    expect(html).toContain('title="Malicious code advisory — remove this package"');
    expect(html).toContain("⚠ Malicious");
  });

  it("renders unverifiable badge for private registry MAL- finding", () => {
    const finding = makeFinding({
      firstFixedVersion: null,
      vulnerabilities: [makeVuln({ id: "MAL-2025-99999" })],
      maliciousUnverifiable: true,
    });
    const html = renderHtmlReport(buildReportData({ ...BASE_PARAMS, findings: [finding] }));
    expect(html).toContain("Unverifiable (private source)");
    expect(html).not.toContain("⚠ Malicious");
  });

  it("renders git source SHA-pinned badge for maliciousGitSource findings", () => {
    const finding = makeFinding({
      firstFixedVersion: null,
      pkg: { name: "node-ipc", version: "9.2.3", ecosystem: "npm", resolvedUrl: "https://codeload.github.com/org/repo/tar.gz/9af9b3c49515b85598cd88de3e8cc20c7a98efbb" },
      vulnerabilities: [makeVuln({ id: "MAL-2022-1000", summary: "Malicious" })],
      maliciousGitSource: true,
      maliciousGitSourcePinned: true,
    });
    const html = renderHtmlReport(buildReportData({ ...BASE_PARAMS, findings: [finding] }));
    expect(html).toContain("Git source (SHA-pinned)");
    expect(html).not.toContain("⚠ Malicious");
    expect(html).not.toContain("Unverifiable (private source)");
  });

  it("renders git source floating ref badge for unpinned git source findings", () => {
    const finding = makeFinding({
      firstFixedVersion: null,
      pkg: { name: "node-ipc", version: "9.2.3", ecosystem: "npm", resolvedUrl: "https://github.com/org/repo/archive/main.tar.gz" },
      vulnerabilities: [makeVuln({ id: "MAL-2022-1000", summary: "Malicious" })],
      maliciousGitSource: true,
      maliciousGitSourcePinned: false,
    });
    const html = renderHtmlReport(buildReportData({ ...BASE_PARAMS, findings: [finding] }));
    expect(html).toContain("Git source (floating ref)");
    expect(html).not.toContain("⚠ Malicious");
    expect(html).not.toContain("Unverifiable (private source)");
  });

  it("shows generic no-fix tooltip when finding has non-MAL advisory and no fix version", () => {
    const finding = makeFinding({ firstFixedVersion: null });
    const html = renderHtmlReport(buildReportData({ ...BASE_PARAMS, findings: [finding] }));
    expect(html).toContain('title="No known fix — consider replacing this package"');
  });

  it("does not show ⚠ No fix when a fixed version is available", () => {
    const finding = makeFinding({ firstFixedVersion: "4.17.21" });
    const html = renderHtmlReport(buildReportData({ ...BASE_PARAMS, findings: [finding] }));
    expect(html).toContain("4.17.21");
    expect(html).not.toContain("⚠ No fix");
  });

  it("labels an unconfirmed fix hint and shows its validation reason without a copy command", () => {
    const finding = makeFinding({
      validatedFirstFixedVersion: null,
      fixVersionValidationNote: "Advisory coverage is incomplete for lodash <4.17.21>.",
    });
    const html = renderHtmlReport(buildReportData({ ...BASE_PARAMS, findings: [finding] }));

    expect(html).toContain("4.17.21 ⊘");
    expect(html).toContain("Advisory coverage is incomplete for lodash &lt;4.17.21&gt;.");
    expect(html).toContain("Verify a safe version of lodash before upgrading.");
    expect(html).not.toContain('data-cmd="npm install lodash@4.17.21"');
  });

  describe("Root column", () => {
    it("adds a Root header to the findings table", () => {
      const html = renderHtmlReport(buildReportData(BASE_PARAMS));
      expect(html).toContain("<th>Root</th>");
    });

    it("lists every root dependency name (not truncated) for a transitive finding with multiple roots", () => {
      const finding = makeFinding({
        relationship: "transitive",
        dependencyPaths: [
          ["my-app", "express", "lodash"],
          ["my-app", "koa", "lodash"],
          ["my-app", "fastify", "lodash"],
        ],
      });
      const html = renderHtmlReport(buildReportData({ ...BASE_PARAMS, findings: [finding] }));
      expect(html).toContain('<span class="root-dep">express</span>, <span class="root-dep">koa</span>, <span class="root-dep">fastify</span>');
    });

    it("shows a dash for a direct dependency with no identifiable root", () => {
      const finding = makeFinding({ relationship: "direct", dependencyPaths: [["my-app", "lodash"]] });
      const html = renderHtmlReport(buildReportData({ ...BASE_PARAMS, findings: [finding] }));
      expect(html).toContain('<span class="root-dep-none">-</span>');
    });
  });

  describe("Dependency paths", () => {
    it("renders singular heading and the single chain when finding has one path", () => {
      const finding = makeFinding({
        relationship: "transitive",
        dependencyPaths: [["my-app", "express", "lodash"]],
      });
      const html = renderHtmlReport(buildReportData({ ...BASE_PARAMS, findings: [finding] }));
      expect(html).toContain("<h4>Dependency path</h4>");
      expect(html).not.toContain("<h4>Known dependency paths</h4>");
      expect(html).toContain("express");
    });

    it("renders 'Known dependency paths' heading and all chains when finding has multiple paths below cap", () => {
      const finding = makeFinding({
        relationship: "transitive",
        dependencyPaths: [
          ["my-app", "express", "lodash"],
          ["my-app", "koa", "lodash"],
        ],
      });
      const html = renderHtmlReport(buildReportData({ ...BASE_PARAMS, findings: [finding] }));
      expect(html).toContain("<h4>Known dependency paths</h4>");
      expect(html).not.toContain("<h4>Dependency path</h4>");
      expect(html).toContain("express");
      expect(html).toContain("koa");
    });

    it("renders 'Known dependency paths (first 5 shown)' heading when paths reach parser cap", () => {
      const finding = makeFinding({
        relationship: "transitive",
        dependencyPaths: [
          ["my-app", "a", "lodash"],
          ["my-app", "b", "lodash"],
          ["my-app", "c", "lodash"],
          ["my-app", "d", "lodash"],
          ["my-app", "e", "lodash"],
        ],
      });
      const html = renderHtmlReport(buildReportData({ ...BASE_PARAMS, findings: [finding] }));
      expect(html).toContain("<h4>Known dependency paths (first 5 shown)</h4>");
    });

    it("renders singular heading and fallback package node when finding has no dependency paths", () => {
      const finding = makeFinding({
        relationship: "direct",
        dependencyPaths: [],
      });
      const html = renderHtmlReport(buildReportData({ ...BASE_PARAMS, findings: [finding] }));
      expect(html).toContain("<h4>Dependency path</h4>");
      expect(html).toContain('<span class="dep-node">lodash</span>');
    });

    describe("renderDependencyPathChain", () => {
      it("formats nodes with links and arrows, marking the last node as vulnerable", () => {
        const html = renderDependencyPathChain(["my-app", "express", "lodash"]);
        expect(html.match(/class="dep-step"/g)).toHaveLength(3);
        expect(html).toContain('<span class="dep-step"><a href="https://www.npmjs.com/package/my-app" target="_blank" rel="noopener noreferrer" class="dep-node">my-app</a><span class="dep-arrow">→</span></span>');
        expect(html).toContain('<a href="https://www.npmjs.com/package/my-app" target="_blank" rel="noopener noreferrer" class="dep-node">my-app</a>');
        expect(html).toContain('<span class="dep-arrow">→</span>');
        expect(html).toContain('<a href="https://www.npmjs.com/package/express" target="_blank" rel="noopener noreferrer" class="dep-node">express</a>');
        expect(html).toContain('<a href="https://www.npmjs.com/package/lodash" target="_blank" rel="noopener noreferrer" class="dep-node vulnerable">lodash</a>');
      });

      it("handles single-node paths without arrows", () => {
        const html = renderDependencyPathChain(["lodash"]);
        expect(html).toContain('class="dep-node vulnerable">lodash</a>');
        expect(html).not.toContain('class="dep-arrow"');
      });

      it("falls back to package node when path is empty and fallback is provided", () => {
        const html = renderDependencyPathChain([], "lodash");
        expect(html).toBe('<span class="dep-node">lodash</span>');
      });

      it("returns empty string when path is empty and no fallback is provided", () => {
        const html = renderDependencyPathChain([]);
        expect(html).toBe("");
      });
    });

    describe("renderDependencyPathsHtml", () => {
      it("returns singular heading and fallback for empty dependencyPaths", () => {
        const report = buildReportData({
          ...BASE_PARAMS,
          findings: [makeFinding({ dependencyPaths: [] })],
        });
        const result = renderDependencyPathsHtml(report.findings[0]);
        expect(result.heading).toBe("Dependency path");
        expect(result.html).toBe('<div class="dep-path"><span class="dep-node">lodash</span></div>');
      });

      it("returns singular heading and single chain for single dependencyPath", () => {
        const report = buildReportData({
          ...BASE_PARAMS,
          findings: [makeFinding({ dependencyPaths: [["app", "lodash"]] })],
        });
        const result = renderDependencyPathsHtml(report.findings[0]);
        expect(result.heading).toBe("Dependency path");
        expect(result.html).toContain('<div class="dep-path">');
        expect(result.html).toContain("app");
        expect(result.html).toContain("lodash");
      });

      it("returns 'Known dependency paths' heading and all chains for multiple dependencyPaths below cap", () => {
        const report = buildReportData({
          ...BASE_PARAMS,
          findings: [
            makeFinding({
              dependencyPaths: [
                ["app", "express", "lodash"],
                ["app", "koa", "lodash"],
              ],
            }),
          ],
        });
        const result = renderDependencyPathsHtml(report.findings[0]);
        expect(result.heading).toBe("Known dependency paths");
        const matches = result.html.match(/<div class="dep-path">/g);
        expect(matches).toHaveLength(2);
        expect(result.html).toContain("express");
        expect(result.html).toContain("koa");
      });

      it("returns capped heading when dependencyPaths reach cap", () => {
        const report = buildReportData({
          ...BASE_PARAMS,
          findings: [
            makeFinding({
              dependencyPaths: [
                ["app", "a", "lodash"],
                ["app", "b", "lodash"],
                ["app", "c", "lodash"],
                ["app", "d", "lodash"],
                ["app", "e", "lodash"],
              ],
            }),
          ],
        });
        const result = renderDependencyPathsHtml(report.findings[0]);
        expect(result.heading).toBe("Known dependency paths (first 5 shown)");
        const matches = result.html.match(/<div class="dep-path">/g);
        expect(matches).toHaveLength(5);
      });
    });
  });

  describe("dev dependency badge", () => {
    it("renders 'direct · dev' badge with dev CSS class for devDependency findings", () => {
      const finding = makeFinding({
        pkg: { name: "lodash", version: "4.17.20", ecosystem: "npm", dev: true },
        relationship: "direct",
      });
      const html = renderHtmlReport(buildReportData({ ...BASE_PARAMS, findings: [finding] }));
      expect(html).toContain('class="rel-badge dev"');
      expect(html).toContain("direct · dev");
    });

    it("renders normal 'direct' badge without dev class for prod findings", () => {
      const finding = makeFinding({
        pkg: { name: "lodash", version: "4.17.20", ecosystem: "npm", dev: false },
        relationship: "direct",
      });
      const html = renderHtmlReport(buildReportData({ ...BASE_PARAMS, findings: [finding] }));
      expect(html).toContain('class="rel-badge direct"');
      expect(html).not.toContain("· dev");
    });
  });

  describe("renderHtmlReport CVE card", () => {
    it("renders a Packages card and a CVEs card", () => {
      const findings = [
        makeFinding({
          vulnerabilities: [
            makeVuln({ id: "CVE-2021-001" }),
            makeVuln({ id: "CVE-2021-002" }),
          ],
          cveAliases: ["CVE-2021-001", "CVE-2021-002"],
        }),
        makeFinding({
          pkg: { name: "express", version: "4.0.0", ecosystem: "npm" },
          vulnerabilities: [makeVuln({ id: "CVE-2021-003" })],
          cveAliases: ["CVE-2021-003"],
        }),
      ];
      const data = buildReportData({ ...BASE_PARAMS, findings });
      const html = renderHtmlReport(data);
      expect(html).toContain('<span class="label">Packages</span>');
      expect(html).toContain('<span class="label">CVEs</span>');
      expect(html).toContain('<span class="count">3</span>'); // 3 total CVEs
      expect(html).not.toContain('<span class="label">Total</span>');
    });
  });
});

describe("writeHtmlReport", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "cve-lite-test-"));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("creates the output directory if it does not exist", async () => {
    const outputDir = path.join(tmpDir, "nested", "report");
    const data = buildReportData(BASE_PARAMS);
    await writeHtmlReport({ outputDir, data, autoOpen: false });
    expect(fs.existsSync(outputDir)).toBe(true);
  });

  it("writes index.html to the output directory", async () => {
    const outputDir = path.join(tmpDir, "report");
    const data = buildReportData(BASE_PARAMS);
    await writeHtmlReport({ outputDir, data, autoOpen: false });
    expect(fs.existsSync(path.join(outputDir, "index.html"))).toBe(true);
  });

  it("writes report.json to the output directory", async () => {
    const outputDir = path.join(tmpDir, "report");
    const data = buildReportData(BASE_PARAMS);
    await writeHtmlReport({ outputDir, data, autoOpen: false });
    expect(fs.existsSync(path.join(outputDir, "report.json"))).toBe(true);
  });

  it("report.json is valid JSON matching ReportData", async () => {
    const outputDir = path.join(tmpDir, "report");
    const data = buildReportData(BASE_PARAMS);
    await writeHtmlReport({ outputDir, data, autoOpen: false });
    const json = JSON.parse(fs.readFileSync(path.join(outputDir, "report.json"), "utf8"));
    expect(json.cliVersion).toBe("1.8.0");
    expect(json.findings).toHaveLength(1);
  });

  it("returns the reportPath as the absolute path to index.html", async () => {
    const outputDir = path.join(tmpDir, "report");
    const data = buildReportData(BASE_PARAMS);
    const result = await writeHtmlReport({ outputDir, data, autoOpen: false });
    expect(result.reportPath).toBe(path.join(outputDir, "index.html"));
  });

  it("overwrites existing files on a second call", async () => {
    const outputDir = path.join(tmpDir, "report");
    const data1 = buildReportData({ ...BASE_PARAMS, cliVersion: "1.0.0" });
    const data2 = buildReportData({ ...BASE_PARAMS, cliVersion: "2.0.0" });
    await writeHtmlReport({ outputDir, data: data1, autoOpen: false });
    await writeHtmlReport({ outputDir, data: data2, autoOpen: false });
    const json = JSON.parse(fs.readFileSync(path.join(outputDir, "report.json"), "utf8"));
    expect(json.cliVersion).toBe("2.0.0");
  });

  it("throws with descriptive path when mkdirSync fails", async () => {
    const brokenDir = path.join(tmpDir, "broken");
    const writeSpy = jest.spyOn(fs, "mkdirSync").mockImplementation(() => {
      throw new Error("ENOSPC: no space left on device");
    });
    try {
      const data = buildReportData(BASE_PARAMS);
      await expect(writeHtmlReport({ outputDir: brokenDir, data, autoOpen: false }))
        .rejects.toThrow(/Failed to create report directory/);
    } finally {
      writeSpy.mockRestore();
    }
  });

  it("throws with descriptive path when writeFileSync fails and cleans up partial files", async () => {
    const outputDir = path.join(tmpDir, "cleanup-test");
    const writeSpy = jest.spyOn(fs, "writeFileSync").mockImplementation(() => {
      throw new Error("ENOSPC: no space left on device");
    });
    try {
      const data = buildReportData(BASE_PARAMS);
      await expect(writeHtmlReport({ outputDir, data, autoOpen: false }))
        .rejects.toThrow(/Failed to write HTML report/);
      expect(fs.existsSync(outputDir)).toBe(false);
    } finally {
      writeSpy.mockRestore();
    }
  });

  it("preserves pre-existing directory when writeFileSync fails", async () => {
    const outputDir = path.join(tmpDir, "pre-existing");
    fs.mkdirSync(outputDir, { recursive: true });
    const marker = path.join(outputDir, "existing-file.txt");
    fs.writeFileSync(marker, "do not delete me");
    const writeSpy = jest.spyOn(fs, "writeFileSync").mockImplementation((filePath: fs.PathOrFileDescriptor) => {
      const base = typeof filePath === "string" ? path.basename(filePath) : "";
      if (base === "index.html" || base === "report.json") {
        throw new Error("ENOSPC: no space left on device");
      }
      return undefined;
    });
    try {
      const data = buildReportData(BASE_PARAMS);
      await expect(writeHtmlReport({ outputDir, data, autoOpen: false }))
        .rejects.toThrow(/Failed to write HTML report/);
      expect(fs.existsSync(outputDir)).toBe(true);
      expect(fs.existsSync(marker)).toBe(true);
    } finally {
      writeSpy.mockRestore();
    }
  });

  it("error contains cause chain with the original filesystem error", async () => {
    const outputDir = path.join(tmpDir, "cause-test");
    const originalError = new Error("ENOSPC: no space left on device");
    const writeSpy = jest.spyOn(fs, "writeFileSync").mockImplementation(() => {
      throw originalError;
    });
    try {
      const data = buildReportData(BASE_PARAMS);
      let thrown: unknown;
      try {
        await writeHtmlReport({ outputDir, data, autoOpen: false });
      } catch (err) {
        thrown = err;
      }
      expect(thrown).toBeInstanceOf(Error);
      expect((thrown as Error).cause).toBe(originalError);
    } finally {
      writeSpy.mockRestore();
    }
  });
});

describe("scan completeness HTML rendering", () => {
  it("does not render a banner when completeness is not set (undefined)", () => {
    const data = buildReportData(BASE_PARAMS);
    const html = renderHtmlReport(data);
    expect(html).not.toContain("Scan data is incomplete");
  });

  it("does not render a banner for a complete scan", () => {
    const data = buildReportData({ ...BASE_PARAMS, completeness: { complete: true, diagnostics: [] } });
    const html = renderHtmlReport(data);
    expect(html).not.toContain("Scan data is incomplete");
  });

  it("renders an incomplete-scan banner with diagnostics when complete is false", () => {
    const data = buildReportData({
      ...BASE_PARAMS,
      completeness: {
        complete: false,
        diagnostics: [
          { code: "OSV_DETAIL_TRANSIENT_FAILURE", severity: "warning", message: "3 lookups failed", impact: "detection", count: 3 },
          { code: "PACKUMENT_FETCH_FAILURE", severity: "warning", message: "1 packument fetch failed", impact: "remediation", count: 1 },
        ],
      },
    });
    const html = renderHtmlReport(data);
    expect(html).toContain("Scan data is incomplete");
    expect(html).toContain("Some vulnerability findings may be incomplete, and some remediation guidance may also be unavailable");
    expect(html).toContain("3 lookups failed");
    expect(html).toContain("1 packument fetch failed");
  });

  it("describes remediation-only diagnostics without implying missed findings", () => {
    const data = buildReportData({
      ...BASE_PARAMS,
      completeness: {
        complete: false,
        diagnostics: [
          { code: "PACKUMENT_FETCH_FAILURE", severity: "warning", message: "1 packument fetch failed", impact: "remediation", count: 1 },
        ],
      },
    });
    const html = renderHtmlReport(data);

    expect(html).toContain("Vulnerability findings are available, but remediation guidance may be incomplete");
    expect(html).not.toContain("Some vulnerability findings may be incomplete");
  });

  it("escapes diagnostic messages", () => {
    const data = buildReportData({
      ...BASE_PARAMS,
      completeness: {
        complete: false,
        diagnostics: [
          { code: "OSV_DETAIL_TRANSIENT_FAILURE", severity: "warning", message: '<script>alert("x")</script>', impact: "detection", count: 1 },
        ],
      },
    });
    const html = renderHtmlReport(data);

    expect(html).toContain("&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;");
    expect(html).not.toContain('<li class="diag-item warning detection"><script>');
  });
});

describe("renderHtmlReport - prod/dev split note", () => {
  it("includes sev-dev-note when some findings are dev-only", () => {
    const findings = [
      makeFinding({ pkg: { name: "a", version: "1.0.0", ecosystem: "npm", dev: false } }),
      makeFinding({ pkg: { name: "b", version: "1.0.0", ecosystem: "npm", dev: true } }),
    ];
    const html = renderHtmlReport(buildReportData({ ...BASE_PARAMS, findings }));
    expect(html).toContain('<div class="sev-dev-note">');
    expect(html).toContain("1 of 2");
    expect(html).toContain("prod dependencies");
  });

  it("omits sev-dev-note when all findings are prod", () => {
    const findings = [
      makeFinding({ pkg: { name: "a", version: "1.0.0", ecosystem: "npm", dev: false } }),
    ];
    const html = renderHtmlReport(buildReportData({ ...BASE_PARAMS, findings }));
    expect(html).not.toContain("prod dependencies");
  });

  it("omits sev-dev-note when dev flag is unavailable on all findings", () => {
    const findings = [
      makeFinding({ pkg: { name: "a", version: "1.0.0", ecosystem: "npm" } }),
    ];
    const html = renderHtmlReport(buildReportData({ ...BASE_PARAMS, findings }));
    expect(html).not.toContain("prod dependencies");
  });
});
