import { scoreMaintenanceFinding, computeStaleness, STALE_YEARS } from "../../src/maintenance/score.js";

describe("scoreMaintenanceFinding", () => {
  it("drag alone is high", () => {
    expect(scoreMaintenanceFinding({ drag: true, deprecated: false })).toEqual({ score: 3, severity: "high" });
  });
  it("deprecated alone is medium - release age never escalates it", () => {
    expect(scoreMaintenanceFinding({ drag: false, deprecated: true })).toEqual({ score: 2, severity: "medium" });
  });
  it("drag + deprecated is high", () => {
    expect(scoreMaintenanceFinding({ drag: true, deprecated: true })).toEqual({ score: 5, severity: "high" });
  });
  it("neither signal is low (does not fire)", () => {
    expect(scoreMaintenanceFinding({ drag: false, deprecated: false })).toEqual({ score: 0, severity: "low" });
  });
});

describe("computeStaleness", () => {
  const now = new Date("2026-01-01T00:00:00Z");
  it("returns null when packument, dist-tags.latest, or the latest version's time entry is absent", () => {
    expect(computeStaleness(null, now)).toBeNull();
    expect(computeStaleness({ time: {} } as any, now)).toBeNull();
    expect(computeStaleness({ "dist-tags": { latest: "1.0.0" }, time: {} } as any, now)).toBeNull();
  });
  it("returns a signal with ageYears from the latest version's publish time when the package is old", () => {
    const p = { "dist-tags": { latest: "2.0.0" }, time: { "2.0.0": "2019-01-01T00:00:00Z" } } as any;
    expect(computeStaleness(p, now)).toEqual({ lastPublish: "2019-01-01T00:00:00Z", ageYears: 7 });
  });
  it("returns null for a package fresher than STALE_YEARS - staleness is context for old packages only", () => {
    const oneY = { "dist-tags": { latest: "1.0.0" }, time: { "1.0.0": "2025-01-01T00:00:00Z" } } as any;
    const twoY = { "dist-tags": { latest: "1.0.0" }, time: { "1.0.0": "2023-12-31T00:00:00Z" } } as any;
    expect(computeStaleness(oneY, now)).toBeNull();
    expect(computeStaleness(twoY, now)!.ageYears).toBeGreaterThanOrEqual(STALE_YEARS);
  });
  it("uses the latest version's real publish time, not time.modified (which npm bumps on `npm deprecate`)", () => {
    // A package deprecated recently but last released years ago must still read as
    // stale via time[latest], not the freshly-bumped time.modified.
    const p = {
      "dist-tags": { latest: "1.2.0" },
      time: {
        modified: "2025-12-30T00:00:00Z", // bumped by a recent `npm deprecate`
        "1.2.0": "2019-01-01T00:00:00Z", // the real last release
      },
    } as any;
    expect(computeStaleness(p, now)).toEqual({ lastPublish: "2019-01-01T00:00:00Z", ageYears: 7 });
  });
});
