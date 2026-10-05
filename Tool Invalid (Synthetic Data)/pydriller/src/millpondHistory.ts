export interface WaterLevelReading {
  readonly pondId: string;
  readonly centimetres: number;
}

export class MillpondHistory {
  private readonly readings: WaterLevelReading[] = [];

  record(reading: WaterLevelReading): void {
    this.readings.push(reading);
  }

  isEmpty(): boolean {
    return this.readings.length === 0;
  }

  readingCount(): number {
    return this.readings.length;
  }

  latest(pondId: string): number | undefined {
    for (let i = this.readings.length - 1; i >= 0; i -= 1) {
      if (this.readings[i].pondId === pondId) {
        return this.readings[i].centimetres;
      }
    }
    return undefined;
  }
}
