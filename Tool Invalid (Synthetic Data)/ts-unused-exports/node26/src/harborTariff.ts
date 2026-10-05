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

// Unused exports below: never imported by src/index.ts, so
// ts-unused-exports should flag the majority of this module's exports.
export interface PilotageRequest {
  readonly berthId: string;
  readonly pilotId: string;
}

export function pilotageFeeCents(request: PilotageRequest): number {
  return request.berthId.length * 50 + request.pilotId.length * 10;
}

export class TugDispatch {
  private dispatched: string[] = [];

  dispatch(tugId: string): void {
    this.dispatched.push(tugId);
  }

  dispatchedCount(): number {
    return this.dispatched.length;
  }
}

export const DEFAULT_PILOTAGE: PilotageRequest = { berthId: "B0", pilotId: "P0" };
