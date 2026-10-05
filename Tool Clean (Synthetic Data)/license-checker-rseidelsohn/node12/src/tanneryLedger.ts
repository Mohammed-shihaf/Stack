export interface HideBatch {
  readonly batchId: string;
  readonly hideCount: number;
  readonly tanDays: number;
}

export class TanneryLedger {
  private readonly batches: HideBatch[] = [];

  intake(batch: HideBatch): void {
    if (batch.hideCount <= 0 || batch.tanDays <= 0) {
      throw new RangeError(`batch ${batch.batchId} needs positive counts`);
    }
    this.batches.push(batch);
  }

  readyBatches(elapsedDays: number): HideBatch[] {
    return this.batches.filter((b) => b.tanDays <= elapsedDays);
  }

  totalHides(): number {
    return this.batches.reduce((sum, b) => sum + b.hideCount, 0);
  }
}
