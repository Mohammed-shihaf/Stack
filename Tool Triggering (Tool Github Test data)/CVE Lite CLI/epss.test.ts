import { fetchEpssScores } from "../src/epss/client.js";

function mockFetch(map: Record<string, { status?: number; body?: unknown }>): typeof fetch {
  return (async (input: RequestInfo | URL) => {
    const url = typeof input === "string" ? input : input.toString();
    const key = Object.keys(map).find(k => url.includes(k));
    if (!key) return new Response("not found", { status: 404 });
    const { status = 200, body = {} } = map[key]!;
    return new Response(JSON.stringify(body), { status });
  }) as unknown as typeof fetch;
}

const EPSS_API_HOST = "api.first.org";

const TWO_CVE_RESPONSE = {
  "status": "OK",
  "status-code": 200,
  "version": "1.0",
  "access": "public",
  "total": 2,
  "data": [
    { "cve": "CVE-2021-44228", "epss": "0.97565", "percentile": "0.99975", "date": "2023-09-30" },
    { "cve": "CVE-2021-23337", "epss": "0.00234", "percentile": "0.61200", "date": "2023-09-30" },
  ],
};

describe("fetchEpssScores", () => {
  it("returns empty map for empty input", async () => {
    const result = await fetchEpssScores([]);
    expect(result.size).toBe(0);
  });

  it("returns empty map when all IDs are non-CVE (GHSA-only)", async () => {
    const result = await fetchEpssScores(["GHSA-abc-def-1234"]);
    expect(result.size).toBe(0);
  });

  it("parses API response and returns EpssScore map keyed by uppercase CVE ID", async () => {
    const fetchImpl = mockFetch({ [EPSS_API_HOST]: { body: TWO_CVE_RESPONSE } });
    const result = await fetchEpssScores(["CVE-2021-44228", "CVE-2021-23337"], fetchImpl);

    expect(result.size).toBe(2);
    expect(result.get("CVE-2021-44228")).toEqual({
      cve: "CVE-2021-44228",
      epss: 0.97565,
      percentile: 0.99975,
    });
    expect(result.get("CVE-2021-23337")).toEqual({
      cve: "CVE-2021-23337",
      epss: 0.00234,
      percentile: 0.612,
    });
  });

  it("normalizes CVE IDs to uppercase in the returned map keys", async () => {
    const fetchImpl = mockFetch({
      [EPSS_API_HOST]: {
        body: { data: [{ cve: "CVE-2021-44228", epss: "0.5", percentile: "0.9" }] },
      },
    });
    const result = await fetchEpssScores(["cve-2021-44228"], fetchImpl);
    expect(result.has("CVE-2021-44228")).toBe(true);
  });

  it("returns empty map when API returns non-200 status", async () => {
    const fetchImpl = mockFetch({ [EPSS_API_HOST]: { status: 500 } });
    const result = await fetchEpssScores(["CVE-2021-44228"], fetchImpl);
    expect(result.size).toBe(0);
  });

  it("returns empty map when fetch throws (network error)", async () => {
    const fetchImpl = (async () => { throw new Error("econnrefused"); }) as unknown as typeof fetch;
    const result = await fetchEpssScores(["CVE-2021-44228"], fetchImpl);
    expect(result.size).toBe(0);
  });

  it("returns empty map when response body is malformed JSON", async () => {
    const fetchImpl = (async () => new Response("not json", { status: 200 })) as unknown as typeof fetch;
    const result = await fetchEpssScores(["CVE-2021-44228"], fetchImpl);
    expect(result.size).toBe(0);
  });

  it("deduplicates CVE IDs so each appears once in the query string", async () => {
    const capturedUrls: string[] = [];
    const fetchImpl = (async (input: RequestInfo | URL) => {
      capturedUrls.push(typeof input === "string" ? input : input.toString());
      return new Response(JSON.stringify({ data: [] }), { status: 200 });
    }) as unknown as typeof fetch;

    await fetchEpssScores(["CVE-2021-44228", "CVE-2021-44228", "CVE-2021-23337"], fetchImpl);

    expect(capturedUrls).toHaveLength(1);
    const queryPart = capturedUrls[0]!.split("cve=")[1]!;
    const parts = queryPart.split(",").map(p => p.toUpperCase());
    expect(parts.filter(p => p === "CVE-2021-44228")).toHaveLength(1);
  });

  it("batches queries into chunks of 100 and merges results", async () => {
    const ids = Array.from({ length: 250 }, (_, i) => {
      const suffix = String(i + 1).padStart(4, "0");
      return `CVE-2020-${suffix}`;
    });
    const capturedUrls: string[] = [];

    const fetchImpl = (async (input: RequestInfo | URL) => {
      const url = typeof input === "string" ? input : input.toString();
      capturedUrls.push(url);
      const requestIds = url.split("cve=")[1]!.split(",");
      expect(requestIds.length).toBeLessThanOrEqual(100);
      return new Response(JSON.stringify({
        data: requestIds.map(cve => ({ cve, epss: "0.5", percentile: "0.9" })),
      }), { status: 200 });
    }) as unknown as typeof fetch;

    const result = await fetchEpssScores(ids, fetchImpl);

    expect(capturedUrls).toHaveLength(3);
    const firstTwoBatches = capturedUrls.slice(0, 2).map(url => url.split("cve=")[1]!.split(",").length);
    expect(firstTwoBatches).toEqual([100, 100]);
    expect(result.size).toBe(250);
  });

  it("still returns scores from successful batches when another batch fails", async () => {
    const ids = Array.from({ length: 150 }, (_, i) => {
      const suffix = String(i + 1).padStart(4, "0");
      return `CVE-2020-${suffix}`;
    });

    const fetchImpl = (async (input: RequestInfo | URL) => {
      const url = typeof input === "string" ? input : input.toString();
      const requestIds = url.split("cve=")[1]!.split(",");
      if (requestIds.length < 100) throw new Error("econnrefused");
      return new Response(JSON.stringify({
        data: requestIds.map(cve => ({ cve, epss: "0.5", percentile: "0.9" })),
      }), { status: 200 });
    }) as unknown as typeof fetch;

    const result = await fetchEpssScores(ids, fetchImpl);
    expect(result.size).toBe(100);
  });

  it("skips items with malformed epss values and still returns valid ones", async () => {
    const fetchImpl = mockFetch({
      [EPSS_API_HOST]: {
        body: {
          data: [
            { cve: "CVE-2021-44228", epss: "not-a-number", percentile: "0.9" },
            { cve: "CVE-2021-23337", epss: "0.00234", percentile: "0.612" },
          ],
        },
      },
    });
    const result = await fetchEpssScores(["CVE-2021-44228", "CVE-2021-23337"], fetchImpl);
    expect(result.has("CVE-2021-44228")).toBe(false);
    expect(result.get("CVE-2021-23337")).toMatchObject({ epss: 0.00234 });
  });

  it("filters out non-CVE IDs and fetches only CVE IDs", async () => {
    const capturedUrls: string[] = [];
    const fetchImpl = (async (input: RequestInfo | URL) => {
      capturedUrls.push(typeof input === "string" ? input : input.toString());
      return new Response(JSON.stringify({ data: [] }), { status: 200 });
    }) as unknown as typeof fetch;

    await fetchEpssScores(["GHSA-abc-def-1234", "CVE-2021-44228"], fetchImpl);

    expect(capturedUrls).toHaveLength(1);
    expect(capturedUrls[0]).toContain("CVE-2021-44228");
    expect(capturedUrls[0]).not.toContain("GHSA");
  });

  it("handles an API response with a missing data array gracefully", async () => {
    const fetchImpl = mockFetch({
      [EPSS_API_HOST]: { body: { status: "OK", total: 0 } },
    });
    const result = await fetchEpssScores(["CVE-2021-44228"], fetchImpl);
    expect(result.size).toBe(0);
  });
});
