import { findFirstFixedVersion } from "../../src/scanner.js";
import type { OsvVuln } from "../../src/types.js";

/**
 * A fix version must belong to the package it is reported against.
 *
 * An OSV advisory can list several affected packages, each with its own fix.
 * Collecting every `fixed` event and returning the global minimum meant a
 * package inherited another package's lower fix — so the scan reported a
 * version that does not actually fix it. Verified against the synced OSV npm
 * database: 353 (advisory, package) pairs were affected, and in every one the
 * returned value was lower than the correct fix.
 */
function vuln(
  id: string,
  affected: Array<{ name: string; ecosystem?: string; fixed: string[] }>,
): OsvVuln {
  return {
    id,
    affected: affected.map(entry => ({
      package: { name: entry.name, ecosystem: entry.ecosystem ?? "npm" },
      ranges: [
        {
          type: "SEMVER",
          events: entry.fixed.map(fixed => ({ fixed })),
        },
      ],
    })),
  } as OsvVuln;
}

describe("findFirstFixedVersion", () => {
  // GHSA-2j2x-hqr9-3h42 as it appears in the real database: scanning
  // react-router used to return @remix-run/router's 1.23.3.
  const multiPackage = vuln("GHSA-2j2x-hqr9-3h42", [
    { name: "@remix-run/router", fixed: ["1.23.3"] },
    { name: "react-router", fixed: ["6.30.4"] },
  ]);

  it("returns the fix belonging to the package being scanned", () => {
    expect(findFirstFixedVersion([multiPackage], "react-router", "npm")).toBe("6.30.4");
  });

  it("does not leak a lower fix from a sibling package in the same advisory", () => {
    expect(findFirstFixedVersion([multiPackage], "react-router", "npm")).not.toBe("1.23.3");
  });

  it("returns each package's own fix from the same advisory", () => {
    expect(findFirstFixedVersion([multiPackage], "@remix-run/router", "npm")).toBe("1.23.3");
  });

  it("reports no fix when the advisory names only other packages", () => {
    expect(findFirstFixedVersion([multiPackage], "unrelated-package", "npm")).toBeNull();
  });

  it("still returns the lowest fix when several apply to this package", () => {
    const reintroduced = vuln("GHSA-window", [{ name: "pkg", fixed: ["2.0.0", "1.5.0"] }]);
    expect(findFirstFixedVersion([reintroduced], "pkg", "npm")).toBe("1.5.0");
  });

  it("keeps an entry whose package name is absent, rather than dropping its fix", () => {
    // Sparse advisory metadata must not turn into a silent "no fix known".
    const sparse = {
      id: "GHSA-sparse",
      affected: [{ ranges: [{ type: "SEMVER", events: [{ fixed: "3.1.0" }] }] }],
    } as OsvVuln;
    expect(findFirstFixedVersion([sparse], "anything", "npm")).toBe("3.1.0");
  });

  it("excludes an entry from a different ecosystem", () => {
    const crossEcosystem = vuln("GHSA-cross", [
      { name: "shared-name", ecosystem: "PyPI", fixed: ["1.0.0"] },
      { name: "shared-name", ecosystem: "npm", fixed: ["4.0.0"] },
    ]);
    expect(findFirstFixedVersion([crossEcosystem], "shared-name", "npm")).toBe("4.0.0");
  });

  it("returns null when no advisory carries a usable fixed version", () => {
    expect(findFirstFixedVersion([], "pkg", "npm")).toBeNull();
  });
});

/**
 * An advisory that patches two release branches declares a fixed version per
 * branch. Returning the global minimum hands the caller the other branch's fix,
 * which is a downgrade across a major boundary rather than a remediation.
 *
 * Shape taken from GHSA-xvch-5gv4-984h (CVE-2021-44906, minimist).
 */
function multiBranchVuln(): OsvVuln {
  return {
    id: "GHSA-xvch-5gv4-984h",
    affected: [
      {
        package: { name: "minimist", ecosystem: "npm" },
        ranges: [
          { type: "SEMVER", events: [{ introduced: "1.0.0" }, { fixed: "1.2.6" }] },
          { type: "SEMVER", events: [{ introduced: "0" }, { fixed: "0.2.4" }] },
        ],
      },
    ],
  } as OsvVuln;
}

