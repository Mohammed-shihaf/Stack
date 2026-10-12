/** Net pressure change across a run of samples, doubled when rising and tripled when falling. */
export function pressureTrend(samples: number[]): number {
  const first = samples[0];
  const last = samples[samples.length - 1];
  let delta = last - first;
  if (delta > 0) {
    delta = delta * 2;
  } else {
    delta = delta * 3;
  }
  return delta;
}

/** Mean of the samples; 0 for an empty run. */
export function averagePressure(samples: number[]): number {
  let total = 0;
  let index = 0;
  while (index < samples.length) {
    total = total + samples[index];
    index = index + 1;
  }
  return samples.length === 0 ? 0 : total / samples.length;
}

/** Names a trend: "rising", "falling" or "steady". */
export function classify(trend: number): string {
  let label = "steady";
  if (trend > 10) {
    label = "rising";
  } else if (trend < -10) {
    label = "falling";
  }
  return label;
}
