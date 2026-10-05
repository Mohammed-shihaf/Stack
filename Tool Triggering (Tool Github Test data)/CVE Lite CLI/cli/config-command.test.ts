import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { jest } from "@jest/globals";
import { runConfigCommand } from "../../src/cli/config-command.js";
import {
  ConfigAction,
  ConfigKey,
  getConfigPath,
  readConfig,
} from "../../src/cli/config.js";

function createTempHome(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "cve-lite-config-cmd-"));
}

function removeDir(dirPath: string) {
  fs.rmSync(dirPath, { recursive: true, force: true });
}

function writePem(dir: string, name = "cert.pem"): string {
  const pem = path.join(dir, name);
  fs.writeFileSync(
    pem,
    "-----BEGIN CERTIFICATE-----\nMIIB...fake-but-valid-shape...\n-----END CERTIFICATE-----\n",
    "utf8",
  );
  return pem;
}

describe("runConfigCommand", () => {
  let home: string;
  let homedirSpy: jest.SpiedFunction<typeof os.homedir>;
  let logSpy: jest.SpiedFunction<typeof console.log>;
  let logged: string[];

  beforeEach(() => {
    home = createTempHome();
    homedirSpy = jest.spyOn(os, "homedir").mockReturnValue(home);
    logged = [];
    logSpy = jest
      .spyOn(console, "log")
      .mockImplementation((...args: unknown[]) => {
        logged.push(args.map(String).join(" "));
      });
  });

  afterEach(() => {
    logSpy.mockRestore();
    homedirSpy.mockRestore();
    removeDir(home);
  });

  it("show prints 'No configuration set.' and the config path when nothing is set", () => {
    runConfigCommand({ action: ConfigAction.Show });
    const output = logged.join("\n");
    expect(output).toMatch(/No configuration set\./);
    expect(output).toContain(getConfigPath());
  });

  it("show prints the ca-cert key and value when configured", () => {
    const pem = writePem(home);
    runConfigCommand({
      action: ConfigAction.Set,
      key: ConfigKey.CaCert,
      value: pem,
    });
    logged = [];

    runConfigCommand({ action: ConfigAction.Show });
    const output = logged.join("\n");
    expect(output).toContain(ConfigKey.CaCert);
    expect(output).toContain(pem);
    expect(output).not.toMatch(/No configuration set\./);
  });

  it("set with a valid certificate path stores it", () => {
    const pem = writePem(home);
    runConfigCommand({
      action: ConfigAction.Set,
      key: ConfigKey.CaCert,
      value: pem,
    });
    expect(readConfig().caCert).toBe(pem);
    expect(logged.join("\n")).toMatch(/Saved/);
  });

  it("set with an invalid path surfaces the validation error", () => {
    const missing = path.join(home, "does-not-exist.pem");
    expect(() =>
      runConfigCommand({
        action: ConfigAction.Set,
        key: ConfigKey.CaCert,
        value: missing,
      }),
    ).toThrow(/cannot read file/);
    expect(readConfig().caCert).toBeUndefined();
  });

  it("unset removes a previously stored value", () => {
    const pem = writePem(home);
    runConfigCommand({
      action: ConfigAction.Set,
      key: ConfigKey.CaCert,
      value: pem,
    });
    expect(readConfig().caCert).toBe(pem);
    logged = [];

    runConfigCommand({ action: ConfigAction.Unset, key: ConfigKey.CaCert });
    expect(readConfig().caCert).toBeUndefined();
    expect(logged.join("\n")).toMatch(/Removed/);
  });

  it("unset when nothing is set reports it is not set", () => {
    runConfigCommand({ action: ConfigAction.Unset, key: ConfigKey.CaCert });
    expect(logged.join("\n")).toMatch(/is not set\./);
  });
});
