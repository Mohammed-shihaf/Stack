import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { jest } from "@jest/globals";
import type { OsvVuln, PackageRef, ParsedOptions } from "../src/types.js";
import { removeDir } from "./test-utils.js";

const queryBatchMock = jest.fn();
const getVulnMock = jest.fn();
const queryNpmAdvisoryGapsMock = jest.fn();

jest.unstable_mockModule("../src/advisory/osv-advisory-source.js", () => ({
  OsvAdvisorySource: jest.fn().mockImplementation(() => ({
    queryBatch: queryBatchMock,
    getVuln: getVulnMock,
  })),
}));

jest.unstable_mockModule("../src/advisory/npm-advisory-source.js", () => ({
  queryNpmAdvisoryGaps: queryNpmAdvisoryGapsMock,
}));

// Also mock remediation so tests don't hang on registry calls
jest.unstable_mockModule("../src/remediation/transitive-chain-resolver.js", () => ({
  resolveChainFix: jest.fn().mockResolvedValue(null),
}));
jest.unstable_mockModule("../src/remediation/npm-transitive-resolution.js", () => ({
  resolveNpmTransitiveRemediation: jest.fn().mockResolvedValue(null),
  resolveTransitiveRemediationViaRegistry: jest.fn().mockResolvedValue(null),
}));

const { scanPackages } = await import("../src/scanner.js");

function createTempCacheDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "cve-lite-npm-advisory-test-"));
}

function createOptions(cacheDir: string): ParsedOptions {
  return {
    batchSize: "100",
    failOn: "critical",
    cacheDir,
    json: true,
  };
}

function createPkg(name: string, version = "1.0.0"): PackageRef {
  return { name, version, ecosystem: "npm", paths: [[name]] };
}

const npmVuln: OsvVuln = {
  id: "GHSA-xxxx-yyyy-zzzz",
  aliases: ["CVE-2025-99999"],
  summary: "Test vuln",
  details: "",
  affected: [
    {
      package: { ecosystem: "npm", name: "some-pkg" },
      ranges: [{ type: "ECOSYSTEM", events: [{ introduced: "0" }, { fixed: "2.0.0" }] }],
    },
  ],
  severity: [],
  database_specific: { severity: "high" },
};

