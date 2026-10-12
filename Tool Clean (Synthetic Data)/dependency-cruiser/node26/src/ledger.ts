import { lotValueCents, type SpiceLot } from "./pricing";

export class SpiceMarketLedger {
  private readonly lots: SpiceLot[] = [];

  record(lot: SpiceLot): void {
    this.lots.push(lot);
  }

  totalValueCents(): number {
    return this.lots.reduce((sum, lot) => sum + lotValueCents(lot), 0);
  }

  lotCount(): number {
    return this.lots.length;
  }
}
