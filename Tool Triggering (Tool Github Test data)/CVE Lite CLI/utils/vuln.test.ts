import { extractCveAliases, isMaliciousVulnId, hasMaliciousAdvisory } from "../../src/utils/vuln.js";
import type { OsvVuln } from "../../src/types.js";

describe("extractCveAliases", () => {
  it("returns only CVE-prefixed strings and does not throw on malformed aliases", () => {
    const vulns = [
      {
        id: "GHSA-xxxx-xxxx-xxxx",
        aliases: ["CVE-2024-1234", undefined, null, 42, "CVE-2024-5678"],
      },
    ] as unknown as OsvVuln[];

    expect(() => extractCveAliases(vulns)).not.toThrow();
    expect(extractCveAliases(vulns)).toEqual(["CVE-2024-1234", "CVE-2024-5678"]);
  });

  it("dedupes CVE aliases and ignores non-CVE-prefixed aliases", () => {
    const vulns: OsvVuln[] = [
      { id: "GHSA-aaaa-aaaa-aaaa", aliases: ["CVE-2024-1111", "GHSA-bbbb-bbbb-bbbb", "CVE-2024-1111"] },
      { id: "GHSA-cccc-cccc-cccc", aliases: ["CVE-2024-2222"] },
    ];

    expect(extractCveAliases(vulns)).toEqual(["CVE-2024-1111", "CVE-2024-2222"]);
  });

  it("returns an empty array when aliases is undefined", () => {
    const vulns: OsvVuln[] = [{ id: "GHSA-dddd-dddd-dddd" }];

    expect(extractCveAliases(vulns)).toEqual([]);
  });
});

describe("isMaliciousVulnId", () => {
  it("returns true for a MAL- prefixed id", () => {
    expect(isMaliciousVulnId("MAL-2024-1")).toBe(true);
  });

  it("returns false for a non-MAL id", () => {
    expect(isMaliciousVulnId("CVE-2024-1234")).toBe(false);
  });

  it("returns false and does not throw for undefined, null, or non-string ids", () => {
    expect(() => isMaliciousVulnId(undefined)).not.toThrow();
    expect(isMaliciousVulnId(undefined)).toBe(false);
    expect(isMaliciousVulnId(null)).toBe(false);
    expect(isMaliciousVulnId(42)).toBe(false);
  });
});

describe("hasMaliciousAdvisory", () => {
  it("returns true when any vulnerability id is MAL- prefixed", () => {
    const vulns = [{ id: "CVE-2024-1234" }, { id: "MAL-2024-9" }];

    expect(hasMaliciousAdvisory(vulns)).toBe(true);
  });

  it("returns false when no vulnerability id is MAL- prefixed", () => {
    const vulns = [{ id: "CVE-2024-1234" }, { id: "GHSA-eeee-eeee-eeee" }];

    expect(hasMaliciousAdvisory(vulns)).toBe(false);
  });

  it("does not throw when a vulnerability has a malformed id", () => {
    const vulns = [{ id: undefined }, { id: "CVE-2024-1234" }] as unknown as Array<{ id: string }>;

    expect(() => hasMaliciousAdvisory(vulns)).not.toThrow();
    expect(hasMaliciousAdvisory(vulns)).toBe(false);
  });
});
