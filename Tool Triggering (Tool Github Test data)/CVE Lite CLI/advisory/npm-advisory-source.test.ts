import { jest } from "@jest/globals";
import { queryNpmAdvisoryGaps } from "../../src/advisory/npm-advisory-source.js";
import type { PackageRef } from "../../src/types.js";

const lodashPkg: PackageRef = { name: "lodash", version: "4.17.20", ecosystem: "npm" };

const mockAdvisory = {
  ghsa_id: "GHSA-35jh-r3h4-6jhm",
  cve_ids: ["CVE-2021-23337"],
  url: "https://github.com/advisories/GHSA-35jh-r3h4-6jhm",
  title: "Command Injection in lodash",
  severity: "high",
  vulnerable_versions: "<4.17.21",
  patched_versions: ">=4.17.21",
};

function makeFetch(responseBody: unknown, status = 200): typeof fetch {
  return async () => ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => responseBody,
  } as Response);
}

describe("queryNpmAdvisoryGaps", () => {
  it("returns normalized OsvVuln for a matching advisory", async () => {
    const fetch = makeFetch({ lodash: [mockAdvisory] });
    const results = await queryNpmAdvisoryGaps([lodashPkg], { fetchImpl: fetch });
    expect(results).toHaveLength(1);
    const { pkg, vulns } = results[0]!;
    expect(pkg.name).toBe("lodash");
    expect(vulns).toHaveLength(1);
    const vuln = vulns[0]!;
    expect(vuln.id).toBe("GHSA-35jh-r3h4-6jhm");
    expect(vuln.aliases).toContain("CVE-2021-23337");
    expect(vuln.summary).toBe("Command Injection in lodash");
    expect(vuln.database_specific?.severity).toBe("high");
    expect(vuln.affected![0]?.package?.name).toBe("lodash");
    expect(vuln.affected![0]?.package?.ecosystem).toBe("npm");
  });

  it("falls back to NPM-{id} only when no GHSA can be recovered at all", async () => {
    const fetch = makeFetch({
      lodash: [{ ...mockAdvisory, ghsa_id: undefined, url: "https://example.invalid/advisory", id: 1234 }],
    });
    const results = await queryNpmAdvisoryGaps([lodashPkg], { fetchImpl: fetch });
    expect(results[0]?.vulns[0]?.id).toBe("NPM-1234");
  });

  it("returns empty array for package with no advisories", async () => {
    const fetch = makeFetch({ lodash: [] });
    const results = await queryNpmAdvisoryGaps([lodashPkg], { fetchImpl: fetch });
    expect(results).toHaveLength(0);
  });

  it("skips malformed advisory entries gracefully, returns valid ones", async () => {
    const fetch = makeFetch({ lodash: [{ title: "broken" }, mockAdvisory] });
    const results = await queryNpmAdvisoryGaps([lodashPkg], { fetchImpl: fetch });
    expect(results[0]?.vulns).toHaveLength(1);
    expect(results[0]?.vulns[0]?.id).toBe("GHSA-35jh-r3h4-6jhm");
  });

  it("returns empty results on network error without throwing", async () => {
    const fetch = async () => { throw new Error("network failure"); };
    await expect(queryNpmAdvisoryGaps([lodashPkg], { fetchImpl: fetch as any })).resolves.toEqual([]);
  });

  it("returns empty results on non-200 response without throwing", async () => {
    const fetch = makeFetch({}, 429);
    await expect(queryNpmAdvisoryGaps([lodashPkg], { fetchImpl: fetch })).resolves.toEqual([]);
  });

  it("skips entirely in offline mode", async () => {
    const fetch = jest.fn();
    const results = await queryNpmAdvisoryGaps([lodashPkg], { fetchImpl: fetch as any, offline: true });
    expect(results).toEqual([]);
    expect(fetch).not.toHaveBeenCalled();
  });
});

