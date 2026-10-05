import { jest } from "@jest/globals";
import { clearPackumentCache, fetchPackument } from "../src/remediation/npm-registry.js";

const fetchMock = jest.fn();
global.fetch = fetchMock as unknown as typeof fetch;

function mockRegistry(versions: string[] = []) {
  fetchMock.mockResolvedValue({
    ok: true,
    json: async () => ({
      versions: Object.fromEntries(versions.map((v) => [v, {}])),
    }),
  });
}

describe("fetchPackument", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    clearPackumentCache();
  });

  it("deduplicates concurrent calls for the same package name", async () => {
    mockRegistry(["4.17.21"]);

    await Promise.all([
      fetchPackument("lodash"),
      fetchPackument("lodash"),
      fetchPackument("lodash"),
    ]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("makes separate requests for different package names", async () => {
    mockRegistry();

    await Promise.all([
      fetchPackument("lodash"),
      fetchPackument("react"),
      fetchPackument("express"),
    ]);

    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("caches completed results and reuses them on subsequent calls", async () => {
    mockRegistry();

    const [a, b] = await Promise.all([
      fetchPackument("lodash"),
      fetchPackument("lodash"),
    ]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(a).toEqual(b);

    // Subsequent call reuses the cached promise (not a new fetch)
    const c = await fetchPackument("lodash");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(c).toEqual(a);
  });

  it("returns null for non-ok responses without caching null as rejection", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 404,
      statusText: "Not Found",
    });

    const result = await fetchPackument("no-such-pkg");
    expect(result).toBeNull();

    // Subsequent calls reuse the cached null promise
    const result2 = await fetchPackument("no-such-pkg");
    expect(result2).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
