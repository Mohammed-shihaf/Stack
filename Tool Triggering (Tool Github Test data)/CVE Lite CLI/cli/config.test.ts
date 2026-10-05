import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  getConfigDir,
  getConfigPath,
  validateCaCertFile,
} from "../../src/cli/config.js";

function createTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "cve-lite-config-test-"));
}

function removeDir(dirPath: string) {
  fs.rmSync(dirPath, { recursive: true, force: true });
}

describe("CLI config paths", () => {
  it("getConfigDir ends with .cve-lite-cli", () => {
    const dir = getConfigDir();
    expect(path.basename(dir)).toBe(".cve-lite-cli");
    expect(dir.endsWith(path.join(".cve-lite-cli"))).toBe(true);
  });

  it("getConfigPath ends with .cve-lite-cli/config.json", () => {
    const configPath = getConfigPath();
    expect(path.basename(configPath)).toBe("config.json");
    expect(configPath.endsWith(path.join(".cve-lite-cli", "config.json"))).toBe(
      true,
    );
    // getConfigPath must live inside getConfigDir
    expect(path.dirname(configPath)).toBe(getConfigDir());
  });
});

describe("validateCaCertFile", () => {
  it("throws 'cannot read file' for a missing path", () => {
    const dir = createTempDir();
    try {
      const missing = path.join(dir, "does-not-exist.pem");
      expect(() => validateCaCertFile(missing)).toThrow(/cannot read file/);
    } finally {
      removeDir(dir);
    }
  });

  it("throws 'not a file' for a directory", () => {
    const dir = createTempDir();
    try {
      expect(() => validateCaCertFile(dir)).toThrow(/not a file/);
    } finally {
      removeDir(dir);
    }
  });

  it("throws 'file is empty' for an empty file", () => {
    const dir = createTempDir();
    try {
      const empty = path.join(dir, "empty.pem");
      fs.writeFileSync(empty, "", "utf8");
      expect(() => validateCaCertFile(empty)).toThrow(/file is empty/);
    } finally {
      removeDir(dir);
    }
  });

  it("throws 'file is empty' for a whitespace-only file", () => {
    const dir = createTempDir();
    try {
      const blank = path.join(dir, "blank.pem");
      fs.writeFileSync(blank, "   \n\t  \n", "utf8");
      expect(() => validateCaCertFile(blank)).toThrow(/file is empty/);
    } finally {
      removeDir(dir);
    }
  });

  it("throws 'not a valid PEM certificate' for a non-PEM file", () => {
    const dir = createTempDir();
    try {
      const notPem = path.join(dir, "notpem.txt");
      fs.writeFileSync(notPem, "hello world, not a certificate\n", "utf8");
      expect(() => validateCaCertFile(notPem)).toThrow(
        /not a valid PEM certificate/,
      );
    } finally {
      removeDir(dir);
    }
  });

  it("does not throw for a file starting with -----BEGIN CERTIFICATE-----", () => {
    const dir = createTempDir();
    try {
      const pem = path.join(dir, "cert.pem");
      fs.writeFileSync(
        pem,
        "-----BEGIN CERTIFICATE-----\nMIIB...fake-but-valid-shape...\n-----END CERTIFICATE-----\n",
        "utf8",
      );
      expect(() => validateCaCertFile(pem)).not.toThrow();
    } finally {
      removeDir(dir);
    }
  });

  it("does not throw when leading whitespace precedes the PEM header", () => {
    const dir = createTempDir();
    try {
      const pem = path.join(dir, "leading-space.pem");
      fs.writeFileSync(
        pem,
        "\n  -----BEGIN CERTIFICATE-----\nMIIB...\n-----END CERTIFICATE-----\n",
        "utf8",
      );
      expect(() => validateCaCertFile(pem)).not.toThrow();
    } finally {
      removeDir(dir);
    }
  });
});
