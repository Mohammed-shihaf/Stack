import { pluralize, nearestCommand, levenshtein } from "../src/utils/string.js";

describe("pluralize", () => {
  it("returns the singular for a count of 1", () => {
    expect(pluralize(1, "finding")).toBe("finding");
  });
  it("returns the plural otherwise", () => {
    expect(pluralize(0, "finding")).toBe("findings");
    expect(pluralize(2, "finding")).toBe("findings");
  });
  it("honors an explicit plural form", () => {
    expect(pluralize(2, "vulnerability", "vulnerabilities")).toBe("vulnerabilities");
  });
});

describe("levenshtein", () => {
  it("is 0 for identical strings", () => {
    expect(levenshtein("config", "config")).toBe(0);
  });
  it("counts edit distance", () => {
    expect(levenshtein("config", "fonfig")).toBe(1); // single substitution
    expect(levenshtein("kitten", "sitting")).toBe(3); // classic case
  });
});

describe("nearestCommand", () => {
  it("suggests the closest known command for a typo", () => {
    expect(nearestCommand("advisores")).toBe("advisories");
    expect(nearestCommand("instal-skill")).toBe("install-skill");
    expect(nearestCommand("confg")).toBe("config");
  });

  it("suggests overrides for a near miss (the command added in #718)", () => {
    expect(nearestCommand("overrdes")).toBe("overrides");
    expect(nearestCommand("overide")).toBe("overrides");
  });

  it("returns undefined when nothing is within edit distance 2", () => {
    expect(nearestCommand("frobnicate")).toBeUndefined();
    expect(nearestCommand("xyzzy")).toBeUndefined();
  });
});
