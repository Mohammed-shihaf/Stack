import { loadPnpmLockGraph } from "../../src/parsers/pnpm-lock-graph.js";

const V9 = "tests/fixtures/lockfile-pnpm-v9-graph/pnpm-lock.yaml";

describe("loadPnpmLockGraph", () => {
  it("resolves every parent of a package reached through more than one route", () => {
    const graph = loadPnpmLockGraph(V9);

    const nodeIds = graph.nodeIdsFor("ms", "2.0.0");
    expect(nodeIds.length).toBeGreaterThan(0);

    const parents = nodeIds
      .flatMap(id => [...graph.parentsFor(id)])
      .map(id => graph.getNode(id))
      .filter((n): n is { name: string; version: string } => n !== null)
      .map(n => `${n.name}@${n.version}`)
      .sort();

    // ms is depended on by express, vite and body-parser. Path-derived edges
    // lose routes; the lock graph must report all three.
    expect([...new Set(parents)]).toEqual([
      "body-parser@1.19.0",
      "express@4.17.1",
      "vite@5.0.0",
    ]);
  });

  it("reports no parents for a package only the root importer depends on", () => {
    const graph = loadPnpmLockGraph(V9);
    const nodeIds = graph.nodeIdsFor("express", "4.17.1");
    const parents = nodeIds.flatMap(id => [...graph.parentsFor(id)]);
    expect(parents).toEqual([]);
  });
});
