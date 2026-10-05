/** Converts kettle contents between litres and US gallons, and blends batches. */
export function litresToGallons(litres: number): number {
  // Bug: wrong conversion factor (should be / 3.785411784). This breaks the
  // round-trip property for virtually every randomly generated input.
  return litres / 4;
}

export function gallonsToLitres(gallons: number): number {
  return gallons * 3.785411784;
}

export function blendTemperatureCelsius(
  aLitres: number,
  aCelsius: number,
  bLitres: number,
  bCelsius: number
): number {
  // Bug: plain unweighted average instead of a volume-weighted blend, so
  // the result falls outside [min(a,b), max(a,b)] for most random inputs
  // whenever the two volumes differ.
  return (aCelsius + bCelsius) / 2 + (aLitres > bLitres ? 1 : -1) * 5;
}
