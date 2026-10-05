export interface SpiceLot {
  readonly spiceName: string;
  readonly kilograms: number;
  readonly pricePerKiloCents: number;
}

export function lotValueCents(lot: SpiceLot): number {
  return Math.round(lot.kilograms * lot.pricePerKiloCents);
}
