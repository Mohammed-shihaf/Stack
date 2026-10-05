export interface TreeBlock {
  readonly blockId: string;
  readonly treeCount: number;
  readonly varietal: string;
}

export class OrchardSurvey {
  private readonly blocks: TreeBlock[] = [];

  addBlock(block: TreeBlock): void {
    if (block.treeCount <= 0) {
      throw new RangeError(`block ${block.blockId} needs a positive tree count`);
    }
    this.blocks.push(block);
  }

  totalTrees(): number {
    return this.blocks.reduce((sum, block) => sum + block.treeCount, 0);
  }

  varietalCount(varietal: string): number {
    return this.blocks
      .filter((block) => block.varietal === varietal)
      .reduce((sum, block) => sum + block.treeCount, 0);
  }
}
