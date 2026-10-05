import { computePrioritySignal } from "../../src/utils/priority-signal.js";
import type { EpssScore } from "../../src/types.js";

function epss(percentile: number): EpssScore[] {
  return [{ cve: "CVE-2024-0001", epss: percentile * 0.01, percentile }];
}

describe("computePrioritySignal", () => {
  it("returns null when epssScores is null", () => {
    expect(computePrioritySignal("critical", null)).toBeNull();
  });

  it("returns null when epssScores is undefined", () => {
    expect(computePrioritySignal("high", undefined)).toBeNull();
  });

  it("returns null when epssScores is empty", () => {
    expect(computePrioritySignal("critical", [])).toBeNull();
  });

  it("returns fix_now for critical + percentile >= 0.90", () => {
    expect(computePrioritySignal("critical", epss(0.96))).toBe("fix_now");
  });

  it("returns fix_now for high + percentile >= 0.90", () => {
    expect(computePrioritySignal("high", epss(0.91))).toBe("fix_now");
  });

  it("returns fix_now at exactly the 0.90 boundary", () => {
    expect(computePrioritySignal("critical", epss(0.90))).toBe("fix_now");
  });

  it("returns fix_soon for critical + percentile < 0.90", () => {
    expect(computePrioritySignal("critical", epss(0.89))).toBe("fix_soon");
  });

  it("returns fix_soon for high + percentile < 0.90", () => {
    expect(computePrioritySignal("high", epss(0.10))).toBe("fix_soon");
  });

  it("returns monitor for medium + percentile >= 0.90", () => {
    expect(computePrioritySignal("medium", epss(0.93))).toBe("monitor");
  });

  it("returns monitor for low + percentile >= 0.90", () => {
    expect(computePrioritySignal("low", epss(0.95))).toBe("monitor");
  });

  it("returns low_priority for medium + percentile < 0.90", () => {
    expect(computePrioritySignal("medium", epss(0.50))).toBe("low_priority");
  });

  it("returns low_priority for low + percentile < 0.90", () => {
    expect(computePrioritySignal("low", epss(0.01))).toBe("low_priority");
  });

  it("uses max percentile across multiple EPSS entries", () => {
    const scores: EpssScore[] = [
      { cve: "CVE-2024-0001", epss: 0.001, percentile: 0.50 },
      { cve: "CVE-2024-0002", epss: 0.009, percentile: 0.92 },
    ];
    // critical + max(0.50, 0.92) = 0.92 >= 0.90 → fix_now
    expect(computePrioritySignal("critical", scores)).toBe("fix_now");
  });

  it("just below boundary is fix_soon for high severity", () => {
    expect(computePrioritySignal("high", epss(0.8999))).toBe("fix_soon");
  });

  // "unknown" and "none" are valid SeverityLabel values (unscored advisories).
  // They are not critical/high, so they fall into the lower-impact tiers.
  it("returns monitor for unknown severity + percentile >= 0.90", () => {
    expect(computePrioritySignal("unknown", epss(0.95))).toBe("monitor");
  });

  it("returns low_priority for unknown severity + percentile < 0.90", () => {
    expect(computePrioritySignal("unknown", epss(0.50))).toBe("low_priority");
  });

  it("returns monitor for none severity + percentile >= 0.90", () => {
    expect(computePrioritySignal("none", epss(0.92))).toBe("monitor");
  });

  it("returns low_priority for none severity + percentile < 0.90", () => {
    expect(computePrioritySignal("none", epss(0.10))).toBe("low_priority");
  });
});
