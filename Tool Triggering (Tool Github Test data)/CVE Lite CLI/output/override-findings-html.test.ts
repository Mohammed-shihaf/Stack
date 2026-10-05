import { renderOverrideFindingsHtml } from "../../src/output/override-findings-html.js";
import type { OverrideFinding } from "../../src/overrides/types.js";

const f = (over: Partial<OverrideFinding> = {}): OverrideFinding => ({
  ruleId: "OA001",
  severity: "high",
  package: { name: "postcss" },
  location: { file: "package.json", jsonPath: "/overrides/postcss" },
  message: "Override target not in resolved tree",
  ...over,
});

describe("renderOverrideFindingsHtml", () => {
  it("returns a section header even with no findings", () => {
    const html = renderOverrideFindingsHtml([]);
    expect(html).toMatch(/Override hygiene/i);
    expect(html).toMatch(/no override hygiene findings/i);
  });

  it("renders nothing (empty string) when override hygiene was not requested", () => {
    // undefined = --check-overrides was never passed; the report must not show an
    // Override hygiene panel at all. An empty array (above) means it ran clean.
    expect(renderOverrideFindingsHtml(undefined)).toBe("");
  });

  it("renders rows for each finding", () => {
    const html = renderOverrideFindingsHtml([f(), f({ ruleId: "OA008", severity: "critical", package: { name: "lodash" } })]);
    expect(html).toMatch(/OA001/);
    expect(html).toMatch(/OA008/);
  });

  it("escapes HTML in message", () => {
    const html = renderOverrideFindingsHtml([f({ message: "<script>alert(1)</script>" })]);
    // Use string containment, not a regex, so the assertion does not look like an
    // HTML-filtering regexp to scanners. The escaper works at the character level,
    // so verify the raw delimiters are gone and the entity form is present.
    expect(html).not.toContain("<script>");
    expect(html).not.toContain("</script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("escapes upper-case and mixed-case tags too", () => {
    const html = renderOverrideFindingsHtml([f({ message: "<SCRIPT>X</ScRiPt>" })]);
    expect(html).not.toContain("<SCRIPT>");
    expect(html).not.toContain("</ScRiPt>");
    expect(html).toContain("&lt;SCRIPT&gt;");
  });

  it("renders location with separator when jsonPath is present", () => {
    const html = renderOverrideFindingsHtml([
      f({ location: { file: "package.json", jsonPath: "/overrides/postcss" } }),
    ]);
    expect(html).toContain("package.json › /overrides/postcss");
  });

  it("renders location without separator when jsonPath is absent", () => {
    const html = renderOverrideFindingsHtml([
      f({ location: { file: "package.json" } }),
    ]);
    expect(html).toContain("package.json");
    expect(html).not.toContain("›");
  });

  it("renders fix command block with copy button when runnableCommand is present", () => {
    const html = renderOverrideFindingsHtml([
      f({
        fix: {
          type: "rfc6902",
          patch: [{ op: "remove", path: "/overrides/postcss" }],
          runnableCommand: "cve-lite overrides --fix --rule OA001",
        },
      }),
    ]);
    expect(html).toContain("fix-cmd-inline");
    expect(html).toContain("copy-btn");
    expect(html).toContain("cve-lite overrides --fix --rule OA001");
  });

  it("omits fix command block when no runnableCommand", () => {
    const html = renderOverrideFindingsHtml([f()]);
    expect(html).not.toContain("fix-cmd-inline");
    expect(html).not.toContain("copy-btn");
  });

  it("row carries a severity class matching the finding, and a severity badge", () => {
    const html = renderOverrideFindingsHtml([f({ severity: "high" })]);
    expect(html).toContain('class="finding high"');
    expect(html).toContain('<span class="sev-badge high">high</span>');
  });

  it("renders the rule ID as a chip and the package name matching the Findings table style", () => {
    const html = renderOverrideFindingsHtml([f()]);
    expect(html).toContain('<span class="dep-node">OA001</span>');
    expect(html).toContain('<div class="pkg-name">postcss</div>');
  });

  it("does not wrap the table in a bordered panel container - table sits flush, matching the Findings table", () => {
    const html = renderOverrideFindingsHtml([f()]);
    expect(html).not.toContain("severity-group");
  });

  it("sorts critical findings before high findings", () => {
    const html = renderOverrideFindingsHtml([
      f({ ruleId: "OA010", severity: "high" }),
      f({ ruleId: "OA020", severity: "critical", package: { name: "lodash" } }),
    ]);
    const critIdx = html.indexOf("OA020");
    const highIdx = html.indexOf("OA010");
    expect(critIdx).toBeLessThan(highIdx);
  });
});
