import fs from "node:fs";
import path from "node:path";
import { jest } from "@jest/globals";
import { loadPackages } from "../src/parsers/index.js";
import { loadNpmLockGraph } from "../src/parsers/npm-lock-graph.js";
import { buildSuggestedFixCommandPlan } from "../src/remediation/fix-commands.js";
import { clearPackumentCache, resolveLowestKnownNonVulnerableVersion } from "../src/remediation/npm-registry.js";
import { resolveNpmTransitiveRemediation } from "../src/remediation/npm-transitive-resolution.js";
import { resolveRecommendedParentUpgrade } from "../src/remediation/parent-upgrade.js";
import { isPrivateRegistrySource, isGitSource, hasCommitShaPinning } from "../src/utils/advisory.js";
import type { Finding, PackageRef, ScanInput } from "../src/types.js";
import { mockPackumentsByPackage } from "./helpers/registry-mock.js";

const examplesDir = path.join(process.cwd(), "examples");

function loadFixture(name: string): ScanInput {
  return loadPackages(path.join(examplesDir, name), false, 4);
}

function itWithFixture(name: string, testName: string, testFn: () => void): void {
  const fixtureTest = fs.existsSync(path.join(examplesDir, name)) ? it : it.skip;
  fixtureTest(testName, testFn);
}

function requirePackage(scanInput: ScanInput, name: string, version?: string): PackageRef {
  const pkg = scanInput.packages.find(
    item => item.name === name && (version === undefined || item.version === version),
  );
  if (!pkg) {
    const versionSuffix = version ? `@${version}` : "";
    throw new Error(`Expected fixture to include ${name}${versionSuffix}`);
  }
  return pkg;
}

function findingFor(
  scanInput: ScanInput,
  packageName: string,
  overrides: Partial<Finding>,
): Finding {
  const pkg = requirePackage(scanInput, packageName);
  return {
    pkg,
    vulnerabilities: [{ id: `OSV-${packageName}` }],
    severity: "high",
    cveAliases: [],
    dependencyPaths: pkg.paths ?? [["project", packageName]],
    relationship: "direct",
    firstFixedVersion: null,
    ...overrides,
  };
}

