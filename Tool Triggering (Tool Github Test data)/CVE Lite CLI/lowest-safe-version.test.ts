import { jest } from "@jest/globals";
import type { OsvVuln } from "../src/types.js";
import {
  clearPackumentCache,
  resolveLowestKnownNonVulnerableVersion,
  resolvePublishedFixVersion,
} from "../src/remediation/npm-registry.js";

const fetchMock = jest.fn();
global.fetch = fetchMock as unknown as typeof fetch;

function mockPackument(versions: string[], time: Record<string, string> = {}) {
  fetchMock.mockResolvedValue({
    ok: true,
    json: async () => ({
      versions: Object.fromEntries(versions.map(version => [version, {}])),
      time,
    }),
  });
}

function createVuln(id: string, events: Array<{ introduced?: string; fixed?: string; last_affected?: string }>): OsvVuln {
  return {
    id,
    affected: [
      {
        package: {
          ecosystem: "npm",
          name: "tar",
        },
        ranges: [{ type: "SEMVER", events }],
      },
    ],
  };
}

describe("resolveLowestKnownNonVulnerableVersion", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    clearPackumentCache();
  });

  it("skips vulnerable intermediate versions and returns the lowest known non-vulnerable target", async () => {
    mockPackument(
      ["1.0.0", "1.0.1", "1.0.2", "1.0.3", "1.0.4"],
      { "1.0.4": "2026-01-04T00:00:00.000Z" },
    );
    const vulnerabilities: OsvVuln[] = [
      createVuln("OSV-1", [{ introduced: "0" }, { fixed: "1.0.2" }]),
      createVuln("OSV-2", [{ introduced: "1.0.2" }, { fixed: "1.0.4" }]),
    ];

    const result = await resolveLowestKnownNonVulnerableVersion("tar", "1.0.0", vulnerabilities);

    expect(result.resolvedVersion).toBe("1.0.4");
    expect(result.note).toBeNull();
    expect(result.verified).toBe(true);
    expect(result.candidatesChecked).toBe(4);
    expect(result.candidatesKnownVulnerable).toBe(3);
    expect(result.candidatesUnknownCoverage).toBe(0);
    expect(result.publishedAt).toBe("2026-01-04T00:00:00.000Z");
  });

  it("handles overlapping advisory ranges by validating against all advisories", async () => {
    mockPackument(["6.2.1", "6.2.2", "6.2.3", "6.2.4", "6.2.5", "6.2.6"]);
    const vulnerabilities: OsvVuln[] = [
      createVuln("OSV-A", [{ introduced: "0" }, { fixed: "6.2.4" }]),
      createVuln("OSV-B", [{ introduced: "6.2.3" }, { fixed: "6.2.6" }]),
    ];

    const result = await resolveLowestKnownNonVulnerableVersion("tar", "6.2.1", vulnerabilities);

    expect(result.resolvedVersion).toBe("6.2.6");
    expect(result.note).toBeNull();
    expect(result.verified).toBe(true);
    expect(result.candidatesChecked).toBe(5);
    expect(result.candidatesKnownVulnerable).toBe(4);
    expect(result.candidatesUnknownCoverage).toBe(0);
  });

  it("returns null with an incomplete-data note when advisory ranges cannot be evaluated", async () => {
    mockPackument(["2.0.0", "2.0.1", "2.0.2"]);
    const vulnerabilities: OsvVuln[] = [
      {
        id: "OSV-INCOMPLETE",
        affected: [
          {
            package: {
              ecosystem: "npm",
              name: "tar",
            },
            ranges: [],
          },
        ],
      },
    ];

    const result = await resolveLowestKnownNonVulnerableVersion("tar", "2.0.0", vulnerabilities);

    expect(result.resolvedVersion).toBeNull();
    expect(result.note).toContain("incomplete");
    expect(result.verified).toBe(false);
    expect(result.candidatesChecked).toBe(2);
    expect(result.candidatesKnownVulnerable).toBe(0);
    expect(result.candidatesUnknownCoverage).toBe(2);
  });
});

describe("resolvePublishedFixVersion", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    clearPackumentCache();
  });

  it("includes the publish date when resolving an exact published fix version", async () => {
    mockPackument(
      ["1.0.0", "1.0.1"],
      { "1.0.1": "2026-01-01T00:00:00.000Z" },
    );

    const result = await resolvePublishedFixVersion("tar", "1.0.1");

    expect(result.resolvedVersion).toBe("1.0.1");
    expect(result.publishedAt).toBe("2026-01-01T00:00:00.000Z");
  });

  it("skips a pre-release below the fix hint and recommends the next stable release (issue #1077)", async () => {
    // "1.2.3" (the advisory's fixed-version hint) is not published; the packument
    // has a pre-release that sits below it and a stable release above it.
    mockPackument(["1.2.3-beta.1", "1.2.4"]);

    const result = await resolvePublishedFixVersion("tar", "1.2.3");

    expect(result.resolvedVersion).toBe("1.2.4");
    expect(result.note).toContain("using nearest published version 1.2.4");
  });

  it("does not return an exact pre-release fix hint (issue #1082)", async () => {
    mockPackument(["1.2.3-rc.1", "1.2.3", "1.2.4"]);

    const result = await resolvePublishedFixVersion("tar", "1.2.3-rc.1");

    expect(result.resolvedVersion).toBe("1.2.3");
    expect(result.note).toContain("using nearest published non-pre-release version 1.2.3");
    expect(result.verified).toBe(true);
  });

  it("does not recommend a higher pre-release when the stable hint is unpublished", async () => {
    mockPackument(["1.2.2", "1.2.4-beta.1"]);

    const result = await resolvePublishedFixVersion("tar", "1.2.3");

    expect(result.resolvedVersion).toBeNull();
  });

  it("returns null when only pre-release fix candidates are published (issue #1082)", async () => {
    mockPackument(["1.2.2", "1.2.3-rc.1", "1.2.4-beta.1"]);

    const result = await resolvePublishedFixVersion("tar", "1.2.3-rc.1");

    expect(result.resolvedVersion).toBeNull();
    expect(result.note).toContain("no published non-pre-release version");
    expect(result.verified).toBe(true);
  });
});

