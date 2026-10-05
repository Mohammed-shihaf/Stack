import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { OsvVuln, PackageRef } from "../src/types.js";
import { LocalAdvisoryDatabase } from "../src/advisory/local-db.js";
import { LocalAdvisorySource } from "../src/advisory/local-advisory-source.js";

function createTempDbPath(): string {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "cve-lite-local-db-"));
  return path.join(tempDir, "advisories.db");
}

function cleanupDbPath(dbPath: string): void {
  fs.rmSync(path.dirname(dbPath), { recursive: true, force: true });
}

function createPackage(name: string, version: string): PackageRef {
  return {
    name,
    version,
    ecosystem: "npm",
  };
}

function seedVulnerability(db: LocalAdvisoryDatabase, overrides?: Partial<OsvVuln>): OsvVuln {
  const vuln: OsvVuln = {
    id: "OSV-2026-LOCAL-1",
    aliases: ["CVE-2026-1234"],
    summary: "Offline advisory test fixture",
    affected: [
      {
        package: {
          ecosystem: "npm",
          name: "lodash",
        },
        ranges: [
          {
            type: "ECOSYSTEM",
            events: [
              { introduced: "0" },
              { fixed: "4.17.21" },
            ],
          },
        ],
      },
    ],
    ...overrides,
  };

  db.upsertVulnerability(vuln);
  return vuln;
}

describe("LocalAdvisorySource", () => {
  it("returns advisory matches for versions inside a stored affected range", async () => {
    const dbPath = createTempDbPath();
    const db = new LocalAdvisoryDatabase(dbPath);
    const source = new LocalAdvisorySource(db);

    try {
      seedVulnerability(db);

      const results = await source.queryBatch([
        createPackage("lodash", "4.17.20"),
        createPackage("lodash", "4.17.21"),
        createPackage("react", "18.2.0"),
      ]);

      expect(results).toEqual([
        {
          package: "lodash",
          version: "4.17.20",
          vulnerabilities: [{ id: "OSV-2026-LOCAL-1" }],
        },
        {
          package: "lodash",
          version: "4.17.21",
          vulnerabilities: [],
        },
        {
          package: "react",
          version: "18.2.0",
          vulnerabilities: [],
        },
      ]);
    } finally {
      db.close();
      cleanupDbPath(dbPath);
    }
  });

  it("treats last_affected as an inclusive upper bound", async () => {
    const dbPath = createTempDbPath();
    const db = new LocalAdvisoryDatabase(dbPath);
    const source = new LocalAdvisorySource(db);

    try {
      seedVulnerability(db, {
        id: "OSV-2026-LAST-AFFECTED",
        affected: [
          {
            package: {
              ecosystem: "npm",
              name: "minimist",
            },
            ranges: [
              {
                type: "ECOSYSTEM",
                events: [
                  { introduced: "0" },
                  { last_affected: "0.2.3" },
                ],
              },
            ],
          },
        ],
      });

      const results = await source.queryBatch([
        createPackage("minimist", "0.2.3"),
        createPackage("minimist", "0.2.4"),
      ]);

      expect(results[0]?.vulnerabilities).toEqual([{ id: "OSV-2026-LAST-AFFECTED" }]);
      expect(results[1]?.vulnerabilities).toEqual([]);
    } finally {
      db.close();
      cleanupDbPath(dbPath);
    }
  });
  it("flags a pre-release below the fix via the real versionMatchesRange path (issue #1087)", async () => {
    const dbPath = createTempDbPath();
    const db = new LocalAdvisoryDatabase(dbPath);
    const source = new LocalAdvisorySource(db);

    try {
      seedVulnerability(db); // lodash fixed at 4.17.21

      // 4.17.21-beta.1 sorts below 4.17.21, so it is still inside the affected range.
      const results = await source.queryBatch([
        createPackage("lodash", "4.17.21-beta.1"),
        createPackage("lodash", "4.17.21"),
      ]);

      expect(results[0]?.vulnerabilities).toEqual([{ id: "OSV-2026-LOCAL-1" }]);
      expect(results[1]?.vulnerabilities).toEqual([]);
    } finally {
      db.close();
      cleanupDbPath(dbPath);
    }
  });

  it("returns stored vulnerability documents by id", async () => {
    const dbPath = createTempDbPath();
    const db = new LocalAdvisoryDatabase(dbPath);
    const source = new LocalAdvisorySource(db);

    try {
      const vuln = seedVulnerability(db);
      await expect(source.getVuln(vuln.id)).resolves.toMatchObject({
        id: vuln.id,
        aliases: ["CVE-2026-1234"],
      });
    } finally {
      db.close();
      cleanupDbPath(dbPath);
    }
  });

  it("throws a clear error when a vulnerability id is not present in the local DB", async () => {
    const dbPath = createTempDbPath();
    const db = new LocalAdvisoryDatabase(dbPath);
    const source = new LocalAdvisorySource(db);

    try {
      await expect(source.getVuln("OSV-MISSING")).rejects.toThrow(
        "Local advisory database lookup failed for OSV-MISSING",
      );
    } finally {
      db.close();
      cleanupDbPath(dbPath);
    }
  });

  it("stores and returns advisory DB metadata", () => {
    const dbPath = createTempDbPath();
    const db = new LocalAdvisoryDatabase(dbPath);

    try {
      db.setMetadata({
        lastSyncAt: "2026-04-04T00:00:00.000Z",
        sourceUrl: "https://storage.googleapis.com/osv-vulnerabilities/npm/all.zip",
      });

      expect(db.getMetadata()).toEqual({
        lastSyncAt: "2026-04-04T00:00:00.000Z",
        sourceUrl: "https://storage.googleapis.com/osv-vulnerabilities/npm/all.zip",
      });
    } finally {
      db.close();
      cleanupDbPath(dbPath);
    }
  });
});

