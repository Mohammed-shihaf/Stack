import { widget } from "vendor-gpl-widget";
import { gadget } from "vendor-nolicense-gadget";
import { tool } from "vendor-mpl-tool";
import { ok } from "vendor-mit-ok";

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

  // Real, if slightly contrived, use of all four real production
  // dependencies declared in package.json -- three of which carry
  // licenses outside the corpus's allow list (GPL-3.0-only, no license
  // field, MPL-2.0), so license-checker-rseidelsohn's --onlyAllow gate
  // should flag 3 of these 4 production dependencies (75%).
  describeTooling(): string {
    return [widget(), gadget(), tool(), ok()].join(",");
  }
}
