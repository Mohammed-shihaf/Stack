import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { buildSuggestedFixCommandPlan, findFixTargetForFinding, findSuggestedCommandForFinding } from "../../src/remediation/fix-commands.js";
import type { Finding, ScanInput } from "../../src/types.js";

function pnpmScanInput(filePath = "/tmp/pnpm-lock.yaml"): ScanInput {
  return {
    mode: "resolved-lockfile",
    source: "pnpm-lock",
    filePath,
    packages: [],
    notes: [],
    warnings: [],
    skippedDependencies: [],
  };
}

// Writes a minimal pnpm-lock.yaml declaring each package in a workspace member,
// so buildPnpmWorkspaceMap attributes the package to that member. Returns the path.
function writePnpmWorkspaceLock(membersByPackage: Record<string, { member: string; version: string }>): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pnpm-ws-"));
  const importers: Record<string, string[]> = {};
  for (const [pkg, { member, version }] of Object.entries(membersByPackage)) {
    (importers[member] ??= []).push(
      `      '${pkg}':\n        specifier: '*'\n        version: ${version}`,
    );
  }
  const importerBlocks = Object.entries(importers)
    .map(([member, deps]) => `  ${member}:\n    dependencies:\n${deps.join("\n")}`)
    .join("\n");
  const content = `lockfileVersion: '9.0'\nimporters:\n${importerBlocks}\n`;
  const file = path.join(dir, "pnpm-lock.yaml");
  fs.writeFileSync(file, content);
  return file;
}

// A transitive finding whose fix is a within-range lockfile refresh, scoped to a
// single workspace member (workspaces attribution lives on the finding's
// remediation, so this needs no real lockfile).
function pnpmWithinRangeRefreshFinding(workspaces: string[]): Finding {
  return {
    pkg: { name: "js-cookie", version: "3.0.1", ecosystem: "npm" },
    vulnerabilities: [{ id: "GHSA-qjx8-664m-686j" }],
    severity: "high",
    cveAliases: [],
    dependencyPaths: [["project", "@aws-amplify/core", "js-cookie"]],
    relationship: "transitive",
    firstFixedVersion: "3.0.5",
    recommendedNpmTransitiveRemediation: {
      kind: "update-parent-within-range",
      package: "js-cookie",
      currentVersion: "3.0.1",
      targetChildVersion: "3.0.5",
      viaPath: ["project", "@aws-amplify/core", "js-cookie"],
      reason: "@aws-amplify/core@6.16.1 already allows js-cookie@3.0.5 within the current dependency range",
      workspaces,
    },
  };
}

describe("buildSuggestedFixCommandPlan - pnpm workspace command scoping", () => {
  it("scopes a within-range refresh to a single member with --filter, not -C", () => {
    const finding = pnpmWithinRangeRefreshFinding(["client"]);
    const plan = buildSuggestedFixCommandPlan([finding], pnpmScanInput());

    const target = findFixTargetForFinding(plan!, finding);
    expect(target?.command).toBe("pnpm --filter ./client update --no-save js-cookie");
    expect(target?.command).not.toContain("pnpm -C ");
  });

  it("emits a plain refresh command (no filter) when the package is at the workspace root", () => {
    const finding = pnpmWithinRangeRefreshFinding(["."]);
    const plan = buildSuggestedFixCommandPlan([finding], pnpmScanInput());

    const target = findFixTargetForFinding(plan!, finding);
    expect(target?.command).toBe("pnpm update --no-save js-cookie");
  });

  it("emits a plain refresh command (no filter) when there is no workspace", () => {
    const finding = pnpmWithinRangeRefreshFinding([]);
    const plan = buildSuggestedFixCommandPlan([finding], pnpmScanInput());

    const target = findFixTargetForFinding(plan!, finding);
    expect(target?.command).toBe("pnpm update --recursive --no-save js-cookie");
  });
});

// A transitive finding whose fix is a breaking parent upgrade (install), where
// the parent package is a direct dependency of a workspace member.
function pnpmParentUpgradeFinding(parent: string, currentVersion: string, targetVersion: string): Finding {
  return {
    pkg: { name: "some-vuln-transitive", version: "1.0.0", ecosystem: "npm" },
    vulnerabilities: [{ id: "GHSA-parent-upgrade" }],
    severity: "high",
    cveAliases: [],
    dependencyPaths: [["project", parent, "some-vuln-transitive"]],
    relationship: "transitive",
    firstFixedVersion: "2.0.0",
    recommendedParentUpgrade: {
      package: parent,
      currentVersion,
      targetVersion,
      viaPath: ["project", parent, "some-vuln-transitive"],
      vulnerablePackage: "some-vuln-transitive",
      confidence: "verified",
      reason: `${parent}@${targetVersion} resolves some-vuln-transitive to 2.0.0`,
    },
  };
}

