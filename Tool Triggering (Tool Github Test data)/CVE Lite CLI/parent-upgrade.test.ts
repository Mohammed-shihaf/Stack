import { jest } from "@jest/globals";
import { mockPackumentsByPackage } from "./helpers/registry-mock.js";
import type { Finding, PackageRef } from "../src/types.js";
import { clearPackumentCache } from "../src/remediation/npm-registry.js";
import { createNpmTransitiveGraph, findSafeVersionWithinParentRange } from "../src/remediation/npm-transitive-graph.js";
import { resolveNpmTransitiveRemediation, resolveTransitiveRemediationViaRegistry } from "../src/remediation/npm-transitive-resolution.js";

const fetchMock = jest.fn();
global.fetch = fetchMock as unknown as typeof fetch;

function createPackages(): PackageRef[] {
  return [
    {
      name: "app",
      version: "1.0.0",
      ecosystem: "npm",
      paths: [["project", "app"]],
    },
    {
      name: "mid",
      version: "2.0.0",
      ecosystem: "npm",
      paths: [["project", "app", "mid"]],
    },
    {
      name: "lodash",
      version: "4.17.20",
      ecosystem: "npm",
      paths: [
        ["project", "app", "lodash"],
        ["project", "app", "mid", "lodash"],
      ],
    },
  ];
}

function createFinding(overrides?: Partial<Finding>): Finding {
  return {
    pkg: {
      name: "lodash",
      version: "4.17.20",
      ecosystem: "npm",
      paths: [["project", "app", "lodash"]],
    },
    vulnerabilities: [{ id: "OSV-123" }],
    severity: "high",
    cveAliases: [],
    dependencyPaths: [["project", "app", "lodash"]],
    relationship: "transitive",
    firstFixedVersion: "4.17.21",
    recommendedParentUpgrade: undefined,
    ...overrides,
  };
}

function mockPackument(data: unknown, ok = true) {
  fetchMock.mockResolvedValue({
    ok,
    json: async () => data,
  });
}


async function loadResolver() {
  const module = await import(`../src/remediation/parent-upgrade.js?test=${Date.now()}-${Math.random()}`);
  return module.resolveRecommendedParentUpgrade;
}

async function loadPathHelpers() {
  const module = await import(`../src/remediation/parent-upgrade.js?test=${Date.now()}-${Math.random()}`);
  return {
    resolveHighestSatisfying: module.resolveHighestSatisfying,
    resolvePathTerminalVersion: module.resolvePathTerminalVersion,
  };
}

describe("npm transitive graph helpers", () => {
  it("finds the highest safe child version that still satisfies the immediate parent range", () => {
    const graph = createNpmTransitiveGraph({
      nodes: [
        {
          id: "node_modules/mocha",
          name: "mocha",
          version: "10.0.0",
        },
        {
          id: "node_modules/diff",
          name: "diff",
          version: "5.0.0",
        },
      ],
      edges: [
        {
          parentNodeId: "node_modules/mocha",
          childName: "diff",
          childNodeId: "node_modules/diff",
          range: "^5.0.0",
        },
      ],
    });

    const result = findSafeVersionWithinParentRange({
      graph,
      parentNodeId: "node_modules/mocha",
      childName: "diff",
      candidates: ["5.0.1", "5.1.0", "6.0.0"],
    });

    expect(result).toBe("5.1.0");
  });

  it("returns null when no safe child version fits the current parent range", () => {
    const graph = createNpmTransitiveGraph({
      nodes: [
        {
          id: "node_modules/mocha",
          name: "mocha",
          version: "10.0.0",
        },
        {
          id: "node_modules/diff",
          name: "diff",
          version: "5.0.0",
        },
      ],
      edges: [
        {
          parentNodeId: "node_modules/mocha",
          childName: "diff",
          childNodeId: "node_modules/diff",
          range: "^5.0.0",
        },
      ],
    });

    const result = findSafeVersionWithinParentRange({
      graph,
      parentNodeId: "node_modules/mocha",
      childName: "diff",
      candidates: ["6.0.0", "6.1.0"],
    });

    expect(result).toBeNull();
  });
});

