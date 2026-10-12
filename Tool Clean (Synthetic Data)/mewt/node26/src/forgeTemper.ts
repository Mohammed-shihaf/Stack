export type TemperGrade = "soft" | "medium" | "hard";

export function classifyTemper(rockwellC: number): TemperGrade {
  if (rockwellC >= 55) {
    return "hard";
  }
  if (rockwellC >= 35) {
    return "medium";
  }
  return "soft";
}

export function quenchSeconds(grade: TemperGrade): number {
  switch (grade) {
    case "hard":
      return 12;
    case "medium":
      return 8;
    default:
      return 4;
  }
}
