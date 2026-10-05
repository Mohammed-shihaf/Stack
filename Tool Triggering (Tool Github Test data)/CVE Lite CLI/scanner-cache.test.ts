import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { jest } from "@jest/globals";
import type { OsvVuln, PackageRef, ParsedOptions } from "../src/types.js";
import { LocalAdvisoryDatabase } from "../src/advisory/local-db.js";
import { clearPackumentCache, fetchPackument, runWithObserver } from "../src/remediation/npm-registry.js";
import { removeDir } from "./test-utils.js";

const queryBatchMock = jest.fn();
const getVulnMock = jest.fn();
const fetchMock = jest.fn();
global.fetch = fetchMock as unknown as typeof fetch;

jest.unstable_mockModule("../src/advisory/osv-advisory-source.js", () => ({
  OsvAdvisorySource: jest.fn().mockImplementation(() => ({
    queryBatch: queryBatchMock,
    getVuln: getVulnMock,
  })),
}));

let throwInChainFix: Error | null = null;
let throwInNpmRemediation: Error | null = null;
let throwInRegistryRemediation: Error | null = null;
const resolveChainFixMock = jest.fn(async () => {
  if (throwInChainFix) throw throwInChainFix;
  return null;
});
const resolveNpmTransitiveRemediationMock = jest.fn(async () => {
  if (throwInNpmRemediation) throw throwInNpmRemediation;
  return null;
});
const resolveTransitiveRemediationViaRegistryMock = jest.fn(async () => {
  if (throwInRegistryRemediation) throw throwInRegistryRemediation;
  return null;
});

jest.unstable_mockModule("../src/remediation/transitive-chain-resolver.js", () => ({
  resolveChainFix: resolveChainFixMock,
}));

jest.unstable_mockModule("../src/remediation/npm-transitive-resolution.js", () => ({
  resolveNpmTransitiveRemediation: resolveNpmTransitiveRemediationMock,
  resolveTransitiveRemediationViaRegistry: resolveTransitiveRemediationViaRegistryMock,
}));

const { scanPackages } = await import("../src/scanner.js");
const { loadCache, saveCache } = await import("../src/osv/cache.js");

function createTempCacheDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "cve-lite-scanner-test-"));
}

function createOptions(cacheDir: string): ParsedOptions {
  return {
    batchSize: "100",
    failOn: "critical",
    cacheDir,
    json: true,
  };
}

function createPackage(name: string, version: string): PackageRef {
  return {
    name,
    version,
    ecosystem: "npm",
    paths: [["root", name]],
  };
}

