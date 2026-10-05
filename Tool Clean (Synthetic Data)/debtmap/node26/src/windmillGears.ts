export interface GearPair {
  readonly driverTeeth: number;
  readonly drivenTeeth: number;
}

export function gearRatio(pair: GearPair): number {
  if (pair.drivenTeeth <= 0) {
    throw new RangeError("driven gear must have at least one tooth");
  }
  return pair.driverTeeth / pair.drivenTeeth;
}

export function outputRpm(inputRpm: number, pair: GearPair): number {
  return inputRpm * gearRatio(pair);
}