describe("resolveNpmTransitiveRemediation", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    clearPackumentCache();
  });

  it("returns an in-range parent update outcome when the parent can absorb a safe child version", async () => {
    const graph = createNpmTransitiveGraph({
      nodes: [
        { id: "node_modules/mocha", name: "mocha", version: "10.0.0" },
        { id: "node_modules/diff", name: "diff", version: "5.0.0" },
      ],
      edges: [
        {
          parentNodeId: "node_modules/mocha",
          childName: "diff",
          childNodeId: "node_modules/diff",
          range: "^5.0.0",
        },
      ],
    });

    mockPackumentsByPackage(fetchMock, {
      diff: {
        versions: {
          "5.0.0": {},
          "5.0.1": {},
          "5.1.0": {},
          "6.0.0": {},
        },
      },
    });

    const result = await resolveNpmTransitiveRemediation({
      finding: {
        pkg: {
          name: "diff",
          version: "5.0.0",
          ecosystem: "npm",
          paths: [["project", "mocha", "diff"]],
        },
        vulnerabilities: [{ id: "OSV-1" }],
        severity: "high",
        cveAliases: [],
        dependencyPaths: [["project", "mocha", "diff"]],
        relationship: "transitive",
        firstFixedVersion: "5.0.1",
      },
      graph,
      packages: [
        {
          name: "mocha",
          version: "10.0.0",
          ecosystem: "npm",
          paths: [["project", "mocha"]],
        },
      ],
    });

    expect(result).toMatchObject({
      kind: "update-parent-within-range",
      package: "mocha",
      currentVersion: "10.0.0",
      targetChildVersion: "5.1.0",
      viaPath: ["project", "mocha", "diff"],
    });
  });

  it("matches workspace-local parent nodes when the display path is normalized", async () => {
    const graph = createNpmTransitiveGraph({
      nodes: [
        {
          id: "client/node_modules/chokidar",
          name: "chokidar",
          version: "3.5.3",
          packagePath: "client/node_modules/chokidar",
        },
        {
          id: "client/node_modules/chokidar/node_modules/braces",
          name: "braces",
          version: "3.0.2",
          packagePath: "client/node_modules/chokidar/node_modules/braces",
        },
      ],
      edges: [
        {
          parentNodeId: "client/node_modules/chokidar",
          childName: "braces",
          childNodeId: "client/node_modules/chokidar/node_modules/braces",
          range: "~3.0.2",
        },
      ],
    });

    mockPackumentsByPackage(fetchMock, {
      braces: {
        versions: {
          "3.0.2": {},
          "3.0.3": {},
          "3.1.0": {},
        },
      },
    });

    const result = await resolveNpmTransitiveRemediation({
      finding: {
        pkg: {
          name: "braces",
          version: "3.0.2",
          ecosystem: "npm",
          paths: [["project", "client", "chokidar", "braces"]],
        },
        vulnerabilities: [{ id: "OSV-1" }],
        severity: "high",
        cveAliases: [],
        dependencyPaths: [["project", "client", "chokidar", "braces"]],
        relationship: "transitive",
        firstFixedVersion: "3.0.3",
      },
      graph,
      packages: [
        {
          name: "chokidar",
          version: "3.5.3",
          ecosystem: "npm",
          paths: [["project", "client", "chokidar"]],
        },
      ],
      directDependencyNames: new Set(["chokidar"]),
    });

    expect(result).toMatchObject({
      kind: "update-parent-within-range",
      package: "chokidar",
      currentVersion: "3.5.3",
      targetChildVersion: "3.0.3",
      viaPath: ["project", "client", "chokidar", "braces"],
    });
  });

  it("synthesizes safe-child candidates from the advisory hint when offline and the parent range allows the fix", async () => {
    const graph = createNpmTransitiveGraph({
      nodes: [
        { id: "node_modules/mocha", name: "mocha", version: "10.0.0" },
        { id: "node_modules/diff", name: "diff", version: "5.0.0" },
      ],
      edges: [
        {
          parentNodeId: "node_modules/mocha",
          childName: "diff",
          childNodeId: "node_modules/diff",
          range: "^5.0.0",
        },
      ],
    });

    const result = await resolveNpmTransitiveRemediation({
      finding: {
        pkg: {
          name: "diff",
          version: "5.0.0",
          ecosystem: "npm",
          paths: [["project", "mocha", "diff"]],
        },
        vulnerabilities: [{ id: "OSV-1" }],
        severity: "high",
        cveAliases: [],
        dependencyPaths: [["project", "mocha", "diff"]],
        relationship: "transitive",
        firstFixedVersion: "5.0.1",
      },
      graph,
      packages: [
        {
          name: "mocha",
          version: "10.0.0",
          ecosystem: "npm",
          paths: [["project", "mocha"]],
        },
      ],
      offline: true,
    });

    expect(result).toMatchObject({
      kind: "update-parent-within-range",
      package: "mocha",
      currentVersion: "10.0.0",
      targetChildVersion: "5.0.1",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns null offline when the upgrade-parent path would otherwise need the registry", async () => {
    // The advisory hint is outside the parent's current range, so an in-range
    // resolution is not possible. Online this would walk newer parent versions;
    // offline that data is unavailable, so the resolver must return null
    // without hitting the registry.
    const graph = createNpmTransitiveGraph({
      nodes: [
        { id: "node_modules/mocha", name: "mocha", version: "10.0.0" },
        { id: "node_modules/diff", name: "diff", version: "5.0.0" },
      ],
      edges: [
        {
          parentNodeId: "node_modules/mocha",
          childName: "diff",
          childNodeId: "node_modules/diff",
          range: "^5.0.0",
        },
      ],
    });

    const result = await resolveNpmTransitiveRemediation({
      finding: {
        pkg: {
          name: "diff",
          version: "5.0.0",
          ecosystem: "npm",
          paths: [["project", "mocha", "diff"]],
        },
        vulnerabilities: [{ id: "OSV-1" }],
        severity: "high",
        cveAliases: [],
        dependencyPaths: [["project", "mocha", "diff"]],
        relationship: "transitive",
        firstFixedVersion: "6.0.0",
      },
      graph,
      packages: [
        {
          name: "mocha",
          version: "10.0.0",
          ecosystem: "npm",
          paths: [["project", "mocha"]],
        },
      ],
      offline: true,
    });

    expect(result).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns null offline when the advisory hint is missing", async () => {
    const graph = createNpmTransitiveGraph({
      nodes: [
        { id: "node_modules/mocha", name: "mocha", version: "10.0.0" },
        { id: "node_modules/diff", name: "diff", version: "5.0.0" },
      ],
      edges: [
        {
          parentNodeId: "node_modules/mocha",
          childName: "diff",
          childNodeId: "node_modules/diff",
          range: "^5.0.0",
        },
      ],
    });

    const result = await resolveNpmTransitiveRemediation({
      finding: {
        pkg: {
          name: "diff",
          version: "5.0.0",
          ecosystem: "npm",
          paths: [["project", "mocha", "diff"]],
        },
        vulnerabilities: [{ id: "OSV-1" }],
        severity: "high",
        cveAliases: [],
        dependencyPaths: [["project", "mocha", "diff"]],
        relationship: "transitive",
        firstFixedVersion: null,
      },
      graph,
      packages: [
        {
          name: "mocha",
          version: "10.0.0",
          ecosystem: "npm",
          paths: [["project", "mocha"]],
        },
      ],
      offline: true,
    });

    expect(result).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("escalates to a parent upgrade when no safe child version fits the current range", async () => {
    const graph = createNpmTransitiveGraph({
      nodes: [
        { id: "node_modules/mocha", name: "mocha", version: "10.0.0" },
        { id: "node_modules/diff", name: "diff", version: "5.0.0" },
      ],
      edges: [
        {
          parentNodeId: "node_modules/mocha",
          childName: "diff",
          childNodeId: "node_modules/diff",
          range: "^5.0.0",
        },
      ],
    });

    mockPackumentsByPackage(fetchMock, {
      diff: {
        versions: {
          "5.0.0": {},
          "6.0.0": {},
          "6.1.0": {},
        },
      },
      mocha: {
        versions: {
          "10.0.0": { dependencies: { diff: "^5.0.0" } },
          "10.1.0": { dependencies: { diff: "^5.0.0" } },
          "11.0.0": { dependencies: { diff: "^6.0.0" } },
        },
      },
    });

    const result = await resolveNpmTransitiveRemediation({
      finding: {
        pkg: {
          name: "diff",
          version: "5.0.0",
          ecosystem: "npm",
          paths: [["project", "mocha", "diff"]],
        },
        vulnerabilities: [{ id: "OSV-1" }],
        severity: "high",
        cveAliases: [],
        dependencyPaths: [["project", "mocha", "diff"]],
        relationship: "transitive",
        firstFixedVersion: "6.0.0",
      },
      graph,
      packages: [
        {
          name: "mocha",
          version: "10.0.0",
          ecosystem: "npm",
          paths: [["project", "mocha"]],
        },
      ],
    });

    expect(result).toMatchObject({
      kind: "upgrade-parent-to-version",
      package: "mocha",
      currentVersion: "10.0.0",
      targetVersion: "11.0.0",
      targetChildVersion: "6.1.0",
      viaPath: ["project", "mocha", "diff"],
    });
  });
});

describe("resolveNpmTransitiveRemediation — 3-level within-range gap (#522)", () => {
  // Reproduces: project → aws-amplify → @aws-amplify/core → js-cookie
  // @aws-amplify/core declares js-cookie: ^3.0.5 which already covers 3.0.7.
  // The correct fix is npm update js-cookie (within-range lockfile refresh).
  // Bug: resolveNpmTransitiveRemediation bails out when directParentName !== immediateParentName,
  // so it returns null and falls back to the wrong unverified parent upgrade.
  beforeEach(() => {
    fetchMock.mockReset();
    clearPackumentCache();
  });

  it("returns null for 3-level chains even when the immediate parent range already covers the fix (known bug #522)", async () => {
    const graph = createNpmTransitiveGraph({
      nodes: [
        { id: "node_modules/aws-amplify", name: "aws-amplify", version: "6.16.3" },
        { id: "node_modules/@aws-amplify/core", name: "@aws-amplify/core", version: "6.16.1" },
        { id: "node_modules/js-cookie", name: "js-cookie", version: "3.0.6" },
      ],
      edges: [
        {
          parentNodeId: "node_modules/aws-amplify",
          childName: "@aws-amplify/core",
          childNodeId: "node_modules/@aws-amplify/core",
          range: "6.16.1",
        },
        {
          parentNodeId: "node_modules/@aws-amplify/core",
          childName: "js-cookie",
          childNodeId: "node_modules/js-cookie",
          range: "^3.0.5",
        },
      ],
    });

    mockPackumentsByPackage(fetchMock, {
      "js-cookie": {
        versions: {
          "3.0.5": {},
          "3.0.6": {},
          "3.0.7": {},
          "3.0.8": {},
        },
      },
    });

    const result = await resolveNpmTransitiveRemediation({
      finding: {
        pkg: { name: "js-cookie", version: "3.0.6", ecosystem: "npm" },
        vulnerabilities: [{ id: "GHSA-qjx8-664m-686j" }],
        severity: "high",
        cveAliases: [],
        dependencyPaths: [["project", "aws-amplify", "@aws-amplify/core", "js-cookie"]],
        relationship: "transitive",
        firstFixedVersion: "3.0.7",
      },
      graph,
      packages: [
        { name: "aws-amplify", version: "6.16.3", ecosystem: "npm", paths: [["project", "aws-amplify"]] },
        { name: "@aws-amplify/core", version: "6.16.1", ecosystem: "npm", paths: [["project", "aws-amplify", "@aws-amplify/core"]] },
      ],
      directDependencyNames: new Set(["aws-amplify"]),
    });

    expect(result).toMatchObject({
      kind: "update-parent-within-range",
      package: "js-cookie",
      currentVersion: "3.0.6",
      targetChildVersion: "3.0.8",
      viaPath: ["project", "aws-amplify", "@aws-amplify/core", "js-cookie"],
    });
    expect(result?.reason).toContain("@aws-amplify/core@6.16.1 already allows js-cookie@3.0.8");
  });
});

describe("resolveTransitiveRemediationViaRegistry — deep-chain within-range", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    clearPackumentCache();
  });

  it("returns within-range lockfile refresh for deep chains when the immediate parent range already covers the fix", async () => {
    mockPackumentsByPackage(fetchMock, {
      "js-cookie": {
        versions: {
          "3.0.5": {},
          "3.0.6": {},
          "3.0.7": {},
          "3.0.8": {},
        },
      },
      "@aws-amplify/core": {
        versions: {
          "6.16.1": {
            dependencies: {
              "js-cookie": "^3.0.5",
            },
          },
        },
      },
    });

    const result = await resolveTransitiveRemediationViaRegistry({
      finding: {
        pkg: { name: "js-cookie", version: "3.0.6", ecosystem: "npm" },
        vulnerabilities: [{ id: "GHSA-qjx8-664m-686j" }],
        severity: "high",
        cveAliases: [],
        dependencyPaths: [["project", "aws-amplify", "@aws-amplify/core", "js-cookie"]],
        relationship: "transitive",
        firstFixedVersion: "3.0.7",
      },
      packages: [
        { name: "aws-amplify", version: "6.16.3", ecosystem: "npm", paths: [["project", "aws-amplify"]] },
        { name: "@aws-amplify/core", version: "6.16.1", ecosystem: "npm", paths: [["project", "aws-amplify", "@aws-amplify/core"]] },
      ],
      directDependencyNames: new Set(["aws-amplify"]),
    });

    expect(result).toMatchObject({
      kind: "update-parent-within-range",
      package: "js-cookie",
      currentVersion: "3.0.6",
      targetChildVersion: "3.0.8",
      viaPath: ["project", "aws-amplify", "@aws-amplify/core", "js-cookie"],
    });
  });
});

