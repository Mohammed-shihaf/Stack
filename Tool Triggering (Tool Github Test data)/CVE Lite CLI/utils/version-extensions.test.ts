import {
  coerceVersion,
  satisfiesRange,
  isValidRange,
  majorVersion,
  normalizeAdvisoryVersion,
} from "../../src/utils/version.js";

describe("majorVersion", () => {
  it("returns the leading integer", () => {
    expect(majorVersion("4.17.21")).toBe(4);
    expect(majorVersion("0.25.12-beta.1")).toBe(0);
  });
  it("returns null for non-versions", () => {
    expect(majorVersion("latest")).toBeNull();
    expect(majorVersion("")).toBeNull();
  });
});

describe("coerceVersion", () => {
  it("returns concrete versions unchanged", () => {
    expect(coerceVersion("1.2.3")).toBe("1.2.3");
  });
  it("expands short forms to X.Y.Z", () => {
    expect(coerceVersion("1")).toBe("1.0.0");
    expect(coerceVersion("1.2")).toBe("1.2.0");
  });
  it("strips range operators", () => {
    expect(coerceVersion("^1.2.3")).toBe("1.2.3");
    expect(coerceVersion("~2.4")).toBe("2.4.0");
    expect(coerceVersion(">=3.1.0")).toBe("3.1.0");
  });
  it("returns null for non-numeric input", () => {
    expect(coerceVersion("latest")).toBeNull();
    expect(coerceVersion("")).toBeNull();
  });
});

describe("isValidRange", () => {
  it("accepts plain versions", () => {
    expect(isValidRange("1.2.3")).toBe(true);
  });
  it("accepts caret, tilde, comparators", () => {
    expect(isValidRange("^1.2.3")).toBe(true);
    expect(isValidRange("~1.2")).toBe(true);
    expect(isValidRange(">=2.0.0")).toBe(true);
    expect(isValidRange("<3.0.0")).toBe(true);
    expect(isValidRange("=1.0.0")).toBe(true);
  });
  it("rejects garbage and tags", () => {
    expect(isValidRange("latest")).toBe(false);
    expect(isValidRange("")).toBe(false);
    expect(isValidRange("not-a-version")).toBe(false);
  });
});

describe("satisfiesRange compound ranges", () => {
  // Regression: only the first comparator was evaluated, so every ceiling was
  // silently discarded and ">=5.7.0 <6" accepted 99.0.0.
  it("ANDs space-separated comparators instead of honouring only the first", () => {
    expect(satisfiesRange("5.9.3", ">=5.7.0 <6")).toBe(true);
    expect(satisfiesRange("6.0.0", ">=5.7.0 <6")).toBe(false);
    expect(satisfiesRange("99.0.0", ">=5.7.0 <6")).toBe(false);
    expect(satisfiesRange("5.0.0", ">=5.7.0 <6")).toBe(false);
  });

  it("keeps an operator and a spaced operand as one comparator", () => {
    expect(satisfiesRange("5.7.0", ">= 5.7.0")).toBe(true);
    expect(satisfiesRange("5.6.0", ">= 5.7.0")).toBe(false);
  });

  it("handles three comparators", () => {
    expect(satisfiesRange("1.5.0", ">=1.0.0 <2.0.0 >1.4.0")).toBe(true);
    expect(satisfiesRange("1.3.0", ">=1.0.0 <2.0.0 >1.4.0")).toBe(false);
  });
});

