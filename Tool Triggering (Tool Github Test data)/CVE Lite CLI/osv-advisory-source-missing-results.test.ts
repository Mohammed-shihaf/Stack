import { describe, it, expect } from "@jest/globals";
import { OsvAdvisorySource } from "../src/advisory/osv-advisory-source.js";
import type { PackageRef } from "../src/types.js";

function pkg(name: string): PackageRef {
  return { name, version: "1.0.0", ecosystem: "npm" };
}

function makeFetch(body: unknown, status = 200): () => Promise<Response> {
  return async () =>
    new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    });
}

describe("OsvAdvisorySource.queryBatch — missing results field", () => {
  it("throws when response body has no results field", async () => {
    const source = new OsvAdvisorySource(
      "https://api.osv.dev",
      undefined,
      makeFetch({}),
    );

    await expect(
      source.queryBatch([pkg("lodash")]),
    ).rejects.toThrow(/results/);
  });

  it("succeeds normally when results is a populated array (control case)", async () => {
    const source = new OsvAdvisorySource(
      "https://api.osv.dev",
      undefined,
      makeFetch({ results: [{ vulns: [{ id: "OSV-123" }] }] }),
    );

    const results = await source.queryBatch([pkg("lodash")]);
    expect(results).toHaveLength(1);
    expect(results[0].vulnerabilities).toEqual([{ id: "OSV-123" }]);
  });

  it("succeeds when results is an empty array and no packages were queried", async () => {
    const source = new OsvAdvisorySource(
      "https://api.osv.dev",
      undefined,
      makeFetch({ results: [] }),
    );

    const results = await source.queryBatch([]);
    expect(results).toHaveLength(0);
  });

  it("throws when results array length does not match queried package count", async () => {
    const source = new OsvAdvisorySource(
      "https://api.osv.dev",
      undefined,
      makeFetch({ results: [] }),
    );

    await expect(
      source.queryBatch([pkg("lodash")]),
    ).rejects.toThrow(/result.*quer/);
  });
});
