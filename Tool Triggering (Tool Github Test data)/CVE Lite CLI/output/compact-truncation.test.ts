import { jest } from "@jest/globals";
import {
  COMPACT_COMMAND_GROUP_LIMIT,
  formatCompactCommandGroupTruncationNotice,
  formatCompactFindingTruncationNotice,
} from "../../src/output/compact-truncation.js";
import { printCompactOutput } from "../../src/output/printers.js";
import { buildSuggestedFixCommandPlan } from "../../src/remediation/fix-commands.js";
import { stripAnsi } from "../../src/utils/chalk.js";
import type { Finding, ScanInput, SeverityLabel } from "../../src/types.js";

function finding(
  name: string,
  severity: SeverityLabel,
  relationship: Finding["relationship"] = "direct",
  extras: Partial<Finding> = {},
): Finding {
  return {
    pkg: { name, version: "1.0.0", ecosystem: "npm" },
    vulnerabilities: [{ id: `OSV-${name}` }],
    severity,
    cveAliases: [],
    dependencyPaths: relationship === "direct" ? [["project", name]] : [["project", "parent", name]],
    relationship,
    firstFixedVersion: null,
    recommendedParentUpgrade: undefined,
    recommendedNpmTransitiveRemediation: undefined,
    ...extras,
  };
}

function captureLogs(run: () => void): string {
  const logs: string[] = [];
  const spy = jest.spyOn(console, "log").mockImplementation((...args: unknown[]) => {
    logs.push(args.map(arg => String(arg)).join(" "));
  });
  try {
    run();
  } finally {
    spy.mockRestore();
  }
  return logs.map(line => stripAnsi(line)).join("\n");
}

function createScanInput(): ScanInput {
  return {
    mode: "resolved-lockfile",
    source: "package-lock",
    filePath: "/tmp/package-lock.json",
    packages: [],
    notes: [],
    warnings: [],
    skippedDependencies: [],
  };
}

function parentUpdateFinding(name: string, parent: string, severity: SeverityLabel): Finding {
  return finding(name, severity, "transitive", {
    pkg: { name, version: "5.0.0", ecosystem: "npm" },
    dependencyPaths: [["project", parent, name]],
    firstFixedVersion: "5.0.1",
    recommendedNpmTransitiveRemediation: {
      kind: "update-parent-within-range",
      package: parent,
      currentVersion: "10.0.0",
      targetChildVersion: "5.1.0",
      viaPath: ["project", parent, name],
      reason: `${parent} already permits a safe version`,
    },
  });
}

function parentUpgradeFinding(name: string, parent: string, severity: SeverityLabel): Finding {
  return finding(name, severity, "transitive", {
    pkg: { name, version: "4.17.20", ecosystem: "npm" },
    dependencyPaths: [["project", parent, name]],
    firstFixedVersion: "4.17.21",
    recommendedParentUpgrade: {
      package: parent,
      currentVersion: "1.0.0",
      targetVersion: "1.1.0",
      viaPath: ["project", parent, name],
      vulnerablePackage: name,
      confidence: "verified",
      reason: `${parent}@1.1.0 no longer allows ${name}@4.17.20`,
    },
  });
}

function chainUpgradeFinding(name: string, parent: string, severity: SeverityLabel): Finding {
  return finding(name, severity, "transitive", {
    pkg: { name, version: "1.8.3", ecosystem: "npm" },
    dependencyPaths: [["project", parent, name]],
    firstFixedVersion: "1.9.0",
    chainResolution: {
      directDep: parent,
      directDepCurrentVersion: "9.2.1",
      targetVersion: "9.2.4",
      chain: [],
      safeVersion: "1.9.0",
      command: `npm install ${parent}@9.2.4`,
      coveredPaths: 1,
      totalPaths: 1,
    },
  });
}

function sixSectionFindings(): Finding[] {
  return [
    finding("minimist", "critical", "direct", { firstFixedVersion: "1.2.8" }),
    parentUpgradeFinding("lodash", "app", "high"),
    parentUpdateFinding("diff", "mocha", "high"),
    parentUpdateFinding("qs", "express", "medium"),
    chainUpgradeFinding("shell-quote", "concurrently", "low"),
    parentUpgradeFinding("minimatch", "glob", "low"),
  ];
}

describe("formatCompactFindingTruncationNotice", () => {
  it("returns null when every finding is shown", () => {
    expect(formatCompactFindingTruncationNotice(3, 3)).toBeNull();
    expect(formatCompactFindingTruncationNotice(1, 1)).toBeNull();
    expect(formatCompactFindingTruncationNotice(0, 0)).toBeNull();
  });

  it("derives the shown and total counts from the hidden remainder", () => {
    expect(formatCompactFindingTruncationNotice(3, 54)).toBe(
      "Showing 3 of 54 findings. Run --verbose --all to see them all.",
    );
    expect(formatCompactFindingTruncationNotice(0, 12)).toBe(
      "Showing 0 of 12 findings. Run --verbose --all to see them all.",
    );
  });
});

