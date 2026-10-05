/** Decides how many times a tower bell should chime for a given hour. */
export function chimeCount(hour24: number): number {
  if (hour24 < 0 || hour24 > 23) {
    throw new RangeError("hour must be between 0 and 23");
  }
  const hour12 = hour24 % 12;
  return hour12 === 0 ? 12 : hour12;
}

export function isQuietHour(hour24: number): boolean {
  return hour24 >= 22 || hour24 < 7;
}