describe("findFirstFixedVersion - range scoping", () => {
  it("returns the fix for the branch the installed version is on", () => {
    expect(findFirstFixedVersion([multiBranchVuln()], "minimist", "npm", "1.2.5")).toBe("1.2.6");
  });

  it("never recommends a downgrade across the branch boundary", () => {
    expect(findFirstFixedVersion([multiBranchVuln()], "minimist", "npm", "1.2.5")).not.toBe("0.2.4");
  });

  it("returns the older branch's fix for an install on that branch", () => {
    expect(findFirstFixedVersion([multiBranchVuln()], "minimist", "npm", "0.1.0")).toBe("0.2.4");
  });

  it("falls back to the lowest fix when no range contains the installed version", () => {
    // 2.0.0 is past every declared range. Reporting nothing would hide the
    // finding's fix entirely, so the previous behaviour is retained.
    expect(findFirstFixedVersion([multiBranchVuln()], "minimist", "npm", "2.0.0")).toBe("0.2.4");
  });

  it("keeps working when no installed version is supplied", () => {
    expect(findFirstFixedVersion([multiBranchVuln()], "minimist", "npm")).toBe("0.2.4");
  });

  it("handles a range that reintroduces the vulnerability after a fix", () => {
    const reintroduced = {
      id: "GHSA-reintro",
      affected: [
        {
          package: { name: "pkg", ecosystem: "npm" },
          ranges: [
            {
              type: "SEMVER",
              events: [
                { introduced: "1.0.0" }, { fixed: "1.5.0" },
                { introduced: "2.0.0" }, { fixed: "2.3.0" },
              ],
            },
          ],
        },
      ],
    } as OsvVuln;
    expect(findFirstFixedVersion([reintroduced], "pkg", "npm", "2.1.0")).toBe("2.3.0");
    expect(findFirstFixedVersion([reintroduced], "pkg", "npm", "1.2.0")).toBe("1.5.0");
  });
});

/**
 * Minimum is right WITHIN one advisory and wrong ACROSS several.
 *
 * An advisory that patches two release branches declares a fix per branch, and
 * the caller wants the fix on the branch they are on - that is the range
 * scoping above. But when two different advisories both affect the installed
 * version, clearing only the lower of their fixes leaves the other one live.
 * The answer has to clear all of them, so it is the highest.
 *
 * Shape taken from @hono/node-server@2.0.0, which is affected by
 * GHSA-frvp-7c67-39w9 (fixed 2.0.5) and GHSA-9mqv-5hh9-4cgg (fixed 2.0.10).
 * Recommending 2.0.5 left the second one unfixed.
 */
function windowVuln(id: string, name: string, introduced: string, fixed: string): OsvVuln {
  return {
    id,
    affected: [
      {
        package: { name, ecosystem: "npm" },
        ranges: [{ type: "SEMVER", events: [{ introduced }, { fixed }] }],
      },
    ],
  } as OsvVuln;
}

describe("findFirstFixedVersion - across several advisories", () => {
  const pathTraversal = windowVuln("GHSA-frvp-7c67-39w9", "@hono/node-server", "2.0.0", "2.0.5");
  const memoryLeak = windowVuln("GHSA-9mqv-5hh9-4cgg", "@hono/node-server", "2.0.0", "2.0.10");

  it("returns the version that clears every advisory affecting the install", () => {
    expect(
      findFirstFixedVersion([pathTraversal, memoryLeak], "@hono/node-server", "npm", "2.0.0"),
    ).toBe("2.0.10");
  });

  it("does not stop at the lowest fix, which leaves the other advisory live", () => {
    expect(
      findFirstFixedVersion([pathTraversal, memoryLeak], "@hono/node-server", "npm", "2.0.0"),
    ).not.toBe("2.0.5");
  });

  it("does not depend on the order the advisories arrive in", () => {
    expect(
      findFirstFixedVersion([memoryLeak, pathTraversal], "@hono/node-server", "npm", "2.0.0"),
    ).toBe("2.0.10");
  });

  it("clears the highest fix when more than two advisories apply", () => {
    const third = windowVuln("GHSA-third", "@hono/node-server", "2.0.0", "2.0.7");
    expect(
      findFirstFixedVersion([pathTraversal, third, memoryLeak], "@hono/node-server", "npm", "2.0.0"),
    ).toBe("2.0.10");
  });

  it("ignores an advisory whose window closed before the installed version", () => {
    // Fixed in 1.19.15, so a 2.0.0 install was never exposed to it and it must
    // not drag the answer down to a version below the install.
    const older = windowVuln("GHSA-older", "@hono/node-server", "0", "1.19.15");
    expect(
      findFirstFixedVersion([older, memoryLeak], "@hono/node-server", "npm", "2.0.0"),
    ).toBe("2.0.10");
  });

  it("takes the earliest fix within one advisory that patched two branches", () => {
    // Unchanged behaviour: inside a single advisory the branch fix still wins.
    const twoBranch = {
      id: "GHSA-two-branch",
      affected: [
        {
          package: { name: "pkg", ecosystem: "npm" },
          ranges: [
            { type: "SEMVER", events: [{ introduced: "1.0.0" }, { fixed: "1.2.6" }] },
            { type: "SEMVER", events: [{ introduced: "0" }, { fixed: "0.2.4" }] },
          ],
        },
      ],
    } as OsvVuln;
    expect(findFirstFixedVersion([twoBranch], "pkg", "npm", "1.2.5")).toBe("1.2.6");
  });

  it("still falls back to the lowest fix when no window contains the install", () => {
    // Sparse metadata must keep a remediation visible rather than reporting none.
    const above = windowVuln("GHSA-above", "pkg", "5.0.0", "5.1.0");
    const below = windowVuln("GHSA-below", "pkg", "0", "1.0.0");
    expect(findFirstFixedVersion([below, above], "pkg", "npm", "3.0.0")).toBe("1.0.0");
  });
});