describe("npm advisory gap-filler integration", () => {
  beforeEach(() => {
    jest.spyOn(console, "log").mockImplementation(() => {});
    jest.spyOn(console, "error").mockImplementation(() => {});
    queryBatchMock.mockReset();
    getVulnMock.mockReset();
    queryNpmAdvisoryGapsMock.mockReset();
  });

  it("calls queryNpmAdvisoryGaps for packages with zero OSV matches and includes findings", async () => {
    const cacheDir = createTempCacheDir();
    const pkg = createPkg("some-pkg");

    // OSV returns nothing for this package
    queryBatchMock.mockResolvedValue([
      { package: "some-pkg", version: "1.0.0", vulnerabilities: [] },
    ]);
    // npm advisory finds a vuln
    queryNpmAdvisoryGapsMock.mockResolvedValue([{ pkg, vulns: [npmVuln] }]);

    try {
      const { findings } = await scanPackages([pkg], 100, createOptions(cacheDir));
      expect(queryNpmAdvisoryGapsMock).toHaveBeenCalledWith(
        expect.arrayContaining([expect.objectContaining({ name: "some-pkg" })]),
        expect.objectContaining({ offline: false }),
      );
      expect(findings.some(f => f.vulnerabilities?.some(v => v.id === "GHSA-xxxx-yyyy-zzzz"))).toBe(true);
    } finally {
      removeDir(cacheDir);
    }
  });

  it("does not double-count vulns that both OSV and npm advisory report", async () => {
    const cacheDir = createTempCacheDir();
    const pkg = createPkg("some-pkg");

    // OSV finds the same vuln that npm advisory also returns
    queryBatchMock.mockResolvedValue([
      { package: "some-pkg", version: "1.0.0", vulnerabilities: [{ id: "GHSA-xxxx-yyyy-zzzz" }] },
    ]);
    const osvVuln: OsvVuln = {
      id: "GHSA-xxxx-yyyy-zzzz",
      aliases: [],
      affected: [{ package: { ecosystem: "npm", name: "some-pkg" }, ranges: [] }],
    };
    getVulnMock.mockResolvedValue(osvVuln);

    // npm advisory also returns the same vuln (overlap case) - npmVuln.id is "GHSA-xxxx-yyyy-zzzz"
    queryNpmAdvisoryGapsMock.mockResolvedValue([{ pkg, vulns: [npmVuln] }]);

    try {
      const { findings } = await scanPackages([pkg], 100, createOptions(cacheDir));
      // The vuln should appear exactly once even though both sources returned it
      const matchingFindings = findings.filter(f =>
        f.vulnerabilities?.some(v => v.id === "GHSA-xxxx-yyyy-zzzz"),
      );
      expect(matchingFindings).toHaveLength(1);
    } finally {
      removeDir(cacheDir);
    }
  });

  it("surfaces npm advisory findings that OSV missed even when OSV found other vulns for the same package", async () => {
    const cacheDir = createTempCacheDir();
    const pkg = createPkg("some-pkg");

    // OSV finds vuln A
    queryBatchMock.mockResolvedValue([
      { package: "some-pkg", version: "1.0.0", vulnerabilities: [{ id: "GHSA-osv-found-0001" }] },
    ]);
    const osvVuln: OsvVuln = {
      id: "GHSA-osv-found-0001",
      aliases: [],
      affected: [{ package: { ecosystem: "npm", name: "some-pkg" }, ranges: [] }],
    };
    getVulnMock.mockResolvedValue(osvVuln);

    // npm advisory finds a DIFFERENT vuln B that is not in OSV
    const npmOnlyVuln: OsvVuln = {
      id: "GHSA-npm-only-1111",
      aliases: [],
      summary: "npm-only finding",
      details: "",
      affected: [{ package: { ecosystem: "npm", name: "some-pkg" }, ranges: [], versions: [] }],
      references: [],
      severity: [],
      database_specific: { severity: "high" },
    };
    queryNpmAdvisoryGapsMock.mockResolvedValue([{ pkg, vulns: [npmOnlyVuln] }]);

    try {
      const { findings } = await scanPackages([pkg], 100, createOptions(cacheDir));
      const vulnIds = findings.flatMap(f => f.vulnerabilities?.map(v => v.id) ?? []);
      expect(vulnIds).toContain("GHSA-osv-found-0001");
      expect(vulnIds).toContain("GHSA-npm-only-1111");
    } finally {
      removeDir(cacheDir);
    }
  });

  it("produces one Finding per package when OSV and npm advisory both have vulns for the same package", async () => {
    const cacheDir = createTempCacheDir();
    const pkg = createPkg("some-pkg");

    // OSV finds vuln A
    queryBatchMock.mockResolvedValue([
      { package: "some-pkg", version: "1.0.0", vulnerabilities: [{ id: "GHSA-osv-0001-0001" }] },
    ]);
    const osvVuln: OsvVuln = {
      id: "GHSA-osv-0001-0001",
      aliases: [],
      affected: [{ package: { ecosystem: "npm", name: "some-pkg" }, ranges: [] }],
    };

    // npm advisory finds ADDITIONAL vuln B not in OSV (disjoint IDs - the gap-filler scenario)
    const npmOnlyVuln: OsvVuln = {
      id: "GHSA-npm-0002-0002",
      aliases: [],
      summary: "npm-only vuln",
      details: "",
      affected: [{ package: { ecosystem: "npm", name: "some-pkg" }, ranges: [], versions: [] }],
      references: [],
      severity: [],
      database_specific: { severity: "medium" },
    };

    getVulnMock.mockImplementation(async (id: string) => {
      if (id === "GHSA-osv-0001-0001") return osvVuln;
      if (id === "GHSA-npm-0002-0002") return npmOnlyVuln;
      throw new Error(`Unexpected id: ${id}`);
    });
    queryNpmAdvisoryGapsMock.mockResolvedValue([{ pkg, vulns: [npmOnlyVuln] }]);

    try {
      const { findings } = await scanPackages([pkg], 100, createOptions(cacheDir));

      // Must produce exactly one Finding for some-pkg - not two separate rows
      const pkgFindings = findings.filter(f => f.pkg.name === "some-pkg");
      expect(pkgFindings).toHaveLength(1);

      // That one Finding must contain both vulns
      const vulnIds = pkgFindings[0]!.vulnerabilities.map(v => v.id);
      expect(vulnIds).toContain("GHSA-osv-0001-0001");
      expect(vulnIds).toContain("GHSA-npm-0002-0002");
    } finally {
      removeDir(cacheDir);
    }
  });

  it("caches npm advisory results and serves them from cache on second scan", async () => {
    const cacheDir = createTempCacheDir();
    const pkg = createPkg("some-pkg");

    queryBatchMock.mockResolvedValue([
      { package: "some-pkg", version: "1.0.0", vulnerabilities: [] },
    ]);
    queryNpmAdvisoryGapsMock.mockResolvedValue([{ pkg, vulns: [npmVuln] }]);

    try {
      await scanPackages([pkg], 100, createOptions(cacheDir));
      expect(queryNpmAdvisoryGapsMock).toHaveBeenCalledTimes(1);

      queryBatchMock.mockClear();
      queryNpmAdvisoryGapsMock.mockClear();

      // Second scan: queryBatch also returns nothing (cache hit for OSV)
      // but npm advisory entry is now in cache so queryNpmAdvisoryGaps should NOT be called
      await scanPackages([pkg], 100, createOptions(cacheDir));
      expect(queryNpmAdvisoryGapsMock).not.toHaveBeenCalled();
    } finally {
      removeDir(cacheDir);
    }
  });

  it("persists npm advisory cache entries for clean projects (no vulns from either source)", async () => {
    const cacheDir = createTempCacheDir();
    const pkg = createPkg("some-pkg");

    // OSV: nothing
    queryBatchMock.mockResolvedValue([
      { package: "some-pkg", version: "1.0.0", vulnerabilities: [] },
    ]);
    // npm advisory: also nothing
    queryNpmAdvisoryGapsMock.mockResolvedValue([]);

    try {
      await scanPackages([pkg], 100, createOptions(cacheDir));
      expect(queryNpmAdvisoryGapsMock).toHaveBeenCalledTimes(1);

      queryBatchMock.mockClear();
      queryNpmAdvisoryGapsMock.mockClear();

      // Second scan: cache should prevent re-querying npm advisory
      await scanPackages([pkg], 100, createOptions(cacheDir));
      expect(queryNpmAdvisoryGapsMock).not.toHaveBeenCalled();
    } finally {
      removeDir(cacheDir);
    }
  });

  it("does not call queryNpmAdvisoryGaps when offline is true", async () => {
    const cacheDir = createTempCacheDir();
    const pkg = createPkg("some-pkg");

    // In offline mode the scanner uses a LocalAdvisorySource path
    // and the npm advisory gap-filler is guarded by !offline
    // We just verify the guard works: queryNpmAdvisoryGapsMock must never be called
    queryNpmAdvisoryGapsMock.mockResolvedValue([]);

    try {
      const opts = { ...createOptions(cacheDir), offline: true };
      await scanPackages([pkg], 100, opts).catch(() => {
        // offline with no db is expected to fail; we only care that npm advisory was not called
      });
      expect(queryNpmAdvisoryGapsMock).not.toHaveBeenCalled();
    } finally {
      removeDir(cacheDir);
    }
  });
});