/**
 * What the bulk endpoint actually returns.
 *
 * The fixture above carries `ghsa_id`, `cve_ids` and `patched_versions`, and
 * `registry.npmjs.org/-/npm/v1/security/advisories/bulk` sends none of the three.
 * The tests agreed with the code because both were written against the same
 * imagined shape, which is why every npm advisory silently arrived under a
 * synthetic `NPM-` id and duplicated its OSV twin, and why its range carried no
 * `fixed` event for the fix-version validator to evaluate.
 *
 * Captured verbatim from a live response for @hono/node-server@2.0.0.
 */
const realBulkShape = {
  id: 1139323,
  url: "https://github.com/advisories/GHSA-frvp-7c67-39w9",
  title: "Node.js Adapter for Hono: Path traversal in `serve-static` on Windows",
  severity: "moderate",
  vulnerable_versions: ">=2.0.0 <2.0.5",
  cwe: ["CWE-22"],
  cvss: { score: 5.9, vectorString: "CVSS:3.1/AV:N/AC:H/PR:N/UI:N/S:U/C:H/I:N/A:N" },
};

const honoPkg: PackageRef = { name: "@hono/node-server", version: "2.0.0", ecosystem: "npm" };

describe("queryNpmAdvisoryGaps - the shape npm actually sends", () => {
  // `version` has to sit inside the advisory's range now that attribution is
  // per version, otherwise the advisory is correctly filtered out before it is
  // ever normalized.
  async function normalizeReal(overrides: Record<string, unknown> = {}, version = "2.0.0") {
    const fetch = makeFetch({ "@hono/node-server": [{ ...realBulkShape, ...overrides }] });
    const results = await queryNpmAdvisoryGaps([{ ...honoPkg, version }], { fetchImpl: fetch });
    return results[0]?.vulns[0];
  }

  it("recovers the GHSA id from the advisory url", async () => {
    // The only place the bulk endpoint puts it. Without this every advisory gets
    // a private id and nothing can match it to the same advisory from OSV.
    expect((await normalizeReal())?.id).toBe("GHSA-frvp-7c67-39w9");
  });

  it("does not invent a synthetic id when a real one is recoverable", async () => {
    expect((await normalizeReal())?.id).not.toBe("NPM-1139323");
  });

  it("turns vulnerable_versions into a range the resolver can evaluate", async () => {
    const events = (await normalizeReal())?.affected?.[0]?.ranges?.[0]?.events;
    expect(events).toEqual([{ introduced: "2.0.0" }, { fixed: "2.0.5" }]);
  });

  it("treats an open lower bound as introduced at zero", async () => {
    const events = (await normalizeReal({ vulnerable_versions: "<0.2.6" }, "0.2.5"))?.affected?.[0]?.ranges?.[0]?.events;
    expect(events).toEqual([{ introduced: "0" }, { fixed: "0.2.6" }]);
  });

  it("uses last_affected for an inclusive upper bound, since <=2.0.9 is not fixed at 2.0.9", async () => {
    const events = (await normalizeReal({ vulnerable_versions: ">=2.0.0 <=2.0.9" }))?.affected?.[0]?.ranges?.[0]?.events;
    expect(events).toEqual([{ introduced: "2.0.0" }, { last_affected: "2.0.9" }]);
  });

  it("still prefers an explicit ghsa_id when one is present", async () => {
    const vuln = await normalizeReal({ ghsa_id: "GHSA-aaaa-bbbb-cccc" });
    expect(vuln?.id).toBe("GHSA-aaaa-bbbb-cccc");
  });

  it("keeps patched_versions working where npm does send it", async () => {
    const events = (await normalizeReal({ vulnerable_versions: "<4.17.21", patched_versions: ">=4.17.21" }))
      ?.affected?.[0]?.ranges?.[0]?.events;
    expect(events).toEqual([{ introduced: "0" }, { fixed: "4.17.21" }]);
  });
});

