import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { isEntryStale, loadCache, saveCache } from "../src/osv/cache.js";
import type { CacheFile, OsvVuln } from "../src/types.js";

function createTempCacheDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "cve-lite-cache-test-"));
}

function removeDir(dirPath: string) {
  fs.rmSync(dirPath, { recursive: true, force: true });
}

describe("OSV cache", () => {
  it("returns an empty version 6 cache when the file does not exist", () => {
    const cacheDir = createTempCacheDir();
    try {
      const cache = loadCache(cacheDir);
      expect(cache.version).toBe(6);
      expect(cache.entries).toEqual({});
      expect(cache.queryEntries).toEqual({});
    } finally {
      removeDir(cacheDir);
    }
  });

  it("migrates a v1 cache file (no queryEntries) to v6", () => {
    const cacheDir = createTempCacheDir();
    const cacheFile = path.join(cacheDir, "osv-vulns.json");
    fs.writeFileSync(
      cacheFile,
      JSON.stringify({
        version: 1,
        createdAt: "2026-01-01T00:00:00.000Z",
        entries: { "OSV-123": { id: "OSV-123", aliases: ["CVE-2026-0001"] } },
      }),
      "utf8",
    );
    try {
      const cache = loadCache(cacheDir);
      expect(cache.version).toBe(6);
      expect(cache.entries["OSV-123"]).toMatchObject({ vuln: { id: "OSV-123" } });
      expect(cache.queryEntries).toEqual({});
    } finally {
      removeDir(cacheDir);
    }
  });

  it("migrates a v2 cache (string[] queryEntries) to v6 and marks entries stale", () => {
    const cacheDir = createTempCacheDir();
    const cacheFile = path.join(cacheDir, "osv-vulns.json");
    fs.writeFileSync(
      cacheFile,
      JSON.stringify({
        version: 2,
        createdAt: "2026-01-01T00:00:00.000Z",
        entries: {},
        queryEntries: { "npm:left-pad@1.0.0": ["OSV-123"] },
      }),
      "utf8",
    );
    try {
      const cache = loadCache(cacheDir);
      expect(cache.version).toBe(6);
      const entry = cache.queryEntries["npm:left-pad@1.0.0"];
      expect(entry?.vulnIds).toEqual(["OSV-123"]);
      expect(isEntryStale(entry!, Date.now())).toBe(true);
    } finally {
      removeDir(cacheDir);
    }
  });

  it("backdates legacy (v3) detail records on migration so they refetch (#860)", () => {
    // v3 stored detail records with no timestamp. On migration to v6 they are
    // backdated to epoch so a stale advisory (e.g. an old merged range that
    // hid the within-range fix) is treated as expired and refetched. Guards #860.
    const cacheDir = createTempCacheDir();
    const cacheFile = path.join(cacheDir, "osv-vulns.json");
    fs.writeFileSync(
      cacheFile,
      JSON.stringify({
        version: 3,
        createdAt: "2026-01-01T00:00:00.000Z",
        entries: { "GHSA-h67p-54hq-rp68": { id: "GHSA-h67p-54hq-rp68" } },
        queryEntries: {},
      }),
      "utf8",
    );
    try {
      const cache = loadCache(cacheDir);
      expect(cache.version).toBe(6);
      const entry = cache.entries["GHSA-h67p-54hq-rp68"];
      expect(entry?.vuln).toMatchObject({ id: "GHSA-h67p-54hq-rp68" });
      expect(isEntryStale(entry!, Date.now())).toBe(true);
    } finally {
      removeDir(cacheDir);
    }
  });

  it("persists v5 detail and query entries and reloads them correctly", () => {
    const cacheDir = createTempCacheDir();
    const now = new Date().toISOString();
    const cache: CacheFile = {
      version: 5,
      createdAt: now,
      entries: { "OSV-123": { vuln: { id: "OSV-123", aliases: ["CVE-2026-0001"] }, cachedAt: now } },
      queryEntries: {
        "npm:left-pad@1.0.0": { vulnIds: ["OSV-123"], cachedAt: now },
      },
      npmVersionEntries: {},
      npmAdvisoryEntries: {},
    };
    try {
      saveCache(cache, cacheDir);
      const reloaded = loadCache(cacheDir);
      expect(reloaded.entries["OSV-123"]).toMatchObject({ vuln: { id: "OSV-123" } });
      expect(reloaded.queryEntries["npm:left-pad@1.0.0"]).toMatchObject({
        vulnIds: ["OSV-123"],
        cachedAt: now,
      });
    } finally {
      removeDir(cacheDir);
    }
  });

  it("isEntryStale returns true when cachedAt is more than 30 minutes ago", () => {
    const thirtyOneMinutesAgo = new Date(Date.now() - 31 * 60 * 1000).toISOString();
    expect(isEntryStale({ cachedAt: thirtyOneMinutesAgo }, Date.now())).toBe(true);
  });

  it("isEntryStale returns false when cachedAt is less than 30 minutes ago", () => {
    const twentyNineMinutesAgo = new Date(Date.now() - 29 * 60 * 1000).toISOString();
    expect(isEntryStale({ cachedAt: twentyNineMinutesAgo }, Date.now())).toBe(false);
  });

  it("isEntryStale returns false for a freshly written entry", () => {
    const now = new Date().toISOString();
    expect(isEntryStale({ cachedAt: now }, Date.now())).toBe(false);
  });

  describe("npmAdvisoryEntries", () => {
    it("loads v4 cache with empty npmAdvisoryEntries", () => {
      const cacheDir = createTempCacheDir();
      const cacheFile = path.join(cacheDir, "osv-vulns.json");
      const v4 = { version: 4, createdAt: "2026-01-01T00:00:00.000Z", entries: {}, queryEntries: {}, npmVersionEntries: {} };
      fs.writeFileSync(cacheFile, JSON.stringify(v4));
      try {
        const cache = loadCache(cacheDir);
        expect(cache.npmAdvisoryEntries).toEqual({});
      } finally {
        removeDir(cacheDir);
      }
    });

    it("round-trips the advisories themselves at v6, not just their ids", () => {
      const cacheDir = createTempCacheDir();
      try {
        const vuln = {
          id: "GHSA-35jh-r3h4-6jhm",
          aliases: ["CVE-2020-8203"],
          summary: "Prototype pollution",
          affected: [{ package: { ecosystem: "npm", name: "lodash" }, ranges: [] }],
        } as unknown as OsvVuln;
        const cache = loadCache(cacheDir);
        cache.npmAdvisoryEntries["npm:lodash@4.17.20"] = { vulns: [vuln], cachedAt: new Date().toISOString() };
        saveCache(cache, cacheDir);
        const reloaded = loadCache(cacheDir);
        // Storing ids alone is what broke #1165: the detail lives in the npm registry
        // namespace, so a later scan had ids it could not resolve anywhere.
        expect(reloaded.npmAdvisoryEntries["npm:lodash@4.17.20"]?.vulns).toEqual([vuln]);
      } finally {
        removeDir(cacheDir);
      }
    });

    it("discards v5 npmAdvisoryEntries, which carried ids with no detail", () => {
      const cacheDir = createTempCacheDir();
      try {
        const now = new Date().toISOString();
        fs.writeFileSync(
          path.join(cacheDir, "osv-cache.json"),
          JSON.stringify({
            version: 5,
            createdAt: now,
            entries: {},
            queryEntries: {},
            npmVersionEntries: {},
            npmAdvisoryEntries: { "npm:lodash@4.17.20": { vulnIds: ["GHSA-35jh-r3h4-6jhm"], cachedAt: now } },
          }),
        );
        const cache = loadCache(cacheDir);
        expect(cache.version).toBe(6);
        expect(cache.npmAdvisoryEntries).toEqual({});
      } finally {
        removeDir(cacheDir);
      }
    });

    it("treats stale npmAdvisoryEntries as uncached", () => {
      const cacheDir = createTempCacheDir();
      try {
        const cache = loadCache(cacheDir);
        cache.npmAdvisoryEntries["npm:lodash@4.17.20"] = { vulns: [], cachedAt: new Date(0).toISOString() };
        saveCache(cache, cacheDir);
        const reloaded = loadCache(cacheDir);
        const entry = reloaded.npmAdvisoryEntries["npm:lodash@4.17.20"]!;
        expect(isEntryStale(entry, Date.now())).toBe(true);
      } finally {
        removeDir(cacheDir);
      }
    });
  });
});