/**
 * Making compareVersions semver-correct (#1084) fixed the upper bound of an
 * affected range but broke the lower one: a pre-release of the introduced
 * version sorts below it and falls outside its own range. A `1.2.0-beta.1`
 * build is a pre-release *of* 1.2.0 and carries whatever the advisory says was
 * introduced there.
 *
 * The relaxation only applies when `introduced` is a stable release. OSV also
 * declares pre-release lower bounds (64 of 352 sampled `introduced` events, and
 * Next.js does it routinely), and those are deliberate canary boundaries that
 * must keep comparing exactly.
 */
function seedRange(
  db: LocalAdvisoryDatabase,
  pkg: string,
  events: Array<Record<string, string>>,
  id = "OSV-RANGE-1",
): void {
  db.upsertVulnerability({
    id,
    affected: [{ package: { ecosystem: "npm", name: pkg }, ranges: [{ type: "ECOSYSTEM", events }] }],
  } as OsvVuln);
}

async function detects(pkg: string, version: string, events: Array<Record<string, string>>): Promise<boolean> {
  const dbPath = createTempDbPath();
  const db = new LocalAdvisoryDatabase(dbPath);
  const source = new LocalAdvisorySource(db);
  try {
    seedRange(db, pkg, events);
    const results = await source.queryBatch([createPackage(pkg, version)]);
    return (results[0]?.vulnerabilities ?? []).length > 0;
  } finally {
    db.close();
    cleanupDbPath(dbPath);
  }
}

describe("LocalAdvisorySource - pre-release handling on the introduced bound", () => {
  const stable = [{ introduced: "1.2.0" }, { fixed: "1.3.0" }];

  it("flags a pre-release of the introduced version as affected", async () => {
    expect(await detects("pkg", "1.2.0-beta.1", stable)).toBe(true);
  });

  it("flags a release-candidate of the introduced version as affected", async () => {
    expect(await detects("pkg", "1.2.0-rc.1", stable)).toBe(true);
  });

  it("still excludes a pre-release of an earlier version", async () => {
    expect(await detects("pkg", "1.1.9-beta.1", stable)).toBe(false);
  });

  it("still flags the stable introduced version itself", async () => {
    expect(await detects("pkg", "1.2.0", stable)).toBe(true);
  });

  it("still excludes a version at or above the fix", async () => {
    expect(await detects("pkg", "1.3.0", stable)).toBe(false);
  });

  it("does not let the relaxation leak past the fixed bound", async () => {
    expect(await detects("pkg", "1.3.0-beta.1", [{ introduced: "1.2.0" }, { fixed: "1.3.0" }])).toBe(true);
  });

  describe("interaction with last_affected as the upper bound", () => {
    const inclusive = [{ introduced: "1.2.0" }, { last_affected: "1.2.9" }];

    it("flags a pre-release of the introduced version", async () => {
      expect(await detects("pkg", "1.2.0-beta.1", inclusive)).toBe(true);
    });

    it("still excludes a pre-release of an earlier version", async () => {
      expect(await detects("pkg", "1.1.9-beta.1", inclusive)).toBe(false);
    });

    it("still treats last_affected as inclusive", async () => {
      expect(await detects("pkg", "1.2.9", inclusive)).toBe(true);
    });

    it("still excludes a version above last_affected", async () => {
      expect(await detects("pkg", "1.3.0", inclusive)).toBe(false);
    });
  });

  describe("when the advisory declares a pre-release lower bound (Next.js canary shape)", () => {
    // GHSA-5f7q-jpqc-wp7h: introduced 15.0.1-canary.0, fixed 15.6.0-canary.61
    const canary = [{ introduced: "15.0.1-canary.0" }, { fixed: "15.6.0-canary.61" }];

    it("flags a later canary inside the declared window", async () => {
      expect(await detects("next", "15.0.1-canary.5", canary)).toBe(true);
    });

    it("excludes a canary below the declared lower bound", async () => {
      expect(await detects("next", "15.0.1-canary.0", [{ introduced: "15.0.1-canary.3" }, { fixed: "15.6.0" }])).toBe(false);
    });

    it("excludes a canary at or above the declared fix", async () => {
      expect(await detects("next", "15.6.0-canary.61", canary)).toBe(false);
    });

    it("does not widen a pre-release lower bound to its release core", async () => {
      // 15.0.1-canary.0 must NOT be treated as 15.0.1, which would pull in
      // earlier canaries the advisory deliberately excluded.
      expect(await detects("next", "15.0.0-canary.9", canary)).toBe(false);
    });
  });
});
