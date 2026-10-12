/** How often, in days, a lighthouse lamp is serviced. */
export const SERVICE_INTERVAL_DAYS = 30;

export interface LampEntry {
  readonly lampId: string;
  readonly day: number;
  readonly action: "inspected" | "relamped" | "cleaned";
}

/** Entries for one lamp, oldest first. */
export function historyOf(entries: readonly LampEntry[], lampId: string): LampEntry[] {
  return entries.filter((entry) => entry.lampId === lampId).sort((a, b) => a.day - b.day);
}
