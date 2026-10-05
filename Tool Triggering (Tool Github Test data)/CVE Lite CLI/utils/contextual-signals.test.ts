import {
  computeContextualSignals,
  formatContextualSignalValues,
  formatContextualSignalsLine,
  matchRequestFacingMarkers,
  packageNameMatchesExposureMarker,
} from "../../src/utils/contextual-signals.js";
import type { Finding } from "../../src/types.js";

function makeFinding(overrides: Partial<Finding> = {}): Finding {
  return {
    pkg: { name: "lodash", version: "4.17.20", ecosystem: "npm" },
    vulnerabilities: [],
    severity: "high",
    cveAliases: [],
    dependencyPaths: [["project", "app", "lodash"]],
    relationship: "transitive",
    firstFixedVersion: null,
    ...overrides,
  };
}

function expectHeuristic(signal: { heuristic: true; basis: string; value: string | null } | null) {
  expect(signal).not.toBeNull();
  expect(signal!.heuristic).toBe(true);
  expect(signal!.basis.toLowerCase()).toMatch(/heuristic|prioritization/);
}

describe("computeContextualSignals - usage", () => {
  it("is null when usage was not run", () => {
    const signals = computeContextualSignals(makeFinding());
    expect(signals.usage).toBeNull();
  });

  it("returns imported when the usage scan found files", () => {
    const signals = computeContextualSignals(makeFinding({
      usage: { imported: true, files: ["src/index.ts", "src/util.ts"] },
    }));
    expectHeuristic(signals.usage);
    expect(signals.usage!.value).toBe("imported");
    expect(signals.usage!.basis).toMatch(/2 files/);
    expect(signals.usage!.basis).not.toMatch(/exploitable/i);
  });

  it("returns not_imported when the usage scan found no references", () => {
    const signals = computeContextualSignals(makeFinding({
      usage: { imported: false, files: [] },
    }));
    expectHeuristic(signals.usage);
    expect(signals.usage!.value).toBe("not_imported");
    expect(signals.usage!.basis.toLowerCase()).toMatch(/not proof of non-exploitability/);
  });
});

describe("computeContextualSignals - reachabilityHint", () => {
  it("returns direct_dependency for a direct relationship", () => {
    const signals = computeContextualSignals(makeFinding({
      relationship: "direct",
      dependencyPaths: [["project", "lodash"]],
    }));
    expectHeuristic(signals.reachabilityHint);
    expect(signals.reachabilityHint!.value).toBe("direct_dependency");
    expect(signals.reachabilityHint!.basis.toLowerCase()).toMatch(/not a runtime reachability proof/);
  });

  it("returns path_depth_N when usage was not run and lockfile depth is known", () => {
    const signals = computeContextualSignals(makeFinding({
      relationship: "transitive",
      dependencyPaths: [["project", "app", "lodash"]],
    }));
    expectHeuristic(signals.reachabilityHint);
    expect(signals.reachabilityHint!.value).toBe("path_depth_2");
    expect(signals.reachabilityHint!.basis).toMatch(/depth 2/);
  });

  it("returns transitive_imported when a transitive package appears in the import scan", () => {
    const signals = computeContextualSignals(makeFinding({
      relationship: "transitive",
      usage: { imported: true, files: ["src/index.ts"] },
    }));
    expectHeuristic(signals.reachabilityHint);
    expect(signals.reachabilityHint!.value).toBe("transitive_imported");
    expect(signals.reachabilityHint!.basis.toLowerCase()).toMatch(/import\/require scan/);
    expect(signals.reachabilityHint!.basis.toLowerCase()).not.toMatch(/imported root/);
  });

  it("returns path_depth_N (not transitive_imported) when usage ran but found no imports", () => {
    const signals = computeContextualSignals(makeFinding({
      relationship: "transitive",
      usage: { imported: false, files: [] },
    }));
    expect(signals.reachabilityHint!.value).toBe("path_depth_2");
  });

  it("returns unknown when the relationship could not be classified", () => {
    const signals = computeContextualSignals(makeFinding({
      relationship: "unknown",
      dependencyPaths: [],
    }));
    expectHeuristic(signals.reachabilityHint);
    expect(signals.reachabilityHint!.value).toBe("unknown");
  });

  it("omits reachabilityHint when transitive path depth is unknown", () => {
    const signals = computeContextualSignals(makeFinding({
      relationship: "transitive",
      dependencyPaths: [],
    }));
    expect(signals.reachabilityHint).toBeNull();
  });
});

describe("computeContextualSignals - exposure", () => {
  it("returns request_facing_path when a path package matches express", () => {
    const signals = computeContextualSignals(makeFinding({
      pkg: { name: "body-parser", version: "1.0.0", ecosystem: "npm" },
      dependencyPaths: [["project", "express", "body-parser"]],
    }));
    expectHeuristic(signals.exposure);
    expect(signals.exposure!.value).toBe("request_facing_path");
    expect(signals.exposure!.basis).toMatch(/express/);
    expect(signals.exposure!.basis.toLowerCase()).toMatch(/path-name indicator/);
  });

  it("returns request_facing_path when the finding package itself is a marker", () => {
    const signals = computeContextualSignals(makeFinding({
      pkg: { name: "express", version: "4.18.2", ecosystem: "npm" },
      relationship: "direct",
      dependencyPaths: [["project", "express"]],
    }));
    expect(signals.exposure!.value).toBe("request_facing_path");
  });

  it("returns not_indicated on a clean path with no request-facing markers", () => {
    const signals = computeContextualSignals(makeFinding({
      pkg: { name: "lodash", version: "4.17.20", ecosystem: "npm" },
      dependencyPaths: [["project", "app", "lodash"]],
    }));
    expectHeuristic(signals.exposure);
    expect(signals.exposure!.value).toBe("not_indicated");
    expect(signals.exposure!.basis.toLowerCase()).toMatch(/does not mean the package is not exposed/);
  });

  it("returns null when there are no package names to inspect", () => {
    const signals = computeContextualSignals(makeFinding({
      pkg: { name: "", version: "1.0.0", ecosystem: "npm" },
      dependencyPaths: [],
    }));
    expect(signals.exposure).toBeNull();
  });
});

