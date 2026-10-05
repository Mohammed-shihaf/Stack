import { loadLogoDataUri } from "../../src/output/logos.js";

describe("loadLogoDataUri", () => {
  it("returns a PNG data URI for cve-lite logo", () => {
    const uri = loadLogoDataUri("cve-lite");
    expect(uri).toMatch(/^data:image\/png;base64,/);
    const decoded = Buffer.from(uri.split(",")[1]!, "base64");
    expect(decoded.length).toBeGreaterThan(1000);
  });

  it("returns a PNG data URI for owasp logo", () => {
    const uri = loadLogoDataUri("owasp");
    expect(uri).toMatch(/^data:image\/png;base64,/);
    const decoded = Buffer.from(uri.split(",")[1]!, "base64");
    expect(decoded.length).toBeGreaterThan(1000);
  });

  it("caches results across calls", () => {
    expect(loadLogoDataUri("cve-lite")).toBe(loadLogoDataUri("cve-lite"));
    expect(loadLogoDataUri("owasp")).toBe(loadLogoDataUri("owasp"));
  });
});
