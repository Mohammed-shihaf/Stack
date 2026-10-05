import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  loadBunLockGraph,
  splitBunPackageKey,
  resolveBunChildKey,
  buildBunChildKeyGraph,
  buildBunKeyIndex,
  collectReachableKeys,
} from "../../src/parsers/bun-lock-graph.js";

describe("splitBunPackageKey", () => {
  it("treats a bare name as top level", () => {
    expect(splitBunPackageKey("lodash")).toEqual({ parentKey: null, childName: "lodash" });
  });

  it("treats a top-level scoped name as top level, not as nesting", () => {
    // "@types/node" contains a slash but is one package, not "node" under "@types".
    expect(splitBunPackageKey("@types/node")).toEqual({ parentKey: null, childName: "@types/node" });
  });

  it("splits an unscoped child nested under a scoped parent", () => {
    expect(splitBunPackageKey("@babel/helper-compilation-targets/lru-cache")).toEqual({
      parentKey: "@babel/helper-compilation-targets",
      childName: "lru-cache",
    });
  });

  it("splits a scoped child nested under a scoped parent", () => {
    // The trailing name is itself scoped, so the split cannot take the last segment.
    expect(splitBunPackageKey("@cline/hub/@types/node")).toEqual({
      parentKey: "@cline/hub",
      childName: "@types/node",
    });
  });

  it("splits a child nested under an unscoped parent", () => {
    expect(splitBunPackageKey("next/postcss")).toEqual({ parentKey: "next", childName: "postcss" });
  });
});

describe("resolveBunChildKey", () => {
  const keys = new Set(["postcss", "next", "next/postcss", "a", "a/b", "vite"]);

  it("prefers the copy nested under the declaring package", () => {
    expect(resolveBunChildKey("next", "postcss", keys)).toBe("next/postcss");
  });

  it("falls back to the top-level copy when nothing is nested", () => {
    expect(resolveBunChildKey("vite", "postcss", keys)).toBe("postcss");
  });

  it("walks outward through ancestors before reaching top level", () => {
    // "a/b" declaring postcss finds no "a/b/postcss" and no "a/postcss", so top level wins.
    expect(resolveBunChildKey("a/b", "postcss", keys)).toBe("postcss");
  });

  it("resolves from the root scope when there is no declaring package", () => {
    expect(resolveBunChildKey(null, "postcss", keys)).toBe("postcss");
  });

  it("returns null when no entry satisfies the declaration", () => {
    expect(resolveBunChildKey("next", "not-installed", keys)).toBeNull();
  });
});

describe("buildBunChildKeyGraph", () => {
  it("keeps two versions of the same package as distinct nodes", () => {
    const packages = {
      next: ["next@15.0.0", "", { dependencies: { postcss: "8.4.31" } }, "sha512-a"],
      "next/postcss": ["postcss@8.4.31", "", {}, "sha512-b"],
      postcss: ["postcss@8.5.15", "", {}, "sha512-c"],
      vite: ["vite@5.0.0", "", { dependencies: { postcss: "^8.5.0" } }, "sha512-d"],
    };

    const graph = buildBunChildKeyGraph(packages);

    // next resolves to its nested copy, vite to the top-level one.
    expect(graph.get("next")).toEqual(["next/postcss"]);
    expect(graph.get("vite")).toEqual(["postcss"]);
  });

  it("drops declarations that resolve to no installed entry", () => {
    const packages = {
      a: ["a@1.0.0", "", { dependencies: { missing: "^1.0.0" } }, "sha512-a"],
    };

    expect(buildBunChildKeyGraph(packages).get("a")).toEqual([]);
  });

  it("reads inlined bare name-to-range pairs alongside the named sections", () => {
    const packages = {
      a: ["a@1.0.0", "", { b: "^1.0.0", dependencies: { c: "^1.0.0" } }, "sha512-a"],
      b: ["b@1.0.0", "", {}, "sha512-b"],
      c: ["c@1.0.0", "", {}, "sha512-c"],
    };

    expect(buildBunChildKeyGraph(packages).get("a")?.sort()).toEqual(["b", "c"]);
  });
});

