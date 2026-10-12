import { SERVICE_INTERVAL_DAYS, type LampEntry } from "./lampLog";

/** True when a lamp has gone longer than the service interval without an entry. */
export function isOverdue(entries: readonly LampEntry[], lampId: string, today: number): boolean {
  const days = entries.filter((entry) => entry.lampId === lampId).map((entry) => entry.day);
  return days.length === 0 || today - Math.max(...days) > SERVICE_INTERVAL_DAYS;
}
