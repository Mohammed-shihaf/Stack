export interface StaveBatch {
  readonly batchId: string;
  readonly staveCount: number;
  readonly rejectCount: number;
}

export function yieldPct(batch: StaveBatch): number {
  if (batch.staveCount <= 0) {
    throw new RangeError(`batch ${batch.batchId} needs a positive stave count`);
  }
  const good = batch.staveCount - batch.rejectCount;
  return (good / batch.staveCount) * 100;
}
