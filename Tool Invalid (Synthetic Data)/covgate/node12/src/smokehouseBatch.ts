export interface SmokehouseBatch {
  readonly batchId: string;
  readonly hours: number;
  readonly targetHours: number;
}

export function isDone(batch: SmokehouseBatch): boolean {
  return batch.hours >= batch.targetHours;
}

export function hoursRemaining(batch: SmokehouseBatch): number {
  const remaining = batch.targetHours - batch.hours;
  return remaining > 0 ? remaining : 0;
}

export type SmokeLevel = "light" | "medium" | "heavy";

export function recommendedLevel(batch: SmokehouseBatch): SmokeLevel {
  const fraction = batch.targetHours === 0 ? 0 : batch.hours / batch.targetHours;
  if (fraction < 0.3) {
    return "light";
  }
  if (fraction < 0.7) {
    return "medium";
  }
  return "heavy";
}

export function percentComplete(batch: SmokehouseBatch): number {
  if (batch.targetHours <= 0) {
    return 0;
  }
  const pct = (batch.hours / batch.targetHours) * 100;
  return pct > 100 ? 100 : pct;
}

export function describeBatch(batch: SmokehouseBatch): string {
  if (isDone(batch)) {
    return `batch ${batch.batchId}: done`;
  }
  return `batch ${batch.batchId}: ${hoursRemaining(batch)}h remaining at ${recommendedLevel(batch)} smoke`;
}

export function mergeBatches(batches: SmokehouseBatch[]): number {
  let total = 0;
  for (const b of batches) {
    total += b.hours;
  }
  return total;
}
