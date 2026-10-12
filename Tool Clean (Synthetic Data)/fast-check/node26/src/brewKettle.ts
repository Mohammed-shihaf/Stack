/** Converts kettle contents between litres and US gallons, and blends batches. */
export function litresToGallons(litres: number): number {
  return litres / 3.785411784;
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
  const totalLitres = aLitres + bLitres;
  if (totalLitres <= 0) {
    throw new RangeError("blended volume must be positive");
  }
  return (aLitres * aCelsius + bLitres * bCelsius) / totalLitres;
}