describe("buildSuggestedFixCommandPlan - pnpm workspace parent-upgrade scoping", () => {
  it("scopes a parent-upgrade install to the member that declares it with --filter, not a flat root add", () => {
    const lock = writePnpmWorkspaceLock({
      "@angular-devkit/build-angular": { member: "client", version: "21.2.6" },
    });
    const finding = pnpmParentUpgradeFinding("@angular-devkit/build-angular", "21.2.6", "22.1.0");

    const plan = buildSuggestedFixCommandPlan([finding], pnpmScanInput(lock));

    expect(plan?.command).toBe("pnpm --filter ./client add @angular-devkit/build-angular@22.1.0");
    expect(plan?.command).not.toBe("pnpm add @angular-devkit/build-angular@22.1.0");
  });

  it("splits parent upgrades in different members into separate per-member commands", () => {
    const lock = writePnpmWorkspaceLock({
      "@angular-devkit/build-angular": { member: "client", version: "21.2.6" },
      "@nestjs/platform-express": { member: "server", version: "11.0.0" },
    });
    const angular = pnpmParentUpgradeFinding("@angular-devkit/build-angular", "21.2.6", "22.1.0");
    const nest = pnpmParentUpgradeFinding("@nestjs/platform-express", "11.0.0", "11.1.28");

    const plan = buildSuggestedFixCommandPlan([angular, nest], pnpmScanInput(lock));

    expect(plan?.command).toContain("pnpm --filter ./client add @angular-devkit/build-angular@22.1.0");
    expect(plan?.command).toContain("pnpm --filter ./server add @nestjs/platform-express@11.1.28");
    // Never a single flat add mixing both members.
    expect(plan?.command).not.toMatch(/pnpm add @angular-devkit\/build-angular@22\.1\.0 @nestjs\/platform-express/);
  });

  it("still emits a flat root add for a parent that is a genuine root-level dependency", () => {
    const lock = writePnpmWorkspaceLock({
      "@angular-devkit/build-angular": { member: ".", version: "21.2.6" },
    });
    const finding = pnpmParentUpgradeFinding("@angular-devkit/build-angular", "21.2.6", "22.1.0");

    const plan = buildSuggestedFixCommandPlan([finding], pnpmScanInput(lock));

    expect(plan?.command).toBe("pnpm add @angular-devkit/build-angular@22.1.0");
    expect(plan?.command).not.toContain("--filter");
  });
});

function npmScanInput(filePath: string): ScanInput {
  return {
    mode: "resolved-lockfile",
    source: "package-lock",
    filePath,
    packages: [],
    notes: [],
    warnings: [],
    skippedDependencies: [],
  };
}

// Minimal package-lock.json declaring each package in a workspace member path.
function writeNpmWorkspaceLock(membersByPackage: Record<string, string>): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "npm-ws-"));
  const packages: Record<string, unknown> = { "": { name: "root" } };
  for (const [pkg, member] of Object.entries(membersByPackage)) {
    packages[member] = { dependencies: { [pkg]: "^1.0.0" } };
  }
  const file = path.join(dir, "package-lock.json");
  fs.writeFileSync(file, JSON.stringify({ lockfileVersion: 3, packages }));
  return file;
}

// npm's transitive resolver produces an "upgrade-parent-to-version" remediation
// (branch distinct from the pnpm-applicable recommendedParentUpgrade path).
function npmParentUpgradeFinding(parent: string, currentVersion: string, targetVersion: string): Finding {
  return {
    pkg: { name: "some-vuln-transitive", version: "1.0.0", ecosystem: "npm" },
    vulnerabilities: [{ id: "GHSA-npm-parent-upgrade" }],
    severity: "high",
    cveAliases: [],
    dependencyPaths: [["project", parent, "some-vuln-transitive"]],
    relationship: "transitive",
    firstFixedVersion: "2.0.0",
    recommendedNpmTransitiveRemediation: {
      kind: "upgrade-parent-to-version",
      package: parent,
      currentVersion,
      targetVersion,
      targetChildVersion: "2.0.0",
      viaPath: ["project", parent, "some-vuln-transitive"],
      reason: `${parent}@${targetVersion} no longer allows some-vuln-transitive@1.0.0 and allows 2.0.0+`,
    },
  };
}

