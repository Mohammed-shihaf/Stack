import {
  buildSuggestedFixCommandPlan,
  findFixTargetForFinding,
  findSuggestedCommandForFinding,
  planVersionForFinding,
} from "../../src/remediation/fix-commands.js";
import { buildSarifOutput } from "../../src/output/sarif.js";
import { buildCycloneDxBom } from "../../src/output/cyclonedx.js";
import { isBreakingUpgrade } from "../../src/utils/version.js";
import type { Finding, ScanInput } from "../../src/types.js";

// Regression coverage for #1007 / #1113 / #1152: a transitive finding whose
// remediation is a within-range refresh (parent-update) names the PARENT in
// `package` and used to store the CHILD's version in `targetVersion`. Keyed by
// package name alone that target merged with the direct fix for the parent and
// the child's version won the "higher version" comparison, producing
// `npm install axios@4.0.6` - a version of axios that does not exist (4.0.6 is
// form-data's). #1113 split the keyspace so the command is correct. #1152
// keeps targetVersion as this package's version and moves the child onto
// childPackage / childTargetVersion.

function scanInput(): ScanInput {
  return {
    mode: "resolved-lockfile",
    source: "package-lock",
    filePath: "/tmp/package-lock.json",
    packages: [
      { name: "axios", version: "1.16.1", ecosystem: "npm" },
      { name: "js-yaml", version: "4.1.1", ecosystem: "npm" },
      { name: "form-data", version: "4.0.5", ecosystem: "npm" },
      { name: "follow-redirects", version: "1.15.0", ecosystem: "npm" },
      { name: "qs", version: "6.11.0", ecosystem: "npm" },
    ],
    notes: [],
    warnings: [],
    skippedDependencies: [],
  };
}

function directAxios(): Finding {
  return {
    pkg: { name: "axios", version: "1.16.1", ecosystem: "npm" },
    vulnerabilities: [{ id: "GHSA-axios-0001" }],
    severity: "high",
    cveAliases: [],
    dependencyPaths: [["project", "axios"]],
    relationship: "direct",
    firstFixedVersion: "1.19.0",
    validatedFirstFixedVersion: "1.19.0",
  };
}

function directJsYaml(): Finding {
  return {
    pkg: { name: "js-yaml", version: "4.1.1", ecosystem: "npm" },
    vulnerabilities: [{ id: "GHSA-js-yaml-0001" }],
    severity: "high",
    cveAliases: [],
    dependencyPaths: [["project", "js-yaml"]],
    relationship: "direct",
    firstFixedVersion: "4.3.1",
    validatedFirstFixedVersion: "4.3.1",
  };
}

function withinRangeChildOfAxios(name: string, installed: string, target: string): Finding {
  return {
    pkg: { name, version: installed, ecosystem: "npm" },
    vulnerabilities: [{ id: `GHSA-${name}-0001` }],
    severity: "high",
    cveAliases: [],
    dependencyPaths: [["project", "axios", name]],
    relationship: "transitive",
    firstFixedVersion: target,
    validatedFirstFixedVersion: target,
    recommendedNpmTransitiveRemediation: {
      kind: "update-parent-within-range",
      package: "axios",
      currentVersion: "1.16.1",
      targetChildVersion: target,
      viaPath: ["project", "axios", name],
      reason: `axios@1.16.1 already allows ${name}@${target} within the current dependency range`,
    },
  };
}

