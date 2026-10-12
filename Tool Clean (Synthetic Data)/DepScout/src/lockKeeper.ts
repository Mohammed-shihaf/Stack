/** A door lock the keeper looks after. */
export interface Lock {
  readonly id: string;
  readonly door: string;
  readonly lastServicedDay: number;
}

/** Locks not serviced within `intervalDays` of `today`. */
export function dueForService(locks: readonly Lock[], today: number, intervalDays: number): Lock[] {
  return locks.filter((lock) => today - lock.lastServicedDay > intervalDays);
}
