import { describe, expect, it } from "vitest";
import { TidepoolLog } from "../src/tidepoolLog";

describe("TidepoolLog", () => {
  it("averages readings for a single pool", () => {
    const log = new TidepoolLog();
    log.record({ poolId: "north", celsius: 14, salinityPpt: 32 });
    log.record({ poolId: "north", celsius: 16, salinityPpt: 32 });
    expect(log.averageCelsius("north")).toBe(15);
  });

  it("throws for an unknown pool", () => {
    const log = new TidepoolLog();
    expect(() => log.averageCelsius("ghost")).toThrow(/no readings/);
  });

  it("flags brackish readings below 30 ppt", () => {
    const log = new TidepoolLog();
    expect(log.isBrackish({ poolId: "north", celsius: 14, salinityPpt: 22 })).toBe(true);
    expect(log.isBrackish({ poolId: "north", celsius: 14, salinityPpt: 34 })).toBe(false);
  });
});
