import { buildDelta, renderComment } from "../../scripts/pr-scan-delta.mjs";

/**
 * The delta is what makes a PR comment tolerable rather than noise. It must say
 * nothing at all unless this PR moved the finding set, and it must never
 * republish pre-existing findings that the PR did not touch.
 */

const finding = (
  pkg: string,
  version: string,
  ids: string[],
  severity = "high",
  fix?: string,
) => ({
  package: pkg,
  version,
  severity,
  relationship: "transitive",
  validatedFirstFixedVersion: fix,
  vulnerabilities: ids.map((id) => ({ id })),
});

const scan = (findings: unknown[]) => ({ findingCount: findings.length, findings });

describe("buildDelta", () => {
  it("reports nothing when the finding set is unchanged", () => {
    const f = [finding("js-yaml", "3.15.1", ["GHSA-2883-xcg3-v3hh"])];
    const delta = buildDelta(scan(f), scan(f));

    expect(delta.introduced).toHaveLength(0);
    expect(delta.resolved).toHaveLength(0);
    expect(delta.hasChanges).toBe(false);
  });

  it("does not republish a pre-existing finding the PR never touched", () => {
    const stale = finding("lodash", "4.17.20", ["GHSA-lodash"]);
    const base = scan([stale, finding("js-yaml", "3.15.1", ["GHSA-2883-xcg3-v3hh"])]);
    const head = scan([stale]);

    const delta = buildDelta(base, head);
    expect(delta.resolved.map((r) => r.package)).toEqual(["js-yaml"]);
    expect(delta.introduced).toHaveLength(0);
  });

  /** The real shape of PR #1111: js-yaml 3.15.1 -> 3.15.2 cleared two advisories. */
  it("collapses several advisory ids on one package into a single row", () => {
    const base = scan([
      finding("js-yaml", "3.15.1", ["GHSA-2883-xcg3-v3hh", "NPM-1193726"]),
    ]);
    const delta = buildDelta(base, scan([]));

    expect(delta.resolved).toHaveLength(1);
    expect(delta.resolved[0]!.advisories).toEqual(["GHSA-2883-xcg3-v3hh", "NPM-1193726"]);
  });

  it("counts an advisory whose detail failed to resolve, rather than dropping it", () => {
    const f = {
      ...finding("js-yaml", "3.15.1", ["GHSA-2883-xcg3-v3hh"]),
      unresolvedAdvisoryIds: ["NPM-1193726"],
      cves: ["CVE-2026-84375"],
    };
    const delta = buildDelta(scan([f]), scan([]));

    expect(delta.resolved[0]!.advisories).toEqual(["GHSA-2883-xcg3-v3hh", "NPM-1193726"]);
    expect(delta.resolved[0]!.cves).toEqual(["CVE-2026-84375"]);
  });

  it("prefers the CVE number over the GHSA id, since that is what reads", () => {
    const f = {
      ...finding("js-yaml", "3.15.1", ["GHSA-2883-xcg3-v3hh"]),
      cves: ["CVE-2026-84375"],
    };
    const body = renderComment(buildDelta(scan([f]), scan([])))!;
    const row = body.split("\n").find((l) => l.startsWith("- `js-yaml"))!;

    expect(row).toContain("CVE-2026-84375");
    expect(row).not.toContain("GHSA-2883-xcg3-v3hh");
  });

  it("falls back to the advisory id when no CVE is assigned", () => {
    const body = renderComment(
      buildDelta(scan([finding("p", "1.0.0", ["GHSA-only"])]), scan([])),
    )!;
    const row = body.split("\n").find((l) => l.startsWith("- `p"))!;

    expect(row).toContain("GHSA-only");
  });

  it("flags a finding the PR introduces, with its fix version", () => {
    const head = scan([
      finding("fast-xml-parser", "5.5.8", ["GHSA-8r6m-32jq-jx6q"], "high", "5.10.1"),
    ]);
    const delta = buildDelta(scan([]), head);

    expect(delta.introduced).toHaveLength(1);
    expect(delta.introduced[0]).toMatchObject({
      package: "fast-xml-parser",
      version: "5.5.8",
      fixVersion: "5.10.1",
    });
  });

  it("treats a version bump on the same advisory as introduced plus resolved", () => {
    const base = scan([finding("axios", "1.16.1", ["GHSA-axios"])]);
    const head = scan([finding("axios", "1.17.0", ["GHSA-axios"])]);

    const delta = buildDelta(base, head);
    expect(delta.resolved.map((r) => r.version)).toEqual(["1.16.1"]);
    expect(delta.introduced.map((r) => r.version)).toEqual(["1.17.0"]);
  });
});

