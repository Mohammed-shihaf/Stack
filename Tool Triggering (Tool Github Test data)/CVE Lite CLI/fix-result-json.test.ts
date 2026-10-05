import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type {
  FixResultJson as FixResultJsonType,
  writeFixResultJson as writeFixResultJsonType,
} from "../src/utils/fix-runner.js";

let writeFixResultJson: typeof writeFixResultJsonType;

beforeAll(async () => {
  const mod = await import("../src/utils/fix-runner.js");
  writeFixResultJson = mod.writeFixResultJson;
});

describe("writeFixResultJson", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "cve-lite-fix-test-"));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("writes cve-lite-fix-result.json to the project path", () => {
    const json: FixResultJsonType = {
      appliedFixCount: 1,
      findingsBeforeFix: 5,
      findingsAfterFix: 4,
      applied: [
        { package: "cross-spawn", from: "7.0.3", to: "7.0.5", advisories: ["GHSA-3xgq-729c-5sgq"] },
      ],
    };

    writeFixResultJson(json, tmpDir);

    const outPath = path.join(tmpDir, "cve-lite-fix-result.json");
    expect(fs.existsSync(outPath)).toBe(true);
  });

  it("writes valid JSON with correct shape", () => {
    const json: FixResultJsonType = {
      appliedFixCount: 2,
      findingsBeforeFix: 10,
      findingsAfterFix: 8,
      applied: [
        { package: "cross-spawn", from: "7.0.3", to: "7.0.5", advisories: ["GHSA-3xgq-729c-5sgq"] },
        { package: "undici", from: "5.26.3", to: "5.28.5", advisories: ["GHSA-xxxx", "CVE-2024-xxxx"] },
      ],
    };

    writeFixResultJson(json, tmpDir);

    const outPath = path.join(tmpDir, "cve-lite-fix-result.json");
    const parsed = JSON.parse(fs.readFileSync(outPath, "utf8"));
    expect(parsed.appliedFixCount).toBe(2);
    expect(parsed.findingsBeforeFix).toBe(10);
    expect(parsed.findingsAfterFix).toBe(8);
    expect(parsed.applied).toHaveLength(2);
    expect(parsed.applied[0].package).toBe("cross-spawn");
    expect(parsed.applied[0].from).toBe("7.0.3");
    expect(parsed.applied[0].to).toBe("7.0.5");
    expect(parsed.applied[0].advisories).toEqual(["GHSA-3xgq-729c-5sgq"]);
  });

  it("writes file when appliedFixCount is 0 (no fixes applied)", () => {
    const json: FixResultJsonType = {
      appliedFixCount: 0,
      findingsBeforeFix: 3,
      findingsAfterFix: 3,
      applied: [],
    };

    writeFixResultJson(json, tmpDir);

    const outPath = path.join(tmpDir, "cve-lite-fix-result.json");
    expect(fs.existsSync(outPath)).toBe(true);
    const parsed = JSON.parse(fs.readFileSync(outPath, "utf8"));
    expect(parsed.appliedFixCount).toBe(0);
    expect(parsed.applied).toEqual([]);
  });

  it("overwrites existing file on repeated calls", () => {
    const first: FixResultJsonType = {
      appliedFixCount: 1,
      findingsBeforeFix: 5,
      findingsAfterFix: 4,
      applied: [{ package: "pkg-a", from: "1.0.0", to: "1.0.1", advisories: [] }],
    };
    const second: FixResultJsonType = {
      appliedFixCount: 2,
      findingsBeforeFix: 5,
      findingsAfterFix: 3,
      applied: [
        { package: "pkg-a", from: "1.0.0", to: "1.0.1", advisories: [] },
        { package: "pkg-b", from: "2.0.0", to: "2.0.2", advisories: ["GHSA-yyyy"] },
      ],
    };

    writeFixResultJson(first, tmpDir);
    writeFixResultJson(second, tmpDir);

    const parsed = JSON.parse(
      fs.readFileSync(path.join(tmpDir, "cve-lite-fix-result.json"), "utf8"),
    );
    expect(parsed.appliedFixCount).toBe(2);
    expect(parsed.applied).toHaveLength(2);
  });
});