/**
 * An advisory introduced at or above the fix version never matches the installed
 * version, so it never reaches the finding, so nothing rejects a candidate it
 * covers. The resolver's own logic is fine - the set it reasons over is not.
 *
 * Real shape, from `tmp`:
 *   GHSA-ph9p-34f9-6g65  introduced 0      fixed 0.2.6
 *   GHSA-7c78-jf6q-g5cm  introduced 0.2.6  fixed 0.2.7
 *
 * Scanning tmp@0.2.5 matched only the first, so 0.2.6 was recommended and 0.2.6
 * is vulnerable. Same class of error as the one OA010 catches for override
 * floors, on the path that recommends the fix.
 */
function tmpVuln(id: string, events: Array<{ introduced?: string; fixed?: string }>): OsvVuln {
  return {
    id,
    affected: [
      { package: { ecosystem: "npm", name: "tmp" }, ranges: [{ type: "SEMVER", events }] },
    ],
  };
}

function advisorySourceReporting(byPair: Record<string, string[]>) {
  return {
    queryBatch: async (packages: Array<{ name: string; version: string }>) =>
      packages.map(p => ({
        package: p.name,
        version: p.version,
        vulnerabilities: (byPair[`${p.name}@${p.version}`] ?? []).map(id => ({ id })),
      })),
    getVuln: async (id: string) => ({ id }) as OsvVuln,
  };
}

describe("resolveLowestKnownNonVulnerableVersion - advisories above the installed version", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    clearPackumentCache();
  });

  // Only the advisory that actually matched tmp@0.2.5, exactly as the scanner passes it.
  const matchedAtInstalled = [tmpVuln("GHSA-ph9p-34f9-6g65", [{ introduced: "0" }, { fixed: "0.2.6" }])];

  it("rejects a candidate covered by an advisory the finding never matched", async () => {
    mockPackument(["0.2.4", "0.2.5", "0.2.6", "0.2.7"]);
    const source = advisorySourceReporting({ "tmp@0.2.6": ["GHSA-7c78-jf6q-g5cm"] });

    const result = await resolveLowestKnownNonVulnerableVersion("tmp", "0.2.5", matchedAtInstalled, { advisorySource: source });

    expect(result.resolvedVersion).toBe("0.2.7");
  });

  // #1213: the confirmation pass advanced candidatesKnownVulnerable by the index
  // of the confirmed version but left candidatesChecked where the range pass had
  // set it. For a single-version window both landed on 1, and fix-commands reads
  // `knownVulnerable >= scanned` as "no safe upgrade", so a confirmed fix was
  // reported as an unmaintained dead end. The invariant is that a resolved
  // version means strictly fewer vulnerable candidates than checked ones.
  it("keeps the candidate counters describing the same set when it confirms a later version", async () => {
    mockPackument(["0.2.4", "0.2.5", "0.2.6", "0.2.7"]);
    const source = advisorySourceReporting({ "tmp@0.2.6": ["GHSA-7c78-jf6q-g5cm"] });

    const result = await resolveLowestKnownNonVulnerableVersion("tmp", "0.2.5", matchedAtInstalled, { advisorySource: source });

    expect(result.resolvedVersion).toBe("0.2.7");
    expect(result.candidatesKnownVulnerable).toBeLessThan(result.candidatesChecked);
  });

  it("does not recommend the version the advisory metadata alone would suggest", async () => {
    mockPackument(["0.2.4", "0.2.5", "0.2.6", "0.2.7"]);
    const source = advisorySourceReporting({ "tmp@0.2.6": ["GHSA-7c78-jf6q-g5cm"] });

    const result = await resolveLowestKnownNonVulnerableVersion("tmp", "0.2.5", matchedAtInstalled, { advisorySource: source });

    expect(result.resolvedVersion).not.toBe("0.2.6");
  });

  it("confirms the arithmetic answer when nothing later covers it", async () => {
    mockPackument(["0.2.4", "0.2.5", "0.2.6", "0.2.7"]);
    const source = advisorySourceReporting({});

    const result = await resolveLowestKnownNonVulnerableVersion("tmp", "0.2.5", matchedAtInstalled, { advisorySource: source });

    expect(result.resolvedVersion).toBe("0.2.6");
    expect(result.verified).toBe(true);
  });

  it("falls back to the range evaluation when the advisory source fails, and says so", async () => {
    mockPackument(["0.2.4", "0.2.5", "0.2.6", "0.2.7"]);
    const failing = {
      queryBatch: async () => {
        throw new Error("advisory source unavailable");
      },
      getVuln: async (id: string) => ({ id }) as OsvVuln,
    };

    const result = await resolveLowestKnownNonVulnerableVersion("tmp", "0.2.5", matchedAtInstalled, { advisorySource: failing });

    expect(result.resolvedVersion).toBe("0.2.6");
    expect(result.verified).toBe(false);
    expect(result.note).toContain("could not be confirmed");
  });

  it("keeps working with no advisory source at all", async () => {
    mockPackument(["0.2.4", "0.2.5", "0.2.6", "0.2.7"]);

    const result = await resolveLowestKnownNonVulnerableVersion("tmp", "0.2.5", matchedAtInstalled);

    expect(result.resolvedVersion).toBe("0.2.6");
  });
});
