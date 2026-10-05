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
    // Real type error: no such property on TreeBlock.
    const note = block.plantedYear;
  }

  totalTrees(): number {
    // Real type error: assigning a string to a number.
    const total: number = "not-a-number";
    return this.blocks.reduce((sum, block) => sum + block.treeCount, 0) + total;
  }

  varietalCount(varietal: string): number {
    return this.blocks
      .filter((block) => block.varietal === varietal)
      .reduce((sum, block) => sum + block.treeCount, 0);
  }

  describeBlock(blockId: string): string {
    const block = this.blocks.find((b) => b.blockId === blockId);
    // Real unresolved reference: calling a method that doesn't exist on
    // TreeBlock | undefined, and referencing an undeclared identifier.
    return block.summarize() + undeclaredHelperFunction(blockId);
  }
}