describe("packageNameMatchesExposureMarker", () => {
  it("matches distinctive stacks in exact, hyphenated, and scoped forms", () => {
    expect(packageNameMatchesExposureMarker("express", "express")).toBe(true);
    expect(packageNameMatchesExposureMarker("express-session", "express")).toBe(true);
    expect(packageNameMatchesExposureMarker("@nestjs/core", "@nestjs/")).toBe(true);
    expect(packageNameMatchesExposureMarker("@nestjs/platform-express", "express")).toBe(true);
    expect(packageNameMatchesExposureMarker("fastify", "fastify")).toBe(true);
    expect(packageNameMatchesExposureMarker("koa-router", "koa-router")).toBe(true);
  });

  it("does not hyphen-match short/generic markers", () => {
    expect(packageNameMatchesExposureMarker("https-proxy-agent", "https")).toBe(false);
    expect(packageNameMatchesExposureMarker("https-proxy-agent", "http")).toBe(false);
    expect(packageNameMatchesExposureMarker("next-tick", "next")).toBe(false);
    expect(packageNameMatchesExposureMarker("react-router-dom", "router")).toBe(false);
    expect(packageNameMatchesExposureMarker("reconnect", "connect")).toBe(false);
    expect(packageNameMatchesExposureMarker("codegen", "next")).toBe(false);
  });

  it("matches short/generic markers by exact name or applicable scoped prefix", () => {
    expect(packageNameMatchesExposureMarker("http", "http")).toBe(true);
    expect(packageNameMatchesExposureMarker("https", "https")).toBe(true);
    expect(packageNameMatchesExposureMarker("next", "next")).toBe(true);
    expect(packageNameMatchesExposureMarker("@next/swc", "next")).toBe(true);
    expect(packageNameMatchesExposureMarker("router", "router")).toBe(true);
    expect(packageNameMatchesExposureMarker("connect", "connect")).toBe(true);
    expect(packageNameMatchesExposureMarker("koa", "koa")).toBe(true);
    expect(packageNameMatchesExposureMarker("@koa/cors", "koa")).toBe(true);
  });
});

describe("matchRequestFacingMarkers", () => {
  it("returns distinctive markers found in a path", () => {
    expect(matchRequestFacingMarkers(["app", "fastify", "lodash"])).toEqual(["fastify"]);
    expect(matchRequestFacingMarkers(["project", "express", "body-parser"])).toEqual(["express"]);
  });

  it("returns an empty list when nothing matches", () => {
    expect(matchRequestFacingMarkers(["app", "lodash"])).toEqual([]);
    expect(matchRequestFacingMarkers(["https-proxy-agent", "next-tick", "react-router-dom"])).toEqual([]);
  });
});

describe("formatContextualSignalsLine", () => {
  it("omits usage when --usage was not run and uses path depth for reachability", () => {
    const signals = computeContextualSignals(makeFinding());
    const line = formatContextualSignalsLine(signals);
    expect(line).toBe("Prioritization signals (heuristic): reachability=path_depth_2; exposure=not_indicated");
    expect(line).not.toMatch(/usage=/);
    expect(line.toLowerCase()).not.toMatch(/exploitable|reachable at runtime|safe because unused/);
    expect(formatContextualSignalValues(signals)).toBe("reachability=path_depth_2; exposure=not_indicated");
  });

  it("includes machine values when all three signals are present", () => {
    const signals = computeContextualSignals(makeFinding({
      relationship: "direct",
      pkg: { name: "express", version: "4.18.2", ecosystem: "npm" },
      dependencyPaths: [["project", "express"]],
      usage: { imported: true, files: ["src/server.ts"] },
    }));
    expect(formatContextualSignalValues(signals)).toBe(
      "usage=imported; reachability=direct_dependency; exposure=request_facing_path",
    );
  });
});

describe("computeContextualSignals - language", () => {
  it("never claims exploitability, runtime reachability, or safety from non-use", () => {
    const cases: Finding[] = [
      makeFinding(),
      makeFinding({ usage: { imported: false, files: [] } }),
      makeFinding({ relationship: "direct", dependencyPaths: [["project", "lodash"]] }),
      makeFinding({
        pkg: { name: "express", version: "4.18.2", ecosystem: "npm" },
        dependencyPaths: [["project", "express"]],
      }),
    ];
    for (const finding of cases) {
      const blob = JSON.stringify(computeContextualSignals(finding)).toLowerCase();
      expect(blob).not.toMatch(/exploitable/);
      expect(blob).not.toMatch(/reachable at runtime/);
      expect(blob).not.toMatch(/safe because unused/);
    }
  });
});
