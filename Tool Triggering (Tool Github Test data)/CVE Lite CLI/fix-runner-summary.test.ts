import { jest } from "@jest/globals";
import { categorizeUnappliedTargets, printFixModeSummary } from "../src/utils/fix-runner.js";
import type { FixExecutionResult } from "../src/utils/fix-runner.js";
import type { SuggestedFixCommandPlan, SuggestedFixTarget } from "../src/remediation/fix-commands.js";
import type { SeverityLabel } from "../src/types.js";

function target(overrides: Partial<SuggestedFixTarget>): SuggestedFixTarget {
  return {
    package: "pkg",
    currentVersion: "1.0.0",
    targetVersion: "1.0.1",
    kind: "direct",
    urgent: true,
    severity: "high",
    adjusted: false,
    adjustmentNote: null,
    reason: "",
    usage: null,
    ...overrides,
  };
}

function plan(targets: SuggestedFixTarget[], skippedCount: number): SuggestedFixCommandPlan {
  return {
    packageManager: "npm",
    sourceLabel: "package-lock.json",
    command: null,
    sections: [],
    targets,
    skipped: Array.from({ length: skippedCount }, (_, i) => ({
      package: `skip-${i}`,
      version: "1.0.0",
      relationship: "transitive" as const,
      reason: "no fix",
    })),
    coveredFindingCount: 0,
    totalFindingCount: 0,
  };
}

describe("categorizeUnappliedTargets", () => {
  it("does not count within-range refreshes or direct targets - both are auto-applied", () => {
    const result = categorizeUnappliedTargets(plan([
      target({ kind: "direct", package: "applied-direct" }),
      target({ kind: "parent-update", package: "refresh-a" }),
      target({ kind: "parent-update", package: "refresh-b" }),
      target({ kind: "parent-upgrade", package: "up", currentVersion: "1.0.0", targetVersion: "1.2.0" }),
    ], 0));

    // Only parent upgrades and no-fix records are "not auto-applied".
    expect(result.parentUpgradeCount).toBe(1);
    expect(result).not.toHaveProperty("withinRangeRefreshCount");
  });

  it("counts breaking major-bump parent upgrades as a subset of parent upgrades", () => {
    const result = categorizeUnappliedTargets(plan([
      target({ kind: "parent-upgrade", package: "major", currentVersion: "21.2.6", targetVersion: "22.1.0" }),
      target({ kind: "parent-upgrade", package: "minor", currentVersion: "9.2.1", targetVersion: "9.2.4" }),
    ], 0));

    expect(result.parentUpgradeCount).toBe(2);
    expect(result.breakingUpgradeCount).toBe(1);
  });

  it("counts skip records as no-fix", () => {
    const result = categorizeUnappliedTargets(plan([
      target({ kind: "direct", package: "applied-direct" }),
      target({ kind: "parent-update", package: "refresh" }),
    ], 3));

    expect(result.noFixCount).toBe(3);
    expect(result.parentUpgradeCount).toBe(0);
    expect(result.breakingUpgradeCount).toBe(0);
  });
});

describe("printFixModeSummary", () => {
  const noSeverity: Record<SeverityLabel, number> = { critical: 0, high: 0, medium: 0, low: 0, unknown: 0 };

  function capture(result: FixExecutionResult, before: number, after: number): string {
    const spy = jest.spyOn(console, "log").mockImplementation(() => {});
    try {
      printFixModeSummary({ fixResult: result, findingsBeforeFix: before, findingsAfterFix: after, remainingBySeverity: noSeverity });
      return spy.mock.calls.map(c => String(c[0])).join("\n");
    } finally {
      spy.mockRestore();
    }
  }

  it("renders an honest categorized breakdown with no 'v1 skip' jargon", () => {
    const out = capture({
      appliedFixCount: 0,
      appliedWithinRangeRefreshCount: 0,
      applied: [],
      note: null,
      parentUpgradeCount: 27,
      breakingUpgradeCount: 27,
      noFixCount: 1,
    }, 45, 45);

    expect(out).toContain("Not auto-applied: 28");
    expect(out).toContain("Parent upgrades (review + test): 27");
    expect(out).toContain("27 breaking");
    expect(out).toContain("No fix available: 1");
    expect(out).not.toContain("v1 skip");
    expect(out).not.toContain("Skipped findings");
  });

  it("notes applied within-range refreshes in the applied count", () => {
    const out = capture({
      appliedFixCount: 4,
      appliedWithinRangeRefreshCount: 3,
      applied: [],
      note: null,
      parentUpgradeCount: 0,
      breakingUpgradeCount: 0,
      noFixCount: 0,
    }, 5, 1);

    expect(out).toContain("Applied fixes: 4");
    expect(out).toContain("incl. 3 within-range refreshes");
  });

  it("names the refreshed child on parent-update applied lines instead of repeating the parent's version", () => {
    const out = capture({
      appliedFixCount: 2,
      appliedWithinRangeRefreshCount: 2,
      applied: [
        { package: "axios", from: "1.16.1", to: "1.16.1", childPackage: "form-data", childTargetVersion: "4.0.6" },
        { package: "axios", from: "1.16.1", to: "1.16.1", childPackage: "follow-redirects", childTargetVersion: "1.15.11" },
      ],
      note: null,
      parentUpgradeCount: 0,
      breakingUpgradeCount: 0,
      noFixCount: 0,
    }, 2, 0);

    expect(out).toContain("refresh form-data to 4.0.6");
    expect(out).toContain("refresh follow-redirects to 1.15.11");
    const parentOnlyLines = out.split("\n").filter(line =>
      line.includes("axios") && line.includes("1.16.1") && !line.includes("form-data") && !line.includes("follow-redirects"),
    );
    expect(parentOnlyLines).toHaveLength(0);
  });

  it("omits the breaking note when no upgrade is a major bump", () => {
    const out = capture({
      appliedFixCount: 1,
      appliedWithinRangeRefreshCount: 0,
      applied: [{ package: "axios", from: "0.21.1", to: "0.33.0" }],
      note: null,
      parentUpgradeCount: 2,
      breakingUpgradeCount: 0,
      noFixCount: 0,
    }, 3, 2);

    expect(out).toContain("Parent upgrades (review + test): 2");
    expect(out).not.toContain("breaking");
  });
});
