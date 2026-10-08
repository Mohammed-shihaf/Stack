/** A dock lock and the tide window in which it can be worked. */
export interface DockLock {
  readonly name: string;
  readonly openFromHour: number;
  readonly openToHour: number;
}

/** True when the lock is workable at the given hour (0-23). */
export function isWorkable(lock: DockLock, hour: number): boolean {
  return hour >= lock.openFromHour && hour < lock.openToHour;
}
