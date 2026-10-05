export interface TidepoolReading {
  readonly poolId: string;
  readonly celsius: number;
  readonly salinityPpt: number;
}

export class TidepoolLog {
  private readonly readings: TidepoolReading[] = [];

  record(reading: TidepoolReading): void {
    this.readings.push(reading);
  }

  averageCelsius(poolId: string): number {
    const matching = this.readings.filter((r) => r.poolId === poolId);
    if (matching.length === 0) {
      throw new Error(`no readings for pool: ${poolId}`);
    }
    // Bug: sum instead of average.
    return matching.reduce((sum, r) => sum + r.celsius, 0);
  }

  isBrackish(reading: TidepoolReading): boolean {
    // Bug: threshold flipped (should be < 30).
    return reading.salinityPpt > 30;
  }
}
