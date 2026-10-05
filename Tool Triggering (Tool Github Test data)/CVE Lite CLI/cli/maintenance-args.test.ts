import { parseArgs } from "../../src/cli/args.js";

describe("parseArgs - --check-maintenance", () => {
  it("parses --check-maintenance on the scan path", () => {
    const { command, options } = parseArgs([".", "--check-maintenance"]);
    expect(command).toBe("scan");
    expect(options.checkMaintenance).toBe(true);
  });

  it("defaults checkMaintenance to falsy when not passed", () => {
    const { options } = parseArgs(["."]);
    expect(options.checkMaintenance).toBeFalsy();
  });

  it("parses --check-maintenance combined with --check-overrides and --fail-on", () => {
    const { options } = parseArgs([".", "--check-maintenance", "--check-overrides", "--fail-on", "high"]);
    expect(options.checkMaintenance).toBe(true);
    expect(options.checkOverrides).toBe(true);
    expect(options.failOn).toBe("high");
  });
});
