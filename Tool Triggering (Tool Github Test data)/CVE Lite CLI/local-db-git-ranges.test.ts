import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { OsvVuln, PackageRef } from "../src/types.js";
import { LocalAdvisoryDatabase } from "../src/advisory/local-db.js";
import { LocalAdvisorySource } from "../src/advisory/local-advisory-source.js";

function createTempDbPath(): string {
  return path.join(fs.mkdtempSync(path.join(os.tmpdir(), "cve-lite-git-range-")), "advisories.db");
}

function pkg(name: string, version: string): PackageRef {
  return { name, version, ecosystem: "npm" };
}

const COMMIT = "74ea7cf4d1b1a1a0a0d0e0f0a0b0c0d0e0f0a0b0";

function vulnWithRange(type: string, introduced: string, fixed: string): OsvVuln {
  return {
    id: "OSV-2026-1191",
    aliases: ["CVE-2026-1191"],
    summary: "GIT range fixture",
    affected: [{
      package: { ecosystem: "npm", name: "gitpkg" },
      ranges: [{ type, events: [{ introduced }, { fixed }] }],
    }],
  } as unknown as OsvVuln;
}

// #1191: ranges were stored without filtering on type, so a GIT range's commit
// hashes were written as if they were versions. versionMatchesRange then asked
// compareVersions to order a version against a hash, which returns an ordering
// rather than rejecting it, so the `fixed` bound failed to exclude and a
// patched version was reported as vulnerable.
describe("offline advisory DB - GIT ranges (#1191)", () => {
  it("does not report a patched version as vulnerable from a GIT range", async () => {
    const dbPath = createTempDbPath();
    const db = new LocalAdvisoryDatabase(dbPath);
    try {
      // introduced must be "0" so the introduced guard does not exclude the row
      // first. The defect is specifically that a commit hash as `fixed` fails to
      // exclude, because compareVersions orders it instead of rejecting it.
      db.upsertVulnerability(vulnWithRange("GIT", "0", COMMIT));
      const results = await new LocalAdvisorySource(db).queryBatch([pkg("gitpkg", "2.32.4")]);
      expect(results[0]!.vulnerabilities).toHaveLength(0);
    } finally {
      db.close();
      fs.rmSync(path.dirname(dbPath), { recursive: true, force: true });
    }
  });

  // The filter must not swallow the ranges we actually rely on.
  it("still matches an ECOSYSTEM range", async () => {
    const dbPath = createTempDbPath();
    const db = new LocalAdvisoryDatabase(dbPath);
    try {
      db.upsertVulnerability(vulnWithRange("ECOSYSTEM", "0", "2.33.0"));
      const results = await new LocalAdvisorySource(db).queryBatch([
        pkg("gitpkg", "2.32.4"),
        pkg("gitpkg", "2.33.0"),
      ]);
      expect(results[0]!.vulnerabilities).toHaveLength(1);
      expect(results[1]!.vulnerabilities).toHaveLength(0);
    } finally {
      db.close();
      fs.rmSync(path.dirname(dbPath), { recursive: true, force: true });
    }
  });

  it("reads a two-component fixed bound rather than discarding the row", async () => {
    const dbPath = createTempDbPath();
    const db = new LocalAdvisoryDatabase(dbPath);
    try {
      db.upsertVulnerability(vulnWithRange("ECOSYSTEM", "0", "2.33"));
      const results = await new LocalAdvisorySource(db).queryBatch([
        pkg("gitpkg", "2.32.4"),
        pkg("gitpkg", "2.33.0"),
      ]);
      expect(results[0]!.vulnerabilities).toHaveLength(1);
      expect(results[1]!.vulnerabilities).toHaveLength(0);
    } finally {
      db.close();
      fs.rmSync(path.dirname(dbPath), { recursive: true, force: true });
    }
  });
});