describe("scanPackages cache behavior", () => {
  beforeEach(() => {
    jest.spyOn(console, "log").mockImplementation(() => {});
    jest.spyOn(console, "error").mockImplementation(() => {});
    queryBatchMock.mockReset();
    getVulnMock.mockReset();
    fetchMock.mockReset();
    throwInChainFix = null;
    throwInNpmRemediation = null;
    throwInRegistryRemediation = null;
    resolveChainFixMock.mockClear();
    resolveNpmTransitiveRemediationMock.mockClear();
    resolveTransitiveRemediationViaRegistryMock.mockClear();
    clearPackumentCache();
  });

  it("uses cached package matches and advisory details on repeat scans", async () => {
    const cacheDir = createTempCacheDir();
    const pkg = createPackage("left-pad", "1.0.0");
    const detail: OsvVuln = {
      id: "OSV-123",
      aliases: ["CVE-2026-0001"],
      affected: [{ ranges: [{ events: [{ fixed: "1.0.1" }] }] }],
    };

    queryBatchMock.mockResolvedValue([
      {
        package: pkg.name,
        version: pkg.version,
        vulnerabilities: [{ id: "OSV-123" }],
      },
    ]);
    getVulnMock.mockResolvedValue(detail);

    try {
      const { findings: firstFindings } = await scanPackages([pkg], 100, createOptions(cacheDir));
      expect(firstFindings).toHaveLength(1);
      expect(firstFindings[0]?.vulnerabilities).toEqual([detail]);
      expect(queryBatchMock).toHaveBeenCalledTimes(1);
      expect(getVulnMock).toHaveBeenCalledTimes(1);

      queryBatchMock.mockClear();
      getVulnMock.mockClear();

      const { findings: secondFindings } = await scanPackages([pkg], 100, createOptions(cacheDir));
      expect(secondFindings).toHaveLength(1);
      expect(secondFindings[0]?.vulnerabilities).toEqual([detail]);
      expect(queryBatchMock).not.toHaveBeenCalled();
      expect(getVulnMock).not.toHaveBeenCalled();
    } finally {
      removeDir(cacheDir);
    }
  });

  it("does not retry advisory detail fetches for cached null entries", async () => {
    const cacheDir = createTempCacheDir();
    const pkg = createPackage("minimist", "0.0.8");
    const cacheFile = path.join(cacheDir, "osv-vulns.json");

    fs.writeFileSync(
      cacheFile,
      JSON.stringify({
        version: 4,
        createdAt: new Date().toISOString(),
        entries: {
          "OSV-NULL": { vuln: null, cachedAt: new Date().toISOString() },
        },
        queryEntries: {
          "npm:minimist@0.0.8": { vulnIds: ["OSV-NULL"], cachedAt: new Date().toISOString() },
        },
        npmVersionEntries: {},
      }),
      "utf8",
    );

    try {
      const { findings, completeness } = await scanPackages([pkg], 100, createOptions(cacheDir));

      expect(findings).toHaveLength(1);
      expect(findings[0]?.vulnerabilities).toEqual([]);
      expect(findings[0]?.unresolvedAdvisoryIds).toEqual(["OSV-NULL"]);
      expect(completeness).toEqual({
        complete: false,
        diagnostics: [
          expect.objectContaining({
            code: "OSV_DETAIL_CONFIRMED_MISSING",
            count: 1,
            impact: "detection",
          }),
        ],
      });
      expect(queryBatchMock).not.toHaveBeenCalled();
      expect(getVulnMock).not.toHaveBeenCalled();
    } finally {
      removeDir(cacheDir);
    }
  });

  it("stores package match results in the JSON cache after an uncached scan", async () => {
    const cacheDir = createTempCacheDir();
    const pkg = createPackage("debug", "4.0.0");
    const detail: OsvVuln = { id: "OSV-999" };

    queryBatchMock.mockResolvedValue([
      {
        package: pkg.name,
        version: pkg.version,
        vulnerabilities: [{ id: "OSV-999" }],
      },
    ]);
    getVulnMock.mockResolvedValue(detail);

    try {
      await scanPackages([pkg], 100, createOptions(cacheDir));

      const cache = loadCache(cacheDir);
      expect(cache.queryEntries["npm:debug@4.0.0"]).toMatchObject({
        vulnIds: ["OSV-999"],
        cachedAt: expect.any(String),
      });
      expect(cache.entries["OSV-999"]).toMatchObject({ vuln: { id: "OSV-999" } });
    } finally {
      removeDir(cacheDir);
    }
  });

  it("runs transitive remediation in offline mode using the lockfile graph and never hits the npm registry", async () => {
    // The scanner used to skip both lockfile graph construction and transitive
    // remediation when offline, which silently dropped fix-plan suggestions
    // for transitive findings. Now it should build the graph from the lockfile
    // (a local read) and resolve in-range parent updates without any network.
    const tempDir = createTempCacheDir();
    const dbPath = path.join(tempDir, "advisories.db");
    const lockfilePath = path.join(tempDir, "package-lock.json");
    fs.writeFileSync(
      lockfilePath,
      JSON.stringify({
        name: "fixture",
        version: "1.0.0",
        lockfileVersion: 3,
        packages: {
          "": { name: "fixture", version: "1.0.0", dependencies: { mocha: "^10.0.0" } },
          "node_modules/mocha": {
            name: "mocha",
            version: "10.0.0",
            dependencies: { diff: "^5.0.0" },
          },
          "node_modules/diff": { name: "diff", version: "5.0.0" },
        },
      }),
      "utf8",
    );

    const db = new LocalAdvisoryDatabase(dbPath);
    db.upsertVulnerability({
      id: "OSV-OFFLINE-TRANSITIVE",
      affected: [
        {
          package: { ecosystem: "npm", name: "diff" },
          ranges: [{ events: [{ introduced: "0" }, { fixed: "5.0.1" }] }],
        },
      ],
    });
    db.close();

    const mochaPkg: PackageRef = {
      name: "mocha",
      version: "10.0.0",
      ecosystem: "npm",
      paths: [["fixture", "mocha"]],
    };
    const transitivePkg: PackageRef = {
      name: "diff",
      version: "5.0.0",
      ecosystem: "npm",
      paths: [["fixture", "mocha", "diff"]],
    };
    resolveNpmTransitiveRemediationMock.mockResolvedValueOnce({
      kind: "update-parent-within-range",
      package: "mocha",
      currentVersion: "10.0.0",
      targetChildVersion: "5.0.1",
      viaPath: ["fixture", "mocha", "diff"],
      reason: "The parent range permits the fixed child version.",
    });

    try {
      const { findings } = await scanPackages(
        [mochaPkg, transitivePkg],
        100,
        {
          ...createOptions(tempDir),
          offline: true,
          offlineDb: dbPath,
        },
        {
          directDependencyNames: new Set(["mocha"]),
          scanSource: "package-lock",
          scanFilePath: lockfilePath,
        },
      );

      expect(findings).toHaveLength(1);
      expect(findings[0]?.relationship).toBe("transitive");
      expect(findings[0]?.recommendedNpmTransitiveRemediation).toMatchObject({
        kind: "update-parent-within-range",
        package: "mocha",
        currentVersion: "10.0.0",
        targetChildVersion: "5.0.1",
      });
      expect(queryBatchMock).not.toHaveBeenCalled();
      expect(fetchMock).not.toHaveBeenCalled();
    } finally {
      removeDir(tempDir);
    }
  });

  it("uses the local advisory database in offline mode without calling OSV", async () => {
    const tempDir = createTempCacheDir();
    const dbPath = path.join(tempDir, "advisories.db");
    const pkg = createPackage("lodash", "4.17.20");
    const db = new LocalAdvisoryDatabase(dbPath);

    db.upsertVulnerability({
      id: "OSV-OFFLINE-1",
      aliases: ["CVE-2026-0101"],
      affected: [
        {
          package: {
            ecosystem: "npm",
            name: "lodash",
          },
          ranges: [
            {
              events: [{ introduced: "0" }, { fixed: "4.17.21" }],
            },
          ],
        },
      ],
    });
    db.close();

    try {
      const { findings } = await scanPackages([pkg], 100, {
        ...createOptions(tempDir),
        offline: true,
        offlineDb: dbPath,
      });

      expect(findings).toHaveLength(1);
      expect(findings[0]?.vulnerabilities).toHaveLength(1);
      expect(findings[0]?.vulnerabilities[0]?.id).toBe("OSV-OFFLINE-1");
      expect(queryBatchMock).not.toHaveBeenCalled();
      expect(getVulnMock).not.toHaveBeenCalled();
    } finally {
      removeDir(tempDir);
    }
  });

  it("picks the lowest known non-vulnerable direct target when intermediate versions are still vulnerable", async () => {
    const cacheDir = createTempCacheDir();
    const pkg = createPackage("tar", "1.0.0");

    queryBatchMock.mockResolvedValue([
      {
        package: pkg.name,
        version: pkg.version,
        vulnerabilities: [{ id: "OSV-1" }, { id: "OSV-2" }],
      },
    ]);
    getVulnMock.mockImplementation(async (id: string) => {
      if (id === "OSV-1") {
        return {
          id,
          affected: [
            {
              package: { ecosystem: "npm", name: "tar" },
              ranges: [{ type: "SEMVER", events: [{ introduced: "0" }, { fixed: "1.0.2" }] }],
            },
          ],
        };
      }
      return {
        id,
        affected: [
          {
            package: { ecosystem: "npm", name: "tar" },
            ranges: [{ type: "SEMVER", events: [{ introduced: "1.0.2" }, { fixed: "1.0.4" }] }],
          },
        ],
      };
    });
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        versions: {
          "1.0.0": {},
          "1.0.1": {},
          "1.0.2": {},
          "1.0.3": {},
          "1.0.4": {},
        },
      }),
    });

    try {
      const { findings } = await scanPackages([pkg], 100, createOptions(cacheDir));

      expect(findings).toHaveLength(1);
      expect(findings[0]?.firstFixedVersion).toBe("1.0.2");
      expect(findings[0]?.validatedFirstFixedVersion).toBe("1.0.4");
      expect(findings[0]?.fixVersionValidationNote).toContain("scanned 4 package versions above current version");
      expect(findings[0]?.fixVersionValidationNote).toContain("(3 still known vulnerable)");
      expect(findings[0]?.fixVersionValidationNote).toContain("lowest known non-vulnerable version 1.0.4");
    } finally {
      removeDir(cacheDir);
    }
  });

  it("classifies short lockfile paths as transitive when not declared in the root manifest", async () => {
    const cacheDir = createTempCacheDir();
    const pkg = createPackage("tar", "6.2.1");
    const detail: OsvVuln = {
      id: "OSV-TRANSITIVE",
      affected: [{ ranges: [{ events: [{ fixed: "7.5.3" }] }] }],
    };

    queryBatchMock.mockResolvedValue([
      {
        package: pkg.name,
        version: pkg.version,
        vulnerabilities: [{ id: "OSV-TRANSITIVE" }],
      },
    ]);
    getVulnMock.mockResolvedValue(detail);
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ versions: { "6.2.1": {}, "7.5.3": {} } }),
    });

    try {
      const { findings } = await scanPackages([pkg], 100, createOptions(cacheDir), {
        directDependencyNames: new Set(["typescript", "jest"]),
      });

      expect(findings).toHaveLength(1);
      expect(findings[0]?.relationship).toBe("transitive");
    } finally {
      removeDir(cacheDir);
    }
  });

  it("classifies manifest-declared dependencies as direct", async () => {
    const cacheDir = createTempCacheDir();
    const pkg = createPackage("diff", "4.0.2");
    const detail: OsvVuln = {
      id: "OSV-DIRECT",
      affected: [{ ranges: [{ events: [{ fixed: "4.0.4" }] }] }],
    };

    queryBatchMock.mockResolvedValue([
      {
        package: pkg.name,
        version: pkg.version,
        vulnerabilities: [{ id: "OSV-DIRECT" }],
      },
    ]);
    getVulnMock.mockResolvedValue(detail);
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ versions: { "4.0.2": {}, "4.0.4": {} } }),
    });

    try {
      const { findings } = await scanPackages([pkg], 100, createOptions(cacheDir), {
        directDependencyNames: new Set(["diff", "typescript"]),
      });

      expect(findings).toHaveLength(1);
      expect(findings[0]?.relationship).toBe("direct");
    } finally {
      removeDir(cacheDir);
    }
  });

  it("keeps published fixed-version hints unconfirmed when advisory ranges are incomplete", async () => {
    const cacheDir = createTempCacheDir();
    const pkg = createPackage("tar", "2.0.0");

    queryBatchMock.mockImplementation(async (
      packages: Array<{ name: string; version: string }>,
      meta?: { batchId?: string },
    ) => {
      if (meta?.batchId === "fix-version-confirmation") {
        throw new Error("advisory source unavailable");
      }
      return packages.map(p => ({
        package: p.name,
        version: p.version,
        vulnerabilities: [{ id: "OSV-FIXED" }, { id: "OSV-INCOMPLETE" }],
      }));
    });
    getVulnMock.mockImplementation(async (id: string) => {
      if (id === "OSV-FIXED") {
        return {
          id,
          affected: [
            {
              package: { ecosystem: "npm", name: "tar" },
              ranges: [{ type: "SEMVER", events: [{ introduced: "0" }, { fixed: "2.0.1" }] }],
            },
          ],
        };
      }
      return {
        id,
        affected: [
          {
            package: { ecosystem: "npm", name: "tar" },
            ranges: [],
          },
        ],
      };
    });
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        versions: {
          "2.0.0": {},
          "2.0.1": {},
          "2.0.2": {},
        },
      }),
    });

    try {
      const { findings } = await scanPackages([pkg], 100, createOptions(cacheDir));

      expect(findings).toHaveLength(1);
      expect(findings[0]?.firstFixedVersion).toBe("2.0.1");
      expect(findings[0]?.validatedFirstFixedVersion).toBeNull();
      expect(findings[0]?.fixVersionValidationNote).toContain("could not be confirmed");
    } finally {
      removeDir(cacheDir);
    }
  });

  it("does not validate a range target when the advisory-source confirmation fails", async () => {
    const cacheDir = createTempCacheDir();
    const pkg = createPackage("tar", "2.0.0");

    queryBatchMock.mockImplementation(async (
      packages: Array<{ name: string; version: string }>,
      meta?: { batchId?: string },
    ) => {
      if (meta?.batchId === "fix-version-confirmation") {
        throw new Error("advisory source unavailable");
      }
      return packages.map(p => ({
        package: p.name,
        version: p.version,
        vulnerabilities: [{ id: "OSV-FIXED" }],
      }));
    });
    getVulnMock.mockResolvedValue({
      id: "OSV-FIXED",
      affected: [{
        package: { ecosystem: "npm", name: "tar" },
        ranges: [{ type: "SEMVER", events: [{ introduced: "0" }, { fixed: "2.0.1" }] }],
      }],
    });
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ versions: { "2.0.0": {}, "2.0.1": {} } }),
    });

    try {
      const { findings } = await scanPackages([pkg], 100, createOptions(cacheDir));

      expect(findings[0]?.firstFixedVersion).toBe("2.0.1");
      expect(findings[0]?.validatedFirstFixedVersion).toBeNull();
      expect(findings[0]?.fixVersionValidationNote).toContain("advisory source was unavailable");
    } finally {
      removeDir(cacheDir);
    }
  });

  it("fetches all uncached CVE detail IDs and populates findings even when some fail", async () => {
    const cacheDir = createTempCacheDir();
    const pkg = createPackage("multi-cve-pkg", "1.0.0");
    const goodDetail: OsvVuln = { id: "OSV-GOOD" };

    queryBatchMock.mockResolvedValue([
      { package: pkg.name, version: pkg.version, vulnerabilities: [{ id: "OSV-GOOD" }, { id: "OSV-BAD" }] },
    ]);
    // OSV-GOOD succeeds, OSV-BAD fails
    getVulnMock.mockImplementation(async (id: string) => {
      if (id === "OSV-BAD") throw new Error("network error");
      return goodDetail;
    });

    try {
      const { findings } = await scanPackages([pkg], 100, createOptions(cacheDir));
      // OSV-GOOD detail should be present even though OSV-BAD failed
      expect(findings).toHaveLength(1);
      expect(findings[0]?.vulnerabilities).toEqual([goodDetail]);
      expect(getVulnMock).toHaveBeenCalledTimes(2);
    } finally {
      removeDir(cacheDir);
    }
  });

  it("fetches multiple uncached CVE detail IDs and skips already-cached ones", async () => {
    const cacheDir = createTempCacheDir();
    const pkg = createPackage("cached-cve-pkg", "1.0.0");
    const cachedDetail: OsvVuln = { id: "OSV-CACHED" };
    const freshDetail: OsvVuln = { id: "OSV-FRESH" };
    const cacheFile = path.join(cacheDir, "osv-vulns.json");

    // Pre-populate cache with a fresh OSV-CACHED detail (not stale, so it is honored)
    fs.writeFileSync(
      cacheFile,
      JSON.stringify({
        version: 4,
        createdAt: new Date().toISOString(),
        entries: { "OSV-CACHED": { vuln: cachedDetail, cachedAt: new Date().toISOString() } },
        queryEntries: {},
        npmVersionEntries: {},
      }),
      "utf8",
    );

    queryBatchMock.mockResolvedValue([
      { package: pkg.name, version: pkg.version, vulnerabilities: [{ id: "OSV-CACHED" }, { id: "OSV-FRESH" }] },
    ]);
    getVulnMock.mockResolvedValue(freshDetail);

    try {
      const { findings } = await scanPackages([pkg], 100, createOptions(cacheDir));
      expect(findings).toHaveLength(1);
      // Both details should appear in the finding
      expect(findings[0]?.vulnerabilities).toEqual(expect.arrayContaining([cachedDetail, freshDetail]));
      // Only the uncached ID should have been fetched
      expect(getVulnMock).toHaveBeenCalledTimes(1);
      expect(getVulnMock).toHaveBeenCalledWith("OSV-FRESH");
    } finally {
      removeDir(cacheDir);
    }
  });

  it("refetches a stale detail record so refined advisory ranges are picked up (#860)", async () => {
    // Regression for #860: a cached OSV detail past CACHE_TTL_MS must be refetched.
    // Reproduces the js-yaml case - a stale merged range {0 -> 4.2.0} wrongly marks
    // 3.15.0 vulnerable and forces a 4.x bump; the refetched refined range {0 -> 3.15.0}
    // restores the correct within-range 3.15.0 fix.
    const cacheDir = createTempCacheDir();
    const pkg = createPackage("js-yaml", "3.14.1");
    const cacheFile = path.join(cacheDir, "osv-vulns.json");
    const staleTimestamp = new Date(Date.now() - 31 * 60 * 1000).toISOString();
    const freshTimestamp = new Date().toISOString();

    // Fresh query entry (so the query cache is a hit) + a STALE detail record.
    fs.writeFileSync(
      cacheFile,
      JSON.stringify({
        version: 4,
        createdAt: freshTimestamp,
        entries: {
          "GHSA-STALE": {
            vuln: {
              id: "GHSA-STALE",
              affected: [
                {
                  package: { ecosystem: "npm", name: "js-yaml" },
                  ranges: [{ type: "SEMVER", events: [{ introduced: "0" }, { fixed: "4.2.0" }] }],
                },
              ],
            },
            cachedAt: staleTimestamp,
          },
        },
        queryEntries: {
          "npm:js-yaml@3.14.1": { vulnIds: ["GHSA-STALE"], cachedAt: freshTimestamp },
        },
        npmVersionEntries: {},
      }),
      "utf8",
    );

    // The refined advisory data returned on refetch: 3.x line fixed at 3.15.0.
    getVulnMock.mockResolvedValue({
      id: "GHSA-STALE",
      affected: [
        {
          package: { ecosystem: "npm", name: "js-yaml" },
          ranges: [{ type: "SEMVER", events: [{ introduced: "0" }, { fixed: "3.15.0" }] }],
        },
      ],
    });
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ versions: { "3.14.1": {}, "3.15.0": {}, "4.3.0": {} } }),
    });
    queryBatchMock.mockImplementation(async (packages: Array<{ name: string; version: string }>) =>
      packages.map(p => ({ package: p.name, version: p.version, vulnerabilities: [] })),
    );

    try {
      const { findings } = await scanPackages([pkg], 100, createOptions(cacheDir), {
        directDependencyNames: new Set(["js-yaml"]),
      });

      // The query cache stayed a hit; only the stale detail was refetched.
      // Fix-version confirmation queries the advisory source separately and is
      // not part of the package scan, so it is excluded here.
      const packageScanCalls = queryBatchMock.mock.calls.filter(
        ([, meta]) => (meta as { batchId?: string } | undefined)?.batchId !== "fix-version-confirmation",
      );
      expect(packageScanCalls).toHaveLength(0);
      expect(getVulnMock).toHaveBeenCalledWith("GHSA-STALE");
      // Refreshed ranges restore the correct within-range fix instead of a 4.x bump.
      expect(findings[0]?.validatedFirstFixedVersion).toBe("3.15.0");
    } finally {
      removeDir(cacheDir);
    }
  });

  it("fires all batch requests in parallel rather than sequentially", async () => {
    const cacheDir = createTempCacheDir();
    const packages = Array.from({ length: 3 }, (_, i) =>
      createPackage(`pkg-${i}`, "1.0.0")
    );

    queryBatchMock.mockImplementation(async (pkgs: PackageRef[]) => {
      return pkgs.map(() => ({ package: pkgs[0]?.name, version: "1.0.0", vulnerabilities: [] }));
    });

    try {
      await scanPackages(packages, 1, createOptions(cacheDir));
      expect(queryBatchMock).toHaveBeenCalledTimes(3);
    } finally {
      removeDir(cacheDir);
    }
  });

  it("re-queries a clean cache entry that is older than 30 minutes", async () => {
    const cacheDir = createTempCacheDir();
    const pkg = createPackage("stale-clean", "1.0.0");
    const staleTimestamp = new Date(Date.now() - 31 * 60 * 1000).toISOString();
    const cacheFile = path.join(cacheDir, "osv-vulns.json");

    fs.writeFileSync(
      cacheFile,
      JSON.stringify({
        version: 3,
        createdAt: staleTimestamp,
        entries: {},
        queryEntries: {
          "npm:stale-clean@1.0.0": { vulnIds: [], cachedAt: staleTimestamp },
        },
      }),
      "utf8",
    );

    queryBatchMock.mockResolvedValue([
      { package: pkg.name, version: pkg.version, vulnerabilities: [] },
    ]);

    try {
      await scanPackages([pkg], 100, createOptions(cacheDir));
      expect(queryBatchMock).toHaveBeenCalledTimes(1);
    } finally {
      removeDir(cacheDir);
    }
  });

  it("re-queries a non-empty cache entry that is older than 30 minutes", async () => {
    const cacheDir = createTempCacheDir();
    const pkg = createPackage("stale-vuln", "2.0.0");
    const staleTimestamp = new Date(Date.now() - 31 * 60 * 1000).toISOString();
    const cacheFile = path.join(cacheDir, "osv-vulns.json");

    fs.writeFileSync(
      cacheFile,
      JSON.stringify({
        version: 3,
        createdAt: staleTimestamp,
        entries: {},
        queryEntries: {
          "npm:stale-vuln@2.0.0": { vulnIds: ["OSV-OLD"], cachedAt: staleTimestamp },
        },
      }),
      "utf8",
    );

    queryBatchMock.mockResolvedValue([
      { package: pkg.name, version: pkg.version, vulnerabilities: [{ id: "OSV-OLD" }, { id: "OSV-NEW" }] },
    ]);
    getVulnMock.mockResolvedValue({ id: "OSV-OLD" });

    try {
      await scanPackages([pkg], 100, createOptions(cacheDir));
      expect(queryBatchMock).toHaveBeenCalledTimes(1);
    } finally {
      removeDir(cacheDir);
    }
  });

  it("bypasses queryEntries cache lookup when noCache is true", async () => {
    const cacheDir = createTempCacheDir();
    const pkg = createPackage("lodash", "4.17.20");
    const cacheFile = path.join(cacheDir, "osv-vulns.json");

    fs.writeFileSync(
      cacheFile,
      JSON.stringify({
        version: 3,
        createdAt: new Date().toISOString(),
        entries: {},
        queryEntries: {
          "npm:lodash@4.17.20": { vulnIds: ["OSV-CACHED"], cachedAt: new Date().toISOString() },
        },
      }),
      "utf8",
    );

    queryBatchMock.mockResolvedValue([
      { package: pkg.name, version: pkg.version, vulnerabilities: [] },
    ]);

    try {
      await scanPackages([pkg], 100, { ...createOptions(cacheDir), noCache: true });
      expect(queryBatchMock).toHaveBeenCalledTimes(1);
    } finally {
      removeDir(cacheDir);
    }
  });

  it("still writes results to cache after a --no-cache scan", async () => {
    const cacheDir = createTempCacheDir();
    const pkg = createPackage("debug", "3.0.0");

    queryBatchMock.mockResolvedValue([
      { package: pkg.name, version: pkg.version, vulnerabilities: [{ id: "OSV-999" }] },
    ]);
    getVulnMock.mockResolvedValue({ id: "OSV-999" });

    try {
      await scanPackages([pkg], 100, { ...createOptions(cacheDir), noCache: true });
      const cache = loadCache(cacheDir);
      expect(cache.queryEntries["npm:debug@3.0.0"]).toMatchObject({
        vulnIds: ["OSV-999"],
        cachedAt: expect.any(String),
      });
    } finally {
      removeDir(cacheDir);
    }
  });

  it("attaches npm publish date to validated fix versions", async () => {
    const cacheDir = createTempCacheDir();
    const pkg = createPackage("lodash", "4.17.20");
    const detail: OsvVuln = {
      id: "OSV-LODASH",
      affected: [{ ranges: [{ events: [{ fixed: "4.17.21" }] }] }],
    };

    queryBatchMock.mockResolvedValue([
      {
        package: pkg.name,
        version: pkg.version,
        vulnerabilities: [{ id: "OSV-LODASH" }],
      },
    ]);
    getVulnMock.mockResolvedValue(detail);
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        versions: { "4.17.20": {}, "4.17.21": {} },
        time: { "4.17.21": "2021-02-20T19:00:00.000Z" },
      }),
    });

    try {
      const { findings } = await scanPackages([pkg], 100, createOptions(cacheDir));

      expect(findings).toHaveLength(1);
      expect(findings[0]?.validatedFirstFixedVersion).toBe("4.17.21");
      expect(findings[0]?.fixVersionPublishedAt).toBe("2021-02-20T19:00:00.000Z");

      const cache = loadCache(cacheDir);
      expect(cache.npmVersionEntries?.["lodash@4.17.21"]).toMatchObject({
        publishedAt: "2021-02-20T19:00:00.000Z",
        cachedAt: expect.any(String),
      });
    } finally {
      removeDir(cacheDir);
    }
  });

  it("skips publish date silently when version is missing from npm time map", async () => {
    const cacheDir = createTempCacheDir();
    const pkg = createPackage("private-pkg", "1.0.0");
    const detail: OsvVuln = {
      id: "OSV-PRIVATE",
      affected: [{ ranges: [{ events: [{ fixed: "1.0.1" }] }] }],
    };

    queryBatchMock.mockResolvedValue([
      {
        package: pkg.name,
        version: pkg.version,
        vulnerabilities: [{ id: "OSV-PRIVATE" }],
      },
    ]);
    getVulnMock.mockResolvedValue(detail);
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        versions: { "1.0.0": {}, "1.0.1": {} },
      }),
    });

    try {
      const { findings } = await scanPackages([pkg], 100, createOptions(cacheDir));

      expect(findings).toHaveLength(1);
      expect(findings[0]?.validatedFirstFixedVersion).toBe("1.0.1");
      expect(findings[0]?.fixVersionPublishedAt).toBeNull();
    } finally {
      removeDir(cacheDir);
    }
  });

  it("sets maliciousUnverifiable when MAL- advisory matches a package from a private registry", async () => {
    const cacheDir = createTempCacheDir();
    const pkg: PackageRef = {
      name: "evil-pkg",
      version: "1.0.0",
      ecosystem: "npm",
      paths: [["root", "evil-pkg"]],
      resolvedUrl: "https://npm.mycompany.internal/evil-pkg/-/evil-pkg-1.0.0.tgz",
    };
    const detail: OsvVuln = {
      id: "MAL-2026-0001",
      affected: [{ ranges: [{ events: [{ introduced: "0" }] }] }],
    };

    queryBatchMock.mockResolvedValue([
      { package: pkg.name, version: pkg.version, vulnerabilities: [{ id: "MAL-2026-0001" }] },
    ]);
    getVulnMock.mockResolvedValue(detail);
    fetchMock.mockResolvedValue({ ok: false, status: 404 });

    try {
      const { findings } = await scanPackages([pkg], 100, createOptions(cacheDir));
      expect(findings).toHaveLength(1);
      expect(findings[0]?.maliciousUnverifiable).toBe(true);
    } finally {
      removeDir(cacheDir);
    }
  });

  it("does NOT set maliciousUnverifiable when MAL- advisory matches a package from registry.npmjs.org", async () => {
    const cacheDir = createTempCacheDir();
    const pkg: PackageRef = {
      name: "lodash",
      version: "4.17.20",
      ecosystem: "npm",
      paths: [["root", "lodash"]],
      resolvedUrl: "https://registry.npmjs.org/lodash/-/lodash-4.17.20.tgz",
    };
    const detail: OsvVuln = {
      id: "MAL-2026-0002",
      affected: [{ ranges: [{ events: [{ introduced: "0" }] }] }],
    };

    queryBatchMock.mockResolvedValue([
      { package: pkg.name, version: pkg.version, vulnerabilities: [{ id: "MAL-2026-0002" }] },
    ]);
    getVulnMock.mockResolvedValue(detail);
    fetchMock.mockResolvedValue({ ok: false, status: 404 });

    try {
      const { findings } = await scanPackages([pkg], 100, createOptions(cacheDir));
      expect(findings).toHaveLength(1);
      expect(findings[0]?.maliciousUnverifiable).toBeUndefined();
    } finally {
      removeDir(cacheDir);
    }
  });

  it("does NOT set maliciousUnverifiable when MAL- advisory matches a package with no resolvedUrl", async () => {
    const cacheDir = createTempCacheDir();
    const pkg: PackageRef = {
      name: "some-pkg",
      version: "2.0.0",
      ecosystem: "npm",
      paths: [["root", "some-pkg"]],
    };
    const detail: OsvVuln = {
      id: "MAL-2026-0003",
      affected: [{ ranges: [{ events: [{ introduced: "0" }] }] }],
    };

    queryBatchMock.mockResolvedValue([
      { package: pkg.name, version: pkg.version, vulnerabilities: [{ id: "MAL-2026-0003" }] },
    ]);
    getVulnMock.mockResolvedValue(detail);
    fetchMock.mockResolvedValue({ ok: false, status: 404 });

    try {
      const { findings } = await scanPackages([pkg], 100, createOptions(cacheDir));
      expect(findings).toHaveLength(1);
      expect(findings[0]?.maliciousUnverifiable).toBeUndefined();
    } finally {
      removeDir(cacheDir);
    }
  });

  it("does NOT set maliciousUnverifiable for a non-MAL CVE from a private registry", async () => {
    const cacheDir = createTempCacheDir();
    const pkg: PackageRef = {
      name: "vulnerable-pkg",
      version: "1.0.0",
      ecosystem: "npm",
      paths: [["root", "vulnerable-pkg"]],
      resolvedUrl: "https://npm.mycompany.internal/vulnerable-pkg/-/vulnerable-pkg-1.0.0.tgz",
    };
    const detail: OsvVuln = {
      id: "CVE-2026-9999",
      affected: [{ ranges: [{ events: [{ introduced: "0" }] }] }],
    };

    queryBatchMock.mockResolvedValue([
      { package: pkg.name, version: pkg.version, vulnerabilities: [{ id: "CVE-2026-9999" }] },
    ]);
    getVulnMock.mockResolvedValue(detail);
    fetchMock.mockResolvedValue({ ok: false, status: 404 });

    try {
      const { findings } = await scanPackages([pkg], 100, createOptions(cacheDir));
      expect(findings).toHaveLength(1);
      expect(findings[0]?.maliciousUnverifiable).toBeUndefined();
    } finally {
      removeDir(cacheDir);
    }
  });

  it("preserves unresolved advisory ID on the finding when detail lookup fails", async () => {
    const cacheDir = createTempCacheDir();
    const pkg = createPackage("transient-fail-pkg", "1.0.0");
    const goodDetail: OsvVuln = { id: "OSV-GOOD" };

    queryBatchMock.mockResolvedValue([
      {
        package: pkg.name,
        version: pkg.version,
        vulnerabilities: [{ id: "OSV-GOOD" }, { id: "OSV-TRANSIENT" }],
      },
    ]);
    getVulnMock.mockImplementation(async (id: string) => {
      if (id === "OSV-TRANSIENT") throw new Error("network error");
      return goodDetail;
    });

    try {
      (console.log as jest.Mock).mockClear();
      const { findings } = await scanPackages([pkg], 100, createOptions(cacheDir));
      expect(findings).toHaveLength(1);
      expect(findings[0]?.vulnerabilities).toEqual([goodDetail]);
      expect(findings[0]?.unresolvedAdvisoryIds).toEqual(["OSV-TRANSIENT"]);
      expect(console.log).not.toHaveBeenCalled();
    } finally {
      removeDir(cacheDir);
    }
  });

  it("retries a transient detail lookup failure on the next scan", async () => {
    const cacheDir = createTempCacheDir();
    const pkg = createPackage("retry-pkg", "1.0.0");
    const detail: OsvVuln = { id: "OSV-RETRY" };

    queryBatchMock.mockResolvedValue([
      {
        package: pkg.name,
        version: pkg.version,
        vulnerabilities: [{ id: "OSV-RETRY" }],
      },
    ]);
    let callCount = 0;
    getVulnMock.mockImplementation(async () => {
      callCount += 1;
      if (callCount === 1) throw new Error("network error");
      return detail;
    });

    try {
      const { findings: firstFindings } = await scanPackages([pkg], 100, createOptions(cacheDir));
      expect(firstFindings[0]?.unresolvedAdvisoryIds).toEqual(["OSV-RETRY"]);
      expect(callCount).toBe(1);

      queryBatchMock.mockClear();
      getVulnMock.mockClear();

      const { findings: secondFindings } = await scanPackages([pkg], 100, createOptions(cacheDir));
      expect(secondFindings[0]?.vulnerabilities).toEqual([detail]);
      expect(getVulnMock).toHaveBeenCalledWith("OSV-RETRY");
    } finally {
      removeDir(cacheDir);
    }
  });

  it("keeps a finding incomplete when its advisory detail is confirmed missing", async () => {
    const cacheDir = createTempCacheDir();
    const pkg = createPackage("neg-cache-pkg", "1.0.0");

    queryBatchMock.mockResolvedValue([
      {
        package: pkg.name,
        version: pkg.version,
        vulnerabilities: [{ id: "OSV-404-MISSING" }],
      },
    ]);
    getVulnMock.mockRejectedValue(new Error("OSV vuln fetch failed for OSV-404-MISSING: 404 Not Found"));

    try {
      const { findings: firstFindings, completeness: firstCompleteness } = await scanPackages([pkg], 100, createOptions(cacheDir));
      expect(firstFindings).toHaveLength(1);
      expect(firstFindings[0]?.vulnerabilities).toEqual([]);
      expect(firstFindings[0]?.unresolvedAdvisoryIds).toEqual(["OSV-404-MISSING"]);
      expect(firstCompleteness).toEqual({
        complete: false,
        diagnostics: [
          expect.objectContaining({
            code: "OSV_DETAIL_CONFIRMED_MISSING",
            count: 1,
            impact: "detection",
          }),
        ],
      });

      queryBatchMock.mockClear();
      getVulnMock.mockClear();

      const { findings: secondFindings, completeness: secondCompleteness } = await scanPackages([pkg], 100, createOptions(cacheDir));
      expect(getVulnMock).not.toHaveBeenCalled();
      expect(secondFindings).toHaveLength(1);
      expect(secondFindings[0]?.vulnerabilities).toEqual([]);
      expect(secondFindings[0]?.unresolvedAdvisoryIds).toEqual(["OSV-404-MISSING"]);
      expect(secondCompleteness).toEqual({
        complete: false,
        diagnostics: [
          expect.objectContaining({
            code: "OSV_DETAIL_CONFIRMED_MISSING",
            count: 1,
            impact: "detection",
          }),
        ],
      });
    } finally {
      removeDir(cacheDir);
    }
  });

  it("marks a confirmed missing detail incomplete when another advisory supports the finding", async () => {
    const cacheDir = createTempCacheDir();
    const pkg = createPackage("mixed-detail-pkg", "1.0.0");
    const detail: OsvVuln = { id: "OSV-PRESENT" };

    queryBatchMock.mockResolvedValue([
      {
        package: pkg.name,
        version: pkg.version,
        vulnerabilities: [{ id: "OSV-PRESENT" }, { id: "OSV-404-MISSING" }],
      },
    ]);
    getVulnMock.mockImplementation(async (id: string) => {
      if (id === "OSV-404-MISSING") {
        throw new Error("OSV vuln fetch failed for OSV-404-MISSING: 404 Not Found");
      }
      return detail;
    });
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ versions: {} }),
    });

    try {
      const { findings, completeness } = await scanPackages([pkg], 100, createOptions(cacheDir));

      expect(findings).toHaveLength(1);
      expect(findings[0]?.vulnerabilities).toEqual([detail]);
      expect(findings[0]?.unresolvedAdvisoryIds).toEqual(["OSV-404-MISSING"]);
      expect(completeness).toEqual({
        complete: false,
        diagnostics: [
          expect.objectContaining({
            code: "OSV_DETAIL_CONFIRMED_MISSING",
            impact: "detection",
            count: 1,
          }),
        ],
      });
    } finally {
      removeDir(cacheDir);
    }
  });

  it("counts each advisory ID once in the warning even when shared across packages", async () => {
    const cacheDir = createTempCacheDir();
    const pkg1 = createPackage("pkg-shared-1", "1.0.0");
    const pkg2 = createPackage("pkg-shared-2", "1.0.0");
    const goodDetail: OsvVuln = { id: "OSV-SHARED-GOOD" };

    queryBatchMock.mockResolvedValue([
      {
        package: pkg1.name,
        version: pkg1.version,
        vulnerabilities: [{ id: "OSV-SHARED-GOOD" }, { id: "OSV-SHARED-FAIL" }],
      },
      {
        package: pkg2.name,
        version: pkg2.version,
        vulnerabilities: [{ id: "OSV-SHARED-GOOD" }, { id: "OSV-SHARED-FAIL" }],
      },
    ]);
    getVulnMock.mockImplementation(async (id: string) => {
      if (id === "OSV-SHARED-FAIL") throw new Error("network error");
      return goodDetail;
    });

    try {
      (console.log as jest.Mock).mockClear();
      const { findings } = await scanPackages([pkg1, pkg2], 100, {
        ...createOptions(cacheDir),
        json: false,
      });

      expect(findings).toHaveLength(2);
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining("1 advisory detail lookup missing from findings"),
      );
    } finally {
      removeDir(cacheDir);
    }
  });

  it("keeps the finding and reports incomplete when chain resolution fails", async () => {
    const cacheDir = createTempCacheDir();
    const lockfilePath = path.join(cacheDir, "package-lock.json");
    fs.writeFileSync(
      lockfilePath,
      JSON.stringify({
        name: "fixture",
        version: "1.0.0",
        lockfileVersion: 3,
        packages: {
          "": { name: "fixture", version: "1.0.0", dependencies: { "pkg-a": "^1.0.0" } },
          "node_modules/pkg-a": { name: "pkg-a", version: "1.0.0", dependencies: { "pkg-b": "^2.0.0" } },
          "node_modules/pkg-b": { name: "pkg-b", version: "2.0.0" },
        },
      }),
      "utf8",
    );
    const pkgA: PackageRef = {
      name: "pkg-a", version: "1.0.0", ecosystem: "npm",
      paths: [["fixture", "pkg-a"]],
    };
    const pkgB: PackageRef = {
      name: "pkg-b", version: "2.0.0", ecosystem: "npm",
      paths: [["fixture", "pkg-a", "pkg-b"]],
    };
    const detail: OsvVuln = {
      id: "OSV-CHAIN-FAIL",
      affected: [{ ranges: [{ events: [{ fixed: "3.0.0" }] }] }],
    };

    queryBatchMock.mockResolvedValue([
      { package: pkgA.name, version: pkgA.version, vulnerabilities: [] },
      { package: pkgB.name, version: pkgB.version, vulnerabilities: [{ id: "OSV-CHAIN-FAIL" }] },
    ]);
    getVulnMock.mockResolvedValue(detail);
    throwInChainFix = new Error("chain resolution failed");
    const debugLog = jest.fn();

    try {
      const { findings, completeness } = await scanPackages([pkgA, pkgB], 100, createOptions(cacheDir), {
        directDependencyNames: new Set(["pkg-a"]),
        scanSource: "package-lock",
        scanFilePath: lockfilePath,
      }, debugLog);

      const matched = findings.find(f => f.pkg.name === "pkg-b");
      expect(matched).toBeDefined();
      expect(matched?.chainResolution).toBeNull();
      expect(completeness.complete).toBe(false);
      expect(completeness.diagnostics).toContainEqual(
        expect.objectContaining({
          code: "CHAIN_RESOLUTION_FAILURE",
          count: 1,
          impact: "remediation",
          message: "1 chain resolution attempt failed — some validated upgrade chains may be missing.",
        }),
      );
      expect(debugLog).toHaveBeenCalledWith(
        "Chain resolution failed",
        expect.objectContaining({ package: "pkg-b" }),
      );
    } finally {
      throwInChainFix = null;
      removeDir(cacheDir);
    }
  });

  it("keeps the finding when transitive remediation fails", async () => {
    const cacheDir = createTempCacheDir();
    const pkgA: PackageRef = {
      name: "pkg-a",
      version: "1.0.0",
      ecosystem: "npm",
      paths: [["root", "pkg-a"]],
    };
    const pkgC: PackageRef = {
      name: "pkg-c",
      version: "2.0.0",
      ecosystem: "npm",
      paths: [["root", "pkg-a", "pkg-c"]],
    };
    const detail: OsvVuln = {
      id: "OSV-REMED-FAIL",
      affected: [{ ranges: [{ events: [{ fixed: "3.0.0" }] }] }],
    };

    queryBatchMock.mockResolvedValue([
      {
        package: pkgA.name,
        version: pkgA.version,
        vulnerabilities: [],
      },
      {
        package: pkgC.name,
        version: pkgC.version,
        vulnerabilities: [{ id: "OSV-REMED-FAIL" }],
      },
    ]);
    getVulnMock.mockResolvedValue(detail);
    throwInRegistryRemediation = new Error("remediation failed");
    const debugLog = jest.fn();

    try {
      const { findings, completeness } = await scanPackages([pkgA, pkgC], 100, createOptions(cacheDir), {
        directDependencyNames: new Set(["pkg-a"]),
      }, debugLog);

      const matched = findings.find(f => f.pkg.name === "pkg-c");
      expect(matched).toBeDefined();
      expect(completeness.diagnostics).toContainEqual(
        expect.objectContaining({
          code: "REMEDIATION_FAILURE",
          count: 1,
          affectedPackageCount: 1,
          message: "1 transitive remediation attempt failed across 1 package — some fix recommendations may be missing.",
        }),
      );
      expect(debugLog).toHaveBeenCalledWith(
        "Remediation failed",
        expect.objectContaining({ package: "pkg-c" }),
      );
    } finally {
      removeDir(cacheDir);
    }
  });

  it("does not cache a transient packument fetch failure", async () => {
    clearPackumentCache();
    fetchMock.mockRejectedValueOnce(new Error("network error"));

    let result: Awaited<ReturnType<typeof fetchPackument>>;
    try {
      result = await fetchPackument("transient-pkg");
    } catch {
      // fetchPackument returns null for transient failures
    }
    expect(result).toBeNull();

    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ versions: { "1.0.0": {} } }),
    });

    const second = await fetchPackument("transient-pkg");
    expect(second).not.toBeNull();
    expect(second?.versions).toEqual({ "1.0.0": {} });
    expect(fetchMock).toHaveBeenCalledTimes(2);

    clearPackumentCache();
  });

  it("warns about transient failures and confirmed missing details", async () => {
    const cacheDir = createTempCacheDir();
    const pkg = createPackage("mix-fail-pkg", "1.0.0");
    const goodDetail: OsvVuln = { id: "OSV-MIX-GOOD" };

    queryBatchMock.mockResolvedValue([
      {
        package: pkg.name,
        version: pkg.version,
        vulnerabilities: [
          { id: "OSV-MIX-GOOD" },
          { id: "OSV-MIX-TRANSIENT" },
          { id: "OSV-MIX-404" },
        ],
      },
    ]);
    getVulnMock.mockImplementation(async (id: string) => {
      if (id === "OSV-MIX-TRANSIENT") throw new Error("network error");
      if (id === "OSV-MIX-404") throw new Error("OSV vuln fetch failed for OSV-MIX-404: 404 Not Found");
      return goodDetail;
    });

    try {
      (console.log as jest.Mock).mockClear();
      const { findings } = await scanPackages([pkg], 100, {
        ...createOptions(cacheDir),
        json: false,
      });

      const matched = findings[0];
      expect(matched).toBeDefined();
      expect(matched?.vulnerabilities).toEqual([goodDetail]);
      expect(matched?.unresolvedAdvisoryIds).toEqual(
        expect.arrayContaining(["OSV-MIX-TRANSIENT", "OSV-MIX-404"]),
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining("2 advisory detail lookups missing from findings"),
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining("1 from transient failures — re-run to retry"),
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining("1 confirmed missing from the OSV API"),
      );
    } finally {
      removeDir(cacheDir);
    }
  });

  it("does not set unresolved advisory IDs in offline mode when all details resolve", async () => {
    const tempDir = createTempCacheDir();
    const dbPath = path.join(tempDir, "advisories.db");
    const pkg = createPackage("offline-resolved", "1.0.0");

    const db = new LocalAdvisoryDatabase(dbPath);
    db.upsertVulnerability({
      id: "OSV-OFFLINE-RESOLVED",
      aliases: ["CVE-2026-TEST"],
      affected: [
        {
          package: { ecosystem: "npm", name: "offline-resolved" },
          ranges: [{ events: [{ introduced: "0" }, { fixed: "2.0.0" }] }],
        },
      ],
    });
    db.close();

    try {
      const { findings } = await scanPackages([pkg], 100, {
        ...createOptions(tempDir),
        offline: true,
        offlineDb: dbPath,
      });

      expect(findings).toHaveLength(1);
      expect(findings[0]?.vulnerabilities).toHaveLength(1);
      expect(findings[0]?.unresolvedAdvisoryIds).toBeUndefined();
    } finally {
      removeDir(tempDir);
    }
  });

  describe("registry fetch observer", () => {
    let cacheDir: string;

    beforeEach(async () => {
      cacheDir = createTempCacheDir();
      clearPackumentCache();
    });

    afterEach(() => {
      if (fs.existsSync(cacheDir)) removeDir(cacheDir);
    });

    it("preserves a transient failure after a successful retry", async () => {
      const pkg: PackageRef = {
        name: "observer-retry-ok",
        version: "1.0.0",
        ecosystem: "npm",
        paths: [["root", "observer-parent", "observer-retry-ok"]],
      };
      const parent = createPackage("observer-parent", "1.0.0");
      const detail: OsvVuln = {
        id: "OSV-OBSERVER-RETRY",
        aliases: ["CVE-2026-OBR"],
        affected: [{ package: { ecosystem: "npm", name: "observer-retry-ok" }, ranges: [{ events: [{ introduced: "0" }, { fixed: "2.0.0" }] }] }],
      };

      queryBatchMock.mockResolvedValue([
        { package: pkg.name, version: pkg.version, vulnerabilities: [{ id: detail.id }] },
        { package: parent.name, version: parent.version, vulnerabilities: [] },
      ]);
      getVulnMock.mockResolvedValue(detail);

      let callCount = 0;
      fetchMock.mockImplementation(async (input: string | URL | Request) => {
        if (!String(input).endsWith("/observer-retry-ok")) {
          return { ok: true, json: async () => ({ versions: { "1.0.0": {} } }) };
        }
        callCount++;
        if (callCount === 1) throw new Error("timeout");
        return { ok: true, json: async () => ({ versions: { "2.0.0": {} } }) };
      });

      const { completeness } = await scanPackages([pkg, parent], 100, createOptions(cacheDir), {
        directDependencyNames: new Set(["observer-parent"]),
      });

      expect(callCount).toBe(2);
      expect(completeness.complete).toBe(false);
      expect(completeness.diagnostics).toEqual([
        expect.objectContaining({
          code: "PACKUMENT_FETCH_FAILURE",
          impact: "remediation",
          count: 1,
        }),
      ]);
    });

    it("preserves a transient failure after a 404 retry", async () => {
      const pkg: PackageRef = {
        name: "observer-retry-404",
        version: "1.0.0",
        ecosystem: "npm",
        paths: [["root", "observer-parent", "observer-retry-404"]],
      };
      const parent = createPackage("observer-parent", "1.0.0");
      const detail: OsvVuln = {
        id: "OSV-OBSERVER-404",
        aliases: ["CVE-2026-O404"],
        affected: [{ package: { ecosystem: "npm", name: "observer-retry-404" }, ranges: [{ events: [{ introduced: "0" }, { fixed: "2.0.0" }] }] }],
      };

      queryBatchMock.mockResolvedValue([
        { package: pkg.name, version: pkg.version, vulnerabilities: [{ id: detail.id }] },
        { package: parent.name, version: parent.version, vulnerabilities: [] },
      ]);
      getVulnMock.mockResolvedValue(detail);

      let callCount = 0;
      fetchMock.mockImplementation(async (input: string | URL | Request) => {
        if (!String(input).endsWith("/observer-retry-404")) {
          return { ok: true, json: async () => ({ versions: { "1.0.0": {} } }) };
        }
        callCount++;
        if (callCount === 1) throw new Error("timeout");
        return { ok: false, status: 404 };
      });

      const { completeness } = await scanPackages([pkg, parent], 100, createOptions(cacheDir), {
        directDependencyNames: new Set(["observer-parent"]),
      });

      expect(callCount).toBe(2);
      expect(completeness.complete).toBe(false);
      expect(completeness.diagnostics).toEqual([
        expect.objectContaining({
          code: "PACKUMENT_FETCH_FAILURE",
          impact: "remediation",
          count: 1,
        }),
      ]);
    });

    it("notifies each concurrent caller's observer when sharing an in-flight fetch", async () => {
      clearPackumentCache();
      fetchMock.mockImplementation(async () => {
        throw new Error("timeout");
      });

      const failuresA: string[] = [];
      const failuresB: string[] = [];
      const observerA = { onTransientFailure: (name: string) => { failuresA.push(name); } };
      const observerB = { onTransientFailure: (name: string) => { failuresB.push(name); } };

      await Promise.all([
        runWithObserver(observerA, () => fetchPackument("shared-package")),
        runWithObserver(observerB, () => fetchPackument("shared-package")),
      ]);

      expect(failuresA).toEqual(["shared-package"]);
      expect(failuresB).toEqual(["shared-package"]);
      // The second caller reuses the in-flight request instead of refetching.
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it("notifies the caller's observer for a cached result", async () => {
      clearPackumentCache();
      fetchMock.mockResolvedValue({ ok: false, status: 404 });

      const firstCallFailures: string[] = [];
      const secondCallResolved: string[] = [];

      await runWithObserver(
        { onTransientFailure: (name: string) => { firstCallFailures.push(name); } },
        () => fetchPackument("cached-404-package"),
      );
      await runWithObserver(
        { onResolved: (name: string) => { secondCallResolved.push(name); } },
        () => fetchPackument("cached-404-package"),
      );

      expect(firstCallFailures).toEqual([]);
      expect(secondCallResolved).toEqual(["cached-404-package"]);
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
  });
});

// #1166: --no-cache was honoured for OSV queries and the registry publish-date
// lookups, but the npm advisory block and the advisory detail block read their
// caches regardless. A flag whose whole purpose is to take the cache out of the
// picture left the run depending on cache state, and two consecutive --no-cache
// runs on the same tree could disagree (18 CVEs then 9, on the issue). That is
// also how #1165 stayed hidden, because --no-cache was used to get a
// trustworthy reading and quietly gave a cached one.
describe("--no-cache bypasses every cache read (#1166)", () => {
  const poison = { id: "NPM-POISON-1166" };

  function seedNpmAdvisoryCache(cacheDir: string, pkg: PackageRef): void {
    const cache = loadCache(cacheDir);
    cache.npmAdvisoryEntries[`npm:${pkg.name}@${pkg.version}`] = {
      vulns: [poison],
      cachedAt: new Date().toISOString(),
    } as never;
    saveCache(cache, cacheDir);
  }

  it("ignores a cached npm advisory entry", async () => {
    const cacheDir = createTempCacheDir();
    const pkg = createPackage("debug", "3.0.0");
    queryBatchMock.mockResolvedValue([
      { package: pkg.name, version: pkg.version, vulnerabilities: [] },
    ]);
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({}) });

    try {
      seedNpmAdvisoryCache(cacheDir, pkg);
      const result = await scanPackages([pkg], 100, { ...createOptions(cacheDir), noCache: true });
      const ids = result.findings.flatMap(f => f.vulnerabilities.map(v => v.id));
      expect(ids).not.toContain(poison.id);
    } finally {
      removeDir(cacheDir);
    }
  });

  // The control. Without the flag the same seeded entry must still be used, or
  // the fix would have broken the cache rather than bypassed it.
  it("still uses that cached entry when the flag is absent", async () => {
    const cacheDir = createTempCacheDir();
    const pkg = createPackage("debug", "3.0.0");
    queryBatchMock.mockResolvedValue([
      { package: pkg.name, version: pkg.version, vulnerabilities: [] },
    ]);
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({}) });

    try {
      seedNpmAdvisoryCache(cacheDir, pkg);
      const result = await scanPackages([pkg], 100, { ...createOptions(cacheDir), noCache: false });
      const ids = result.findings.flatMap(f => f.vulnerabilities.map(v => v.id));
      expect(ids).toContain(poison.id);
    } finally {
      removeDir(cacheDir);
    }
  });
});
