import { sarifFingerprintHash } from "../../src/utils/sarif.js";

describe("sarifFingerprintHash", () => {
  it("returns a 16-character hexadecimal string", () => {
    const hash = sarifFingerprintHash("example-key");

    expect(hash).toHaveLength(16);
    expect(hash).toMatch(/^[0-9a-f]{16}$/);
  });

  it("is deterministic for the same input", () => {
    const input = "dependency-path:alpha@1.2.3";
    const firstHash = sarifFingerprintHash(input);
    const secondHash = sarifFingerprintHash(input);

    expect(firstHash).toBe(secondHash);
  });

  it("produces different outputs for different inputs", () => {
    const alphaHash = sarifFingerprintHash("alpha");
    const betaHash = sarifFingerprintHash("beta");
    const alphaVersionHash = sarifFingerprintHash("alpha@2");

    expect(alphaHash).not.toBe(betaHash);
    expect(alphaHash).not.toBe(alphaVersionHash);
  });
});