// A transitive finding whose fix is a validated chain upgrade of the direct
// parent (the path a real pnpm workspace scan hits, distinct from the
// recommendedParentUpgrade/upgrade-parent-to-version branches).
function pnpmChainUpgradeFinding(directDep: string, currentVersion: string, targetVersion: string): Finding {
  return {
    pkg: { name: "shell-quote", version: "1.8.3", ecosystem: "npm" },
    vulnerabilities: [{ id: "GHSA-395f-4hp3-45gv" }],
    severity: "critical",
    cveAliases: [],
    dependencyPaths: [["project", directDep, "shell-quote"]],
    relationship: "transitive",
    firstFixedVersion: "1.9.0",
    chainResolution: {
      directDep,
      directDepCurrentVersion: currentVersion,
      targetVersion,
      chain: [],
      safeVersion: "1.9.0",
      command: `pnpm add ${directDep}@${targetVersion}`,
      coveredPaths: 1,
      totalPaths: 1,
    },
  };
}

describe("buildSuggestedFixCommandPlan - pnpm workspace chain-upgrade scoping", () => {
  it("scopes a validated chain parent-upgrade to the member that declares the direct dep", () => {
    const lock = writePnpmWorkspaceLock({
      concurrently: { member: "packages/tooling", version: "9.2.1" },
    });
    const finding = pnpmChainUpgradeFinding("concurrently", "9.2.1", "9.2.4");

    const plan = buildSuggestedFixCommandPlan([finding], pnpmScanInput(lock));

    expect(plan?.command).toBe("pnpm --filter ./packages/tooling add concurrently@9.2.4");
    expect(plan?.command).not.toBe("pnpm add concurrently@9.2.4");
  });

  // findSuggestedCommandForFinding feeds the per-finding runnableFixCommand used
  // by JSON, the HTML per-finding view, and CycloneDX - it must be scoped too,
  // not just the combined plan.command.
  it("returns a workspace-scoped per-finding command (runnableFixCommand), not the flat chain command", () => {
    const lock = writePnpmWorkspaceLock({
      concurrently: { member: "packages/tooling", version: "9.2.1" },
    });
    const finding = pnpmChainUpgradeFinding("concurrently", "9.2.1", "9.2.4");

    const plan = buildSuggestedFixCommandPlan([finding], pnpmScanInput(lock))!;
    const command = findSuggestedCommandForFinding(plan, finding);

    expect(command).toBe("pnpm --filter ./packages/tooling add concurrently@9.2.4");
    expect(command).not.toBe("pnpm add concurrently@9.2.4");
  });

  // The raw per-target `command` field is exposed in JSON output and embedded in
  // the HTML report's data, so it must be scoped too - no flat command anywhere.
  it("normalizes the raw target command to the workspace-scoped form", () => {
    const lock = writePnpmWorkspaceLock({
      concurrently: { member: "packages/tooling", version: "9.2.1" },
    });
    const finding = pnpmChainUpgradeFinding("concurrently", "9.2.1", "9.2.4");

    const plan = buildSuggestedFixCommandPlan([finding], pnpmScanInput(lock))!;
    const target = findFixTargetForFinding(plan, finding);

    expect(target?.command).toBe("pnpm --filter ./packages/tooling add concurrently@9.2.4");
    expect(target?.command).not.toBe("pnpm add concurrently@9.2.4");
  });
});

describe("buildSuggestedFixCommandPlan - npm workspace parent-upgrade scoping", () => {
  it("scopes an npm parent-upgrade install to the member that declares it with -w", () => {
    const lock = writeNpmWorkspaceLock({ "eslint": "packages/api" });
    const finding = npmParentUpgradeFinding("eslint", "8.0.0", "9.0.0");

    const plan = buildSuggestedFixCommandPlan([finding], npmScanInput(lock));

    expect(plan?.command).toBe("npm install -w packages/api eslint@9.0.0");
    expect(plan?.command).not.toBe("npm install eslint@9.0.0");
  });
});

function bunScanInput(filePath: string): ScanInput {
  return {
    mode: "resolved-lockfile",
    source: "bun-lock",
    filePath,
    packages: [],
    notes: [],
    warnings: [],
    skippedDependencies: [],
  };
}

