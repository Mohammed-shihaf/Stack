import {
	selectFindingsForCompact,
	selectFindingsForTable,
} from "../../src/output/finding-display.js";
import type { Finding, SeverityLabel } from "../../src/types.js";

function finding(
	name: string,
	severity: SeverityLabel,
	relationship: Finding["relationship"] = "transitive",
): Finding {
	return {
		pkg: { name, version: "1.0.0", ecosystem: "npm" },
		vulnerabilities: [{ id: `OSV-${name}` }],
		severity,
		cveAliases: [],
		dependencyPaths: [],
		relationship,
		firstFixedVersion: null,
	};
}

describe("selectFindingsForTable", () => {
	it("filters findings at or above the minimum severity", () => {
		const findings = [
			finding("low", "low"),
			finding("medium", "medium"),
			finding("high", "high"),
			finding("critical", "critical"),
		];

		expect(selectFindingsForTable(findings, "high")).toEqual([
			findings[2],
			findings[3],
		]);
	});

	it("includes unknown findings regardless of the minimum severity", () => {
		const unknown = finding("unknown", "unknown");

		expect(selectFindingsForTable([finding("low", "low"), unknown], "critical")).toEqual([
			unknown,
		]);
	});

	it("returns an empty result for empty input", () => {
		expect(selectFindingsForTable([], "medium")).toEqual([]);
	});
});

describe("selectFindingsForCompact", () => {
	it("respects the urgent finding limit", () => {
		const findings = [
			finding("critical", "critical"),
			finding("high", "high"),
			finding("another-high", "high"),
			finding("medium", "medium"),
		];

		expect(selectFindingsForCompact(findings, { urgentLimit: 2 })).toEqual([
			findings[0],
			findings[1],
		]);
	});

	it("includes unknown direct findings even when the urgent limit is reached", () => {
		const unknownDirect = finding("unknown-direct", "unknown", "direct");

		expect(
			selectFindingsForCompact(
				[finding("critical", "critical"), unknownDirect],
				{ urgentLimit: 0 },
			),
		).toEqual([unknownDirect]);
	});

	it("does not include unknown transitive findings", () => {
		const unknownTransitive = finding("unknown-transitive", "unknown");

		expect(selectFindingsForCompact([unknownTransitive])).toEqual([]);
	});

	it("uses the default urgent limit of three", () => {
		const findings = [
			finding("critical-1", "critical"),
			finding("high-1", "high"),
			finding("critical-2", "critical"),
			finding("high-2", "high"),
		];

		expect(selectFindingsForCompact(findings)).toEqual([
			findings[0],
			findings[1],
			findings[2],
		]);
	});

	it("returns an empty result for empty input", () => {
		expect(selectFindingsForCompact([])).toEqual([]);
	});
});
