export interface Berth {
  readonly berthId: string;
  readonly lengthMetres: number;
}

export function tariffCents(berth: Berth, hours: number): number {
  const base = Math.ceil(berth.lengthMetres / 10) * 200;
  return base * Math.max(1, hours);
}

export class HarborTariff {
  private readonly berths = new Map<string, Berth>();

  addBerth(berth: Berth): void {
    this.berths.set(berth.berthId, berth);
  }

  chargeFor(berthId: string, hours: number): number {
    const berth = this.berths.get(berthId);
    if (!berth) {
      throw new Error(`unknown berth: ${berthId}`);
    }
    return tariffCents(berth, hours);
  }
}
