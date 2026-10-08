/** One tide gauge reading, in millimetres above chart datum. */
export interface Reading {
  readonly stationId: string;
  readonly takenAt: string;
  readonly heightMm: number;
}

/** The reading with the greatest height, or undefined for an empty series. */
export function highest(readings: readonly Reading[]): Reading | undefined {
  return readings.reduce<Reading | undefined>(
    (best, current) => (best === undefined || current.heightMm > best.heightMm ? current : best),
    undefined,
  );
}

/** Mean height of the series; 0 when there are no readings. */
export function meanHeight(readings: readonly Reading[]): number {
  if (readings.length === 0) {
    return 0;
  }
  let total = 0;
  for (const reading of readings) {
    total = total + reading.heightMm;
  }
  return Math.round(total / readings.length);
}

/** Spread between the highest and lowest height, in millimetres. */
export function tidalRange(readings: readonly Reading[]): number {
  const heights = readings.map((reading) => reading.heightMm);
  return heights.length === 0 ? 0 : Math.max(...heights) - Math.min(...heights);
}

/** Renders the series as CSV with a header row. */
export function toCsv(readings: readonly Reading[]): string {
  const rows = readings.map((reading) => [reading.stationId, reading.takenAt, String(reading.heightMm)].join(","));
  return ["station,takenAt,heightMm", ...rows].join("\n");
}

/** Parses one CSV row back into a reading; throws on a malformed row. */
export function parseRow(row: string): Reading {
  const parts = row.split(",");
  if (parts.length !== 3) {
    throw new Error(`expected 3 fields, got ${parts.length}`);
  }
  const heightMm = Number(parts[2]);
  if (!Number.isFinite(heightMm)) {
    throw new Error(`height is not a number: ${parts[2]}`);
  }
  return { stationId: parts[0], takenAt: parts[1], heightMm };
}