describe("resolveNpmTransitiveRemediation — parent name collision (multiple installed versions)", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    clearPackumentCache();
  });

  it("uses the specific minimatch instance reachable via the finding's path, not an unrelated installed version of the same name", async () => {
    const graph = createNpmTransitiveGraph({
      nodes: [
        { id: "node_modules/eslint", name: "eslint", version: "9.0.0" },
        { id: "node_modules/eslint/node_modules/minimatch", name: "minimatch", version: "3.1.5" },
        { id: "node_modules/brace-expansion-under-eslint", name: "brace-expansion", version: "1.1.16" },
        { id: "node_modules/minimatch", name: "minimatch", version: "10.2.5" },
        { id: "node_modules/brace-expansion", name: "brace-expansion", version: "5.0.7" },
      ],
      edges: [
        {
          parentNodeId: "node_modules/eslint",
          childName: "minimatch",
          childNodeId: "node_modules/eslint/node_modules/minimatch",
          range: "^3.1.2",
        },
        {
          // Narrow range: cannot reach a 5.x fix. This is the edge the resolver
          // MUST use, because it's the one actually on the finding's path.
          parentNodeId: "node_modules/eslint/node_modules/minimatch",
          childName: "brace-expansion",
          childNodeId: "node_modules/brace-expansion-under-eslint",
          range: "^1.1.7",
        },
        {
          // Wide range: an UNRELATED top-level minimatch that happens to share
          // the same package name but has nothing to do with this finding.
          parentNodeId: "node_modules/minimatch",
          childName: "brace-expansion",
          childNodeId: "node_modules/brace-expansion",
          range: "^5.0.5",
        },
      ],
    });

    mockPackumentsByPackage(fetchMock, {
      "brace-expansion": {
        versions: {
          "1.1.16": {},
          "1.1.18": {},
          "5.0.7": {},
          "5.0.9": {},
        },
      },
    });

    const result = await resolveNpmTransitiveRemediation({
      finding: {
        pkg: { name: "brace-expansion", version: "1.1.16", ecosystem: "npm" },
        vulnerabilities: [{ id: "GHSA-mh99-v99m-4gvg" }],
        severity: "high",
        cveAliases: [],
        dependencyPaths: [["project", "eslint", "minimatch", "brace-expansion"]],
        relationship: "transitive",
        firstFixedVersion: "5.0.8",
        validatedFirstFixedVersion: "1.1.18",
      },
      graph,
      packages: [
        { name: "eslint", version: "9.0.0", ecosystem: "npm", paths: [["project", "eslint"]] },
        {
          name: "minimatch",
          version: "3.1.5",
          ecosystem: "npm",
          paths: [["project", "eslint", "minimatch"]],
        },
        {
          name: "minimatch",
          version: "10.2.5",
          ecosystem: "npm",
          paths: [["project", "minimatch"]],
        },
      ],
      directDependencyNames: new Set(["eslint"]),
    });

    // The correct in-range fix, reachable through the REAL parent (minimatch@3.1.5,
    // range ^1.1.7): 1.1.18 clears the CVE and still satisfies ^1.1.7.
    expect(result).toMatchObject({
      kind: "update-parent-within-range",
      targetChildVersion: "1.1.18",
    });
    expect(result?.reason).toContain("minimatch@3.1.5");
    // Must never cite the unrelated top-level minimatch@10.2.5 as the permitting parent.
    expect(result?.reason).not.toContain("10.2.5");
  });
});

