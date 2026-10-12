export interface BerthRequest {
  readonly vesselName: string;
  readonly requestedLengthMetres: number;
}

export interface Berth {
  readonly berthId: string;
  readonly lengthMetres: number;
  occupiedBy: string | null;
}

export class HarborBerthPlan {
  private readonly berths: Berth[];

  constructor(berths: Berth[]) {
    this.berths = berths;
  }

  assign(request: BerthRequest): string | null {
    const candidate = this.berths.find(
      (berth) => berth.occupiedBy === null && berth.lengthMetres >= request.requestedLengthMetres
    );
    if (!candidate) {
      return null;
    }
    candidate.occupiedBy = request.vesselName;
    return candidate.berthId;
  }

  vacate(berthId: string): boolean {
    const berth = this.berths.find((b) => b.berthId === berthId);
    if (!berth || berth.occupiedBy === null) {
      return false;
    }
    berth.occupiedBy = null;
    return true;
  }

  freeBerthCount(): number {
    return this.berths.filter((b) => b.occupiedBy === null).length;
  }
}