describe("OSV detail lookups for foreign advisory namespaces", () => {
  beforeEach(() => {
    jest.spyOn(console, "log").mockImplementation(() => {});
    jest.spyOn(console, "error").mockImplementation(() => {});
    queryBatchMock.mockReset();
    getVulnMock.mockReset();
    queryNpmAdvisoryGapsMock.mockReset();
  });

  it("never asks OSV to resolve an NPM-prefixed id", async () => {
    const cacheDir = createTempCacheDir();
    const pkg = createPkg("some-pkg");

    // A real scan carries both: GHSA ids OSV owns, and NPM ids contributed by the
    // npm registry advisory source from its own namespace.
    queryBatchMock.mockResolvedValue([
      {
        package: "some-pkg",
        version: "1.0.0",
        vulnerabilities: [{ id: "GHSA-xxxx-yyyy-zzzz" }, { id: "NPM-1193726" }],
      },
    ]);
    getVulnMock.mockResolvedValue({
      id: "GHSA-xxxx-yyyy-zzzz",
      aliases: [],
      affected: [{ package: { ecosystem: "npm", name: "some-pkg" }, ranges: [] }],
    } as OsvVuln);
    queryNpmAdvisoryGapsMock.mockResolvedValue([]);

    try {
      await scanPackages([pkg], 100, createOptions(cacheDir));

      const requestedIds = getVulnMock.mock.calls.map(call => call[0]);
      expect(requestedIds).toContain("GHSA-xxxx-yyyy-zzzz");
      // api.osv.dev/v1/vulns/NPM-... is a 404 by definition, so asking is not a
      // lookup that can succeed. It is a lookup in the wrong database.
      expect(requestedIds).not.toContain("NPM-1193726");
    } finally {
      removeDir(cacheDir);
    }
  });

  it("does not report an NPM-prefixed id as detail confirmed missing from OSV", async () => {
    const cacheDir = createTempCacheDir();
    const pkg = createPkg("some-pkg");

    queryBatchMock.mockResolvedValue([
      { package: "some-pkg", version: "1.0.0", vulnerabilities: [{ id: "NPM-1193726" }] },
    ]);
    // What api.osv.dev actually does for an id from another namespace. Without the
    // filter this 404 is recorded as detail confirmed missing, which is what drove
    // the whole scan to report incomplete.
    getVulnMock.mockRejectedValue(new Error("OSV request failed with 404 Not Found"));
    queryNpmAdvisoryGapsMock.mockResolvedValue([]);

    try {
      const { completeness } = await scanPackages([pkg], 100, createOptions(cacheDir));

      // This is the user-visible bug: every online scan of a project carrying
      // npm-sourced advisories reported "findings may be incomplete" when nothing
      // was missing.
      const confirmedMissing = completeness.diagnostics.find(
        d => d.code === "OSV_DETAIL_CONFIRMED_MISSING",
      );
      expect(confirmedMissing).toBeUndefined();
      expect(completeness.complete).toBe(true);
    } finally {
      removeDir(cacheDir);
    }
  });
});

