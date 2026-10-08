/** One ferry crossing as written in the harbour logbook. */
export interface Crossing {
  readonly ferry: string;
  readonly passengers: number;
  readonly minutes: number;
}

/** Throws unless the crossing has a non-negative passenger count and a positive duration. */
export function validateCrossing(crossing: Crossing): Crossing {
  if (!Number.isInteger(crossing.passengers) || crossing.passengers < 0) {
    throw new Error(`${crossing.ferry}: passengers must be a non-negative integer`);
  }
  if (!(crossing.minutes > 0)) {
    throw new Error(`${crossing.ferry}: minutes must be positive`);
  }
  return crossing;
}

/** Fare income for one crossing: 4 per passenger plus 1 per minute at sea. */
export function fareFor(crossing: Crossing): number {
  return crossing.passengers * 4 + crossing.minutes;
}

export class CrossingLog {
  private readonly entries: Crossing[] = [];

  /** Validates and stores a crossing, returning its fare income. */
  record(crossing: Crossing): number {
    const valid = validateCrossing(crossing);
    this.entries.push(valid);
    return fareFor(valid);
  }

  total(): number {
    return this.entries.reduce((sum, entry) => sum + fareFor(entry), 0);
  }
}