describe("satisfiesRange", () => {
  it("exact match", () => {
    expect(satisfiesRange("1.2.3", "1.2.3")).toBe(true);
    expect(satisfiesRange("1.2.4", "1.2.3")).toBe(false);
  });
  it("caret: same major, >= specified", () => {
    expect(satisfiesRange("1.2.3", "^1.2.0")).toBe(true);
    expect(satisfiesRange("1.9.9", "^1.2.0")).toBe(true);
    expect(satisfiesRange("2.0.0", "^1.2.0")).toBe(false);
    expect(satisfiesRange("1.1.0", "^1.2.0")).toBe(false);
  });
  it("caret on 0.x: minor is the breaking position", () => {
    expect(satisfiesRange("0.25.0", "^0.25.0")).toBe(true);
    expect(satisfiesRange("0.25.1", "^0.25.0")).toBe(true);
    expect(satisfiesRange("0.26.0", "^0.25.0")).toBe(false);
    expect(satisfiesRange("0.99.0", "^0.25.0")).toBe(false);
    expect(satisfiesRange("0.2.9", "^0.2.3")).toBe(true);
    expect(satisfiesRange("0.3.0", "^0.2.3")).toBe(false);
  });
  it("caret on 0.0.x: patch is the breaking position", () => {
    expect(satisfiesRange("0.0.3", "^0.0.3")).toBe(true);
    expect(satisfiesRange("0.0.4", "^0.0.3")).toBe(false);
    expect(satisfiesRange("0.1.0", "^0.0.3")).toBe(false);
  });
  it("caret partial forms: component count sets the ceiling", () => {
    expect(satisfiesRange("0.25.0", "^0")).toBe(true);
    expect(satisfiesRange("0.99.0", "^0")).toBe(true);
    expect(satisfiesRange("1.0.0", "^0")).toBe(false);
    expect(satisfiesRange("0.0.1", "^0.0")).toBe(true);
    expect(satisfiesRange("0.0.9", "^0.0")).toBe(true);
    expect(satisfiesRange("0.1.0", "^0.0")).toBe(false);
    expect(satisfiesRange("1.9.9", "^1")).toBe(true);
    expect(satisfiesRange("2.0.0", "^1")).toBe(false);
    expect(satisfiesRange("1.9.9", "^1.2")).toBe(true);
    expect(satisfiesRange("2.0.0", "^1.2")).toBe(false);
  });
  it("tilde: same major.minor, >= specified patch", () => {
    expect(satisfiesRange("1.2.5", "~1.2.3")).toBe(true);
    expect(satisfiesRange("1.3.0", "~1.2.3")).toBe(false);
  });
  it("comparators", () => {
    expect(satisfiesRange("2.0.0", ">=1.0.0")).toBe(true);
    expect(satisfiesRange("0.9.0", ">=1.0.0")).toBe(false);
    expect(satisfiesRange("0.5.0", "<1.0.0")).toBe(true);
    expect(satisfiesRange("1.0.0", "<1.0.0")).toBe(false);
  });
  it("returns false on invalid version", () => {
    expect(satisfiesRange("not-a-version", "^1.0.0")).toBe(false);
  });
});

// #1216: isValidRange modelled a single comparator followed by one version, so
// every other legal shape read as invalid. OA002 treats "not a valid range" as a
// floating tag, which reported correct bounded overrides as though they were
// pinned to `latest`, and OA005.d / OA008 gate on it and skipped such overrides
// entirely.
describe("isValidRange accepts the full range grammar (#1216)", () => {
  it("accepts bounded compound ranges", () => {
    expect(isValidRange(">=1.18.0 <2")).toBe(true);
    expect(isValidRange(">=7.5.21 <8")).toBe(true);
    expect(isValidRange(">=0.28.1 <0.29")).toBe(true);
  });
  it("accepts a space between operator and operand", () => {
    expect(isValidRange("> 1.0.0 < 2.0.0")).toBe(true);
  });
  it("accepts unions", () => {
    expect(isValidRange("^1.0.0 || ^2.0.0")).toBe(true);
    expect(isValidRange("1.x || >=2.5.0")).toBe(true);
  });
  it("accepts wildcards and partials", () => {
    expect(isValidRange("1.x")).toBe(true);
    expect(isValidRange("1.2.x")).toBe(true);
    expect(isValidRange("1.*")).toBe(true);
    expect(isValidRange("1.2")).toBe(true);
  });
  it("accepts hyphen ranges", () => {
    expect(isValidRange("1.2.3 - 2.3.4")).toBe(true);
  });
  it("still rejects empty input so callers can treat it as a floating tag", () => {
    expect(isValidRange("")).toBe(false);
    expect(isValidRange("   ")).toBe(false);
  });
});

