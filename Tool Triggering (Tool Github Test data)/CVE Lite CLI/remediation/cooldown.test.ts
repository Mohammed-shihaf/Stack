import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { readConfiguredCooldown, cooldownWarningFor } from "../../src/remediation/cooldown.js";

function tmpProject(files: Record<string, string>): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cooldown-"));
  for (const [rel, content] of Object.entries(files)) {
    fs.writeFileSync(path.join(dir, rel), content);
  }
  return dir;
}

describe("readConfiguredCooldown", () => {
  it("reads npm min-release-age from .npmrc (days -> ms) and reports source + label", () => {
    const dir = tmpProject({ ".npmrc": "min-release-age=7\n" });
    expect(readConfiguredCooldown(dir, "npm")).toEqual({
      windowMs: 7 * 86_400_000,
      windowLabel: "7 day",
      sourceFile: ".npmrc",
    });
  });

  it("reads pnpm minimumReleaseAge from pnpm-workspace.yaml (minutes -> ms)", () => {
    const dir = tmpProject({ "pnpm-workspace.yaml": "minimumReleaseAge: 1440\n" });
    expect(readConfiguredCooldown(dir, "pnpm")).toEqual({
      windowMs: 1440 * 60_000,
      windowLabel: "1440 min",
      sourceFile: "pnpm-workspace.yaml",
    });
  });

  it("reads yarn npmMinimalAgeGate from .yarnrc.yml (minutes -> ms)", () => {
    const dir = tmpProject({ ".yarnrc.yml": "npmMinimalAgeGate: 4320\n" });
    expect(readConfiguredCooldown(dir, "yarn")).toEqual({
      windowMs: 4320 * 60_000,
      windowLabel: "4320 min",
      sourceFile: ".yarnrc.yml",
    });
  });

  it("returns null when the value is 0 (cooldown disabled)", () => {
    const dir = tmpProject({ ".npmrc": "min-release-age=0\n" });
    expect(readConfiguredCooldown(dir, "npm")).toBeNull();
  });

  it("returns null when the key is absent", () => {
    const dir = tmpProject({ ".npmrc": "registry=https://example.com\n" });
    expect(readConfiguredCooldown(dir, "npm")).toBeNull();
  });

  it("returns null when the config file is missing", () => {
    const dir = tmpProject({});
    expect(readConfiguredCooldown(dir, "npm")).toBeNull();
  });

  it("returns null on a malformed value rather than throwing", () => {
    const dir = tmpProject({ "pnpm-workspace.yaml": "minimumReleaseAge: not-a-number\n" });
    expect(readConfiguredCooldown(dir, "pnpm")).toBeNull();
  });

  it("does not read a different PM's file", () => {
    const dir = tmpProject({ ".npmrc": "min-release-age=7\n" });
    expect(readConfiguredCooldown(dir, "pnpm")).toBeNull();
  });
});

describe("cooldownWarningFor", () => {
  const cooldown = { windowMs: 24 * 60 * 60_000, windowLabel: "1440 min", sourceFile: "pnpm-workspace.yaml" };
  const now = Date.parse("2026-07-20T12:00:00Z");

  it("warns when the fix was published inside the window", () => {
    const publishedAt = "2026-07-20T06:00:00Z"; // 6h ago, window 24h
    expect(cooldownWarningFor(publishedAt, cooldown, now)).toEqual({
      publishedAt,
      windowLabel: "1440 min",
      sourceFile: "pnpm-workspace.yaml",
    });
  });

  it("does not warn when the fix is older than the window", () => {
    expect(cooldownWarningFor("2026-07-18T00:00:00Z", cooldown, now)).toBeNull();
  });

  it("does not warn exactly at the boundary (age == window is outside)", () => {
    const publishedAt = new Date(now - cooldown.windowMs).toISOString();
    expect(cooldownWarningFor(publishedAt, cooldown, now)).toBeNull();
  });

  it("returns null when there is no cooldown configured", () => {
    expect(cooldownWarningFor("2026-07-20T06:00:00Z", null, now)).toBeNull();
  });

  it("returns null when publishedAt is null/undefined (offline)", () => {
    expect(cooldownWarningFor(null, cooldown, now)).toBeNull();
    expect(cooldownWarningFor(undefined, cooldown, now)).toBeNull();
  });

  it("returns null when publishedAt is unparseable", () => {
    expect(cooldownWarningFor("not-a-date", cooldown, now)).toBeNull();
  });
});