describe("untrusted input", () => {
  /**
   * With fork PRs working, every string in the comment comes from a lockfile
   * the contributor controls. GitHub strips raw HTML in comments, so this is
   * not XSS, but a crafted package name can still inject links, headings, or
   * text that reads as if a maintainer wrote it.
   */
  it("strips markdown control characters from a package name", () => {
    const head = scan([
      finding("evil`](https://phish.example)`x", "1.0.0", ["GHSA-x"]),
    ]);
    const body = renderComment(buildDelta(scan([]), head))!;

    // Scope to the finding row. The footer's Share block contains legitimate
    // markdown links, so asserting against the whole body would pass trivially
    // and stop testing anything.
    const row = body.split("\n").find((l) => l.startsWith("- `"))!;
    expect(row).not.toContain("](");
    expect(row).not.toContain("https://phish");
    expect(row).toContain("`evilhttps//phish.examplex@1.0.0`");
  });

  it("neutralises a backtick that would break out of the code span", () => {
    const head = scan([finding("a`b", "1.0.0", ["GHSA-x"])]);
    const body = renderComment(buildDelta(scan([]), head))!;

    // exactly the backticks we opened, none smuggled in
    expect((body.match(/`/g) ?? []).length % 2).toBe(0);
  });

  it("strips a heading or blockquote injected through a version", () => {
    const head = scan([finding("pkg", "1.0.0\n\n# Approved by maintainer", ["GHSA-x"])]);
    const body = renderComment(buildDelta(scan([]), head))!;

    expect(body).not.toContain("# Approved");
    expect(body).not.toContain("\n#");
  });

  it("strips an HTML tag smuggled through an advisory id", () => {
    const head = scan([finding("pkg", "1.0.0", ['<img src=x onerror="alert(1)">'])]);
    const body = renderComment(buildDelta(scan([]), head))!;

    // Angle brackets, quotes and equals are gone, so no tag can form. The
    // comment's own <img> is the only one, and it is ours.
    expect(body).not.toContain("<img src=x");
    expect(body).not.toContain('onerror="');
    expect(body.match(/<img /g)).toHaveLength(1);
    expect(body).not.toMatch(/<[a-z]+ [a-z]+=[^"]/i);
  });

  it("keeps legitimate scoped names and prerelease versions intact", () => {
    const head = scan([
      finding("@hono/node-server", "2.0.10-beta.1+build", ["GHSA-8r6m-32jq-jx6q"]),
    ]);
    const body = renderComment(buildDelta(scan([]), head))!;

    expect(body).toContain("@hono/node-server");
    expect(body).toContain("2.0.10-beta.1+build");
    expect(body).toContain("GHSA-8r6m-32jq-jx6q");
  });
});

describe("renderComment", () => {
  it("renders nothing when there is no delta, so no comment is posted", () => {
    expect(renderComment(buildDelta(scan([]), scan([])))).toBeNull();
  });

  it("leads with the introduced findings and names the fix", () => {
    const head = scan([
      finding("fast-xml-parser", "5.5.8", ["GHSA-8r6m-32jq-jx6q"], "high", "5.10.1"),
    ]);
    const body = renderComment(buildDelta(scan([]), head))!;

    expect(body).toContain("1 new high finding");
    expect(body).toContain("fast-xml-parser");
    expect(body).toContain("GHSA-8r6m-32jq-jx6q");
    expect(body).toContain("5.10.1");
  });

  it("reports a clean resolution without sounding like an alarm", () => {
    const base = scan([
      finding("js-yaml", "3.15.1", ["GHSA-2883-xcg3-v3hh", "NPM-1193726"]),
    ]);
    const body = renderComment(buildDelta(base, scan([])))!;

    expect(body).toContain("resolved");
    expect(body).not.toContain("new high finding");
  });

  it("puts the linked wordmark on its own line, above the summary", () => {
    const head = scan([finding("x", "1.0.0", ["GHSA-x"])]);
    const body = renderComment(buildDelta(scan([]), head))!;

    expect(body).toContain("assets/logo-with-title-transparent.png");
    expect(body).toContain('width="120"');
    // Inline it either overhangs the line box or shrinks to ~24px, so it gets
    // its own line and there is nothing to align against.
    expect(body).not.toContain("align=");
    expect(body).toMatch(/<a href="https:\/\/github\.com\/OWASP\/cve-lite-cli"><img /);
    // Without an explicit href GitHub links the image to the raw PNG.
    expect(body.match(/<img /g)).toHaveLength(1);
    // Two anchors now: the logo and the footer link. Both point at the project.
    expect(body.match(/<a href=/g)).toHaveLength(2);

    const lines = body.split("\n").filter((l) => l.trim().length > 0);
    const logoLine = lines.findIndex((l) => l.includes("<img "));
    expect(lines[logoLine]).not.toContain("finding");
    expect(lines[logoLine + 1]).toContain("finding");
  });

  it("ends with a runnable fix command, not just a version number", () => {
    const head = scan([
      finding("js-yaml", "3.15.1", ["GHSA-x"], "high", "3.15.2"),
    ]);
    (head.findings[0] as any).runnableFixCommand = "npm update js-yaml";
    const body = renderComment(buildDelta(scan([]), head))!;

    expect(body).toContain("```bash");
    expect(body).toContain("npm update js-yaml");
  });

  it("strips anything that could break out of the command fence", () => {
    const head = scan([finding("p", "1.0.0", ["GHSA-x"], "high", "2.0.0")]);
    (head.findings[0] as any).runnableFixCommand = "npm i p\n```\n# Approved";
    const body = renderComment(buildDelta(scan([]), head))!;

    expect(body).not.toContain("# Approved");
    // opening and closing fences only, none smuggled in
    expect((body.match(/```/g) ?? []).length % 2).toBe(0);
  });

  it("does not repeat the same fix command when several findings share one", () => {
    const head = scan([
      finding("a", "1.0.0", ["GHSA-a"], "high", "2.0.0"),
      finding("b", "1.0.0", ["GHSA-b"], "high", "2.0.0"),
    ]);
    (head.findings[0] as any).runnableFixCommand = "npm update shared";
    (head.findings[1] as any).runnableFixCommand = "npm update shared";
    const body = renderComment(buildDelta(scan([]), head))!;

    expect(body.match(/npm update shared/g)).toHaveLength(1);
  });

  it("breaks the count down by severity rather than claiming the worst for all", () => {
    const head = scan([
      finding("a", "1.0.0", ["GHSA-a"], "critical"),
      finding("b", "1.0.0", ["GHSA-b"], "high"),
      finding("c", "1.0.0", ["GHSA-c"], "high"),
    ]);
    const body = renderComment(buildDelta(scan([]), head))!;

    // "3 new critical findings" would overstate two of the three.
    expect(body).toContain("3 new findings (1 critical, 2 high)");
    expect(body).not.toContain("3 new critical findings");
  });

  it("keeps a single-severity set reading naturally", () => {
    const head = scan([
      finding("a", "1.0.0", ["GHSA-a"], "high"),
      finding("b", "1.0.0", ["GHSA-b"], "high"),
    ]);
    const body = renderComment(buildDelta(scan([]), head))!;

    const summary = body.split("\n").find((l) => l.includes("findings introduced"))!;
    expect(summary).toBe("2 new high findings introduced by this PR");
    // no severity breakdown when there is only one severity to break down
    expect(summary).not.toContain("(");
  });

  it("caps the advisory list so one package cannot swamp the comment", () => {
    // tar@6.1.0 genuinely carries 36 advisories and 18 CVEs.
    const many = Array.from({ length: 18 }, (_, i) => `CVE-2021-${1000 + i}`);
    const f = { ...finding("tar", "6.1.0", ["GHSA-t"], "critical", "6.1.1"), cves: many };
    const body = renderComment(buildDelta(scan([]), scan([f])))!;

    const row = body.split("\n").find((l) => l.startsWith("- `tar"))!;
    expect(row).toContain("and 15 more");
    expect((row.match(/CVE-/g) ?? []).length).toBe(3);
  });

  it("lists each command exactly as the CLI produced it", () => {
    const head = scan([
      finding("a", "1.0.0", ["GHSA-a"], "high", "2.0.0"),
      finding("b", "1.0.0", ["GHSA-b"], "high", "3.0.0"),
    ]);
    (head.findings[0] as any).runnableFixCommand = "npm install a@2.0.0";
    (head.findings[1] as any).runnableFixCommand = "npm install b@3.0.0";
    const body = renderComment(buildDelta(scan([]), head))!;

    // Merging them here was a second implementation of the CLI's own grouping,
    // and it could not tell a pnpm workspace filter from a package name (#1172).
    expect(body).toContain("npm install a@2.0.0");
    expect(body).toContain("npm install b@3.0.0");
  });

  it("withholds every command when one of them would be altered by sanitising", () => {
    const head = scan([
      finding("a", "1.0.0", ["GHSA-a"], "high", "2.0.0"),
      finding("b", "1.0.0", ["GHSA-b"], "high", "3.0.0"),
    ]);
    // A real chained command. safeCommand drops the ampersands, so showing it
    // would post something that silently does less than it says.
    (head.findings[0] as any).runnableFixCommand = "pnpm add a@2.0.0 && pnpm add -D b@3.0.0";
    (head.findings[1] as any).runnableFixCommand = "npm install b@3.0.0";
    const body = renderComment(buildDelta(scan([]), head))!;

    expect(body).not.toContain("```bash");
    expect(body).not.toContain("npm install b@3.0.0");
    expect(body).toContain("Run `cve-lite .` for the fix commands.");
  });

  it("does not merge install and update into one broken command", () => {
    const head = scan([
      finding("a", "1.0.0", ["GHSA-a"], "high", "2.0.0"),
      finding("b", "1.0.0", ["GHSA-b"], "high", "3.0.0"),
    ]);
    (head.findings[0] as any).runnableFixCommand = "npm install a@2.0.0";
    (head.findings[1] as any).runnableFixCommand = "npm update b";
    const body = renderComment(buildDelta(scan([]), head))!;

    expect(body).toContain("npm install a@2.0.0");
    expect(body).toContain("npm update b");
    expect(body).not.toContain("npm install a@2.0.0 b");
  });

  it("labels the share block so it reads as an invitation, not a nag", () => {
    const head = scan([finding("x", "1.0.0", ["GHSA-x"])]);
    const body = renderComment(buildDelta(scan([]), head))!;

    expect(body).toContain("<summary>\u2764\ufe0f Share</summary>");
    // collapsed by default: one line of weight until someone opens it
    expect(body).toContain("<details>");
    expect(body).not.toContain("<details open>");
  });

  it("carries a stable marker so the comment can be updated in place", () => {
    const head = scan([finding("x", "1.0.0", ["GHSA-x"])]);
    const body = renderComment(buildDelta(scan([]), head))!;

    expect(body).toContain("<!-- cve-lite-cli:pr-delta -->");
  });
});
