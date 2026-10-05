import { parseArgs } from "../../src/cli/args.js";

describe("parseArgs - --sbom", () => {
  it("parses --sbom cyclonedx", () => {
    const { options } = parseArgs([".", "--sbom", "cyclonedx"]);
    expect(options.sbom).toBe("cyclonedx");
  });

  it("parses --sbom spdx", () => {
    const { options } = parseArgs([".", "--sbom", "spdx"]);
    expect(options.sbom).toBe("spdx");
  });

  it("accepts the --sbom=<format> form", () => {
    const { options } = parseArgs([".", "--sbom=spdx"]);
    expect(options.sbom).toBe("spdx");
  });

  it("treats spdx2.3 as an explicit alias for spdx", () => {
    const { options } = parseArgs([".", "--sbom", "spdx2.3"]);
    expect(options.sbom).toBe("spdx");
  });

  it("rejects an unknown format and names the valid ones", () => {
    expect(() => parseArgs([".", "--sbom", "spdx9"])).toThrow(/cyclonedx/);
    expect(() => parseArgs([".", "--sbom", "spdx9"])).toThrow(/spdx/);
  });

  it("rejects --sbom with no value", () => {
    expect(() => parseArgs([".", "--sbom"])).toThrow(/--sbom/);
  });

  it("keeps --cdx working as an alias for --sbom cyclonedx", () => {
    const { options } = parseArgs([".", "--cdx"]);
    expect(options.sbom).toBe("cyclonedx");
    expect(options.cdx).toBe(true);
  });

  it("rejects combining --sbom with --report", () => {
    expect(() => parseArgs([".", "--sbom", "spdx", "--report"])).toThrow(/--report/);
  });

  it("still rejects combining --cdx with --report", () => {
    expect(() => parseArgs([".", "--cdx", "--report"])).toThrow(/--report/);
  });
});

describe("parseArgs - --sbom-inventory-only", () => {
  it("parses alongside --sbom", () => {
    const { options } = parseArgs([".", "--sbom", "spdx", "--sbom-inventory-only"]);
    expect(options.sbomInventoryOnly).toBe(true);
  });

  it("rejects being used without --sbom", () => {
    expect(() => parseArgs([".", "--sbom-inventory-only"])).toThrow(/--sbom/);
  });
});