describe("resolveTransitiveRemediationViaRegistry — parent name collision (multiple installed versions)", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    clearPackumentCache();
  });

  it("uses the specific minimatch instance reachable via the finding's path, not an unrelated installed version of the same name", async () => {
    mockPackumentsByPackage(fetchMock, {
      "brace-expansion": {
        versions: {
          "1.1.16": {},
          "1.1.18": {},
          "5.0.7": {},
          "5.0.9": {},
        },
      },
      minimatch: {
        versions: {
          "3.1.5": {
            dependencies: {
              "brace-expansion": "^1.1.7",
            },
          },
          "10.2.5": {
            dependencies: {
              "brace-expansion": "^5.0.5",
            },
          },
        },
      },
    });

    const result = await resolveTransitiveRemediationViaRegistry({
      finding: {
        pkg: { name: "brace-expansion", version: "1.1.16", ecosystem: "npm" },
        vulnerabilities: [{ id: "GHSA-mh99-v99m-4gvg" }],
        severity: "high",
        cveAliases: [],
        dependencyPaths: [["project", "eslint", "minimatch", "brace-expansion"]],
        relationship: "transitive",
        firstFixedVersion: "5.0.8",
        validatedFirstFixedVersion: "1.1.18",
      },
      packages: [
        { name: "eslint", version: "9.0.0", ecosystem: "npm", paths: [["project", "eslint"]] },
        {
          name: "minimatch",
          version: "3.1.5",
          ecosystem: "npm",
          paths: [["project", "eslint", "minimatch"]],
        },
        {
          name: "minimatch",
          version: "10.2.5",
          ecosystem: "npm",
          paths: [["project", "minimatch"]],
        },
      ],
      directDependencyNames: new Set(["eslint"]),
    });

    expect(result).toMatchObject({
      kind: "update-parent-within-range",
      targetChildVersion: "1.1.18",
    });
    expect(result?.reason).toContain("minimatch@3.1.5");
    expect(result?.reason).not.toContain("10.2.5");
  });

  it("correctly reports no in-range fix when the REAL parent's range cannot reach it, even when an unrelated same-name instance elsewhere could", async () => {
    // No 1.x fix published yet in this scenario - only a cross-major fix exists.
    mockPackumentsByPackage(fetchMock, {
      "brace-expansion": {
        versions: {
          "1.1.16": {},
          "5.0.7": {},
          "5.0.8": {},
        },
      },
      minimatch: {
        versions: {
          "3.1.5": {
            dependencies: {
              "brace-expansion": "^1.1.7",
            },
          },
          "10.2.5": {
            dependencies: {
              "brace-expansion": "^5.0.5",
            },
          },
        },
      },
    });

    const result = await resolveTransitiveRemediationViaRegistry({
      finding: {
        pkg: { name: "brace-expansion", version: "1.1.16", ecosystem: "npm" },
        vulnerabilities: [{ id: "GHSA-mh99-v99m-4gvg" }],
        severity: "high",
        cveAliases: [],
        dependencyPaths: [["project", "eslint", "minimatch", "brace-expansion"]],
        relationship: "transitive",
        firstFixedVersion: "5.0.8",
      },
      packages: [
        { name: "eslint", version: "9.0.0", ecosystem: "npm", paths: [["project", "eslint"]] },
        {
          name: "minimatch",
          version: "3.1.5",
          ecosystem: "npm",
          paths: [["project", "eslint", "minimatch"]],
        },
        {
          name: "minimatch",
          version: "10.2.5",
          ecosystem: "npm",
          paths: [["project", "minimatch"]],
        },
      ],
      directDependencyNames: new Set(["eslint"]),
    });

    // Must NOT claim "already permits" using the unrelated minimatch@10.2.5.
    expect(result?.kind).not.toBe("update-parent-within-range");
  });
});

