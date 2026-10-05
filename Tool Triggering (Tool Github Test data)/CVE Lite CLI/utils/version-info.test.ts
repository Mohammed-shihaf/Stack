import { jest } from "@jest/globals";
import fs from "node:fs";

const readFileSyncMock = jest.fn<any>(fs.readFileSync);

jest.unstable_mockModule("node:fs", () => ({
  default: {
    readFileSync: readFileSyncMock,
  },
  readFileSync: readFileSyncMock,
}));

let getCliVersion: () => string;

beforeAll(async () => {
  const mod = await import("../../src/utils/version-info.js");
  getCliVersion = mod.getCliVersion;
});

beforeEach(() => {
  readFileSyncMock.mockImplementation(fs.readFileSync);
});

describe("getCliVersion", () => {
  it("returns the semver version from package.json", () => {
    const packageJsonPath = new URL("../../package.json", import.meta.url);
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8")) as { version: string };

    const version = getCliVersion();

    expect(version).toBe(packageJson.version);
    expect(version).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it("returns 0.0.0 when package.json cannot be read", () => {
    readFileSyncMock.mockImplementationOnce(() => {
      throw new Error("package.json is unavailable");
    });

    expect(getCliVersion()).toBe("0.0.0");
  });
});
