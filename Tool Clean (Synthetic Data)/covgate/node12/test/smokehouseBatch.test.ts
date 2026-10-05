import { describe, expect, it } from "vitest";
import { hoursRemaining, isDone } from "../src/smokehouseBatch";

describe("smokehouseBatch", () => {
  it("is not done before reaching target hours", () => {
    expect(isDone({ batchId: "s1", hours: 4, targetHours: 8 })).toBe(false);
  });
  it("is done once target hours are reached", () => {
    expect(isDone({ batchId: "s2", hours: 8, targetHours: 8 })).toBe(true);
  });
  it("reports remaining hours", () => {
    expect(hoursRemaining({ batchId: "s3", hours: 4, targetHours: 8 })).toBe(4);
  });
  it("floors remaining hours at zero", () => {
    expect(hoursRemaining({ batchId: "s4", hours: 10, targetHours: 8 })).toBe(0);
  });
});