describe("resolveNpmTransitiveRemediation — additional parent-collision edge cases", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    clearPackumentCache();
  });

  it("disambiguates correctly among 3+ installed versions of the same intermediate package name", async () => {
    const graph = createNpmTransitiveGraph({
      nodes: [
        { id: "node_modules/verdaccio", name: "verdaccio", version: "6.0.0" },
        { id: "node_modules/verdaccio/node_modules/minimatch", name: "minimatch", version: "7.4.9" },
        { id: "node_modules/brace-expansion-under-verdaccio", name: "brace-expansion", version: "2.1.2" },
        { id: "node_modules/eslint/node_modules/minimatch", name: "minimatch", version: "3.1.5" },
        { id: "node_modules/brace-expansion-under-eslint", name: "brace-expansion", version: "1.1.16" },
        { id: "node_modules/minimatch", name: "minimatch", version: "10.2.5" },
        { id: "node_modules/brace-expansion", name: "brace-expansion", version: "5.0.7" },
      ],
      edges: [
        {
          parentNodeId: "node_modules/verdaccio",
          childName: "minimatch",
          childNodeId: "node_modules/verdaccio/node_modules/minimatch",
          range: "^7.0.0",
        },
        {
          // Narrow range on the path actually used by this finding.
          parentNodeId: "node_modules/verdaccio/node_modules/minimatch",
          childName: "brace-expansion",
          childNodeId: "node_modules/brace-expansion-under-verdaccio",
          range: "^2.0.2",
        },
        {
          parentNodeId: "node_modules/eslint/node_modules/minimatch",
          childName: "brace-expansion",
          childNodeId: "node_modules/brace-expansion-under-eslint",
          range: "^1.1.7",
        },
        {
          parentNodeId: "node_modules/minimatch",
          childName: "brace-expansion",
          childNodeId: "node_modules/brace-expansion",
          range: "^5.0.5",
        },
      ],
    });

    mockPackumentsByPackage(fetchMock, {
      "brace-expansion": {
        versions: {
          "2.1.2": {},
          "2.1.4": {},
          "5.0.7": {},
          "5.0.9": {},
        },
      },
    });

    const result = await resolveNpmTransitiveRemediation({
      finding: {
        pkg: { name: "brace-expansion", version: "2.1.2", ecosystem: "npm" },
        vulnerabilities: [{ id: "GHSA-mh99-v99m-4gvg" }],
        severity: "high",
        cveAliases: [],
        dependencyPaths: [["project", "verdaccio", "minimatch", "brace-expansion"]],
        relationship: "transitive",
        firstFixedVersion: "5.0.8",
        validatedFirstFixedVersion: "2.1.4",
      },
      graph,
      packages: [
        { name: "verdaccio", version: "6.0.0", ecosystem: "npm", paths: [["project", "verdaccio"]] },
        {
          name: "minimatch",
          version: "7.4.9",
          ecosystem: "npm",
          paths: [["project", "verdaccio", "minimatch"]],
        },
        {
          name: "minimatch",
          version: "3.1.5",
          ecosystem: "npm",
          paths: [["project", "eslint", "minimatch"]],
        },
        {
          name: "minimatch",
          version: "10.2.5",
          ecosystem: "npm",
          paths: [["project", "minimatch"]],
        },
      ],
      directDependencyNames: new Set(["verdaccio"]),
    });

    expect(result).toMatchObject({
      kind: "update-parent-within-range",
      targetChildVersion: "2.1.4",
    });
    expect(result?.reason).toContain("minimatch@7.4.9");
  });

  it("correctly reports no in-range fix when the REAL parent's range cannot reach it, even when an unrelated same-name instance elsewhere could", async () => {
    const graph = createNpmTransitiveGraph({
      nodes: [
        { id: "node_modules/eslint", name: "eslint", version: "9.0.0" },
        { id: "node_modules/eslint/node_modules/minimatch", name: "minimatch", version: "3.1.5" },
        { id: "node_modules/brace-expansion-under-eslint", name: "brace-expansion", version: "1.1.16" },
        { id: "node_modules/minimatch", name: "minimatch", version: "10.2.5" },
        { id: "node_modules/brace-expansion", name: "brace-expansion", version: "5.0.7" },
      ],
      edges: [
        {
          parentNodeId: "node_modules/eslint",
          childName: "minimatch",
          childNodeId: "node_modules/eslint/node_modules/minimatch",
          range: "^3.1.2",
        },
        {
          // Narrow range: only reaches 5.0.8+ if wrongly checked against the
          // unrelated top-level minimatch below. The real parent cannot reach it.
          parentNodeId: "node_modules/eslint/node_modules/minimatch",
          childName: "brace-expansion",
          childNodeId: "node_modules/brace-expansion-under-eslint",
          range: "^1.1.7",
        },
        {
          parentNodeId: "node_modules/minimatch",
          childName: "brace-expansion",
          childNodeId: "node_modules/brace-expansion",
          range: "^5.0.5",
        },
      ],
    });

    // No 1.x fix published yet in this scenario - only a cross-major fix exists.
    mockPackumentsByPackage(fetchMock, {
      "brace-expansion": {
        versions: {
          "1.1.16": {},
          "5.0.7": {},
          "5.0.8": {},
        },
      },
    });

    const result = await resolveNpmTransitiveRemediation({
      finding: {
        pkg: { name: "brace-expansion", version: "1.1.16", ecosystem: "npm" },
        vulnerabilities: [{ id: "GHSA-mh99-v99m-4gvg" }],
        severity: "high",
        cveAliases: [],
        dependencyPaths: [["project", "eslint", "minimatch", "brace-expansion"]],
        relationship: "transitive",
        firstFixedVersion: "5.0.8",
      },
      graph,
      packages: [
        { name: "eslint", version: "9.0.0", ecosystem: "npm", paths: [["project", "eslint"]] },
        {
          name: "minimatch",
          version: "3.1.5",
          ecosystem: "npm",
          paths: [["project", "eslint", "minimatch"]],
        },
        {
          name: "minimatch",
          version: "10.2.5",
          ecosystem: "npm",
          paths: [["project", "minimatch"]],
        },
      ],
      directDependencyNames: new Set(["eslint"]),
    });

    // Must NOT claim "already permits" using the unrelated minimatch@10.2.5.
    expect(result?.kind).not.toBe("update-parent-within-range");
  });

  it("walks a 4-level chain (two hops between the direct parent and the immediate parent) to the correct colliding instance", async () => {
    const graph = createNpmTransitiveGraph({
      nodes: [
        { id: "node_modules/nx", name: "nx", version: "23.0.0" },
        { id: "node_modules/nx/node_modules/@nx/devkit", name: "@nx/devkit", version: "23.0.0" },
        { id: "node_modules/nx/node_modules/@nx/devkit/node_modules/minimatch", name: "minimatch", version: "9.0.3" },
        { id: "node_modules/brace-expansion-under-devkit", name: "brace-expansion", version: "2.1.2" },
        { id: "node_modules/minimatch", name: "minimatch", version: "10.2.5" },
        { id: "node_modules/brace-expansion", name: "brace-expansion", version: "5.0.7" },
      ],
      edges: [
        {
          parentNodeId: "node_modules/nx",
          childName: "@nx/devkit",
          childNodeId: "node_modules/nx/node_modules/@nx/devkit",
          range: "23.0.0",
        },
        {
          parentNodeId: "node_modules/nx/node_modules/@nx/devkit",
          childName: "minimatch",
          childNodeId: "node_modules/nx/node_modules/@nx/devkit/node_modules/minimatch",
          range: "^9.0.0",
        },
        {
          parentNodeId: "node_modules/nx/node_modules/@nx/devkit/node_modules/minimatch",
          childName: "brace-expansion",
          childNodeId: "node_modules/brace-expansion-under-devkit",
          range: "^2.0.1",
        },
        {
          parentNodeId: "node_modules/minimatch",
          childName: "brace-expansion",
          childNodeId: "node_modules/brace-expansion",
          range: "^5.0.5",
        },
      ],
    });

    mockPackumentsByPackage(fetchMock, {
      "brace-expansion": {
        versions: {
          "2.1.2": {},
          "2.1.4": {},
          "5.0.7": {},
          "5.0.9": {},
        },
      },
    });

    const result = await resolveNpmTransitiveRemediation({
      finding: {
        pkg: { name: "brace-expansion", version: "2.1.2", ecosystem: "npm" },
        vulnerabilities: [{ id: "GHSA-mh99-v99m-4gvg" }],
        severity: "high",
        cveAliases: [],
        dependencyPaths: [["project", "nx", "@nx/devkit", "minimatch", "brace-expansion"]],
        relationship: "transitive",
        firstFixedVersion: "5.0.8",
        validatedFirstFixedVersion: "2.1.4",
      },
      graph,
      packages: [
        { name: "nx", version: "23.0.0", ecosystem: "npm", paths: [["project", "nx"]] },
        {
          name: "@nx/devkit",
          version: "23.0.0",
          ecosystem: "npm",
          paths: [["project", "nx", "@nx/devkit"]],
        },
        {
          name: "minimatch",
          version: "9.0.3",
          ecosystem: "npm",
          paths: [["project", "nx", "@nx/devkit", "minimatch"]],
        },
        {
          name: "minimatch",
          version: "10.2.5",
          ecosystem: "npm",
          paths: [["project", "minimatch"]],
        },
      ],
      directDependencyNames: new Set(["nx"]),
    });

    expect(result).toMatchObject({
      kind: "update-parent-within-range",
      targetChildVersion: "2.1.4",
    });
    expect(result?.reason).toContain("minimatch@9.0.3");
  });

  it("still finds the correct edge among multiple physical graph nodes that share the same correct name+version", async () => {
    const graph = createNpmTransitiveGraph({
      nodes: [
        { id: "node_modules/eslint", name: "eslint", version: "9.0.0" },
        // Two separate physical locations, SAME name+version — a legitimate case
        // distinct from the name-collision bug, already handled by the existing
        // `for (const nodeId of nodeIds)` loop. One has no recorded range for
        // brace-expansion at all (a decoy); the other has the real edge.
        { id: "node_modules/eslint/node_modules/minimatch", name: "minimatch", version: "3.1.5" },
        { id: "node_modules/somewhere-else/node_modules/minimatch", name: "minimatch", version: "3.1.5" },
        { id: "node_modules/brace-expansion-under-eslint", name: "brace-expansion", version: "1.1.16" },
      ],
      edges: [
        {
          parentNodeId: "node_modules/eslint",
          childName: "minimatch",
          childNodeId: "node_modules/eslint/node_modules/minimatch",
          range: "^3.1.2",
        },
        {
          parentNodeId: "node_modules/eslint/node_modules/minimatch",
          childName: "brace-expansion",
          childNodeId: "node_modules/brace-expansion-under-eslint",
          range: "^1.1.7",
        },
        // The decoy node has no edge to brace-expansion at all - the loop must
        // skip it and use the other node id for the same name+version.
      ],
    });

    mockPackumentsByPackage(fetchMock, {
      "brace-expansion": {
        versions: {
          "1.1.16": {},
          "1.1.18": {},
        },
      },
    });

    const result = await resolveNpmTransitiveRemediation({
      finding: {
        pkg: { name: "brace-expansion", version: "1.1.16", ecosystem: "npm" },
        vulnerabilities: [{ id: "GHSA-mh99-v99m-4gvg" }],
        severity: "high",
        cveAliases: [],
        dependencyPaths: [["project", "eslint", "minimatch", "brace-expansion"]],
        relationship: "transitive",
        firstFixedVersion: "1.1.18",
        validatedFirstFixedVersion: "1.1.18",
      },
      graph,
      packages: [
        { name: "eslint", version: "9.0.0", ecosystem: "npm", paths: [["project", "eslint"]] },
        {
          name: "minimatch",
          version: "3.1.5",
          ecosystem: "npm",
          paths: [["project", "eslint", "minimatch"]],
        },
      ],
      directDependencyNames: new Set(["eslint"]),
    });

    expect(result).toMatchObject({
      kind: "update-parent-within-range",
      targetChildVersion: "1.1.18",
    });
  });
});

