export interface LockPass {
  readonly vesselName: string;
  readonly lockNumber: number;
  readonly minutesToOperate: number;
}

export class LockkeeperLog {
  private readonly passes: LockPass[] = [];

  record(pass: LockPass): void {
    if (pass.minutesToOperate <= 0) {
      throw new RangeError(`pass through lock ${pass.lockNumber} needs positive duration`);
    }
    this.passes.push(pass);
  }

  totalMinutes(): number {
    return this.passes.reduce((sum, pass) => sum + pass.minutesToOperate, 0);
  }

  passesThroughLock(lockNumber: number): number {
    return this.passes.filter((pass) => pass.lockNumber === lockNumber).length;
  }
}
