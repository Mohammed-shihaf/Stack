import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { resolveDependencyEdges } from "../../src/output/sbom-dependency-edges.js";
import type { PackageRef, ScanInput } from "../../src/types.js";

function writeLock(packages: Record<string, unknown>): { dir: string; file: string } {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cve-lite-edges-"));
  const file = path.join(dir, "package-lock.json");
  fs.writeFileSync(file, JSON.stringify({ name: "app", version: "1.0.0", lockfileVersion: 3, packages }));
  return { dir, file };
}

function scanInput(file: string | null, source: ScanInput["source"] = "package-lock"): ScanInput {
  return { mode: "lockfile", source, filePath: file, packages: [], notes: [], warnings: [], skippedDependencies: [] } as ScanInput;
}

function pkg(name: string, version: string): PackageRef {
  return { name, version, ecosystem: "npm" };
}

/**
 * The lock graph keeps a complete child-to-parents edge map that is not subject
 * to the five-path display cap, so edges are resolved from it rather than
 * reconstructed from truncated `paths`.
 */
describe("resolveDependencyEdges", () => {
  it("resolves a direct dependency's parent as the root project", () => {
    const { dir, file } = writeLock({
      "": { name: "app", version: "1.0.0", dependencies: { express: "^4.0.0" } },
      "node_modules/express": { version: "4.17.1" },
    });
    try {
      const edges = resolveDependencyEdges(scanInput(file), [pkg("express", "4.17.1")]);
      expect(edges).toContainEqual({ child: "express@4.17.1", parent: null });
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it("resolves a transitive dependency to the package that pulled it in", () => {
    const { dir, file } = writeLock({
      "": { name: "app", version: "1.0.0", dependencies: { express: "^4.0.0" } },
      "node_modules/express": { version: "4.17.1", dependencies: { qs: "6.7.0" } },
      "node_modules/qs": { version: "6.7.0" },
    });
    try {
      const edges = resolveDependencyEdges(scanInput(file), [pkg("express", "4.17.1"), pkg("qs", "6.7.0")]);
      expect(edges).toContainEqual({ child: "qs@6.7.0", parent: "express@4.17.1" });
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it("keeps every parent when a package is pulled in by more than one", () => {
    const { dir, file } = writeLock({
      "": { name: "app", version: "1.0.0", dependencies: { a: "1.0.0", b: "1.0.0" } },
      "node_modules/a": { version: "1.0.0", dependencies: { shared: "2.0.0" } },
      "node_modules/b": { version: "1.0.0", dependencies: { shared: "2.0.0" } },
      "node_modules/shared": { version: "2.0.0" },
    });
    try {
      const edges = resolveDependencyEdges(scanInput(file), [pkg("a", "1.0.0"), pkg("b", "1.0.0"), pkg("shared", "2.0.0")]);
      const parents = edges.filter(e => e.child === "shared@2.0.0").map(e => e.parent).sort();
      expect(parents).toEqual(["a@1.0.0", "b@1.0.0"]);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it("drops an edge whose parent was filtered out of the scanned package set", () => {
    // --prod-only filters the package list but not the graph. An edge to a
    // package absent from the document would be a dangling SPDX reference.
    const { dir, file } = writeLock({
      "": { name: "app", version: "1.0.0", dependencies: { express: "^4.0.0" } },
      "node_modules/express": { version: "4.17.1", dependencies: { qs: "6.7.0" } },
      "node_modules/qs": { version: "6.7.0" },
    });
    try {
      const edges = resolveDependencyEdges(scanInput(file), [pkg("qs", "6.7.0")]);
      // No dangling reference to a package that is not in the document.
      expect(edges.some(e => e.parent === "express@4.17.1")).toBe(false);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it("deduplicates edges when several graph nodes collapse to one name@version", () => {
    const { dir, file } = writeLock({
      "": { name: "app", version: "1.0.0", dependencies: { a: "1.0.0" } },
      "node_modules/a": { version: "1.0.0", dependencies: { dep: "1.0.0" } },
      "node_modules/a/node_modules/dep": { version: "1.0.0" },
      "node_modules/dep": { version: "1.0.0" },
    });
    try {
      const edges = resolveDependencyEdges(scanInput(file), [pkg("a", "1.0.0"), pkg("dep", "1.0.0")]);
      const keys = edges.map(e => `${e.child}<-${e.parent}`);
      expect(new Set(keys).size).toBe(keys.length);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it("anchors to the root when every parent is a workspace member", () => {
    // Workspace members are symlinked, not installed, so the graph records them
    // with a null version and they never appear in the scanned package set.
    // Dropping the edge would orphan the package; from the document's point of
    // view a workspace member's dependency is a dependency of the project.
    const { dir, file } = writeLock({
      "": { name: "monorepo", version: "1.0.0", workspaces: ["packages/*"] },
      "packages/site": { name: "@scope/site", version: "1.0.0", dependencies: { eleventy: "1.0.2" } },
      "node_modules/@scope/site": { resolved: "packages/site", link: true },
      "node_modules/eleventy": { version: "1.0.2" },
    });
    try {
      const edges = resolveDependencyEdges(scanInput(file), [pkg("eleventy", "1.0.2")]);
      expect(edges).toContainEqual({ child: "eleventy@1.0.2", parent: null });
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it("anchors to the root rather than orphaning when no parent survives filtering", () => {
    const { dir, file } = writeLock({
      "": { name: "app", version: "1.0.0", dependencies: { express: "^4.0.0" } },
      "node_modules/express": { version: "4.17.1", dependencies: { qs: "6.7.0" } },
      "node_modules/qs": { version: "6.7.0" },
    });
    try {
      // express filtered out of the document; qs must still be reachable.
      const edges = resolveDependencyEdges(scanInput(file), [pkg("qs", "6.7.0")]);
      expect(edges).toContainEqual({ child: "qs@6.7.0", parent: null });
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it("returns no edges for a non-npm lockfile, so other ecosystems fall back", () => {
    expect(resolveDependencyEdges(scanInput("/tmp/pnpm-lock.yaml", "pnpm-lock"), [pkg("x", "1.0.0")])).toEqual([]);
  });

  it("returns no edges when there is no lockfile path", () => {
    expect(resolveDependencyEdges(scanInput(null), [pkg("x", "1.0.0")])).toEqual([]);
  });

  it("returns no edges rather than throwing when the lockfile is unreadable", () => {
    expect(resolveDependencyEdges(scanInput("/nonexistent/package-lock.json"), [pkg("x", "1.0.0")])).toEqual([]);
  });
});

describe("resolveDependencyEdges - pnpm", () => {
  const PNPM = "tests/fixtures/lockfile-pnpm-v9-graph/pnpm-lock.yaml";

  const pkg = (name: string, version: string): PackageRef =>
    ({ name, version, ecosystem: "npm", paths: [] }) as PackageRef;

  const allPackages = [
    pkg("express", "4.17.1"),
    pkg("vite", "5.0.0"),
    pkg("body-parser", "1.19.0"),
    pkg("postcss", "8.4.0"),
    pkg("ms", "2.0.0"),
  ];

  const edgesFor = () =>
    resolveDependencyEdges({ source: "pnpm-lock", filePath: PNPM } as ScanInput, allPackages);

  it("resolves edges from the pnpm lock graph instead of returning nothing", () => {
    expect(edgesFor().length).toBeGreaterThan(0);
  });

  it("keeps every parent of a package reached through more than one route", () => {
    const parentsOfMs = edgesFor()
      .filter(e => e.child === "ms@2.0.0")
      .map(e => e.parent)
      .sort();
    expect(parentsOfMs).toEqual([
      "body-parser@1.19.0",
      "express@4.17.1",
      "vite@5.0.0",
    ]);
  });

  it("anchors a root-level package to the project rather than orphaning it", () => {
    expect(edgesFor()).toContainEqual({ child: "express@4.17.1", parent: null });
  });
});

describe("resolveDependencyEdges - bun", () => {
  const BUN = "tests/fixtures/lockfile-bun-graph/bun.lock";

  const pkg = (name: string, version: string): PackageRef =>
    ({ name, version, ecosystem: "npm", paths: [] }) as PackageRef;

  const allPackages = [
    pkg("express", "4.17.1"),
    pkg("body-parser", "1.19.0"),
    pkg("ms", "2.0.0"),
    pkg("vite", "5.0.0"),
    pkg("next", "15.0.0"),
    pkg("postcss", "8.4.31"),
    pkg("postcss", "8.5.15"),
    pkg("@acme/web", "workspace:apps/web"),
  ];

  const edgesFor = (packages: PackageRef[] = allPackages) =>
    resolveDependencyEdges({ source: "bun-lock", filePath: BUN } as ScanInput, packages);

  it("resolves edges from the bun lock graph instead of returning nothing", () => {
    expect(edgesFor().length).toBeGreaterThan(0);
  });

  it("keeps every parent of a package reached through more than one route", () => {
    const parentsOfMs = edgesFor()
      .filter(e => e.child === "ms@2.0.0")
      .map(e => e.parent)
      .sort();
    expect(parentsOfMs).toEqual(["body-parser@1.19.0", "express@4.17.1", "vite@5.0.0"]);
  });

  it("attributes each version of a package to the parent that installs it", () => {
    const edges = edgesFor();
    // The nested copy belongs to next; the top-level copy belongs to vite. Deriving
    // these from bare names would have collapsed both onto one version.
    expect(edges).toContainEqual({ child: "postcss@8.4.31", parent: "next@15.0.0" });
    expect(edges).toContainEqual({ child: "postcss@8.5.15", parent: "vite@5.0.0" });
    expect(edges).not.toContainEqual({ child: "postcss@8.4.31", parent: "vite@5.0.0" });
  });

  it("anchors a root-level package to the project rather than orphaning it", () => {
    expect(edgesFor()).toContainEqual({ child: "express@4.17.1", parent: null });
  });

  it("anchors to the root rather than emitting a reference to a filtered-out package", () => {
    // body-parser is excluded from the document, so ms must not reference it.
    const trimmed = allPackages.filter(p => p.name !== "body-parser");
    const parentsOfMs = edgesFor(trimmed)
      .filter(e => e.child === "ms@2.0.0")
      .map(e => e.parent);

    expect(parentsOfMs).not.toContain("body-parser@1.19.0");
    expect(parentsOfMs.length).toBeGreaterThan(0);
  });
});

describe("resolveDependencyEdges - yarn", () => {
  const YARN = "tests/fixtures/lockfile-yarn-graph/yarn.lock";

  const pkg = (name: string, version: string): PackageRef =>
    ({ name, version, ecosystem: "npm", paths: [] }) as PackageRef;

  const allPackages = [
    pkg("express", "4.17.1"),
    pkg("body-parser", "1.19.0"),
    pkg("vite", "5.0.0"),
    pkg("ms", "2.0.0"),
  ];

  const edgesFor = (packages: PackageRef[] = allPackages) =>
    resolveDependencyEdges({ source: "yarn-lock", filePath: YARN } as ScanInput, packages);

  it("resolves edges from the yarn lock graph instead of returning nothing", () => {
    expect(edgesFor().length).toBeGreaterThan(0);
  });

  it("keeps every parent of a package reached through more than one route", () => {
    const parentsOfMs = edgesFor()
      .filter(e => e.child === "ms@2.0.0")
      .map(e => e.parent)
      .sort();
    expect(parentsOfMs).toEqual(["body-parser@1.19.0", "express@4.17.1", "vite@5.0.0"]);
  });

  it("anchors a root-level package to the project rather than orphaning it", () => {
    expect(edgesFor()).toContainEqual({ child: "express@4.17.1", parent: null });
  });

  it("anchors to the root rather than emitting a reference to a filtered-out package", () => {
    const trimmed = allPackages.filter(p => p.name !== "body-parser");
    const parentsOfMs = edgesFor(trimmed)
      .filter(e => e.child === "ms@2.0.0")
      .map(e => e.parent);

    expect(parentsOfMs).not.toContain("body-parser@1.19.0");
    expect(parentsOfMs.length).toBeGreaterThan(0);
  });
});