describe("resolveRecommendedParentUpgrade", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    clearPackumentCache();
  });

  it("returns null for non-transitive findings or missing usable paths", async () => {
    const resolveRecommendedParentUpgrade = await loadResolver();
    const packages = createPackages();

    await expect(
      resolveRecommendedParentUpgrade(
        createFinding({ relationship: "direct" }),
        packages,
      ),
    ).resolves.toBeNull();

    await expect(
      resolveRecommendedParentUpgrade(
        createFinding({ dependencyPaths: [], pkg: { name: "lodash", version: "4.17.20", ecosystem: "npm" } }),
        packages,
      ),
    ).resolves.toBeNull();

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns null when the direct parent cannot be found in the package list", async () => {
    const resolveRecommendedParentUpgrade = await loadResolver();
    const finding = createFinding({
      dependencyPaths: [["project", "missing-parent", "lodash"]],
    });

    await expect(resolveRecommendedParentUpgrade(finding, createPackages())).resolves.toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("recommends an exact direct-child parent upgrade when a newer parent stops allowing the vulnerable version", async () => {
    const resolveRecommendedParentUpgrade = await loadResolver();
    mockPackumentsByPackage(fetchMock, {
      app: {
        versions: {
          "1.0.0": { dependencies: { lodash: "^4.17.20" } },
          "1.0.5": { dependencies: { lodash: "^4.17.20" } },
          "1.1.0": { dependencies: { lodash: "^4.17.21" } },
        },
      },
      lodash: {
        versions: {
          "4.17.20": {},
          "4.17.21": {},
        },
      },
    });

    const result = await resolveRecommendedParentUpgrade(createFinding(), createPackages());

    expect(result).toMatchObject({
      package: "app",
      currentVersion: "1.0.0",
      targetVersion: "1.1.0",
      vulnerablePackage: "lodash",
      confidence: "verified",
    });
    expect(result?.reason).toContain("no longer allows lodash@4.17.20");
    expect(result?.reason).toContain("allows 4.17.21+");
  });

  it("uses validated lowest known non-vulnerable version when evaluating exact direct-child upgrades", async () => {
    const resolveRecommendedParentUpgrade = await loadResolver();
    mockPackumentsByPackage(fetchMock, {
      app: {
        versions: {
          "1.0.0": { dependencies: { lodash: "^4.17.20" } },
          "1.1.0": { dependencies: { lodash: "^4.18.0" } },
        },
      },
      lodash: {
        versions: {
          "4.17.20": {},
          "4.17.21": {},
          "4.18.0": {},
        },
      },
    });

    const result = await resolveRecommendedParentUpgrade(
      createFinding({
        firstFixedVersion: "4.17.21",
        validatedFirstFixedVersion: "4.18.0",
      }),
      createPackages(),
    );

    expect(result).toMatchObject({
      package: "app",
      currentVersion: "1.0.0",
      targetVersion: "1.1.0",
      vulnerablePackage: "lodash",
      confidence: "verified",
    });
    expect(result?.reason).toContain("allows 4.18.0+");
  });

  it("recommends an unverified upgrade for deeper paths that cannot be verified when the direct parent stops allowing the current intermediate version", async () => {
    const resolveRecommendedParentUpgrade = await loadResolver();
    // `mid` has no published versions to resolve against, so the terminal walk
    // cannot verify whether the vulnerable package would be resolved -> the
    // resolver falls back to the old "no longer allows the installed child"
    // heuristic, but labels the result unverified.
    mockPackumentsByPackage(fetchMock, {
      app: {
        versions: {
          "1.0.0": { dependencies: { mid: "^2.0.0" } },
          "1.1.0": { dependencies: { mid: "^2.0.0" } },
          "2.0.0": { dependencies: { mid: "^3.0.0" } },
        },
      },
      mid: { versions: {} },
    });

    const finding = createFinding({
      dependencyPaths: [["project", "app", "mid", "lodash"]],
      pkg: {
        name: "lodash",
        version: "4.17.20",
        ecosystem: "npm",
        paths: [["project", "app", "mid", "lodash"]],
      },
    });

    const result = await resolveRecommendedParentUpgrade(finding, createPackages());

    expect(result).toMatchObject({
      package: "app",
      currentVersion: "1.0.0",
      targetVersion: "2.0.0",
      vulnerablePackage: "lodash",
      confidence: "unverified",
    });
    expect(result?.reason).toContain("could not be verified");
  });

  it("returns null when the immediate parent version is missing or invalid in deeper paths", async () => {
    const resolveRecommendedParentUpgrade = await loadResolver();
    mockPackument({
      versions: {
        "1.1.0": { dependencies: { mid: "^3.0.0" } },
      },
    });

    const packages: PackageRef[] = [
      {
        name: "app",
        version: "1.0.0",
        ecosystem: "npm",
        paths: [["project", "app"]],
      },
      {
        name: "lodash",
        version: "4.17.20",
        ecosystem: "npm",
        paths: [["project", "app", "mid", "lodash"]],
      },
    ];

    const finding = createFinding({
      dependencyPaths: [["project", "app", "mid", "lodash"]],
      pkg: {
        name: "lodash",
        version: "4.17.20",
        ecosystem: "npm",
        paths: [["project", "app", "mid", "lodash"]],
      },
    });

    await expect(resolveRecommendedParentUpgrade(finding, packages)).resolves.toBeNull();
  });

  it("returns null when all newer parent versions are pre-release", async () => {
    const resolveRecommendedParentUpgrade = await loadResolver();
    mockPackumentsByPackage(fetchMock, {
      app: {
        versions: {
          "1.0.0": { dependencies: { lodash: "^4.17.20" } },
          "1.1.0-beta.1": { dependencies: { lodash: "^4.17.21" } },
          "1.1.0-next.0": { dependencies: { lodash: "^4.17.21" } },
        },
      },
      lodash: {
        versions: {
          "4.17.20": {},
          "4.17.21": {},
        },
      },
    });

    const result = await resolveRecommendedParentUpgrade(createFinding(), createPackages());

    expect(result).toBeNull();
  });

  it("skips pre-release parent versions and recommends the first stable upgrade", async () => {
    const resolveRecommendedParentUpgrade = await loadResolver();
    mockPackumentsByPackage(fetchMock, {
      app: {
        versions: {
          "1.0.0": { dependencies: { lodash: "^4.17.20" } },
          "1.1.0-beta.1": { dependencies: { lodash: "^4.17.21" } },
          "1.1.0": { dependencies: { lodash: "^4.17.21" } },
        },
      },
      lodash: {
        versions: {
          "4.17.20": {},
          "4.17.21": {},
        },
      },
    });

    const result = await resolveRecommendedParentUpgrade(createFinding(), createPackages());

    expect(result).toMatchObject({
      package: "app",
      targetVersion: "1.1.0",
    });
  });

  it("returns null when the registry packument cannot be fetched successfully", async () => {
    const resolveRecommendedParentUpgrade = await loadResolver();
    mockPackument({}, false);

    await expect(resolveRecommendedParentUpgrade(createFinding(), createPackages())).resolves.toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("returns null in offline mode without making any registry calls", async () => {
    // Every code path in this resolver needs the parent's published manifests,
    // so offline scans must short-circuit before the network call rather than
    // letting a fetch attempt fall through.
    const resolveRecommendedParentUpgrade = await loadResolver();

    await expect(
      resolveRecommendedParentUpgrade(createFinding(), createPackages(), null, { offline: true }),
    ).resolves.toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("selects the correct version of a package installed at multiple versions based on dependency path", async () => {
    // Regression test: when the same package (e.g. "mid") is installed at two
    // different versions on different dependency paths, findPackageVersion must
    // use path-aware iteration rather than a name-keyed Map. A Map only holds
    // one entry (last write wins), so the version on the other path would be
    // returned incorrectly or null.
    //
    // Graph: project -> app -> mid@2.0.0 -> lodash (vulnerable path)
    //        project -> app -> other -> mid@3.0.0 (different path, different version)
    const resolveRecommendedParentUpgrade = await loadResolver();

    mockPackumentsByPackage(fetchMock, {
      app: {
        versions: {
          "1.0.0": { dependencies: { mid: "^2.0.0" } },
          "2.0.0": { dependencies: { mid: "^3.0.0" } },
        },
      },
    });

    // Two versions of "mid" installed at different paths.
    const packages: PackageRef[] = [
      {
        name: "app",
        version: "1.0.0",
        ecosystem: "npm",
        paths: [["project", "app"]],
      },
      {
        name: "mid",
        version: "2.0.0",  // old version — the one on the vulnerable path
        ecosystem: "npm",
        paths: [["project", "app", "mid"]],
      },
      {
        name: "mid",
        version: "3.0.0",  // new version — different path, must not shadow the above
        ecosystem: "npm",
        paths: [["project", "app", "other", "mid"]],
      },
      {
        name: "lodash",
        version: "4.17.20",
        ecosystem: "npm",
        paths: [["project", "app", "mid", "lodash"]],
      },
    ];

    const finding = createFinding({
      dependencyPaths: [["project", "app", "mid", "lodash"]],
      pkg: {
        name: "lodash",
        version: "4.17.20",
        ecosystem: "npm",
        paths: [["project", "app", "mid", "lodash"]],
      },
    });

    // The resolver should use mid@2.0.0 (the version on the vulnerable path)
    // when calling findUpgradeForImmediateIntermediate. If it mistakenly used
    // mid@3.0.0 (from the Map's last-write-wins), the app@2.0.0 entry requires
    // mid ^3.0.0 which satisfies 3.0.0, so it would not be selected. With the
    // correct version (2.0.0), app@2.0.0 requires mid ^3.0.0 which no longer
    // allows mid@2.0.0, triggering the unverified upgrade recommendation.
    const result = await resolveRecommendedParentUpgrade(finding, packages, new Set(["app"]));

    expect(result).toMatchObject({
      package: "app",
      currentVersion: "1.0.0",
      targetVersion: "2.0.0",
      vulnerablePackage: "lodash",
      confidence: "unverified",
    });
    expect(result?.reason).toContain("could not be verified");
  });

  it("uses the root direct-dep version, not a nested same-name installation, as the currentVersion baseline when filtering upgrade candidates", async () => {
    // Regression test for the packagesByName Map collision on the DIRECT parent itself.
    //
    // Graph: project -> eslint@9.36.0 -> eslint-utils@1.4.3 (vulnerable path)
    //        project -> some-tool -> eslint@6.14.0 (nested, unrelated path)
    //
    // packagesByName is built as new Map(packages.map(p => [p.name, p])).
    // Because eslint appears twice and 6.14.0 is last in the array, the map
    // holds eslint -> 6.14.0. findDirectDependency then returns eslint@6.14.0
    // as the direct parent, so directParentVersion = "6.14.0". The candidate
    // filter compareVersions(version, "6.14.0") > 0 admits eslint@6.15.0,
    // producing a downgrade suggestion from the actually-installed 9.36.0.
    //
    // After the fix: path-based lookup must return eslint@9.36.0, so only
    // candidates > 9.36.0 (i.e. eslint@10.0.0) are considered.
    const resolveRecommendedParentUpgrade = await loadResolver();

    mockPackumentsByPackage(fetchMock, {
      eslint: {
        versions: {
          "6.14.0": { dependencies: { "eslint-utils": "^1.4.0" } },
          "6.15.0": { dependencies: { "eslint-utils": "^1.4.4" } },
          "9.36.0": { dependencies: { "eslint-utils": "^1.4.0" } },
          "10.0.0": { dependencies: { "eslint-utils": "^1.4.4" } },
        },
      },
    });

    const packages: PackageRef[] = [
      // Root eslint@9.36.0 - the actual direct dep on the finding's path.
      { name: "eslint", version: "9.36.0", ecosystem: "npm", paths: [["project", "eslint"]] },
      { name: "eslint-utils", version: "1.4.3", ecosystem: "npm", paths: [["project", "eslint", "eslint-utils"]] },
      // Nested eslint@6.14.0 - appears LAST so it wins the packagesByName Map,
      // causing findDirectDependency to return the wrong version when the bug is present.
      { name: "eslint", version: "6.14.0", ecosystem: "npm", paths: [["project", "some-tool", "eslint"]] },
    ];

    const finding = createFinding({
      pkg: { name: "eslint-utils", version: "1.4.3", ecosystem: "npm", paths: [["project", "eslint", "eslint-utils"]] },
      dependencyPaths: [["project", "eslint", "eslint-utils"]],
      firstFixedVersion: "1.4.4",
    });

    const result = await resolveRecommendedParentUpgrade(finding, packages, new Set(["eslint"]));

    // Must reflect the root installation version, not the nested one.
    expect(result?.currentVersion).toBe("9.36.0");
    // eslint@6.15.0 is a downgrade from 9.36.0 and must never be suggested.
    expect(result?.targetVersion).not.toBe("6.15.0");
    // The only valid upgrade above 9.36.0 is 10.0.0.
    expect(result).toMatchObject({
      package: "eslint",
      currentVersion: "9.36.0",
      targetVersion: "10.0.0",
      vulnerablePackage: "eslint-utils",
      confidence: "verified",
    });
  });
});

describe("resolveHighestSatisfying", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    clearPackumentCache();
  });

  it("picks the highest published non-prerelease version satisfying the range", async () => {
    const { resolveHighestSatisfying } = await loadPathHelpers();
    mockPackumentsByPackage(fetchMock, {
      foo: {
        versions: {
          "1.0.0": {},
          "1.1.0": {},
          "2.0.0-beta.1": {},
          "1.2.0": {},
        },
      },
    });

    const result = await resolveHighestSatisfying("foo", "^1.0.0");

    expect(result).toBe("1.2.0");
  });

  it("returns null when no published version satisfies the range", async () => {
    const { resolveHighestSatisfying } = await loadPathHelpers();
    mockPackumentsByPackage(fetchMock, {
      foo: {
        versions: {
          "1.0.0": {},
          "1.1.0": {},
        },
      },
    });

    const result = await resolveHighestSatisfying("foo", "^2.0.0");

    expect(result).toBeNull();
  });
});

describe("resolvePathTerminalVersion", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    clearPackumentCache();
  });

  it("walks the path names to the terminal and returns the vulnerable package's resolved version", async () => {
    const { resolvePathTerminalVersion } = await loadPathHelpers();
    mockPackumentsByPackage(fetchMock, {
      mid: {
        versions: {
          "2.0.0": { dependencies: { lodash: "^4.17.20" } },
          "2.1.0": { dependencies: { lodash: "^4.17.21" } },
        },
      },
      lodash: {
        versions: {
          "4.17.20": {},
          "4.17.21": {},
        },
      },
    });

    const result = await resolvePathTerminalVersion(
      { dependencies: { mid: "^2.0.0" } },
      ["mid", "lodash"],
      "lodash",
    );

    expect(result).toEqual({ terminalVersion: "4.17.21", resolvable: true });
  });

  it("treats a dropped dependency mid-path as fixed for this path", async () => {
    const { resolvePathTerminalVersion } = await loadPathHelpers();
    mockPackumentsByPackage(fetchMock, {
      mid: {
        versions: {
          "2.0.0": {},
          "2.1.0": { dependencies: {} },
        },
      },
    });

    const result = await resolvePathTerminalVersion(
      { dependencies: { mid: "^2.0.0" } },
      ["mid", "lodash"],
      "lodash",
    );

    expect(result).toEqual({ terminalVersion: null, resolvable: true });
  });

  it("returns unresolvable when a range mid-path has no satisfying published version", async () => {
    const { resolvePathTerminalVersion } = await loadPathHelpers();
    mockPackumentsByPackage(fetchMock, {
      mid: {
        versions: {
          "2.0.0": {},
          "2.1.0": {},
        },
      },
    });

    const result = await resolvePathTerminalVersion(
      { dependencies: { mid: "^99.0.0" } },
      ["mid", "lodash"],
      "lodash",
    );

    expect(result).toEqual({ terminalVersion: null, resolvable: false });
  });
});

