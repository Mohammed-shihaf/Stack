import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { initAdvisoryDatabase } from "../src/cli/advisories-init.js";
import { LocalAdvisoryDatabase } from "../src/advisory/local-db.js";

describe("initAdvisoryDatabase", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "cve-lite-init-"));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("creates an empty advisory database with the current schema", () => {
    const target = path.join(tmpDir, "advisories.db");
    const dbPath = initAdvisoryDatabase(target);

    expect(dbPath).toBe(target);
    expect(fs.existsSync(target)).toBe(true);

    // The file opens read-only (so the schema exists) and holds no advisories.
    const db = new LocalAdvisoryDatabase(target, { readonly: true });
    try {
      expect(db.getMetadata()).toEqual({ lastSyncAt: null, sourceUrl: null });
      expect(
        db.findMatchingVulnerabilityIds({ name: "lodash", version: "4.17.20", ecosystem: "npm" }),
      ).toEqual([]);
    } finally {
      db.close();
    }
  });

  it("throws rather than reuse an existing database file", () => {
    const target = path.join(tmpDir, "advisories.db");
    initAdvisoryDatabase(target);
    expect(() => initAdvisoryDatabase(target)).toThrow(/already exists/);
  });
});