// Minimal bun.lock declaring each package in a workspace member. Packages listed
// in rootPackages are additionally declared by the root workspace, which bun keys
// as "" rather than ".".
function writeBunWorkspaceLock(
  membersByPackage: Record<string, string>,
  rootPackages: string[] = [],
): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "bun-ws-"));
  const rootDeps: Record<string, string> = {};
  for (const pkg of rootPackages) rootDeps[pkg] = "9.2.1";
  const workspaces: Record<string, unknown> = {
    "": { name: "root", workspaces: ["packages/*"], devDependencies: rootDeps },
  };
  for (const [pkg, member] of Object.entries(membersByPackage)) {
    workspaces[member] = { name: member.split("/").pop(), devDependencies: { [pkg]: "9.2.1" } };
  }
  const file = path.join(dir, "bun.lock");
  fs.writeFileSync(file, JSON.stringify({ lockfileVersion: 0, workspaces, packages: {} }));
  return file;
}

// Bun's parser does not yet produce parent-upgrade recommendations for transitive
// findings (its dependency-path modeling is incomplete - tracked separately), so
// this path is not reachable through a real bun scan today. This test constructs
// the finding directly to verify that WHEN a bun parent-upgrade is produced, the
// fix command is correctly scoped to the workspace member with --filter.
describe("buildSuggestedFixCommandPlan - bun workspace parent-upgrade scoping", () => {
  it("scopes a bun parent-upgrade install to the member that declares it with --filter", () => {
    const lock = writeBunWorkspaceLock({ concurrently: "packages/tooling" });
    const finding = pnpmParentUpgradeFinding("concurrently", "9.2.1", "9.2.4");

    const plan = buildSuggestedFixCommandPlan([finding], bunScanInput(lock));

    expect(plan?.command).toBe("bun add --filter packages/tooling concurrently@9.2.4");
    expect(plan?.command).not.toBe("bun add concurrently@9.2.4");
  });

  // Bun keys its root workspace "", while npm normalises the same thing to "."
  // before storing it. Every consumer drops the root with `w !== "."`, which never
  // matches "", so the root survived into the flag list and rendered as a valueless
  // `--filter `. Pasting that command fails.
  it("does not emit a valueless --filter when the root workspace also declares the package", () => {
    const lock = writeBunWorkspaceLock({ concurrently: "packages/tooling" }, ["concurrently"]);
    const finding = pnpmParentUpgradeFinding("concurrently", "9.2.1", "9.2.4");

    const plan = buildSuggestedFixCommandPlan([finding], bunScanInput(lock));

    expect(plan?.command).not.toMatch(/--filter(\s|$)(?!\S)/);
    expect(plan?.command).toBe("bun add --filter packages/tooling concurrently@9.2.4");
  });

  it("emits a flat add when only the root workspace declares the package", () => {
    const lock = writeBunWorkspaceLock({}, ["concurrently"]);
    const finding = pnpmParentUpgradeFinding("concurrently", "9.2.1", "9.2.4");

    const plan = buildSuggestedFixCommandPlan([finding], bunScanInput(lock));

    expect(plan?.command).toBe("bun add concurrently@9.2.4");
  });
});

// A package can enter the plan twice: once as a chain-resolution target (upgrade
// the parent far enough to pull a safe child) and once as a direct target for its
// OWN advisories. upsertTarget raises targetVersion to the higher of the two, but
// the explicit `command` string built for the lower version used to survive the
// merge, so buildTargetCommand returned it and the user was handed a version the
// scanner had already determined was still vulnerable. Seen on CopilotKit, where
// nx merged a chain command at 22.5.1 with a direct target validated at 22.7.7.
function directFindingNeedingHigherVersion(
  name: string,
  installed: string,
  hint: string,
  validated: string,
): Finding {
  return {
    pkg: { name, version: installed, ecosystem: "npm" },
    vulnerabilities: [{ id: "GHSA-direct-0000" }],
    severity: "high",
    cveAliases: [],
    dependencyPaths: [["project", name]],
    relationship: "direct",
    firstFixedVersion: hint,
    validatedFirstFixedVersion: validated,
    validatedTargetScannedVersions: 18,
    validatedTargetKnownVulnerableVersions: 17,
    fixVersionValidationNote: `Advisory fixed-version hint ${hint} is still known vulnerable for ${name}; using lowest known non-vulnerable version ${validated}.`,
  };
}

