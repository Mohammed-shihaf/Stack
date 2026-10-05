import { strict as assert } from "assert";
import { canLift, safetyMarginTonnes } from "../src/quarryCrane";

assert.equal(canLift({ blockTonnes: 8, craneCapacityTonnes: 10 }), true);
assert.equal(canLift({ blockTonnes: 12, craneCapacityTonnes: 10 }), false);
assert.equal(safetyMarginTonnes({ blockTonnes: 8, craneCapacityTonnes: 10 }), 2);
assert.equal(safetyMarginTonnes({ blockTonnes: 12, craneCapacityTonnes: 10 }), 0);

console.log("ALL_ASSERTIONS_PASSED");
