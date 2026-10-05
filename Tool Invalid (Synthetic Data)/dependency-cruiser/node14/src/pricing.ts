import type { SpiceMarketLedger } from "./ledger";

export interface SpiceLot {
  readonly spiceName: string;
  readonly kilograms: number;
  readonly pricePerKiloCents: number;
}

export function lotValueCents(lot: SpiceLot): number {
  return Math.round(lot.kilograms * lot.pricePerKiloCents);
}

// Real circular import: pricing.ts -> ledger.ts -> pricing.ts. Only the
// type is used here (erased at runtime) but dependency-cruiser's static
// graph still records the edge, which is exactly what "no-circular" is
// built to catch.
export function describeLedger(ledger: SpiceMarketLedger): string {
  return `ledger with ${ledger.lotCount()} lot(s)`;
}
