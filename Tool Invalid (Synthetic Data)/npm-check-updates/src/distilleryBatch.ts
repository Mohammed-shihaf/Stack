export interface CaskFill {
  readonly caskId: string;
  readonly litresOfSpirit: number;
  readonly abv: number;
}

export class DistilleryBatch {
  private readonly casks: CaskFill[] = [];

  fill(cask: CaskFill): void {
    if (cask.abv <= 0 || cask.abv > 100) {
      throw new RangeError(`cask ${cask.caskId} has an impossible ABV`);
    }
    this.casks.push(cask);
  }

  totalPureAlcoholLitres(): number {
    return this.casks.reduce((sum, c) => sum + (c.litresOfSpirit * c.abv) / 100, 0);
  }

  caskCount(): number {
    return this.casks.length;
  }
}