/**
 * npm answers per package, not per version.
 *
 * The request used to be built with `body[pkg.name] = [pkg.version]`, which
 * overwrites, so a tree carrying six copies of postcss asked about one of them.
 * The reply was then handed to every copy. Real example: postcss carries
 * advisories capped at `<=8.5.22`, `<8.5.10`, `<=8.5.11` and `<=8.5.17`, and all
 * four were attached to 8.5.23, 8.5.25 and 8.5.26, versions above every cap. The
 * same scan recommended upgrading to 8.5.23.
 *
 * It misses in the other direction too: ask about the one clean copy and npm
 * returns nothing for the vulnerable ones sitting beside it.
 */
describe("queryNpmAdvisoryGaps - one answer per package, many versions", () => {
  const postcssAdvisories = [
    { id: 1, url: "https://github.com/advisories/GHSA-fxqj-rqcc-2cmp", title: "a", severity: "moderate", vulnerable_versions: "<=8.5.22" },
    { id: 2, url: "https://github.com/advisories/GHSA-qx2v-qp2m-jg93", title: "b", severity: "moderate", vulnerable_versions: "<8.5.10" },
  ];
  const at = (v: string): PackageRef => ({ name: "postcss", version: v, ecosystem: "npm" });

  function capturingFetch(body: unknown) {
    const sent: unknown[] = [];
    const impl = (async (_url: string, init?: RequestInit) => {
      sent.push(JSON.parse(String(init?.body)));
      return { ok: true, status: 200, json: async () => body } as Response;
    }) as unknown as typeof fetch;
    return { impl, sent };
  }

  it("asks about every version of a package rather than only the last", async () => {
    const { impl, sent } = capturingFetch({ postcss: postcssAdvisories });
    await queryNpmAdvisoryGaps([at("8.5.6"), at("8.5.23")], { fetchImpl: impl });
    expect((sent[0] as Record<string, string[]>).postcss.sort()).toEqual(["8.5.23", "8.5.6"]);
  });

  it("attaches an advisory only to the versions its range actually covers", async () => {
    const { impl } = capturingFetch({ postcss: postcssAdvisories });
    const results = await queryNpmAdvisoryGaps([at("8.5.6"), at("8.5.15"), at("8.5.23")], { fetchImpl: impl });
    const byVersion = Object.fromEntries(results.map(r => [r.pkg.version, r.vulns.map(v => v.id)]));
    expect(byVersion["8.5.6"]).toEqual(["GHSA-fxqj-rqcc-2cmp", "GHSA-qx2v-qp2m-jg93"]);
    expect(byVersion["8.5.15"]).toEqual(["GHSA-fxqj-rqcc-2cmp"]);
    expect(byVersion["8.5.23"]).toBeUndefined();
  });

  it("does not report a version that sits above every advisory cap", async () => {
    const { impl } = capturingFetch({ postcss: postcssAdvisories });
    const results = await queryNpmAdvisoryGaps([at("8.5.26")], { fetchImpl: impl });
    expect(results).toHaveLength(0);
  });

  it("treats * as covering every version", async () => {
    const { impl } = capturingFetch({
      postcss: [{ id: 9, url: "https://github.com/advisories/GHSA-aaaa-bbbb-cccc", title: "all", severity: "high", vulnerable_versions: "*" }],
    });
    const results = await queryNpmAdvisoryGaps([at("99.0.0")], { fetchImpl: impl });
    expect(results[0]?.vulns[0]?.id).toBe("GHSA-aaaa-bbbb-cccc");
  });

  it("keeps an advisory with an exclusive lower bound and no ceiling", async () => {
    const { impl } = capturingFetch({
      postcss: [{ id: 10, url: "https://github.com/advisories/GHSA-dddd-eeee-ffff", title: "open", severity: "low", vulnerable_versions: ">1.0.0" }],
    });
    const results = await queryNpmAdvisoryGaps([at("2.0.0")], { fetchImpl: impl });
    expect(results[0]?.vulns[0]?.affected?.[0]?.ranges?.[0]?.events).toEqual([{ introduced: "1.0.0" }]);
  });
});
