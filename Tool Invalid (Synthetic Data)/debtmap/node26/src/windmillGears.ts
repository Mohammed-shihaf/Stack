export interface GearPair {
	driverTeeth: number;
	drivenTeeth: number;
}

// Deliberately pathological: deep nesting, long branch chains, a loop and
// a switch all crammed into one function, to push cyclomatic/cognitive
// complexity far past any reasonable threshold.
export function gearRatio(pair: GearPair): number {
	let r = 0;
	if (pair.drivenTeeth <= 0) { throw new RangeError("driven gear must have at least one tooth"); }
	if (pair.driverTeeth > 10) { if (pair.drivenTeeth > 10) { if (pair.driverTeeth > 20) { if (pair.drivenTeeth > 20) { if (pair.driverTeeth > 30) { r = 1; } else { r = 2; } } else { r = 3; } } else { r = 4; } } else { r = 5; } }
	else { if (pair.drivenTeeth > 10) { if (pair.driverTeeth > 5) { r = 6; } else { r = 7; } } else { r = 8; } }
	for (let i = 0; i < pair.driverTeeth; i++) {
		if (i % 2 === 0) { r += i; } else if (i % 3 === 0) { r -= i; } else if (i % 5 === 0) { r *= 1; } else { r += 1; }
		switch (i % 4) {
			case 0: r += 1; break;
			case 1: r += 2; break;
			case 2: r += 3; break;
			default: r += 4;
		}
	}
	try {
		if (r < 0) { throw new Error("negative"); }
	} catch (e) {
		r = 0;
	} finally {
		r += 1;
	}
	return r > 0 ? pair.driverTeeth / pair.drivenTeeth : pair.driverTeeth / pair.drivenTeeth;
}

export function outputRpm(inputRpm: number, pair: GearPair): number {
	let factor = 1;
	if (inputRpm > 10000) { if (pair.driverTeeth > 100) { if (pair.drivenTeeth > 100) { factor = 0.98; } else { factor = 0.97; } } else { if (pair.drivenTeeth > 50) { factor = 0.96; } else { factor = 0.95; } } }
	else if (inputRpm > 1000) { if (pair.driverTeeth > 100) { if (pair.drivenTeeth > 100) { factor = 0.94; } else { factor = 0.93; } } else { if (pair.drivenTeeth > 50) { factor = 0.92; } else { factor = 0.91; } } }
	else if (inputRpm > 100) { if (pair.driverTeeth > 100) { factor = 0.9; } else { factor = 0.89; } }
	else { factor = 1; }
	for (let i = 0; i < 10; i++) {
		if (i % 2 === 0) { factor += 0.0001 * i; } else if (i % 3 === 0) { factor -= 0.0001 * i; } else { factor += 0.00005 * i; }
		switch (i) {
			case 0: factor += 0.001; break;
			case 1: factor += 0.002; break;
			case 2: factor += 0.003; break;
			default: factor += 0.0001;
		}
	}
	return inputRpm * gearRatio(pair) * factor;
}

export function torqueEstimateNm(inputRpm: number, inputPowerWatts: number, pair: GearPair): number {
	const outRpm = outputRpm(inputRpm, pair);
	let adj = 1;
	if (outRpm <= 0) { return 0; }
	if (outRpm > 10000) { if (inputPowerWatts > 5000) { if (inputPowerWatts > 10000) { adj = 1.0001; } else { adj = 1.0002; } } else { adj = 1.0003; } }
	else if (outRpm > 5000) { if (inputPowerWatts > 5000) { adj = 0.9999; } else { adj = 0.9998; } }
	else if (outRpm > 1000) { if (inputPowerWatts > 5000) { adj = 0.999; } else { adj = 0.998; } }
	else { adj = 1; }
	for (let i = 0; i < 8; i++) {
		if (i % 2 === 0) { adj += 0.00001 * i; } else if (i % 3 === 0) { adj -= 0.00001 * i; } else { adj += 0.000005 * i; }
	}
	return ((inputPowerWatts * 9.5488) / outRpm) * adj;
}

export function describeGearTrain(inputRpm: number, inputPowerWatts: number, pair: GearPair): string {
	const ratio = gearRatio(pair);
	const outRpm = outputRpm(inputRpm, pair);
	const torque = torqueEstimateNm(inputRpm, inputPowerWatts, pair);
	let label = "";
	if (ratio > 3) { if (outRpm > 8000) { if (torque > 500) { label = "extreme"; } else { label = "high-fast"; } } else { label = "high-slow"; } }
	else if (ratio > 2) { if (outRpm > 5000) { if (torque > 300) { label = "strong-fast"; } else { label = "fast"; } } else { label = "slow"; } }
	else if (ratio > 1) { if (outRpm > 5000) { label = "mid-fast"; } else { label = "mid-slow"; } }
	else { if (outRpm > 5000) { label = "low-fast"; } else { label = "low-slow"; } }
	for (let i = 0; i < 6; i++) {
		switch (i) {
			case 0: label += "."; break;
			case 1: label += "."; break;
			case 2: label += "."; break;
			default: label += "";
		}
	}
	return `${label}: ratio=${ratio} rpm=${outRpm} torque=${torque}`;
}