describe("formatCompactCommandGroupTruncationNotice", () => {
  it("returns null when no command groups were withheld", () => {
    expect(formatCompactCommandGroupTruncationNotice([])).toBeNull();
  });

  it("derives the count and unique severities from the hidden sections", () => {
    expect(formatCompactCommandGroupTruncationNotice([
      { severity: "medium" },
      { severity: "low" },
      { severity: "low" },
    ])).toBe("3 more command groups (medium, low). Run --verbose to see them.");
  });

  it("uses a singular label for one hidden group and keeps first-seen severity order", () => {
    expect(formatCompactCommandGroupTruncationNotice([
      { severity: "unknown" },
    ])).toBe("1 more command group (unknown). Run --verbose to see them.");

    expect(formatCompactCommandGroupTruncationNotice([
      { severity: "low" },
      { severity: "medium" },
    ])).toBe("2 more command groups (low, medium). Run --verbose to see them.");
  });
});

describe("printCompactOutput truncation disclosure", () => {
  it("does not announce truncation when every finding block is shown", () => {
    const output = captureLogs(() => {
      printCompactOutput(
        [finding("lodash", "critical"), finding("express", "high")],
        createScanInput(),
      );
    });

    expect(output).toContain("lodash@1.0.0");
    expect(output).toContain("express@1.0.0");
    expect(output).not.toContain("Showing ");
    expect(output).not.toContain("more command group");
  });

  it("discloses suppressed finding blocks after the last shown block", () => {
    const findings = [
      finding("critical-1", "critical"),
      finding("critical-2", "critical"),
      finding("critical-3", "critical"),
      ...Array.from({ length: 51 }, (_, index) => finding(`medium-${index + 1}`, "medium")),
    ];

    const output = captureLogs(() => {
      printCompactOutput(findings, createScanInput());
    });

    expect(output).toContain("critical-1@1.0.0");
    expect(output).toContain("critical-2@1.0.0");
    expect(output).toContain("critical-3@1.0.0");
    expect(output).not.toContain("medium-1@1.0.0");
    expect(output).toContain("Showing 3 of 54 findings. Run --verbose --all to see them all.");
    expect(output.indexOf("critical-3@1.0.0")).toBeLessThan(
      output.indexOf("Showing 3 of 54 findings. Run --verbose --all to see them all."),
    );
    expect(output.indexOf("Showing 3 of 54 findings. Run --verbose --all to see them all.")).toBeLessThan(
      output.indexOf("Summary"),
    );
  });

  it("discloses withheld command groups after the last shown section", () => {
    const findings = sixSectionFindings();
    const plan = buildSuggestedFixCommandPlan(findings, createScanInput());
    expect(plan).not.toBeNull();
    expect(plan!.sections.length).toBeGreaterThan(COMPACT_COMMAND_GROUP_LIMIT);

    const hidden = plan!.sections.slice(COMPACT_COMMAND_GROUP_LIMIT);
    const expectedNotice = formatCompactCommandGroupTruncationNotice(hidden);
    expect(expectedNotice).not.toBeNull();

    const output = captureLogs(() => {
      printCompactOutput(findings, createScanInput());
    });

    const shownTitles = plan!.sections.slice(0, COMPACT_COMMAND_GROUP_LIMIT).map(s => s.title);
    const hiddenTitles = hidden.map(s => s.title);
    for (const title of shownTitles) {
      expect(output).toContain(title);
    }
    for (const title of hiddenTitles) {
      expect(output).not.toContain(title);
    }
    expect(output).toContain(expectedNotice!);
    expect(output.lastIndexOf(shownTitles[shownTitles.length - 1]!)).toBeLessThan(
      output.indexOf(expectedNotice!),
    );
    expect(output.indexOf(expectedNotice!)).toBeLessThan(output.indexOf("Summary"));
  });

  it("does not disclose command groups when the plan fits within the cap", () => {
    const findings = [
      finding("minimist", "critical", "direct", { firstFixedVersion: "1.2.8" }),
      parentUpgradeFinding("lodash", "app", "high"),
    ];
    const plan = buildSuggestedFixCommandPlan(findings, createScanInput());
    expect(plan!.sections.length).toBeLessThanOrEqual(COMPACT_COMMAND_GROUP_LIMIT);

    const output = captureLogs(() => {
      printCompactOutput(findings, createScanInput());
    });

    expect(output).toContain("Vulnerabilities found");
    expect(output).not.toContain("more command group");
  });

  it("does not disclose finding truncation under --all because the table already prints them", () => {
    const findings = [
      finding("critical-1", "critical"),
      finding("critical-2", "critical"),
      finding("critical-3", "critical"),
      ...Array.from({ length: 51 }, (_, index) => finding(`medium-${index + 1}`, "medium")),
    ];

    const output = captureLogs(() => {
      printCompactOutput(findings, createScanInput(), { all: true });
    });

    expect(output).not.toContain("Showing ");
    expect(output).toContain("Vulnerability findings");
    expect(output).toContain("medium-1");
  });
});
