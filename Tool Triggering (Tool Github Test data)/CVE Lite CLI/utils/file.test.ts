import { chooseBestLockfile } from '../../src/utils/file';
import { LOCKFILE_NAMES, LOCKFILE_PRIORITY_ROOT, LOCKFILE_PRIORITY_NESTED } from "../../src/constants.js";

describe("chooseBestLockfile", () => {
  it("returns the only candidate when given a single lockfile", () => {
    expect(chooseBestLockfile(["project/package-lock.json"])).toBe("project/package-lock.json");
    expect(chooseBestLockfile(["project/pnpm-lock.yaml"])).toBe("project/pnpm-lock.yaml");
    expect(chooseBestLockfile(["project/yarn.lock"])).toBe("project/yarn.lock");
    expect(chooseBestLockfile(["project/bun.lock"])).toBe("project/bun.lock");
  });

  it("prefers package-lock.json over pnpm-lock.yaml at the same directory depth", () => {
    const candidates = ["project/pnpm-lock.yaml", "project/package-lock.json"];
    expect(chooseBestLockfile(candidates)).toBe("project/package-lock.json");
  });

  it("picks the shallowest path regardless of lockfile type", () => {
    const candidates = [
      "project/packages/app/package-lock.json",
      "project/pnpm-lock.yaml",
    ];
    expect(chooseBestLockfile(candidates)).toBe("project/pnpm-lock.yaml");
  });

  it("returns undefined for an empty array", () => {
    expect(chooseBestLockfile([])).toBeUndefined();
  });
});
describe("lockfile precedence lists", () => {
  it("keeps the root and nested orderings exactly as they were", () => {
    // These two disagree on six of the ten pairs, which is a real bug. They are
    // pinned here so that reconciling them has to be a deliberate edit with a
    // visible diff, rather than something that falls out of a refactor.
    expect([...LOCKFILE_PRIORITY_ROOT]).toEqual([
      "bun.lock",
      "npm-shrinkwrap.json",
      "package-lock.json",
      "pnpm-lock.yaml",
      "yarn.lock",
    ]);
    expect([...LOCKFILE_PRIORITY_NESTED]).toEqual([
      "package-lock.json",
      "pnpm-lock.yaml",
      "yarn.lock",
      "bun.lock",
      "npm-shrinkwrap.json",
    ]);
  });

  it("covers every supported lockfile in both orderings", () => {
    expect([...LOCKFILE_PRIORITY_ROOT].sort()).toEqual([...LOCKFILE_NAMES].sort());
    expect([...LOCKFILE_PRIORITY_NESTED].sort()).toEqual([...LOCKFILE_NAMES].sort());
  });
});
