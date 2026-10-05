import type { PackageRef } from "../../src/types.js";
import { startsWithPath, findPackageAlongPath } from "../../src/remediation/package-path-lookup.js";

describe("startsWithPath", () => {
  it("returns true when path starts with the exact prefix", () => {
    expect(startsWithPath(["project", "eslint", "minimatch"], ["project", "eslint"])).toBe(true);
  });

  it("returns true when path equals the prefix exactly", () => {
    expect(startsWithPath(["project", "eslint"], ["project", "eslint"])).toBe(true);
  });

  it("returns false when a segment differs", () => {
    expect(startsWithPath(["project", "nx", "minimatch"], ["project", "eslint"])).toBe(false);
  });

  it("returns false when the prefix is longer than the path", () => {
    expect(startsWithPath(["project"], ["project", "eslint"])).toBe(false);
  });
});

describe("findPackageAlongPath", () => {
  const packages: PackageRef[] = [
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
      paths: [["project", "minimatch"], ["project", "nx", "minimatch"]],
    },
  ];

  it("returns the specific installed version reachable via the given path prefix", () => {
    const result = findPackageAlongPath(packages, "minimatch", ["project", "eslint", "minimatch"]);
    expect(result?.version).toBe("3.1.5");
  });

  it("does not fall back to an unrelated installed version of the same name", () => {
    const result = findPackageAlongPath(packages, "minimatch", ["project", "eslint", "minimatch"]);
    expect(result?.version).not.toBe("10.2.5");
  });

  it("finds a different installed version when the path prefix points elsewhere", () => {
    const result = findPackageAlongPath(packages, "minimatch", ["project", "nx", "minimatch"]);
    expect(result?.version).toBe("10.2.5");
  });

  it("returns null when no package with that name has a path matching the prefix", () => {
    const result = findPackageAlongPath(packages, "minimatch", ["project", "verdaccio", "minimatch"]);
    expect(result).toBeNull();
  });

  it("returns null when no package has that name at all", () => {
    const result = findPackageAlongPath(packages, "semver", ["project", "eslint", "semver"]);
    expect(result).toBeNull();
  });
});