describe("npm advisory detail across repeated scans", () => {
  beforeEach(() => {
    jest.spyOn(console, "log").mockImplementation(() => {});
    jest.spyOn(console, "error").mockImplementation(() => {});
    queryBatchMock.mockReset();
    getVulnMock.mockReset();
    queryNpmAdvisoryGapsMock.mockReset();
  });

  const npmOnlyVuln: OsvVuln = {
    id: "NPM-1193726",
    aliases: [],
    summary: "npm registry advisory",
    details: "",
    affected: [
      {
        package: { ecosystem: "npm", name: "some-pkg" },
        ranges: [{ type: "ECOSYSTEM", events: [{ introduced: "0" }, { fixed: "2.0.0" }] }],
      },
    ],
    severity: [],
    database_specific: { severity: "high" },
  };

  it("keeps npm-sourced advisory detail when a later scan reads it from cache", async () => {
    const cacheDir = createTempCacheDir();
    const pkg = createPkg("some-pkg");

    queryBatchMock.mockResolvedValue([
      { package: "some-pkg", version: "1.0.0", vulnerabilities: [] },
    ]);
    queryNpmAdvisoryGapsMock.mockResolvedValue([{ pkg, vulns: [npmOnlyVuln] }]);
    // OSV has never heard of this id. It belongs to the npm registry namespace.
    getVulnMock.mockRejectedValue(new Error("OSV request failed with 404 Not Found"));

    try {
      const first = await scanPackages([pkg], 100, createOptions(cacheDir));
      expect(first.findings.flatMap(f => f.vulnerabilities ?? []).map(v => v.id)).toContain(
        "NPM-1193726",
      );

      // The second scan hits the npm advisory cache, so the source is not queried
      // again. The detail has to come back from the cache or it is lost, and a
      // scanner that reports fewer CVEs on the second run than the first is worse
      // than one that fails loudly.
      queryNpmAdvisoryGapsMock.mockClear();
      const second = await scanPackages([pkg], 100, createOptions(cacheDir));

      expect(queryNpmAdvisoryGapsMock).not.toHaveBeenCalled();
      expect(second.findings.flatMap(f => f.vulnerabilities ?? []).map(v => v.id)).toContain(
        "NPM-1193726",
      );
    } finally {
      removeDir(cacheDir);
    }
  });
});
