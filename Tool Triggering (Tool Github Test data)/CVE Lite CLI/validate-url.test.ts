import dns from "node:dns";
import { isOfficialOsv, isPrivateOrReservedIp, validateOsvUrl } from "../src/utils/validate-url.js";

describe("isOfficialOsv", () => {
  it("returns true for official OSV URL", () => {
    expect(isOfficialOsv("https://api.osv.dev/v1/querybatch")).toBe(true);
  });

  it("returns true for official OSV URL without path", () => {
    expect(isOfficialOsv("https://api.osv.dev")).toBe(true);
  });

  it("returns false for non-official URL", () => {
    expect(isOfficialOsv("https://evil.com")).toBe(false);
  });

  it("returns false for invalid URL", () => {
    expect(isOfficialOsv("not-a-url")).toBe(false);
  });

  it("returns true for HTTP official host (scheme check is in validateOsvUrl)", () => {
    // isOfficialOsv only checks hostname, scheme validation is in validateOsvUrl
    expect(isOfficialOsv("http://api.osv.dev")).toBe(true);
  });
});

describe("isPrivateOrReservedIp", () => {
  it.each([
    // 0.0.0.0/8 — "this network"
    ["0.0.0.0", true],
    ["0.255.255.255", true],
    ["1.0.0.0", false],

    // 10.0.0.0/8 — private Class A
    ["10.0.0.0", true],
    ["10.255.255.255", true],
    ["9.255.255.255", false],
    ["11.0.0.0", false],

    // 100.64.0.0/10 — CGNAT
    ["100.64.0.0", true],
    ["100.127.255.255", true],
    ["100.63.255.255", false],
    ["100.128.0.0", false],
    ["100.108.0.1", true],
    ["100.109.0.1", true],
    ["100.118.0.1", true],
    ["100.119.0.1", true],

    // 127.0.0.0/8 — loopback
    ["127.0.0.0", true],
    ["127.255.255.255", true],
    ["128.0.0.0", false],

    // 169.254.0.0/16 — link-local
    ["169.254.0.0", true],
    ["169.254.255.255", true],
    ["169.253.255.255", false],
    ["169.255.0.0", false],

    // 172.16.0.0/12 — private Class B
    ["172.16.0.0", true],
    ["172.31.255.255", true],
    ["172.15.255.255", false],
    ["172.32.0.0", false],

    // 192.168.0.0/16 — private Class C
    ["192.168.0.0", true],
    ["192.168.255.255", true],
    ["192.167.255.255", false],
    ["192.169.0.0", false],

    // 192.0.0.0/24 — IETF Protocol
    ["192.0.0.0", true],
    ["192.0.0.255", true],
    ["192.0.1.0", false],

    // 198.18.0.0/15 — benchmark
    ["198.18.0.0", true],
    ["198.19.255.255", true],
    ["198.17.255.255", false],
    ["198.20.0.0", false],

    // 192.0.2.0/24 — documentation (TEST-NET-1)
    ["192.0.2.0", true],
    ["192.0.2.255", true],
    ["192.0.3.0", false],

    // 198.51.100.0/24 — documentation (TEST-NET-2)
    ["198.51.100.0", true],
    ["198.51.100.255", true],
    ["198.51.101.0", false],

    // 203.0.113.0/24 — documentation (TEST-NET-3)
    ["203.0.113.0", true],
    ["203.0.113.255", true],
    ["203.0.114.0", false],

    // 224.0.0.0/4 — multicast
    ["224.0.0.0", true],
    ["239.255.255.255", true],
    ["223.255.255.255", false],

    // 240.0.0.0/4 — reserved
    ["240.0.0.0", true],
    ["255.255.255.255", true],

    // public IPv4
    ["8.8.8.8", false],
    ["1.1.1.1", false],
    ["93.184.216.34", false],
  ])("%s → %s", (ip, expected) => {
    expect(isPrivateOrReservedIp(ip)).toBe(expected);
  });

  it("detects IPv6 loopback", () => {
    expect(isPrivateOrReservedIp("::1")).toBe(true);
  });

  it("detects IPv6 unspecified", () => {
    expect(isPrivateOrReservedIp("::")).toBe(true);
  });

  it("detects IPv6 ULA", () => {
    expect(isPrivateOrReservedIp("fc00::1")).toBe(true);
    expect(isPrivateOrReservedIp("fd00::1")).toBe(true);
  });

  it("detects IPv6 link-local", () => {
    expect(isPrivateOrReservedIp("fe80::1")).toBe(true);
  });

  it("detects IPv6 multicast", () => {
    expect(isPrivateOrReservedIp("ff02::1")).toBe(true);
  });

  it("detects IPv6 documentation", () => {
    expect(isPrivateOrReservedIp("2001:db8::1")).toBe(true);
  });

  it("detects IPv6 Teredo (full /32 coverage)", () => {
    // Compressed form
    expect(isPrivateOrReservedIp("2001::1")).toBe(true);
    // Non-compressed form — within 2001::/32 but NOT matching old /^2001::/ regex
    expect(isPrivateOrReservedIp("2001:0:1::1")).toBe(true);
    expect(isPrivateOrReservedIp("2001:0:0:1::1")).toBe(true);
    // Outside Teredo block
    expect(isPrivateOrReservedIp("2003::1")).toBe(false);
  });

  it("detects IPv6 NAT64", () => {
    expect(isPrivateOrReservedIp("64:ff9b::1")).toBe(true);
  });

  it("detects IPv6 discard", () => {
    expect(isPrivateOrReservedIp("100::1")).toBe(true);
  });

  it("detects IPv6 benchmark", () => {
    expect(isPrivateOrReservedIp("2001:2::1")).toBe(true);
    expect(isPrivateOrReservedIp("2001:2:0:ffff::")).toBe(true); // within /48
    expect(isPrivateOrReservedIp("2001:3::")).toBe(false);
  });

  it("detects additional non-global and special-purpose IPv6 ranges", () => {
    expect(isPrivateOrReservedIp("::127.0.0.1")).toBe(true); // deprecated IPv4-compatible
    expect(isPrivateOrReservedIp("64:ff9b:1::1")).toBe(true); // local-use NAT64
    expect(isPrivateOrReservedIp("100:0:0:1::1")).toBe(true); // dummy prefix
    expect(isPrivateOrReservedIp("2002:7f00:1::")).toBe(true); // 6to4
    expect(isPrivateOrReservedIp("3fff::1")).toBe(true); // documentation
    expect(isPrivateOrReservedIp("5f00::1")).toBe(true); // SRv6 SIDs
    expect(isPrivateOrReservedIp("64:ff9b:2::1")).toBe(false);
    expect(isPrivateOrReservedIp("3ffe::1")).toBe(false);
    expect(isPrivateOrReservedIp("6000::1")).toBe(false);
  });

  it("detects IPv4-mapped IPv6 addresses (dotted-decimal form)", () => {
    expect(isPrivateOrReservedIp("::ffff:127.0.0.1")).toBe(true);
    expect(isPrivateOrReservedIp("::ffff:10.0.0.1")).toBe(true);
    expect(isPrivateOrReservedIp("::ffff:192.168.1.1")).toBe(true);
    expect(isPrivateOrReservedIp("::ffff:8.8.8.8")).toBe(false);
  });

  it("detects IPv4-mapped IPv6 addresses (hex form)", () => {
    // ::ffff:7f00:1 = 127.0.0.1 (compressed hex)
    expect(isPrivateOrReservedIp("::ffff:7f00:1")).toBe(true);
    // ::ffff:a00:1 = 10.0.0.1 (uncompressed hex — the reported bypass)
    expect(isPrivateOrReservedIp("::ffff:a00:1")).toBe(true);
    // ::ffff:c0a8:1 = 192.168.0.1
    expect(isPrivateOrReservedIp("::ffff:c0a8:1")).toBe(true);
    // ::ffff:58b8:d822 = 88.184.216.34 (public)
    expect(isPrivateOrReservedIp("::ffff:58b8:d822")).toBe(false);
    // ::ffff:0a00:1 = 10.0.0.1 (with leading zero)
    expect(isPrivateOrReservedIp("::ffff:0a00:1")).toBe(true);
    // ::ffff:c000:1 = 192.0.0.1 (short final hextet)
    expect(isPrivateOrReservedIp("::ffff:c000:1")).toBe(true);
  });

  it("does not detect public IPv6", () => {
    expect(isPrivateOrReservedIp("2606:4700::1")).toBe(false);
  });
});

