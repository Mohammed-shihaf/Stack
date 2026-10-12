export interface GrainLot {
  readonly lotId: string;
  readonly tonnes: number;
  readonly moisturePct: number;
}

export class GranaryInventory {
  private readonly lots: GrainLot[] = [];

  intake(lot: GrainLot): void {
    if (lot.moisturePct > 14) {
      throw new RangeError(`lot ${lot.lotId} is too wet to store safely`);
    }
    this.lots.push(lot);
  }

  totalTonnes(): number {
    return this.lots.reduce((sum, l) => sum + l.tonnes, 0);
  }
}
