import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { hasOverrideEntries } from "../../src/utils/package-json.js";

function makeTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "pkg-json-test-"));
}

function writePackageJson(dir: string, content: Record<string, unknown>): void {
  fs.writeFileSync(path.join(dir, "package.json"), JSON.stringify(content));
}

describe("hasOverrideEntries", () => {
  it("returns false when package.json does not exist", () => {
    const dir = makeTempDir();
    expect(hasOverrideEntries(dir)).toBe(false);
  });

  it("returns false when package.json has no override fields", () => {
    const dir = makeTempDir();
    writePackageJson(dir, { name: "test", version: "1.0.0" });
    expect(hasOverrideEntries(dir)).toBe(false);
  });

  it("returns false when overrides is an empty object", () => {
    const dir = makeTempDir();
    writePackageJson(dir, { overrides: {} });
    expect(hasOverrideEntries(dir)).toBe(false);
  });

  it("returns false when pnpm.overrides is an empty object", () => {
    const dir = makeTempDir();
    writePackageJson(dir, { pnpm: { overrides: {} } });
    expect(hasOverrideEntries(dir)).toBe(false);
  });

  it("returns false when resolutions is an empty object", () => {
    const dir = makeTempDir();
    writePackageJson(dir, { resolutions: {} });
    expect(hasOverrideEntries(dir)).toBe(false);
  });

  it("returns true when overrides has entries (npm/Bun)", () => {
    const dir = makeTempDir();
    writePackageJson(dir, { overrides: { "lodash": "4.17.21" } });
    expect(hasOverrideEntries(dir)).toBe(true);
  });

  it("returns true when pnpm.overrides has entries", () => {
    const dir = makeTempDir();
    writePackageJson(dir, { pnpm: { overrides: { "semver": "7.6.0" } } });
    expect(hasOverrideEntries(dir)).toBe(true);
  });

  it("returns true when resolutions has entries (Yarn)", () => {
    const dir = makeTempDir();
    writePackageJson(dir, { resolutions: { "minimatch": "3.1.2" } });
    expect(hasOverrideEntries(dir)).toBe(true);
  });

  it("returns false when package.json is malformed JSON", () => {
    const dir = makeTempDir();
    fs.writeFileSync(path.join(dir, "package.json"), "not json {");
    expect(hasOverrideEntries(dir)).toBe(false);
  });
});
