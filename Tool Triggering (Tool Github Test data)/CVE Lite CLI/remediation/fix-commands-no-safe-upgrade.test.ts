import { buildSuggestedFixCommandPlan } from "../../src/remediation/fix-commands.js";
import type { Finding, ScanInput } from "../../src/types.js";

function scanInput(): ScanInput {
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

function directFinding(overrides: Partial<Finding> = {}): Finding {
  return {
    pkg: { name: "tmp", version: "0.2.5", ecosystem: "npm" },
    vulnerabilities: [{ id: "GHSA-test-0000-0000" }],
    severity: "high",
    cveAliases: [],
    dependencyPaths: [["project", "tmp"]],
    relationship: "direct",
    firstFixedVersion: "0.2.7",
    ...overrides,
  };
}

// #1213: a finding carrying a confirmed fix version was routed to `skipped` as
// having no safe upgrade, and the package described as possibly unmaintained,
// in the same scan that named the fix. The decision was derived from comparing
// two counters that separate passes maintained, and the confirmation pass
// advanced only one of them, so a single-version window left them equal.
describe("buildSuggestedFixCommandPlan - no-safe-upgrade routing (#1213)", () => {
  it("never reports no safe upgrade when a fix version was confirmed", () => {
    const plan = buildSuggestedFixCommandPlan([directFinding({
      validatedFirstFixedVersion: "0.2.7",
      validatedTargetScannedVersions: 1,
      validatedTargetKnownVulnerableVersions: 1,
    } as Partial<Finding>)], scanInput());

    expect(plan).not.toBeNull();
    expect(plan!.skipped).toHaveLength(0);
    expect(plan!.coveredFindingCount).toBe(1);
    expect(plan!.command).toContain("tmp@0.2.7");
  });

  it("still reports no safe upgrade when nothing was confirmed and every candidate is affected", () => {
    const plan = buildSuggestedFixCommandPlan([directFinding({
      validatedFirstFixedVersion: null,
      validatedTargetScannedVersions: 4,
      validatedTargetKnownVulnerableVersions: 4,
    } as Partial<Finding>)], scanInput());

    expect(plan).not.toBeNull();
    expect(plan!.skipped).toHaveLength(1);
    expect(plan!.skipped[0]!.reason).toContain("No safe upgrade");
    expect(plan!.skipped[0]!.reason).toContain("may be unmaintained");
    expect(plan!.coveredFindingCount).toBe(0);
  });

  it("uses a singular verb for a single scanned version", () => {
    const plan = buildSuggestedFixCommandPlan([directFinding({
      validatedFirstFixedVersion: null,
      validatedTargetScannedVersions: 1,
      validatedTargetKnownVulnerableVersions: 1,
    } as Partial<Finding>)], scanInput());

    expect(plan!.skipped[0]!.reason).toContain("all 1 scanned version is still known-vulnerable");
  });

  it("uses a plural verb for several scanned versions", () => {
    const plan = buildSuggestedFixCommandPlan([directFinding({
      validatedFirstFixedVersion: null,
      validatedTargetScannedVersions: 3,
      validatedTargetKnownVulnerableVersions: 3,
    } as Partial<Finding>)], scanInput());

    expect(plan!.skipped[0]!.reason).toContain("all 3 scanned versions are still known-vulnerable");
  });
});
