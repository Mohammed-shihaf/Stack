export interface CordEntry {
  readonly species: string;
  readonly cords: number;
  readonly stackedOn: string;
}

export class CordwoodStack {
  private readonly entries: CordEntry[] = [];

  add(entry: CordEntry): void {
    if (entry.cords <= 0) {
      throw new RangeError(`${entry.species} entry needs a positive cord count`);
    }
    this.entries.push(entry);
  }

  totalCords(): number {
    return this.entries.reduce((sum, e) => sum + e.cords, 0);
  }

  cordsOfSpecies(species: string): number {
    return this.entries
      .filter((e) => e.species === species)
      .reduce((sum, e) => sum + e.cords, 0);
  }
}
