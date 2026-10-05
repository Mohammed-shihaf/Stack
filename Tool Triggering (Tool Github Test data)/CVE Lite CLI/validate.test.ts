import dns from "node:dns";
import { validateOptions } from "../src/cli/validate.js";
import type { ParsedOptions } from "../src/types.js";

function opts(overrides: Partial<ParsedOptions> = {}): ParsedOptions {
  return { failOn: "none", batchSize: "50", ...overrides };
}

describe("validateOptions", () => {
  describe("--offline / --offline-db with --osv-url", () => {
    const expectedMessage =
      "--offline/--offline-db cannot be used with --osv-url. Choose offline mode (local DB) or online mode (custom OSV endpoint), not both.";

    it("throws when --offline and --osv-url are combined", async () => {
      await expect(validateOptions(opts({ offline: true, osvUrl: "https://api.osv.dev" }))).rejects.toThrow(
        expectedMessage,
      );
    });

    it("throws when --offline-db and --osv-url are combined", async () => {
      await expect(
        validateOptions(opts({ offlineDb: "/path/to/db", osvUrl: "https://api.osv.dev" })),
      ).rejects.toThrow(expectedMessage);
    });

    it("does not throw when --offline is used without --osv-url", async () => {
      await expect(validateOptions(opts({ offline: true }))).resolves.toBeUndefined();
    });
  });

  describe("--no-cache with --offline / --offline-db", () => {
    const expectedMessage =
      "--no-cache cannot be used with --offline or --offline-db. Offline mode uses the local advisory DB directly; --no-cache only applies to online scans.";

    it("throws when --no-cache and --offline are combined", async () => {
      await expect(validateOptions(opts({ noCache: true, offline: true }))).rejects.toThrow(expectedMessage);
    });

    it("throws when --no-cache and --offline-db are combined", async () => {
      await expect(validateOptions(opts({ noCache: true, offlineDb: "/path/to/db" }))).rejects.toThrow(
        expectedMessage,
      );
    });

    it("does not throw when --no-cache is used without offline flags", async () => {
      await expect(validateOptions(opts({ noCache: true }))).resolves.toBeUndefined();
    });
  });

  describe("--osv-url validation", () => {
    it("throws when --osv-url is not a valid URL", async () => {
      await expect(validateOptions(opts({ osvUrl: "not-a-url" }))).rejects.toThrow(
        "Invalid value for --osv-url: not-a-url",
      );
    });

    it("does not throw when --osv-url is official OSV URL", async () => {
      await expect(validateOptions(opts({ osvUrl: "https://api.osv.dev" }))).resolves.toBeUndefined();
    });

    it("rejects non-HTTPS --osv-url", async () => {
      await expect(validateOptions(opts({ osvUrl: "http://api.osv.dev" }))).rejects.toThrow(
        "--osv-url requires https:// scheme",
      );
    });

    it("throws when --allow-private-osv-url is used without --osv-url", async () => {
      await expect(validateOptions(opts({ allowPrivateOsvUrl: true }))).rejects.toThrow(
        "--allow-private-osv-url requires --osv-url. Provide a custom OSV endpoint with --osv-url, or remove --allow-private-osv-url.",
      );
    });
  });

  describe("--fix with --json", () => {
    it("throws when --fix and --json are combined", async () => {
      await expect(validateOptions(opts({ fix: true, json: true }))).rejects.toThrow(
        "--fix cannot be used with --json. Use --fix to apply validated fixes and rescan, or --json to save scan results as JSON, not both.",
      );
    });

    it("does not throw when --fix is used without --json", async () => {
      await expect(validateOptions(opts({ fix: true }))).resolves.toBeUndefined();
    });
  });

  describe("--fix with --sarif / --cdx", () => {
    it("throws when --fix and --sarif are combined", async () => {
      await expect(validateOptions(opts({ fix: true, sarif: true }))).rejects.toThrow(
        "--fix cannot be used with --sarif. Use --fix to apply validated fixes and rescan, or --sarif to save scan results as SARIF, not both.",
      );
    });

    it("throws when --fix and --cdx are combined", async () => {
      await expect(validateOptions(opts({ fix: true, cdx: true }))).rejects.toThrow(
        "--fix cannot be used with --cdx. Use --fix to apply validated fixes and rescan, or --cdx to save a CycloneDX SBOM, not both.",
      );
    });

    it("does not throw when --sarif is used without --fix", async () => {
      await expect(validateOptions(opts({ sarif: true }))).resolves.toBeUndefined();
    });

    it("throws when --fix and --sbom are combined", async () => {
      await expect(validateOptions(opts({ fix: true, sbom: "spdx" }))).rejects.toThrow(
        "--fix cannot be used with --sbom. Use --fix to apply validated fixes and rescan, or --sbom to save an SBOM, not both.",
      );
    });

    it("names --cdx rather than --sbom when the user typed the alias", async () => {
      await expect(validateOptions(opts({ fix: true, cdx: true, sbom: "cyclonedx" }))).rejects.toThrow(
        /--fix cannot be used with --cdx/,
      );
    });

    it("does not throw when --sbom is used without --fix", async () => {
      await expect(validateOptions(opts({ sbom: "spdx" }))).resolves.toBeUndefined();
    });

    it("does not throw when --cdx is used without --fix", async () => {
      await expect(validateOptions(opts({ cdx: true }))).resolves.toBeUndefined();
    });
  });

  describe("--create-pr and --base dependencies", () => {
    it("explains that --create-pr requires --fix", async () => {
      await expect(validateOptions(opts({ createPr: true }))).rejects.toThrow(
        "--create-pr requires --fix. Add --fix to apply validated fixes before opening a pull request, or remove --create-pr.",
      );
    });

    it("explains that --create-pr cannot be combined with --json", async () => {
      await expect(validateOptions(opts({ createPr: true, fix: true, json: true }))).rejects.toThrow(
        "--create-pr cannot be used with --json. Use --create-pr to open a pull request for applied fixes, or --json to save scan results as JSON, not both.",
      );
    });

    it("explains that --base requires --create-pr", async () => {
      await expect(validateOptions(opts({ prBase: "develop" }))).rejects.toThrow(
        "--base can only be used with --create-pr. Add --create-pr to select its target branch, or remove --base.",
      );
    });
  });

  describe("--report with --json", () => {
    it("throws when --report and --json are combined", async () => {
      await expect(validateOptions(opts({ report: "report.html", json: true }))).rejects.toThrow(
        "--report cannot be used with --json. Use --report to generate an HTML report, or --json to save scan results as JSON, not both.",
      );
    });

    it("does not throw when --report is used without --json", async () => {
      await expect(validateOptions(opts({ report: "report.html" }))).resolves.toBeUndefined();
    });
  });

  describe("--output without a file output", () => {
    it("throws when --output is set without --json, --sarif or --sbom", async () => {
      await expect(validateOptions(opts({ output: "reports" }))).rejects.toThrow(
        "--output requires --json, --sarif or --sbom. Add one of them to write a file into the output directory, or remove --output.",
      );
    });

    it("does not throw when --output is combined with a file output", async () => {
      for (const format of [{ sarif: true }, { json: true }, { sbom: "spdx" as const }]) {
        await expect(validateOptions(opts({ output: "reports", ...format }))).resolves.toBeUndefined();
      }
    });
  });

  describe("--ca-cert validation", () => {
    it("throws with a --ca-cert: prefix when the cert file does not exist or is invalid", async () => {
      await expect(validateOptions(opts({ caCert: "invalid-fake-cert.pem" }))).rejects.toThrow(
        "--ca-cert:"
      );
    });

    it("does not throw when --ca-cert is not set", async () => {
      await expect(validateOptions(opts({}))).resolves.toBeUndefined();
    });
  });

  it("does not throw for a valid set of options", async () => {
    await expect(validateOptions(opts({ fix: true, verbose: true }))).resolves.toBeUndefined();
  });

  describe("SSRF warning does not short-circuit validation", () => {
    let originalLookup: typeof dns.lookup;

    beforeEach(() => {
      originalLookup = dns.lookup;
    });

    afterEach(() => {
      dns.lookup = originalLookup;
    });

    function mockDnsLookupPrivate(hostname: string) {
      (dns as any).lookup = (
        host: string,
        options: dns.LookupOptions | ((err: NodeJS.ErrnoException | null, address: string, family: number) => void),
        callback?: (err: NodeJS.ErrnoException | null, address: string, family: number) => void,
      ) => {
        if (typeof options === "object" && options.all) {
          const cb = callback!;
          if (host === hostname) {
            cb(null, [{ address: "10.0.0.1", family: 4 }] as any, 0);
          } else {
            cb(new Error("ENOTFOUND"), [], 0);
          }
        } else {
          const cb = typeof options === "function" ? options : callback!;
          if (host === hostname) {
            cb(null, "10.0.0.1", 4);
          } else {
            cb(new Error("ENOTFOUND"), "", 0);
          }
        }
      };
    }

    it("still throws --fix --json when --allow-private-osv-url is set", async () => {
      mockDnsLookupPrivate("private.test");
      await expect(
        validateOptions(opts({ osvUrl: "https://private.test", allowPrivateOsvUrl: true, fix: true, json: true })),
      ).rejects.toThrow("--fix cannot be used with --json");
    });

    it("still throws --create-pr without --fix when --allow-private-osv-url is set", async () => {
      mockDnsLookupPrivate("private.test");
      await expect(
        validateOptions(opts({ osvUrl: "https://private.test", allowPrivateOsvUrl: true, createPr: true })),
      ).rejects.toThrow("--create-pr requires --fix");
    });

    it("still throws --report --json when --allow-private-osv-url is set", async () => {
      mockDnsLookupPrivate("private.test");
      await expect(
        validateOptions(opts({ osvUrl: "https://private.test", allowPrivateOsvUrl: true, report: "report.html", json: true })),
      ).rejects.toThrow("--report cannot be used with --json");
    });

    it("still throws bad --ca-cert when --allow-private-osv-url is set", async () => {
      mockDnsLookupPrivate("private.test");
      await expect(
        validateOptions(opts({ osvUrl: "https://private.test", allowPrivateOsvUrl: true, caCert: "nonexistent.pem" })),
      ).rejects.toThrow("--ca-cert:");
    });

    it("returns warning when all options are valid", async () => {
      mockDnsLookupPrivate("private.test");
      const warning = await validateOptions(opts({ osvUrl: "https://private.test", allowPrivateOsvUrl: true }));
      expect(warning).toContain("--allow-private-osv-url is set");
    });
  });
});
