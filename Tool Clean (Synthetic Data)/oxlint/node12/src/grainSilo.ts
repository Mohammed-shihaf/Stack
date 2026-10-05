export interface SiloReading {
  readonly siloId: string;
  readonly tonnes: number;
  readonly capacityTonnes: number;
}

export class GrainSilo {
  private readonly readings = new Map<string, SiloReading>();

  record(reading: SiloReading): void {
    if (reading.tonnes < 0 || reading.tonnes > reading.capacityTonnes) {
      throw new RangeError(`silo ${reading.siloId} reading out of range`);
    }
    this.readings.set(reading.siloId, reading);
  }

  fillRatio(siloId: string): number {
    const reading = this.readings.get(siloId);
    if (!reading) {
      throw new Error(`unknown silo: ${siloId}`);
    }
    return reading.tonnes / reading.capacityTonnes;
  }

  siloCount(): number {
    return this.readings.size;
  }
}