describe("buildBunKeyIndex", () => {
  it("maps each key to the name and version its entry resolves to", () => {
    const index = buildBunKeyIndex({
      "next/postcss": ["postcss@8.4.31", "", {}, "sha512-a"],
      "@types/node": ["@types/node@24.0.0", "", {}, "sha512-b"],
    });

    expect(index.get("next/postcss")).toEqual({ name: "postcss", version: "8.4.31" });
    expect(index.get("@types/node")).toEqual({ name: "@types/node", version: "24.0.0" });
  });

  it("skips entries that are not a usable name@version", () => {
    const index = buildBunKeyIndex({
      broken: ["no-version-here", "", {}, ""],
      alsoBroken: "not-an-array",
    });

    expect(index.size).toBe(0);
  });
});

describe("collectReachableKeys", () => {
  it("follows the key graph and terminates on cycles", () => {
    const graph = new Map([
      ["a", ["b"]],
      ["b", ["a", "c"]],
      ["c", []],
    ]);

    expect([...collectReachableKeys(["a"], graph)].sort()).toEqual(["a", "b", "c"]);
  });

  it("does not reach a node that is only declared by an unvisited root", () => {
    const graph = new Map([
      ["a", ["b"]],
      ["x", ["y"]],
      ["b", []],
      ["y", []],
    ]);

    expect([...collectReachableKeys(["a"], graph)].sort()).toEqual(["a", "b"]);
  });
});

describe("loadBunLockGraph", () => {
  function writeLock(contents: unknown): string {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cve-lite-bun-graph-"));
    const lockPath = path.join(dir, "bun.lock");
    fs.writeFileSync(lockPath, JSON.stringify(contents), "utf8");
    return lockPath;
  }

  const lock = {
    lockfileVersion: 1,
    workspaces: { "": { name: "root", dependencies: { next: "^15.0.0", vite: "^5.0.0" } } },
    packages: {
      next: ["next@15.0.0", "", { dependencies: { postcss: "8.4.31" } }, "sha512-next"],
      "next/postcss": ["postcss@8.4.31", "", {}, "sha512-old"],
      vite: ["vite@5.0.0", "", { dependencies: { postcss: "^8.5.0" } }, "sha512-vite"],
      postcss: ["postcss@8.5.15", "", {}, "sha512-new"],
    },
  };

  it("maps each version of a package to its own parent", () => {
    const graph = loadBunLockGraph(writeLock(lock))!;

    const nested = graph.nodeIdsFor("postcss", "8.4.31");
    const topLevel = graph.nodeIdsFor("postcss", "8.5.15");

    expect(nested).toEqual(["next/postcss"]);
    expect(topLevel).toEqual(["postcss"]);
    expect(graph.parentsFor(nested[0]!)).toEqual(["next"]);
    expect(graph.parentsFor(topLevel[0]!)).toEqual(["vite"]);
  });

  it("resolves a node id back to its name and version", () => {
    const graph = loadBunLockGraph(writeLock(lock))!;

    expect(graph.getNode("next/postcss")).toEqual({ name: "postcss", version: "8.4.31" });
    expect(graph.getNode("nope")).toBeNull();
  });

  it("returns every node id when one version is installed under several parents", () => {
    const graph = loadBunLockGraph(
      writeLock({
        lockfileVersion: 1,
        workspaces: { "": { name: "root", dependencies: { a: "^1.0.0", b: "^1.0.0" } } },
        packages: {
          a: ["a@1.0.0", "", { dependencies: { dup: "1.0.0" } }, "sha512-a"],
          "a/dup": ["dup@1.0.0", "", {}, "sha512-d1"],
          b: ["b@1.0.0", "", { dependencies: { dup: "1.0.0" } }, "sha512-b"],
          "b/dup": ["dup@1.0.0", "", {}, "sha512-d2"],
        },
      }),
    )!;

    // Same name@version, two distinct lockfile nodes, so both must be returned or
    // the edge builder would miss one of the two parents.
    expect([...graph.nodeIdsFor("dup", "1.0.0")].sort()).toEqual(["a/dup", "b/dup"]);
  });

  it("reports no parents for a package nothing depends on", () => {
    const graph = loadBunLockGraph(writeLock(lock))!;

    expect(graph.parentsFor("next")).toEqual([]);
  });

  it("returns null for a lockfile with no packages section", () => {
    expect(loadBunLockGraph(writeLock({ lockfileVersion: 1 }))).toBeNull();
  });
});