describe("satisfiesRange handles the full range grammar (#1216)", () => {
  it("evaluates unions as OR rather than returning false", () => {
    expect(satisfiesRange("1.2.3", "^1.0.0 || ^2.0.0")).toBe(true);
    expect(satisfiesRange("2.5.0", "^1.0.0 || ^2.0.0")).toBe(true);
    expect(satisfiesRange("3.0.0", "^1.0.0 || ^2.0.0")).toBe(false);
  });
  it("evaluates wildcards", () => {
    expect(satisfiesRange("1.18.0", "1.x")).toBe(true);
    expect(satisfiesRange("2.0.0", "1.x")).toBe(false);
    expect(satisfiesRange("1.2.4", "1.2.x")).toBe(true);
  });
  it("evaluates hyphen ranges", () => {
    expect(satisfiesRange("2.0.0", "1.2.3 - 2.3.4")).toBe(true);
    expect(satisfiesRange("2.4.0", "1.2.3 - 2.3.4")).toBe(false);
  });
  it("treats a bare partial as a range, not an exact pin", () => {
    // "1" previously coerced to 1.0.0 and matched only that exact version.
    expect(satisfiesRange("1.18.0", "1")).toBe(true);
    expect(satisfiesRange("2.0.0", "1")).toBe(false);
  });
  it("still enforces the ceiling of a bounded range", () => {
    expect(satisfiesRange("1.20.0", ">=1.18.0 <2")).toBe(true);
    expect(satisfiesRange("2.0.0", ">=1.18.0 <2")).toBe(false);
  });
  it("falls back to coercion for version strings semver will not parse", () => {
    expect(satisfiesRange("v1.2.3", ">=1.0.0")).toBe(true);
  });
  it("returns false for a range that is not a range at all", () => {
    expect(satisfiesRange("1.2.3", "latest")).toBe(false);
  });
});

// #1216, and the part with real security consequence. satisfiesRange ran the
// version through coerceVersion first, which strips the pre-release tag, so
// "1.2.3-beta.1" compared equal to "1.2.3" and an advisory covering "<1.2.3"
// did not match a vulnerable beta. Same class as the defect v1.34.0 fixed on
// the OSV path.
describe("satisfiesRange keeps pre-release identifiers (#1216)", () => {
  it("matches a vulnerable pre-release against an advisory range that covers it", () => {
    expect(satisfiesRange("1.2.3-beta.1", "<1.2.3")).toBe(true);
    expect(satisfiesRange("1.2.3-rc.1", "<1.2.3")).toBe(true);
  });
  it("does not treat a pre-release as its own release version", () => {
    expect(satisfiesRange("1.2.3-beta.1", "1.2.3")).toBe(false);
  });
  it("includes pre-releases inside a covering range", () => {
    expect(satisfiesRange("2.0.0-alpha.3", ">=1.0.0 <3.0.0")).toBe(true);
  });
  it("orders pre-releases below their release", () => {
    expect(satisfiesRange("1.2.3-beta.1", ">=1.2.3")).toBe(false);
    expect(satisfiesRange("1.2.3", ">=1.2.3")).toBe(true);
  });
});

// #1192: advisories write boundaries with fewer than three components, and
// `fixed: "1.22"` means 1.22.0. looksLikeVersion demands a strict X.Y.Z, so the
// event was discarded and the finding reported "no fix available", which tells a
// developer to stop looking for a fix that exists.
describe("normalizeAdvisoryVersion (#1192)", () => {
  it("fills in the components an advisory omits", () => {
    expect(normalizeAdvisoryVersion("1.22")).toBe("1.22.0");
    expect(normalizeAdvisoryVersion("2")).toBe("2.0.0");
    expect(normalizeAdvisoryVersion("2024.1")).toBe("2024.1.0");
  });
  it("leaves a complete version alone", () => {
    expect(normalizeAdvisoryVersion("1.22.0")).toBe("1.22.0");
  });
  it("keeps pre-release and build identifiers", () => {
    expect(normalizeAdvisoryVersion("1.2.3-rc.1")).toBe("1.2.3-rc.1");
    expect(normalizeAdvisoryVersion("1.2.3+build.5")).toBe("1.2.3+build.5");
  });
  it("tolerates a leading v", () => {
    expect(normalizeAdvisoryVersion("v1.2")).toBe("1.2.0");
  });
  // The reason this is a strict whole-string match and not semver.coerce, which
  // reads "74.0.0" out of a commit hash and would turn #1191 into a silent
  // comparison against a plausible-looking version.
  it("rejects a GIT range commit hash rather than reading digits out of it", () => {
    expect(normalizeAdvisoryVersion("74ea7cf4d1b1a1a0a0d0e0f0a0b0c0d0e0f0a0b0")).toBeNull();
    expect(normalizeAdvisoryVersion("abc")).toBeNull();
    expect(normalizeAdvisoryVersion("refs/tags/v2")).toBeNull();
  });
  it("rejects a version scheme it cannot reason about", () => {
    expect(normalizeAdvisoryVersion("1.0.post1")).toBeNull();
  });
  it("handles absent input", () => {
    expect(normalizeAdvisoryVersion(null)).toBeNull();
    expect(normalizeAdvisoryVersion(undefined)).toBeNull();
    expect(normalizeAdvisoryVersion("")).toBeNull();
  });
});
