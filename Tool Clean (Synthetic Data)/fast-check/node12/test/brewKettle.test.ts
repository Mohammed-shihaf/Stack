import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { blendTemperatureCelsius, gallonsToLitres, litresToGallons } from "../src/brewKettle";

describe("brewKettle unit conversion", () => {
  it("round-trips litres through gallons", () => {
    fc.assert(
      fc.property(fc.double({ min: 0.01, max: 10000, noNaN: true }), (litres) => {
        const roundTrip = gallonsToLitres(litresToGallons(litres));
        expect(Math.abs(roundTrip - litres)).toBeLessThan(1e-6 * Math.max(1, litres));
      })
    );
  });

  it("blends within the range of the two input temperatures", () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0.1, max: 500, noNaN: true }),
        fc.double({ min: -20, max: 120, noNaN: true }),
        fc.double({ min: 0.1, max: 500, noNaN: true }),
        fc.double({ min: -20, max: 120, noNaN: true }),
        (aLitres, aCelsius, bLitres, bCelsius) => {
          const blended = blendTemperatureCelsius(aLitres, aCelsius, bLitres, bCelsius);
          const lower = Math.min(aCelsius, bCelsius);
          const upper = Math.max(aCelsius, bCelsius);
          expect(blended).toBeGreaterThanOrEqual(lower - 1e-9);
          expect(blended).toBeLessThanOrEqual(upper + 1e-9);
        }
      )
    );
  });
});
