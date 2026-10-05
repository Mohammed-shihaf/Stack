import { describe, expect, it } from "vitest";
import { chimeCount, isQuietHour } from "../src/clocktowerChime";

describe("chimeCount", () => {
  it("chimes 12 at midnight", () => {
    expect(chimeCount(0)).toBe(12);
  });
  it("chimes 12 at noon", () => {
    expect(chimeCount(12)).toBe(12);
  });
  it("chimes the 12-hour equivalent for afternoon hours", () => {
    expect(chimeCount(15)).toBe(3);
  });
  it("chimes the hour itself before noon", () => {
    expect(chimeCount(9)).toBe(9);
  });
  it("chimes correctly at the last valid hour, 23", () => {
    expect(chimeCount(23)).toBe(11);
  });
  it("rejects an hour outside 0-23 with a specific message", () => {
    expect(() => chimeCount(24)).toThrow("hour must be between 0 and 23");
    expect(() => chimeCount(-1)).toThrow("hour must be between 0 and 23");
  });
});

describe("isQuietHour", () => {
  it("is quiet late at night", () => {
    expect(isQuietHour(23)).toBe(true);
  });
  it("is quiet early morning", () => {
    expect(isQuietHour(5)).toBe(true);
  });
  it("is not quiet mid-morning", () => {
    expect(isQuietHour(9)).toBe(false);
  });
  it("is not quiet right at 7", () => {
    expect(isQuietHour(7)).toBe(false);
  });
  it("is not quiet right before 22", () => {
    expect(isQuietHour(21)).toBe(false);
  });
  it("is quiet exactly at 22", () => {
    expect(isQuietHour(22)).toBe(true);
  });
});
