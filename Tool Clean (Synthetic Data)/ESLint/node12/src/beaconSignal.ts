/** A single beacon's flash timing, in whole seconds. */
export interface BeaconTiming {
  readonly beaconId: string;
  readonly onSeconds: number;
  readonly offSeconds: number;
}

/** Tracks a set of lighthouse beacons and reports which are due to flash. */
export class BeaconSignal {
  private readonly timings = new Map<string, BeaconTiming>();

  register(timing: BeaconTiming): void {
    if (timing.onSeconds <= 0 || timing.offSeconds <= 0) {
      throw new RangeError(`beacon ${timing.beaconId} needs positive on/off durations`);
    }
    this.timings.set(timing.beaconId, timing);
  }

  cycleLength(beaconId: string): number {
    const timing = this.requireTiming(beaconId);
    return timing.onSeconds + timing.offSeconds;
  }

  isLitAt(beaconId: string, elapsedSeconds: number): boolean {
    const timing = this.requireTiming(beaconId);
    const cycle = timing.onSeconds + timing.offSeconds;
    const phase = ((elapsedSeconds % cycle) + cycle) % cycle;
    return phase < timing.onSeconds;
  }

  registeredCount(): number {
    return this.timings.size;
  }

  private requireTiming(beaconId: string): BeaconTiming {
    const timing = this.timings.get(beaconId);
    if (!timing) {
      throw new Error(`unknown beacon: ${beaconId}`);
    }
    return timing;
  }
}
