import { buildSuggestedFixCommandPlan, findFixTargetForFinding } from "../../src/remediation/fix-commands.js";
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

function transitiveFindingWithParentUpgrade(confidence: "verified" | "unverified"): Finding {
  return {
    pkg: { name: "brace-expansion", version: "2.1.2", ecosystem: "npm" },
    vulnerabilities: [{ id: "GHSA-mh99-v99m-4gvg" }],
    severity: "high",
    cveAliases: ["CVE-2026-9999"],
    dependencyPaths: [["project", "jest", "brace-expansion"]],
    relationship: "transitive",
    firstFixedVersion: "5.0.8",
    recommendedParentUpgrade: {
      package: "jest",
      currentVersion: "30.4.1",
      targetVersion: "30.4.2",
      viaPath: ["project", "jest", "brace-expansion"],
      vulnerablePackage: "brace-expansion",
      confidence,
      reason: confidence === "verified"
        ? "jest@30.4.2 resolves brace-expansion to 5.0.8, at or above the fix 5.0.8"
        : "jest@30.4.2 may resolve brace-expansion, but this could not be verified; rescan after upgrading to confirm",
    },
  };
}

describe("buildSuggestedFixCommandPlan - unverified parent upgrade coverage", () => {
  it("does not count a finding whose only fix is an unverified parent upgrade as covered", () => {
    const finding = transitiveFindingWithParentUpgrade("unverified");
    const plan = buildSuggestedFixCommandPlan([finding], scanInput());

    expect(plan).not.toBeNull();
    expect(plan!.totalFindingCount).toBe(1);
    expect(plan!.coveredFindingCount).toBe(0);

    const target = findFixTargetForFinding(plan!, finding);
    expect(target?.confidence).toBe("unverified");
  });

  it("counts a finding fixed by a verified parent upgrade as covered (no regression)", () => {
    const finding = transitiveFindingWithParentUpgrade("verified");
    const plan = buildSuggestedFixCommandPlan([finding], scanInput());

    expect(plan).not.toBeNull();
    expect(plan!.totalFindingCount).toBe(1);
    expect(plan!.coveredFindingCount).toBe(1);

    const target = findFixTargetForFinding(plan!, finding);
    expect(target?.confidence).toBe("verified");
  });

  it("still counts a direct fix as covered when it has no recommendedParentUpgrade at all", () => {
    const finding: Finding = {
      pkg: { name: "minimist", version: "0.0.8", ecosystem: "npm" },
      vulnerabilities: [{ id: "CVE-2020-7598" }],
      severity: "critical",
      cveAliases: ["CVE-2020-7598"],
      dependencyPaths: [["project", "minimist"]],
      relationship: "direct",
      firstFixedVersion: "1.2.8",
      recommendedParentUpgrade: undefined,
    };

    const plan = buildSuggestedFixCommandPlan([finding], scanInput());

    expect(plan).not.toBeNull();
    expect(plan!.coveredFindingCount).toBe(1);
    expect(plan!.totalFindingCount).toBe(1);

    const target = findFixTargetForFinding(plan!, finding);
    expect(target?.confidence).toBeUndefined();
  });

  it("still counts a direct fix as covered when it shares a target package with an unrelated unverified parent upgrade (#896 merge regression)", () => {
    // A direct jest CVE fixed by jest 30.4.1 -> 30.4.2, plus an unrelated
    // transitive brace-expansion finding whose UNVERIFIED parent upgrade
    // recommends the same jest 30.4.2. They merge into one target; the direct
    // fix must keep its coverage credit (coverage is per-finding, not per-target).
    const directJest: Finding = {
      pkg: { name: "jest", version: "30.4.1", ecosystem: "npm" },
      vulnerabilities: [{ id: "GHSA-jest-0001" }],
      severity: "high",
      cveAliases: [],
      dependencyPaths: [["project", "jest"]],
      relationship: "direct",
      firstFixedVersion: "30.4.2",
      recommendedParentUpgrade: undefined,
    };
    const unverifiedTransitive = transitiveFindingWithParentUpgrade("unverified");

    const plan = buildSuggestedFixCommandPlan([directJest, unverifiedTransitive], scanInput());

    expect(plan).not.toBeNull();
    expect(plan!.totalFindingCount).toBe(2);
    // The direct jest fix is covered; only the unverified transitive one is not.
    expect(plan!.coveredFindingCount).toBe(1);
  });
});
