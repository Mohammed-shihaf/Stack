import { findFirstFixedVersion } from "../src/scanner.js";
import type { OsvVuln } from "../src/types.js";

function advisory(fixed: string, introduced = "0"): OsvVuln[] {
  return [{
    id: "GHSA-test-1192",
    affected: [{
      package: { name: "widget", ecosystem: "npm" },
      ranges: [{ type: "ECOSYSTEM", events: [{ introduced }, { fixed }] }],
    }],
  }] as unknown as OsvVuln[];
}

// #1192: `findFirstFixedVersion` dropped any advisory `fixed` value that was not
// a strict X.Y.Z, and a finding whose every candidate was dropped reported "no
// fix available". That is indistinguishable from an advisory with genuinely no
// fix, and it tells a developer to stop looking for a fix that exists.
describe("findFirstFixedVersion - advisory versions with omitted components (#1192)", () => {
  it("reads a two-component fix version as X.Y.0", () => {
    expect(findFirstFixedVersion(advisory("1.22"), "widget", "npm", "1.21.0")).toBe("1.22.0");
  });

  it("reads a single-component fix version as X.0.0", () => {
    expect(findFirstFixedVersion(advisory("2"), "widget", "npm", "1.21.0")).toBe("2.0.0");
  });

  it("scopes to the installed branch when the introduced boundary is also short", () => {
    expect(findFirstFixedVersion(advisory("1.22", "1.20"), "widget", "npm", "1.21.0")).toBe("1.22.0");
  });

  // The counterpart guard. Normalizing must not become "accept anything", or a
  // GIT range's commit hash would be reported as the version to upgrade to.
  it("still reports nothing for a boundary that is not a version", () => {
    expect(findFirstFixedVersion(advisory("74ea7cf4d1b1a1a0a0d0e0f0a0b0c0d0e0f0a0b0"), "widget", "npm", "1.21.0")).toBeNull();
    expect(findFirstFixedVersion(advisory("abc"), "widget", "npm", "1.21.0")).toBeNull();
  });

  it("still refuses to recommend a pre-release as the fix", () => {
    expect(findFirstFixedVersion(advisory("1.22.0-rc.1"), "widget", "npm", "1.21.0")).toBeNull();
  });
});
