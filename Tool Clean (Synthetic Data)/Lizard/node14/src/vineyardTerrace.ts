export interface TerraceRow {
  readonly rowId: string;
  readonly vineCount: number;
  readonly slopePct: number;
}

export function classifyRow(row: TerraceRow): string {
  if (row.slopePct > 30) {
    return "steep";
  }
  if (row.slopePct > 15) {
    return "moderate";
  }
  return "gentle";
}

export function estimatedYieldKg(row: TerraceRow): number {
  const perVineKg = row.slopePct > 30 ? 2.5 : row.slopePct > 15 ? 3.5 : 4.5;
  return row.vineCount * perVineKg;
}

export function totalYieldKg(rows: TerraceRow[]): number {
  let total = 0;
  for (const row of rows) {
    total += estimatedYieldKg(row);
  }
  return total;
}