describe("buildSuggestedFixCommandPlan - stale command after a raised merge", () => {
  it("does not keep a chain command built for a lower version than the merged target", () => {
    const chain = pnpmChainUpgradeFinding("nx", "22.5.0", "22.5.1");
    const direct = directFindingNeedingHigherVersion("nx", "22.5.0", "22.7.2", "22.7.7");

    const plan = buildSuggestedFixCommandPlan([chain, direct], pnpmScanInput());
    const target = plan?.targets.find(t => t.package === "nx");

    expect(target?.targetVersion).toBe("22.7.7");
    expect(plan?.command).not.toContain("nx@22.5.1");
    expect(findSuggestedCommandForFinding(plan!, direct)).toBe("pnpm add nx@22.7.7");
  });

  it("keeps the chain command when no higher direct target merges in", () => {
    const chain = pnpmChainUpgradeFinding("nx", "22.5.0", "22.5.1");

    const plan = buildSuggestedFixCommandPlan([chain], pnpmScanInput());

    expect(plan?.command).toContain("nx@22.5.1");
  });
});

// The adjustment note narrates one specific version ("using lowest known
// non-vulnerable version 4.20.0"). When a direct target merges with a
// parent-upgrade target for the same package and the parent-upgrade version
// wins, inheriting the direct target's note leaves it contradicting the Target
// column it prints beside. Seen on examples/open-source-friday-demo: express
// showed Target 4.22.3 with a note saying "using ... 4.20.0".
describe("buildSuggestedFixCommandPlan - adjustment note after a merge", () => {
  function directAdjusted(name: string, installed: string, hint: string, validated: string): Finding {
    return {
      pkg: { name, version: installed, ecosystem: "npm" },
      vulnerabilities: [{ id: "GHSA-adj-0000" }],
      severity: "medium",
      cveAliases: [],
      dependencyPaths: [["project", name]],
      relationship: "direct",
      firstFixedVersion: hint,
      validatedFirstFixedVersion: validated,
      validatedTargetScannedVersions: 10,
      validatedTargetKnownVulnerableVersions: 9,
      fixVersionValidationNote: `Advisory fixed-version hint ${hint} is still known vulnerable for ${name}; using lowest known non-vulnerable version ${validated}.`,
    };
  }

  it("does not keep a note naming a version the merge has moved away from", () => {
    const direct = directAdjusted("express", "4.17.1", "4.19.2", "4.20.0");
    const parentUpgrade = pnpmParentUpgradeFinding("express", "4.17.1", "4.22.3");

    const plan = buildSuggestedFixCommandPlan([direct, parentUpgrade], pnpmScanInput());
    const target = plan?.targets.find(t => t.package === "express");

    expect(target?.targetVersion).toBe("4.22.3");
    expect(target?.adjustmentNote ?? "").not.toContain("4.20.0");
  });

  it("keeps the note when no higher target merges in", () => {
    const direct = directAdjusted("express", "4.17.1", "4.19.2", "4.20.0");

    const plan = buildSuggestedFixCommandPlan([direct], pnpmScanInput());
    const target = plan?.targets.find(t => t.package === "express");

    expect(target?.targetVersion).toBe("4.20.0");
    expect(target?.adjustmentNote).toContain("4.20.0");
  });
});

// The Advisory column replaced a 297-character prose note. It shows what the
// advisory originally suggested so the table can convey the adjustment without
// a sentence beside it, and it is always present so a reader never has to work
// out why a column vanished.
describe("SuggestedFixTarget.advisoryVersion", () => {
  function adjusted(name: string, installed: string, hint: string, validated: string): Finding {
    return {
      pkg: { name, version: installed, ecosystem: "npm" },
      vulnerabilities: [{ id: "GHSA-adv-0000" }],
      severity: "high",
      cveAliases: [],
      dependencyPaths: [["project", name]],
      relationship: "direct",
      firstFixedVersion: hint,
      validatedFirstFixedVersion: validated,
      validatedTargetScannedVersions: 3,
      validatedTargetKnownVulnerableVersions: 2,
    };
  }

  it("carries the advisory hint even when validation moved the target", () => {
    const plan = buildSuggestedFixCommandPlan(
      [adjusted("lodash", "4.17.20", "4.17.21", "4.18.0")],
      pnpmScanInput(),
    );
    const target = plan?.targets.find(t => t.package === "lodash");

    expect(target?.advisoryVersion).toBe("4.17.21");
    expect(target?.targetVersion).toBe("4.18.0");
  });

  it("carries the advisory hint when it matches the target", () => {
    const plan = buildSuggestedFixCommandPlan(
      [adjusted("lodash", "4.17.20", "4.17.21", "4.17.21")],
      pnpmScanInput(),
    );

    expect(plan?.targets.find(t => t.package === "lodash")?.advisoryVersion).toBe("4.17.21");
  });
});
