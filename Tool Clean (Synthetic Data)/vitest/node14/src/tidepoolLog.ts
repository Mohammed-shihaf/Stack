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
    return matching.reduce((sum, r) => sum + r.celsius, 0) / matching.length;
  }

  isBrackish(reading: TidepoolReading): boolean {
    return reading.salinityPpt < 30;
  }
}
