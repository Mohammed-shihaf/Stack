import { OsvAdvisorySource } from "../../src/advisory/osv-advisory-source.js";
import type { PackageRef } from "../../src/types.js";

const pkgA: PackageRef = { name: "lodash", version: "4.17.20", ecosystem: "npm" };
const pkgB: PackageRef = { name: "express", version: "4.18.0", ecosystem: "npm" };

function makeFetch(responseBody: unknown, status = 200): typeof fetch {
  return async () =>
    ({
      ok: status >= 200 && status < 300,
      status,
      statusText: status === 200 ? "OK" : "Error",
      json: async () => responseBody,
    }) as Response;
}

describe("OsvAdvisorySource.queryBatch", () => {
  it("returns one result per queried package with vulnerabilities attached", async () => {
    const fetch = makeFetch({
      results: [{ vulns: [{ id: "GHSA-abc-123" }] }, { vulns: [] }],
    });
    const source = new OsvAdvisorySource(undefined, undefined, fetch);
    const results = await source.queryBatch([pkgA, pkgB]);
    expect(results).toHaveLength(2);
    expect(results[0]!.package).toBe("lodash");
    expect(results[0]!.version).toBe("4.17.20");
    expect(results[0]!.vulnerabilities).toHaveLength(1);
    expect(results[1]!.package).toBe("express");
    expect(results[1]!.vulnerabilities).toHaveLength(0);
  });

  it("treats a missing vulns field as an empty vulnerability list", async () => {
    const fetch = makeFetch({ results: [{}] });
    const source = new OsvAdvisorySource(undefined, undefined, fetch);
    const results = await source.queryBatch([pkgA]);
    expect(results[0]!.vulnerabilities).toEqual([]);
  });

  it("throws when results array is shorter than the query list", async () => {
    const fetch = makeFetch({ results: [{ vulns: [] }] });
    const source = new OsvAdvisorySource(undefined, undefined, fetch);
    await expect(source.queryBatch([pkgA, pkgB])).rejects.toThrow(
      "OSV batch query returned 1 result(s) for 2 quer(ies)",
    );
  });

  it("throws when results array is longer than the query list", async () => {
    const fetch = makeFetch({ results: [{ vulns: [] }, { vulns: [] }, { vulns: [] }] });
    const source = new OsvAdvisorySource(undefined, undefined, fetch);
    await expect(source.queryBatch([pkgA])).rejects.toThrow(
      "OSV batch query returned 3 result(s) for 1 quer(ies)",
    );
  });

  it("throws when the response has no results array", async () => {
    const fetch = makeFetch({ something: "else" });
    const source = new OsvAdvisorySource(undefined, undefined, fetch);
    await expect(source.queryBatch([pkgA])).rejects.toThrow('no "results" array');
  });

  it("throws on a non-2xx response", async () => {
    const fetch = makeFetch({}, 500);
    const source = new OsvAdvisorySource(undefined, undefined, fetch);
    await expect(source.queryBatch([pkgA])).rejects.toThrow("OSV batch query failed for");
  });
});
