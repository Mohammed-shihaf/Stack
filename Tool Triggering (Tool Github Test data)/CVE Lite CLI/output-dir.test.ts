import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { resolveOutputDir, displayOutputPath } from "../src/output/output-dir.js";
import { writeSarifReport } from "../src/output/sarif.js";
import { writeSbomFile } from "../src/output/sbom-file.js";

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "cve-lite-output-dir-"));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe("resolveOutputDir", () => {
  it("returns the working directory when no --output is set", () => {
    expect(resolveOutputDir(undefined)).toBe(process.cwd());
  });

  it("resolves a relative --output against the working directory and creates it", () => {
    const nested = path.join(tmpDir, "a", "b");
    const resolved = resolveOutputDir(path.relative(process.cwd(), nested));
    expect(resolved).toBe(nested);
    expect(fs.statSync(nested).isDirectory()).toBe(true);
  });

  it("throws a descriptive error when the directory cannot be created", () => {
    const blocker = path.join(tmpDir, "file");
    fs.writeFileSync(blocker, "not a directory");
    expect(() => resolveOutputDir(path.join(blocker, "child"))).toThrow(/Failed to create output directory/);
  });
});

describe("displayOutputPath", () => {
  it("is relative for a file under the working directory", () => {
    const target = path.join(process.cwd(), "reports", "cve-lite-scan-x.sarif");
    expect(displayOutputPath(target)).toBe(path.join("reports", "cve-lite-scan-x.sarif"));
  });

  it("is absolute for a file outside the working directory", () => {
    const target = path.join(tmpDir, "cve-lite-scan-x.sarif");
    expect(displayOutputPath(target)).toBe(target);
  });
});

describe("report writers with an output directory", () => {
  it("writeSarifReport writes into the directory and returns the printed path", () => {
    const returned = writeSarifReport([], "package-lock.json", null, undefined, undefined, undefined, tmpDir);
    const [written] = fs.readdirSync(tmpDir);
    expect(written).toMatch(/^cve-lite-scan-.*\.sarif$/);
    expect(returned).toBe(path.join(tmpDir, written));
    expect(JSON.parse(fs.readFileSync(path.join(tmpDir, written), "utf8")).version).toBe("2.1.0");
  });

  it("writeSbomFile writes into the directory and returns the printed path", () => {
    const target = path.join(tmpDir, "cve-lite-scan-test.cdx.json");
    const returned = writeSbomFile("cve-lite-scan-test.cdx.json", { bomFormat: "CycloneDX" }, "CycloneDX report", tmpDir);
    expect(returned).toBe(target);
    expect(JSON.parse(fs.readFileSync(target, "utf8"))).toEqual({ bomFormat: "CycloneDX" });
  });
});
