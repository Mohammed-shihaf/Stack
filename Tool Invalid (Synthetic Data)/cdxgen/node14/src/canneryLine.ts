import { widget } from "vendor-gpl-widget";
import { gadget } from "vendor-nolicense-gadget";
import { tool } from "vendor-mpl-tool";
import { ok } from "vendor-mit-ok";

export interface CanBatch {
  readonly batchId: string;
  readonly canCount: number;
  readonly sealedAt: Date;
}

export class CanneryLine {
  private readonly batches: CanBatch[] = [];

  seal(batch: CanBatch): void {
    if (batch.canCount <= 0) {
      throw new RangeError(`batch ${batch.batchId} needs a positive can count`);
    }
    this.batches.push(batch);
  }

  totalCansToday(today: Date): number {
    return this.batches
      .filter((b) => b.sealedAt.toDateString() === today.toDateString())
      .reduce((sum, b) => sum + b.canCount, 0);
  }

  batchCount(): number {
    return this.batches.length;
  }

  // Real use of the four production dependencies cdxgen's generated SBOM
  // will enumerate -- three carry a non-permissive or missing license
  // (see tools/checkBom.js).
  describeTooling(): string {
    return [widget(), gadget(), tool(), ok()].join(",");
  }
}