describe("validateOsvUrl", () => {
  let originalLookup: typeof dns.lookup;

  beforeEach(() => {
    originalLookup = dns.lookup;
  });

  afterEach(() => {
    dns.lookup = originalLookup;
  });

  function mockDnsLookup(hostname: string, address: string, family: number = 4) {
    (dns as any).lookup = (
      host: string,
      options: dns.LookupOptions | ((err: NodeJS.ErrnoException | null, address: string, family: number) => void),
      callback?: (err: NodeJS.ErrnoException | null, address: string, family: number) => void,
    ) => {
      // Handle the { all: true } overload
      if (typeof options === "object" && options.all) {
        const cb = callback!;
        if (host === hostname) {
          cb(null, [{ address, family }] as any, 0);
        } else {
          cb(new Error("ENOTFOUND"), [], 0);
        }
      } else {
        const cb = typeof options === "function" ? options : callback!;
        if (host === hostname) {
          cb(null, address, family);
        } else {
          cb(new Error("ENOTFOUND"), "", 0);
        }
      }
    };
  }

  function mockDnsLookupAll(hostname: string, addresses: Array<{ address: string; family: number }>) {
    (dns as any).lookup = (
      host: string,
      options: dns.LookupOptions | ((err: NodeJS.ErrnoException | null, address: string, family: number) => void),
      callback?: (err: NodeJS.ErrnoException | null, address: string, family: number) => void,
    ) => {
      // Handle the { all: true } overload
      if (typeof options === "object" && options.all) {
        const cb = callback!;
        if (host === hostname) {
          cb(null, addresses as any, 0);
        } else {
          cb(new Error("ENOTFOUND"), [], 0);
        }
      } else {
        const cb = typeof options === "function" ? options : callback!;
        if (host === hostname && addresses.length > 0) {
          cb(null, addresses[0].address, addresses[0].family);
        } else {
          cb(new Error("ENOTFOUND"), "", 0);
        }
      }
    };
  }

  it("accepts official OSV URL without DNS check", async () => {
    await expect(
      validateOsvUrl("https://api.osv.dev/v1/querybatch", false),
    ).resolves.toBeUndefined();
  });

  it("rejects non-HTTPS URL", async () => {
    await expect(
      validateOsvUrl("http://api.osv.dev", false),
    ).rejects.toThrow("--osv-url requires https:// scheme");
  });

  it("rejects ftp URL", async () => {
    await expect(
      validateOsvUrl("ftp://api.osv.dev", false),
    ).rejects.toThrow("--osv-url requires https:// scheme");
  });

  it("rejects invalid URL", async () => {
    await expect(
      validateOsvUrl("not-a-url", false),
    ).rejects.toThrow();
  });

  it("rejects custom host resolving to loopback", async () => {
    mockDnsLookup("evil.test", "127.0.0.1");

    await expect(
      validateOsvUrl("https://evil.test", false),
    ).rejects.toThrow("private/reserved IP");
  });

  it("rejects custom host resolving to private IP", async () => {
    mockDnsLookup("internal.test", "10.0.0.10");

    await expect(
      validateOsvUrl("https://internal.test", false),
    ).rejects.toThrow("private/reserved IP");
  });

  it("rejects a private IPv4-mapped IPv6 address returned by DNS", async () => {
    mockDnsLookup("mapped.test", "::ffff:c000:1", 6);

    await expect(
      validateOsvUrl("https://mapped.test", false),
    ).rejects.toThrow("private/reserved IP");
  });

  it("allows private IP only with explicit flag", async () => {
    mockDnsLookup("internal.test", "10.0.0.10");

    const warning = await validateOsvUrl("https://internal.test", true);
    expect(warning).toContain("--allow-private-osv-url is set");
  });

  it("rejects if any resolved address is private (multiple A records)", async () => {
    mockDnsLookupAll("mixed.test", [
      { address: "93.184.216.34", family: 4 },
      { address: "127.0.0.1", family: 4 },
    ]);

    await expect(
      validateOsvUrl("https://mixed.test", false),
    ).rejects.toThrow("private/reserved IP");
  });

  it("shows all private addresses in error message", async () => {
    mockDnsLookupAll("multi-private.test", [
      { address: "10.0.0.1", family: 4 },
      { address: "192.168.1.1", family: 4 },
    ]);

    await expect(
      validateOsvUrl("https://multi-private.test", false),
    ).rejects.toThrow("10.0.0.1, 192.168.1.1");
  });

  it("allows public IPs", async () => {
    mockDnsLookup("public.test", "93.184.216.34");

    await expect(
      validateOsvUrl("https://public.test", false),
    ).resolves.toBeUndefined();
  });

  it("allows private IP with warning when flag is set", async () => {
    mockDnsLookup("internal.test", "10.0.0.10");

    const warning = await validateOsvUrl("https://internal.test", true);
    expect(warning).toContain("--allow-private-osv-url is set");
    expect(warning).toContain("10.0.0.10");
  });

  it("rejects IPv6 loopback literal", async () => {
    // IPv6 literal URL: https://[::1]/foo → hostname is "[::1]"
    // After bracket stripping, dns.lookup receives "::1"
    mockDnsLookup("::1", "::1", 6);

    await expect(
      validateOsvUrl("https://[::1]/foo", false),
    ).rejects.toThrow("private/reserved IP");
  });

  it("rejects IPv6 link-local literal", async () => {
    mockDnsLookup("fe80::1", "fe80::1", 6);

    await expect(
      validateOsvUrl("https://[fe80::1]/foo", false),
    ).rejects.toThrow("private/reserved IP");
  });

  it("allows IPv6 public literal", async () => {
    mockDnsLookup("2606:4700::1", "2606:4700::1", 6);

    await expect(
      validateOsvUrl("https://[2606:4700::1]/foo", false),
    ).resolves.toBeUndefined();
  });

  it("rejects IPv6 private literal with allowPrivate flag", async () => {
    mockDnsLookup("::1", "::1", 6);

    const warning = await validateOsvUrl("https://[::1]/foo", true);
    expect(warning).toContain("--allow-private-osv-url is set");
    expect(warning).toContain("::1");
  });
});
