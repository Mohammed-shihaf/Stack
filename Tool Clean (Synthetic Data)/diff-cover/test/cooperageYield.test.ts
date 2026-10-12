import { describe, expect, it } from "vitest";
import { yieldPct } from "../src/cooperageYield";

describe("yieldPct", () => {
  it("computes a perfect yield", () => {
    expect(yieldPct({ batchId: "b1", staveCount: 40, rejectCount: 0 })).toBe(100);
  });

  it("computes a partial yield", () => {
    expect(yieldPct({ batchId: "b2", staveCount: 40, rejectCount: 10 })).toBe(75);
  });

  it("rejects a non-positive stave count", () => {
    expect(() => yieldPct({ batchId: "b3", staveCount: 0, rejectCount: 0 })).toThrow(RangeError);
  });
});
