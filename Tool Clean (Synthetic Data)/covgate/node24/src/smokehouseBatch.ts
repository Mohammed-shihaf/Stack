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
