import { applyFixesIfRequested } from "../src/utils/fix-runner.js";
import type { SuggestedFixCommandPlan, SuggestedFixTarget } from "../src/remediation/fix-commands.js";
import type { ParsedOptions } from "../src/types.js";

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

function plan(targets: SuggestedFixTarget[]): SuggestedFixCommandPlan {
  return {
    packageManager: "npm",
    sourceLabel: "package-lock.json",
    command: null,
    sections: [],
    targets,
    skipped: [],
    coveredFindingCount: 0,
    totalFindingCount: 0,
  };
}

const options = { quiet: true } as unknown as ParsedOptions;

function recordingRunner() {
  const calls: string[] = [];
  const run = async (command: string, args: string[]) => {
    calls.push([command, ...args].join(" "));
    return { status: 0 as number | null, error: null as Error | null };
  };
  return { calls, run };
}

describe("applyFixesIfRequested - within-range refresh auto-apply", () => {
  it("runs the scoped refresh command for a parent-update target and counts it as applied", async () => {
    const { calls, run } = recordingRunner();
    const result = await applyFixesIfRequested({
      plan: plan([
        target({
          kind: "parent-update",
          package: "follow-redirects",
          currentVersion: "1.14.0",
          targetVersion: "1.16.0",
          command: "npm update -w packages/api follow-redirects",
        }),
      ]),
      projectPath: "/tmp/proj",
      totalFindings: 1,
      options,
      runCommand: run,
    });

    expect(calls).toEqual(["npm update -w packages/api follow-redirects"]);
    expect(result.appliedFixCount).toBe(1);
    expect(result.appliedWithinRangeRefreshCount).toBe(1);
    expect(result.applied.map(a => a.package)).toContain("follow-redirects");
    // A within-range refresh that was applied must not also appear as "not auto-applied".
    expect(result.note).toBeNull();
  });

  it("applies both direct upgrades and within-range refreshes together", async () => {
    const { calls, run } = recordingRunner();
    const result = await applyFixesIfRequested({
      plan: plan([
        target({ kind: "direct", package: "axios", currentVersion: "0.21.1", targetVersion: "0.33.0" }),
        target({ kind: "parent-update", package: "follow-redirects", currentVersion: "1.14.0", targetVersion: "1.16.0", command: "npm update follow-redirects" }),
      ]),
      projectPath: "/tmp/proj",
      totalFindings: 2,
      options,
      runCommand: run,
    });

    expect(calls).toContain("npm install axios@0.33.0");
    expect(calls).toContain("npm update follow-redirects");
    expect(result.appliedFixCount).toBe(2);
    expect(result.appliedWithinRangeRefreshCount).toBe(1);
  });

  it("applies a direct fix scoped to its workspace member, not flat at root", async () => {
    const { calls, run } = recordingRunner();
    await applyFixesIfRequested({
      plan: plan([
        target({ kind: "direct", package: "axios", currentVersion: "0.21.1", targetVersion: "0.33.0", workspaces: ["packages/api"] }),
      ]),
      projectPath: "/tmp/proj",
      totalFindings: 1,
      options,
      runCommand: run,
    });

    expect(calls).toEqual(["npm install -w packages/api axios@0.33.0"]);
    expect(calls).not.toContain("npm install axios@0.33.0");
  });

  it("still applies a flat install for a direct fix outside a workspace", async () => {
    const { calls, run } = recordingRunner();
    await applyFixesIfRequested({
      plan: plan([
        target({ kind: "direct", package: "axios", currentVersion: "0.21.1", targetVersion: "0.33.0" }),
      ]),
      projectPath: "/tmp/proj",
      totalFindings: 1,
      options,
      runCommand: run,
    });

    expect(calls).toEqual(["npm install axios@0.33.0"]);
  });

  it("spawns a shared parent-update command once when two children refresh through the same parent", async () => {
    const { calls, run } = recordingRunner();
    const result = await applyFixesIfRequested({
      plan: plan([
        target({
          kind: "parent-update",
          package: "axios",
          currentVersion: "1.16.1",
          targetVersion: "1.16.1",
          childPackage: "form-data",
          childTargetVersion: "4.0.6",
          command: "npm update axios",
        }),
        target({
          kind: "parent-update",
          package: "axios",
          currentVersion: "1.16.1",
          targetVersion: "1.16.1",
          childPackage: "follow-redirects",
          childTargetVersion: "1.15.11",
          command: "npm update axios",
        }),
      ]),
      projectPath: "/tmp/proj",
      totalFindings: 2,
      options,
      runCommand: run,
    });

    expect(calls).toEqual(["npm update axios"]);
    expect(result.appliedFixCount).toBe(2);
    expect(result.appliedWithinRangeRefreshCount).toBe(2);
    expect(result.applied).toEqual([
      expect.objectContaining({ package: "axios", from: "1.16.1", to: "1.16.1", childPackage: "form-data", childTargetVersion: "4.0.6" }),
      expect.objectContaining({ package: "axios", from: "1.16.1", to: "1.16.1", childPackage: "follow-redirects", childTargetVersion: "1.15.11" }),
    ]);
  });

  it("reports nothing applied only when there are no direct or within-range targets", async () => {
    const { calls, run } = recordingRunner();
    const result = await applyFixesIfRequested({
      plan: plan([
        target({ kind: "parent-upgrade", package: "nx", currentVersion: "21.0.0", targetVersion: "22.0.0" }),
      ]),
      projectPath: "/tmp/proj",
      totalFindings: 1,
      options,
      runCommand: run,
    });

    expect(calls).toEqual([]);
    expect(result.appliedFixCount).toBe(0);
    expect(result.note).toContain("No fixes were auto-applied");
    expect(result.parentUpgradeCount).toBe(1);
  });
});