describe("buildSuggestedFixCommandPlan - parent-update targets do not merge with install targets (#1007)", () => {
  it("keeps the direct fix version for the parent when a child is refreshed within the parent's range", () => {
    const axios = directAxios();
    const jsYaml = directJsYaml();
    const formData = withinRangeChildOfAxios("form-data", "4.0.5", "4.0.6");

    const plan = buildSuggestedFixCommandPlan([axios, jsYaml, formData], scanInput());
    expect(plan).not.toBeNull();

    const axiosInstall = plan!.targets.find(t => t.package === "axios" && t.kind === "direct");
    expect(axiosInstall).toMatchObject({ currentVersion: "1.16.1", targetVersion: "1.19.0" });

    // The refresh is still there, as its own target. targetVersion is axios's
    // own version (unchanged); form-data's destination lives on the child fields.
    const formDataRefresh = plan!.targets.find(t => t.kind === "parent-update");
    expect(formDataRefresh).toMatchObject({
      package: "axios",
      currentVersion: "1.16.1",
      targetVersion: "1.16.1",
      childPackage: "form-data",
      childTargetVersion: "4.0.6",
      command: "npm update axios",
    });
    expect(isBreakingUpgrade(formDataRefresh!.currentVersion!, formDataRefresh!.targetVersion)).toBe(false);

    // The emitted command never pins axios to form-data's version.
    expect(plan!.command).toContain("npm install axios@1.19.0 js-yaml@4.3.1");
    expect(plan!.command).not.toContain("axios@4.0.6");
    for (const section of plan!.sections) {
      expect(section.command).not.toContain("axios@4.0.6");
    }

    // Every finding still resolves to its own target and its own command.
    expect(findFixTargetForFinding(plan!, axios)?.targetVersion).toBe("1.19.0");
    expect(findFixTargetForFinding(plan!, jsYaml)?.targetVersion).toBe("4.3.1");
    expect(findFixTargetForFinding(plan!, formData)?.targetVersion).toBe("1.16.1");
    expect(findFixTargetForFinding(plan!, formData)?.childTargetVersion).toBe("4.0.6");
    expect(planVersionForFinding(plan!, formData)).toBe("4.0.6");
    expect(findSuggestedCommandForFinding(plan!, axios)).toBe("npm install axios@1.19.0");
    expect(findSuggestedCommandForFinding(plan!, formData)).toBe("npm update axios");
    expect(plan!.coveredFindingCount).toBe(3);
  });

  it("does not merge two within-range refreshes of different children through the same parent", () => {
    const formData = withinRangeChildOfAxios("form-data", "4.0.5", "4.0.6");
    const followRedirects = withinRangeChildOfAxios("follow-redirects", "1.15.0", "1.15.6");

    const plan = buildSuggestedFixCommandPlan([formData, followRedirects], scanInput());
    expect(plan).not.toBeNull();

    // Two distinct children keep their own targets. Each names axios at its
    // own version; the child's destination is on the child fields, so neither
    // row reads as a downgrade of axios or a three-major upgrade.
    const refreshes = plan!.targets.filter(t => t.kind === "parent-update");
    expect(refreshes).toHaveLength(2);
    expect(refreshes.every(t => t.package === "axios" && t.targetVersion === "1.16.1")).toBe(true);
    expect(refreshes.map(t => t.childPackage).sort()).toEqual(["follow-redirects", "form-data"]);
    expect(refreshes.map(t => t.childTargetVersion).sort()).toEqual(["1.15.6", "4.0.6"]);
    for (const refresh of refreshes) {
      expect(isBreakingUpgrade(refresh.currentVersion!, refresh.targetVersion)).toBe(false);
    }

    // The same refresh command is only emitted once.
    expect(plan!.command).toBe("npm update axios");

    expect(findFixTargetForFinding(plan!, formData)?.childTargetVersion).toBe("4.0.6");
    expect(findFixTargetForFinding(plan!, followRedirects)?.childTargetVersion).toBe("1.15.6");
    expect(planVersionForFinding(plan!, formData)).toBe("4.0.6");
    expect(planVersionForFinding(plan!, followRedirects)).toBe("1.15.6");
    expect(plan!.coveredFindingCount).toBe(2);
  });

  it("does not attach a later child to an earlier sibling when the child's destination equals the parent's current version", () => {
    // childA sorts first (form-data < qs). childB's destination equals axios's
    // current version, which used to match childA via targetVersion fallthrough.
    const childA = withinRangeChildOfAxios("form-data", "4.0.5", "4.0.6");
    const childB = withinRangeChildOfAxios("qs", "6.11.0", "1.16.1");

    const plan = buildSuggestedFixCommandPlan([childA, childB], scanInput());
    expect(plan).not.toBeNull();

    const refreshes = plan!.targets.filter(t => t.kind === "parent-update");
    expect(refreshes.map(t => t.childPackage)).toEqual(["form-data", "qs"]);
    expect(refreshes[0]!.targetVersion).toBe(childB.recommendedNpmTransitiveRemediation!.targetChildVersion);

    const targetB = findFixTargetForFinding(plan!, childB);
    expect(targetB?.childPackage).toBe("qs");
    expect(targetB?.childTargetVersion).toBe("1.16.1");
    expect(targetB?.childPackage).not.toBe("form-data");
    expect(findFixTargetForFinding(plan!, childA)?.childPackage).toBe("form-data");
    expect(planVersionForFinding(plan!, childB)).toBe("1.16.1");

    const sarif = buildSarifOutput([childA, childB], "package-lock.json", "1.0.0", plan);
    const resultB = sarif.runs[0]!.results.find(r => r.message.text.includes("qs@"));
    expect(resultB?.properties?.childPackage).toBe("qs");
    expect(resultB?.properties?.childTargetVersion).toBe("1.16.1");
    expect(resultB?.properties?.childPackage).not.toBe("form-data");

    const bom = buildCycloneDxBom(scanInput().packages, [childA, childB], null, "1.0.0", plan);
    const vulnB = bom.vulnerabilities.find(v => v.id === "GHSA-qs-0001");
    const byName = Object.fromEntries((vulnB?.properties ?? []).map(p => [p.name, p.value]));
    expect(byName["cve-lite:child-package"]).toBe("qs");
    expect(byName["cve-lite:child-target-version"]).toBe("1.16.1");
    expect(byName["cve-lite:child-package"]).not.toBe("form-data");
  });

  it("keeps the child's destination on targetVersion when the named package is the child itself", () => {
    const finding: Finding = {
      pkg: { name: "js-cookie", version: "3.0.6", ecosystem: "npm" },
      vulnerabilities: [{ id: "GHSA-js-cookie-0001" }],
      severity: "high",
      cveAliases: [],
      dependencyPaths: [["project", "@aws-amplify/core", "js-cookie"]],
      relationship: "transitive",
      firstFixedVersion: "3.0.7",
      validatedFirstFixedVersion: "3.0.7",
      recommendedNpmTransitiveRemediation: {
        kind: "update-parent-within-range",
        package: "js-cookie",
        currentVersion: "3.0.6",
        targetChildVersion: "3.0.7",
        viaPath: ["project", "@aws-amplify/core", "js-cookie"],
        reason: "js-cookie can be refreshed within @aws-amplify/core's declared range.",
      },
    };

    const plan = buildSuggestedFixCommandPlan([finding], scanInput());
    expect(plan!.targets).toEqual([
      expect.objectContaining({
        package: "js-cookie",
        currentVersion: "3.0.6",
        targetVersion: "3.0.7",
        kind: "parent-update",
        command: "npm update js-cookie",
      }),
    ]);
    expect(plan!.targets[0]!.childPackage).toBeUndefined();
    expect(plan!.targets[0]!.childTargetVersion).toBeUndefined();
    expect(findFixTargetForFinding(plan!, finding)?.targetVersion).toBe("3.0.7");
    expect(planVersionForFinding(plan!, finding)).toBe("3.0.7");
  });

  it("still merges repeated install targets for the same package to the highest version (no regression)", () => {
    const lower: Finding = { ...directAxios(), firstFixedVersion: "1.17.0", validatedFirstFixedVersion: "1.17.0", vulnerabilities: [{ id: "GHSA-axios-0002" }] };
    const higher = directAxios();

    const plan = buildSuggestedFixCommandPlan([lower, higher], scanInput());
    expect(plan).not.toBeNull();
    expect(plan!.targets).toHaveLength(1);
    expect(plan!.targets[0]).toMatchObject({ package: "axios", kind: "direct", targetVersion: "1.19.0" });
    expect(plan!.command).toBe("npm install axios@1.19.0");
  });
});