describe("resolveRecommendedParentUpgrade - verified deep-chain outcomes (#896)", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    clearPackumentCache();
  });

  function deepFinding(): Finding {
    return createFinding({
      firstFixedVersion: "4.17.21",
      dependencyPaths: [["project", "app", "mid", "lodash"]],
      pkg: {
        name: "lodash",
        version: "4.17.20",
        ecosystem: "npm",
        paths: [["project", "app", "mid", "lodash"]],
      },
    });
  }

  it("recommends a verified upgrade when the path resolves the vulnerable package to a fixed version", async () => {
    const resolveRecommendedParentUpgrade = await loadResolver();
    mockPackumentsByPackage(fetchMock, {
      app: {
        versions: {
          "1.0.0": { dependencies: { mid: "^2.0.0" } },
          "1.1.0": { dependencies: { mid: "^2.1.0" } },
        },
      },
      mid: {
        versions: {
          "2.0.0": { dependencies: { lodash: "4.17.20" } },
          "2.1.0": { dependencies: { lodash: "^4.17.21" } },
        },
      },
      lodash: { versions: { "4.17.20": {}, "4.17.21": {} } },
    });

    const result = await resolveRecommendedParentUpgrade(deepFinding(), createPackages());

    expect(result).toMatchObject({
      package: "app",
      targetVersion: "1.1.0",
      vulnerablePackage: "lodash",
      confidence: "verified",
    });
    expect(result?.reason).toContain("4.17.21");
  });

  it("returns null when no parent version resolves the vulnerable package to a fixed version", async () => {
    const resolveRecommendedParentUpgrade = await loadResolver();
    mockPackumentsByPackage(fetchMock, {
      app: {
        versions: {
          "1.0.0": { dependencies: { mid: "^2.0.0" } },
          "1.1.0": { dependencies: { mid: "^2.0.0" } },
        },
      },
      mid: { versions: { "2.0.0": { dependencies: { lodash: "4.17.20" } } } },
      lodash: { versions: { "4.17.20": {}, "4.17.21": {} } },
    });

    const result = await resolveRecommendedParentUpgrade(deepFinding(), createPackages());

    expect(result).toBeNull();
  });

  it("recommends a verified upgrade when a parent version drops the vulnerable package from the path", async () => {
    const resolveRecommendedParentUpgrade = await loadResolver();
    mockPackumentsByPackage(fetchMock, {
      app: {
        versions: {
          "1.0.0": { dependencies: { mid: "^2.0.0" } },
          "1.1.0": { dependencies: { mid: "^2.1.0" } },
        },
      },
      mid: {
        versions: {
          "2.0.0": { dependencies: { lodash: "4.17.20" } },
          "2.1.0": { dependencies: {} },
        },
      },
      lodash: { versions: { "4.17.20": {}, "4.17.21": {} } },
    });

    const result = await resolveRecommendedParentUpgrade(deepFinding(), createPackages());

    expect(result).toMatchObject({
      package: "app",
      targetVersion: "1.1.0",
      confidence: "verified",
    });
    expect(result?.reason).toContain("no longer pulls");
  });

  it("terminates and returns null within the candidate cap when no version fixes the finding", async () => {
    const resolveRecommendedParentUpgrade = await loadResolver();
    const appVersions: Record<string, unknown> = {};
    for (let minor = 0; minor <= 30; minor++) {
      appVersions[`1.${minor}.0`] = { dependencies: { mid: "^2.0.0" } };
    }
    mockPackumentsByPackage(fetchMock, {
      app: { versions: appVersions },
      mid: { versions: { "2.0.0": { dependencies: { lodash: "4.17.20" } } } },
      lodash: { versions: { "4.17.20": {}, "4.17.21": {} } },
    });

    const result = await resolveRecommendedParentUpgrade(deepFinding(), createPackages());

    expect(result).toBeNull();
  });

  it("does not recommend a jest upgrade for brace-expansion when every jest still pulls the vulnerable version (#896 regression)", async () => {
    const resolveRecommendedParentUpgrade = await loadResolver();
    // Every jest version above current still resolves the path
    // jest -> @jest/core -> minimatch -> brace-expansion@2.x (below the 5.0.8 fix).
    // The old resolver recommended jest@30.4.2 and claimed it "should fix" the
    // finding; the verified resolver must return null instead.
    mockPackumentsByPackage(fetchMock, {
      jest: {
        versions: {
          "30.4.1": { dependencies: { "@jest/core": "^30.4.1" } },
          "30.4.2": { dependencies: { "@jest/core": "^30.4.1" } },
        },
      },
      "@jest/core": { versions: { "30.4.1": { dependencies: { minimatch: "^9.0.9" } } } },
      minimatch: { versions: { "9.0.9": { dependencies: { "brace-expansion": "^2.0.1" } } } },
      "brace-expansion": { versions: { "2.1.2": {}, "5.0.8": {} } },
    });

    const finding = createFinding({
      firstFixedVersion: "5.0.8",
      dependencyPaths: [["project", "jest", "@jest/core", "minimatch", "brace-expansion"]],
      pkg: {
        name: "brace-expansion",
        version: "2.1.2",
        ecosystem: "npm",
        paths: [["project", "jest", "@jest/core", "minimatch", "brace-expansion"]],
      },
    });

    const packages: PackageRef[] = [
      { name: "jest", version: "30.4.1", ecosystem: "npm", paths: [["project", "jest"]] },
      { name: "@jest/core", version: "30.4.1", ecosystem: "npm", paths: [["project", "jest", "@jest/core"]] },
      { name: "minimatch", version: "9.0.9", ecosystem: "npm", paths: [["project", "jest", "@jest/core", "minimatch"]] },
      { name: "brace-expansion", version: "2.1.2", ecosystem: "npm", paths: [["project", "jest", "@jest/core", "minimatch", "brace-expansion"]] },
    ];

    const result = await resolveRecommendedParentUpgrade(finding, packages, new Set(["jest"]));

    expect(result).toBeNull();
  });
});
