import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("GitHub Action contract", () => {
  let actionDefinition: string;

  beforeAll(() => {
    actionDefinition = readFileSync(resolve(process.cwd(), "action.yml"), "utf8");
  });

  it("includes check-maintenance input and wires it to cve-lite command args", () => {
    expect(actionDefinition.indexOf("check-maintenance:")).toBeGreaterThan(-1);
    expect(actionDefinition.indexOf("INPUT_CHECK_MAINTENANCE")).toBeGreaterThan(-1);
    expect(actionDefinition.indexOf('args+=("--check-maintenance")')).toBeGreaterThan(-1);
  });

  it("includes check-licenses input and wires it to cve-lite command args", () => {
    expect(actionDefinition.indexOf("check-licenses:")).toBeGreaterThan(-1);
    expect(actionDefinition.indexOf("INPUT_CHECK_LICENSES")).toBeGreaterThan(-1);
    expect(actionDefinition.indexOf('args+=("--check-licenses")')).toBeGreaterThan(-1);
  });

  it("includes output input and wires it to cve-lite command args only when sarif or cdx is enabled", () => {
    expect(actionDefinition.indexOf("\n  output:")).toBeGreaterThan(-1);
    expect(actionDefinition.indexOf("INPUT_OUTPUT: ${{ inputs.output }}")).toBeGreaterThan(-1);
    expect(
      actionDefinition.indexOf('if [[ -n "${INPUT_OUTPUT}" && ( "${INPUT_SARIF}" == "true" || "${INPUT_CDX}" == "true" ) ]]'),
    ).toBeGreaterThan(-1);
    expect(actionDefinition.indexOf('args+=("--output" "${INPUT_OUTPUT}")')).toBeGreaterThan(-1);
  });
});
