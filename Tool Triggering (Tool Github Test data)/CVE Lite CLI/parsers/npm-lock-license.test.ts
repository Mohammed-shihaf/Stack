import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { loadFromPackageLock } from "../../src/parsers/package-lock.js";
import { removeDir } from "../test-utils.js";

function writeLock(contents: unknown): { dir: string; lockPath: string } {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cve-lite-license-test-"));
  const lockPath = path.join(dir, "package-lock.json");
  fs.writeFileSync(lockPath, JSON.stringify(contents));
  return { dir, lockPath };
}

describe("package-lock.json license capture", () => {
  it("captures the license field npm records for each package", () => {
    const { dir, lockPath } = writeLock({
      name: "app",
      lockfileVersion: 3,
      packages: {
        "": { name: "app", version: "1.0.0" },
        "node_modules/lodash": { version: "4.17.21", license: "MIT" },
        "node_modules/@babel/core": { version: "7.0.0", license: "Apache-2.0" },
      },
    });
    try {
      const packages = loadFromPackageLock(lockPath, false);
      expect(packages.find(p => p.name === "lodash")!.license).toBe("MIT");
      expect(packages.find(p => p.name === "@babel/core")!.license).toBe("Apache-2.0");
    } finally {
      removeDir(dir);
    }
  });

  it("leaves license undefined when the lockfile does not record one", () => {
    const { dir, lockPath } = writeLock({
      name: "app",
      lockfileVersion: 3,
      packages: {
        "": { name: "app", version: "1.0.0" },
        "node_modules/mystery": { version: "1.0.0" },
      },
    });
    try {
      const packages = loadFromPackageLock(lockPath, false);
      expect(packages.find(p => p.name === "mystery")!.license).toBeUndefined();
    } finally {
      removeDir(dir);
    }
  });

  it("ignores a non-string license value rather than emitting it verbatim", () => {
    const { dir, lockPath } = writeLock({
      name: "app",
      lockfileVersion: 3,
      packages: {
        "": { name: "app", version: "1.0.0" },
        "node_modules/legacy": { version: "1.0.0", license: { type: "MIT", url: "https://x" } },
      },
    });
    try {
      const packages = loadFromPackageLock(lockPath, false);
      expect(packages.find(p => p.name === "legacy")!.license).toBeUndefined();
    } finally {
      removeDir(dir);
    }
  });
});