describe("fixture remediation scans", () => {
  it("suggests a package-lock refresh for wrong-parent instead of upgrading the parent", () => {
    const scanInput = loadFixture("wrong-parent");
    const finding = findingFor(scanInput, "js-cookie", {
      relationship: "transitive",
      firstFixedVersion: "3.0.7",
      recommendedNpmTransitiveRemediation: {
        kind: "update-parent-within-range",
        package: "js-cookie",
        currentVersion: "3.0.6",
        targetChildVersion: "3.0.7",
        viaPath: ["project", "@aws-amplify/core", "js-cookie"],
        reason: "js-cookie can be refreshed within @aws-amplify/core's declared range.",
      },
    });

    const plan = buildSuggestedFixCommandPlan([finding], scanInput);

    expect(plan?.packageManager).toBe("npm");
    expect(plan?.command).toBe("npm update js-cookie");
    expect(plan?.targets).toEqual([
      expect.objectContaining({
        package: "js-cookie",
        kind: "parent-update",
      }),
    ]);
    expect(plan?.targets).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ package: "@aws-amplify/core", kind: "parent-upgrade" }),
      ]),
    );
  });

  itWithFixture(
    "yarn-within-range",
    "suggests a yarn lockfile refresh for yarn-within-range instead of upgrading the parent",
    () => {
      const scanInput = loadFixture("yarn-within-range");
      const finding = findingFor(scanInput, "js-cookie", {
        relationship: "transitive",
        firstFixedVersion: "3.0.7",
        dependencyPaths: [["project", "@aws-amplify/core", "js-cookie"]],
        recommendedNpmTransitiveRemediation: {
          kind: "update-parent-within-range",
          package: "@aws-amplify/core",
          currentVersion: "6.16.1",
          targetChildVersion: "3.0.7",
          viaPath: ["project", "@aws-amplify/core", "js-cookie"],
          reason: "js-cookie can be refreshed within @aws-amplify/core's declared range.",
        },
      });

      const plan = buildSuggestedFixCommandPlan([finding], scanInput);

      expect(plan?.packageManager).toBe("yarn");
      expect(plan?.command).toBe("yarn upgrade js-cookie");
      expect(plan?.targets).toEqual([
        expect.objectContaining({
          package: "js-cookie",
          kind: "parent-update",
        }),
      ]);
      expect(plan?.targets).not.toEqual(
        expect.arrayContaining([
          expect.objectContaining({ package: "@aws-amplify/core", kind: "parent-upgrade" }),
        ]),
      );
    },
  );

  describe("exact-pinned-intermediate", () => {
    let originalFetch: typeof fetch;
    const fetchMock = jest.fn<typeof fetch>();

    beforeEach(() => {
      originalFetch = global.fetch;
      fetchMock.mockReset();
      global.fetch = fetchMock as unknown as typeof fetch;
      clearPackumentCache();
    });

    afterEach(() => {
      global.fetch = originalFetch;
    });

    itWithFixture(
      "exact-pinned-intermediate",
      "detects exact-pinned qs via the analysis layer and suggests a parent upgrade instead of npm update qs",
      async () => {
        const fixtureName = "exact-pinned-intermediate";
        const scanInput = loadFixture(fixtureName);
        const graph = loadNpmLockGraph(path.join(examplesDir, fixtureName, "package-lock.json"));
        const directDependencyNames = new Set(["express"]);
        const finding = findingFor(scanInput, "qs", {
          relationship: "transitive",
          severity: "medium",
          // 6.14.3 is within ~6.14.0 but outside body-parser's exact pin (=6.14.2).
          firstFixedVersion: "6.14.3",
          validatedFirstFixedVersion: "6.14.3",
          dependencyPaths: [["project", "express", "body-parser", "qs"]],
        });
        finding.pkg = requirePackage(scanInput, "qs", "6.14.2");

        mockPackumentsByPackage(fetchMock, {
          qs: {
            versions: {
              "6.14.2": {},
              "6.14.3": {},
              "6.15.2": {},
            },
          },
          express: {
            versions: {
              "4.22.1": { dependencies: { "body-parser": "~1.20.3" } },
              "4.22.2": { dependencies: { "body-parser": "~1.20.5" } },
            },
          },
        });

        // Hand-crafted lockfile: body-parser declares qs as bare "6.14.2", not "~6.14.0".
        const bodyParserNodeIds = graph.nodeIdsFor("body-parser", "1.20.4");
        expect(bodyParserNodeIds.length).toBeGreaterThan(0);
        expect(graph.rangeFor(bodyParserNodeIds[0]!, "qs")).toBe("6.14.2");

        const remediation = await resolveNpmTransitiveRemediation({
          finding,
          graph,
          packages: scanInput.packages,
          directDependencyNames,
        });

        // Regression guard: exact pin must not be misclassified as a within-range refresh.
        expect(remediation).toBeNull();

        const parentUpgrade = await resolveRecommendedParentUpgrade(
          finding,
          scanInput.packages,
          directDependencyNames,
        );

        expect(parentUpgrade).toMatchObject({
          package: "express",
          currentVersion: "4.22.1",
          targetVersion: "4.22.2",
          vulnerablePackage: "qs",
          confidence: "unverified",
        });

        finding.recommendedParentUpgrade = parentUpgrade ?? undefined;

        const plan = buildSuggestedFixCommandPlan([finding], scanInput);

        expect(plan?.packageManager).toBe("npm");
        expect(plan?.command).toBe("npm install express@4.22.2");
        expect(plan?.command).not.toContain("npm update qs");
        expect(plan?.targets).toEqual([
          expect.objectContaining({
            package: "express",
            kind: "parent-upgrade",
          }),
        ]);
        expect(plan?.targets).not.toEqual(
          expect.arrayContaining([
            expect.objectContaining({ package: "qs", kind: "parent-update" }),
          ]),
        );
      },
    );
  });

  it("builds a direct dependency target for direct-fixable", () => {
    const scanInput = loadFixture("direct-fixable");
    const finding = findingFor(scanInput, "axios", {
      relationship: "direct",
      firstFixedVersion: "0.21.2",
      validatedFirstFixedVersion: "0.21.2",
    });

    const plan = buildSuggestedFixCommandPlan([finding], scanInput);

    expect(plan?.command).toBe("npm install axios@0.21.2");
    expect(plan?.sections).toEqual([
      expect.objectContaining({
        kind: "urgent",
        command: "npm install axios@0.21.2",
      }),
    ]);
    expect(plan?.targets).toEqual([
      expect.objectContaining({ package: "axios", kind: "direct" }),
    ]);
  });

  it("keeps transitive-only findings out of direct fix targets", () => {
    const scanInput = loadFixture("transitive-only");
    const finding = findingFor(scanInput, "string-width", {
      relationship: "transitive",
      firstFixedVersion: "7.2.1",
      dependencyPaths: [["project", "lint-staged", "string-width"]],
      recommendedParentUpgrade: {
        package: "lint-staged",
        currentVersion: "15.2.0",
        targetVersion: "15.2.1",
        viaPath: ["project", "lint-staged", "string-width"],
        vulnerablePackage: "string-width",
        confidence: "verified",
        reason: "Upgrade lint-staged to pick up a safe string-width release.",
      },
    });

    const plan = buildSuggestedFixCommandPlan([finding], scanInput);

    expect(plan?.targets).toEqual([
      expect.objectContaining({
        package: "lint-staged",
        kind: "parent-upgrade",
      }),
    ]);
    expect(plan?.targets).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ package: "string-width", kind: "direct" }),
      ]),
    );
  });

  it("loads no-findings with no mocked findings and produces no fix command", () => {
    const scanInput = loadFixture("no-findings");

    expect(scanInput.packages.length).toBeGreaterThan(0);
    expect(buildSuggestedFixCommandPlan([], scanInput)).toEqual(
      expect.objectContaining({
        command: null,
        sections: [],
        targets: [],
        skipped: [],
        totalFindingCount: 0,
      }),
    );
  });

  describe("multi-path-same-vuln", () => {
    let originalFetch: typeof fetch;
    const fetchMock = jest.fn<typeof fetch>();

    beforeEach(() => {
      originalFetch = global.fetch;
      fetchMock.mockReset();
      global.fetch = fetchMock as unknown as typeof fetch;
      clearPackumentCache();
    });

    afterEach(() => {
      global.fetch = originalFetch;
    });

    itWithFixture(
      "multi-path-same-vuln",
      "suggests path-specific fix commands for qs via express and body-parser",
      async () => {
        const fixtureName = "multi-path-same-vuln";
        const scanInput = loadFixture(fixtureName);
        const graph = loadNpmLockGraph(path.join(examplesDir, fixtureName, "package-lock.json"));
        const directDependencyNames = new Set(["express"]);
        const qsWithinRange = requirePackage(scanInput, "qs", "6.15.1");
        const qsParentUpgrade = requirePackage(scanInput, "qs", "6.14.2");

        expect(scanInput.packages.filter(item => item.name === "qs")).toHaveLength(2);
        expect(qsWithinRange.paths).toEqual(
          expect.arrayContaining([["project", "express", "body-parser", "qs"]]),
        );
        expect(qsParentUpgrade.paths).toEqual(
          expect.arrayContaining([["project", "express", "qs"]]),
        );

        mockPackumentsByPackage(fetchMock, {
          qs: {
            versions: {
              "6.14.2": {},
              "6.15.1": {},
              "6.15.2": {},
              "6.15.3": {},
            },
          },
          express: {
            versions: {
              "4.22.1": { dependencies: { qs: "~6.14.0", "body-parser": "~1.20.3" } },
              "4.22.2": { dependencies: { qs: "~6.15.1", "body-parser": "~1.20.3" } },
            },
          },
          "body-parser": {
            versions: {
              "1.20.5": { dependencies: { qs: "~6.15.1" } },
            },
          },
        });

        const withinRangeFinding = findingFor(scanInput, "qs", {
          relationship: "transitive",
          severity: "medium",
          firstFixedVersion: "6.15.2",
          validatedFirstFixedVersion: "6.15.2",
          dependencyPaths: [["project", "express", "body-parser", "qs"]],
        });
        withinRangeFinding.pkg = qsWithinRange;

        const parentUpgradeFinding = findingFor(scanInput, "qs", {
          relationship: "transitive",
          severity: "medium",
          firstFixedVersion: "6.15.2",
          validatedFirstFixedVersion: "6.15.2",
          dependencyPaths: [["project", "express", "qs"]],
        });
        parentUpgradeFinding.pkg = qsParentUpgrade;

        const withinRangeRemediation = await resolveNpmTransitiveRemediation({
          finding: withinRangeFinding,
          graph,
          packages: scanInput.packages,
          directDependencyNames,
        });
        expect(withinRangeRemediation).toMatchObject({
          kind: "update-parent-within-range",
          package: "qs",
          currentVersion: "6.15.1",
          targetChildVersion: "6.15.3",
        });

        const parentUpgradeRemediation = await resolveNpmTransitiveRemediation({
          finding: parentUpgradeFinding,
          graph,
          packages: scanInput.packages,
          directDependencyNames,
        });
        expect(parentUpgradeRemediation).toMatchObject({
          kind: "upgrade-parent-to-version",
          package: "express",
          currentVersion: "4.22.1",
          targetVersion: "4.22.2",
        });

        const parentUpgrade = await resolveRecommendedParentUpgrade(
          parentUpgradeFinding,
          scanInput.packages,
          directDependencyNames,
        );
        expect(parentUpgrade).toMatchObject({
          package: "express",
          currentVersion: "4.22.1",
          targetVersion: "4.22.2",
          vulnerablePackage: "qs",
        });

        withinRangeFinding.recommendedNpmTransitiveRemediation = withinRangeRemediation ?? undefined;
        parentUpgradeFinding.recommendedNpmTransitiveRemediation = parentUpgradeRemediation ?? undefined;
        parentUpgradeFinding.recommendedParentUpgrade = parentUpgrade ?? undefined;

        const withinRangePlan = buildSuggestedFixCommandPlan([withinRangeFinding], scanInput);
        const parentUpgradePlan = buildSuggestedFixCommandPlan([parentUpgradeFinding], scanInput);
        const combinedPlan = buildSuggestedFixCommandPlan(
          [withinRangeFinding, parentUpgradeFinding],
          scanInput,
        );

        expect(withinRangePlan?.command).toBe("npm update qs");
        expect(withinRangePlan?.command).not.toContain("npm install express");
        expect(parentUpgradePlan?.command).toBe("npm install express@4.22.2");
        expect(parentUpgradePlan?.command).not.toContain("npm update qs");
        expect(combinedPlan?.sections).toHaveLength(2);
        expect(combinedPlan?.sections?.map(section => section.command)).toEqual(
          expect.arrayContaining(["npm update qs", "npm install express@4.22.2"]),
        );
      },
    );
  });

  describe("no-fix-available", () => {
    let originalFetch: typeof fetch;
    const fetchMock = jest.fn<typeof fetch>();

    beforeEach(() => {
      originalFetch = global.fetch;
      fetchMock.mockReset();
      global.fetch = fetchMock as unknown as typeof fetch;
      clearPackumentCache();
    });

    afterEach(() => {
      global.fetch = originalFetch;
    });

    itWithFixture(
      "no-fix-available",
      "skips fix commands when no published safe version exists for html-minifier@4.0.0",
      async () => {
        const scanInput = loadFixture("no-fix-available");
        const htmlMinifier = requirePackage(scanInput, "html-minifier", "4.0.0");

        expect(htmlMinifier.paths?.some(path => path.length <= 2)).toBe(true);

        mockPackumentsByPackage(fetchMock, {
          "html-minifier": {
            versions: {
              "4.0.0": {},
            },
          },
        });

        // GHSA-pfq8-rq6v-vf5m: all versions affected (introduced: "0", no fixed event) - intentionally minimal to exercise the "no published safe version" path
        const resolution = await resolveLowestKnownNonVulnerableVersion(
          "html-minifier",
          "4.0.0",
          [
            {
              id: "GHSA-pfq8-rq6v-vf5m",
              affected: [
                {
                  package: { ecosystem: "npm", name: "html-minifier" },
                  ranges: [{ type: "SEMVER", events: [{ introduced: "0" }] }],
                },
              ],
            },
          ],
        );

        expect(resolution.resolvedVersion).toBeNull();
        expect(resolution.note).toBe("No published versions above 4.0.0 were found for html-minifier.");

        const finding = findingFor(scanInput, "html-minifier", {
          relationship: "direct",
          severity: "high",
          firstFixedVersion: null,
          validatedFirstFixedVersion: null,
          fixVersionValidationNote: resolution.note,
        });
        finding.pkg = htmlMinifier;

        const plan = buildSuggestedFixCommandPlan([finding], scanInput);

        expect(plan?.command).toBeNull();
        expect(plan?.sections).toEqual([]);
        expect(plan?.targets).toEqual([]);
        expect(plan?.skipped).toEqual([
          expect.objectContaining({
            package: "html-minifier",
            version: "4.0.0",
            relationship: "direct",
            reason: resolution.note,
          }),
        ]);
        expect(JSON.stringify(plan)).not.toContain("npm install html-minifier");
        expect(JSON.stringify(plan)).not.toContain("npm update html-minifier");
      },
    );
  });

  describe("pre-release-fix", () => {
    let originalFetch: typeof fetch;
    const fetchMock = jest.fn<typeof fetch>();

    beforeEach(() => {
      originalFetch = global.fetch;
      fetchMock.mockReset();
      global.fetch = fetchMock as unknown as typeof fetch;
      clearPackumentCache();
    });

    afterEach(() => {
      global.fetch = originalFetch;
    });

    itWithFixture(
      "pre-release-fix",
      "suggests a stable express upgrade when OSV includes a pre-release fixed hint",
      async () => {
        const scanInput = loadFixture("pre-release-fix");
        const express = requirePackage(scanInput, "express", "4.18.2");

        expect(express.paths?.some(path => path.length <= 2)).toBe(true);

        mockPackumentsByPackage(fetchMock, {
          express: {
            versions: {
              "4.18.2": {},
              "4.19.2": {},
              "4.20.0": {},
              "4.22.0": {},
              "5.0.0-beta.3": {},
            },
          },
        });

        // GHSA-rv95-896h-c2vc: stable fixed 4.19.2 plus a separate 5.x range fixed at 5.0.0-beta.3 (pre-release).
        const ghsaRv95 = {
          id: "GHSA-rv95-896h-c2vc",
          affected: [
            {
              package: { ecosystem: "npm", name: "express" },
              ranges: [
                { type: "SEMVER", events: [{ introduced: "0" }, { fixed: "4.19.2" }] },
                { type: "SEMVER", events: [{ introduced: "5.0.0-alpha.1" }, { fixed: "5.0.0-beta.3" }] },
              ],
            },
          ],
        };

        const resolution = await resolveLowestKnownNonVulnerableVersion(
          "express",
          "4.18.2",
          [ghsaRv95],
        );

        expect(resolution.resolvedVersion).toBe("4.19.2");
        expect(resolution.resolvedVersion).not.toMatch(/-(beta|rc|alpha|next|canary)/);

        const finding = findingFor(scanInput, "express", {
          relationship: "direct",
          severity: "medium",
          firstFixedVersion: "4.19.2",
          validatedFirstFixedVersion: resolution.resolvedVersion,
        });
        finding.pkg = express;

        const plan = buildSuggestedFixCommandPlan([finding], scanInput);

        expect(plan?.command).toBe("npm install express@4.19.2");
        expect(plan?.command).not.toMatch(/-(beta|rc|alpha|next|canary)/);
        expect(JSON.stringify(plan)).not.toContain("5.0.0-beta.3");
      },
    );
  });

  itWithFixture(
    "workspace-transitive",
    "includes the npm workspace flag for a vulnerable package declared in packages/api",
    () => {
      const scanInput = loadFixture("workspace-transitive");
      const axios = requirePackage(scanInput, "axios", "0.21.1");

      expect(scanInput.packages.some(item => item.name === "axios" && item.version === "0.21.1")).toBe(true);

      const finding = findingFor(scanInput, "axios", {
        relationship: "direct",
        severity: "high",
        firstFixedVersion: "0.32.0",
        validatedFirstFixedVersion: "0.32.0",
      });
      finding.pkg = axios;

      const plan = buildSuggestedFixCommandPlan([finding], scanInput);

      expect(plan?.command).toBe("npm install -w packages/api axios@0.32.0");
      expect(plan?.command).not.toBe("npm install axios@0.32.0");
    },
  );

  itWithFixture(
    "multiple-versions-same-pkg",
    "reports lodash@3 and lodash@4 as separate installed packages with correct relationships",
    () => {
      const scanInput = loadFixture("multiple-versions-same-pkg");
      const lodash3 = requirePackage(scanInput, "lodash", "3.10.1");
      const lodash4 = requirePackage(scanInput, "lodash", "4.17.20");

      expect(scanInput.packages.filter(item => item.name === "lodash")).toHaveLength(2);
      expect(lodash3.paths?.every(path => path.length > 2)).toBe(true);
      expect(lodash4.paths?.some(path => path.length <= 2)).toBe(true);

      const directFinding = findingFor(scanInput, "lodash", {
        relationship: "direct",
        firstFixedVersion: "4.18.0",
        validatedFirstFixedVersion: "4.18.0",
      });
      directFinding.pkg = lodash4;

      const transitiveFinding = findingFor(scanInput, "lodash", {
        relationship: "transitive",
        firstFixedVersion: "4.18.0",
        validatedFirstFixedVersion: "4.18.0",
        dependencyPaths: lodash3.paths ?? [],
      });
      transitiveFinding.pkg = lodash3;

      const directPlan = buildSuggestedFixCommandPlan([directFinding], scanInput);
      const transitivePlan = buildSuggestedFixCommandPlan([transitiveFinding], scanInput);

      expect(directPlan?.command).toBe("npm install lodash@4.18.0");
      expect(directPlan?.targets.find(t => t.kind === "direct")?.package).toBe("lodash");
      expect(transitivePlan?.targets.find(t => t.kind === "direct")).toBeUndefined();
    },
  );

  it("mal-private-registry fixture - node-ipc resolvedUrl is from a private registry", () => {
    const scanInput = loadFixture("mal-private-registry");
    const nodeIpc = scanInput.packages.find(p => p.name === "node-ipc");

    expect(nodeIpc).toBeDefined();
    expect(nodeIpc?.resolvedUrl).toBe("https://npm.internal.example.com/node-ipc/-/node-ipc-9.2.3.tgz");
    expect(isPrivateRegistrySource(nodeIpc!)).toBe(true);
  });

  it("pnpm-mal-private-registry fixture - node-ipc resolvedUrl is from a private registry", () => {
    const scanInput = loadFixture("pnpm-mal-private-registry");
    const nodeIpc = scanInput.packages.find(p => p.name === "node-ipc");
    expect(nodeIpc).toBeDefined();
    expect(nodeIpc?.resolvedUrl).toBe("https://npm.internal.example.com/node-ipc/-/node-ipc-9.2.3.tgz");
    expect(isPrivateRegistrySource(nodeIpc!)).toBe(true);
  });

  it("pnpm-legacy-mal-private-registry fixture - node-ipc resolvedUrl is from a private registry", () => {
    const scanInput = loadFixture("pnpm-legacy-mal-private-registry");
    const nodeIpc = scanInput.packages.find(p => p.name === "node-ipc");
    expect(nodeIpc).toBeDefined();
    expect(nodeIpc?.resolvedUrl).toBe("https://npm.internal.example.com/node-ipc/-/node-ipc-9.2.3.tgz");
    expect(isPrivateRegistrySource(nodeIpc!)).toBe(true);
  });

  it("yarn-classic-mal-private-registry fixture - node-ipc resolvedUrl is from a private registry", () => {
    const scanInput = loadFixture("yarn-classic-mal-private-registry");
    const nodeIpc = scanInput.packages.find(p => p.name === "node-ipc");
    expect(nodeIpc).toBeDefined();
    expect(nodeIpc?.resolvedUrl).toBe("https://npm.internal.example.com/node-ipc/-/node-ipc-9.2.3.tgz");
    expect(isPrivateRegistrySource(nodeIpc!)).toBe(true);
  });

  it("bun-mal-private-registry fixture - node-ipc resolvedUrl is from a private registry", () => {
    const scanInput = loadFixture("bun-mal-private-registry");
    const nodeIpc = scanInput.packages.find(p => p.name === "node-ipc");
    expect(nodeIpc).toBeDefined();
    expect(nodeIpc?.resolvedUrl).toBe("https://npm.internal.example.com/node-ipc/-/node-ipc-9.2.3.tgz");
    expect(isPrivateRegistrySource(nodeIpc!)).toBe(true);
  });

  it("git-source-mal fixture - node-ipc is detected as git source with SHA pinning", () => {
    const scanInput = loadFixture("git-source-mal");
    const nodeIpc = scanInput.packages.find(p => p.name === "node-ipc");
    expect(nodeIpc).toBeDefined();
    expect(isGitSource(nodeIpc!)).toBe(true);
    expect(hasCommitShaPinning(nodeIpc!)).toBe(true);
    expect(nodeIpc?.resolvedUrl).toContain("codeload.github.com");
  });

  itWithFixture("pnpm-dual-document", "pnpm-dual-document fixture - parses bootstrap + project lockfile sections", () => {
    const scanInput = loadFixture("pnpm-dual-document");
    expect(scanInput.source).toBe("pnpm-lock");
    const lodash = requirePackage(scanInput, "lodash", "4.17.20");
    expect(lodash.paths).toEqual(expect.arrayContaining([["project", "lodash"]]));
    expect(scanInput.packages.some(pkg => pkg.name === "pnpm")).toBe(false);
  });
});
