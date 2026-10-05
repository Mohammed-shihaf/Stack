import { buildSpdxDocument } from "../src/output/spdx.js";
import type { Finding, PackageRef } from "../src/types.js";

function makePackage(name: string, version: string, license?: string): PackageRef {
  return { name, version, ecosystem: "npm", ...(license ? { license } : {}) };
}

const allPackages = [
  makePackage("lodash", "4.17.21", "MIT"),
  makePackage("@babel/core", "7.0.0", "MIT"),
  makePackage("express", "4.18.0"),
];

describe("buildSpdxDocument top-level shape", () => {
  it("declares SPDX 2.3 with the required document fields", () => {
    const doc = buildSpdxDocument(allPackages, [], null, "1.0.0");
    expect(doc.spdxVersion).toBe("SPDX-2.3");
    expect(doc.SPDXID).toBe("SPDXRef-DOCUMENT");
    expect(doc.dataLicense).toBe("CC0-1.0");
    expect(typeof doc.name).toBe("string");
    expect(doc.name.length).toBeGreaterThan(0);
  });

  it("records the tool and a creation timestamp in creationInfo", () => {
    const doc = buildSpdxDocument(allPackages, [], null, "9.9.9");
    expect(doc.creationInfo.creators).toContain("Tool: CVE Lite CLI-9.9.9");
    expect(doc.creationInfo.created).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
  });

  it("gives each document a unique namespace", () => {
    const a = buildSpdxDocument(allPackages, [], null, "1.0.0");
    const b = buildSpdxDocument(allPackages, [], null, "1.0.0");
    expect(a.documentNamespace).toMatch(/^https?:\/\//);
    expect(a.documentNamespace).not.toBe(b.documentNamespace);
  });
});

describe("buildSpdxDocument packages", () => {
  it("includes every scanned package, not just vulnerable ones", () => {
    const doc = buildSpdxDocument(allPackages, [], null, "1.0.0");
    expect(doc.packages).toHaveLength(3);
    expect(doc.packages.map(p => p.name).sort()).toEqual(["@babel/core", "express", "lodash"]);
  });

  it("gives every package the SPDX-required fields", () => {
    const doc = buildSpdxDocument(allPackages, [], null, "1.0.0");
    for (const pkg of doc.packages) {
      expect(typeof pkg.SPDXID).toBe("string");
      expect(typeof pkg.name).toBe("string");
      expect(typeof pkg.downloadLocation).toBe("string");
    }
  });

  it("restricts SPDXID to the characters the spec allows", () => {
    const doc = buildSpdxDocument(allPackages, [], null, "1.0.0");
    for (const pkg of doc.packages) {
      expect(pkg.SPDXID).toMatch(/^SPDXRef-[A-Za-z0-9.-]+$/);
    }
  });

  it("keeps SPDXIDs unique when sanitising collapses different names", () => {
    const colliding = [makePackage("@scope/pkg", "1.0.0"), makePackage("scope-pkg", "1.0.0")];
    const doc = buildSpdxDocument(colliding, [], null, "1.0.0");
    const ids = doc.packages.map(p => p.SPDXID);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("uses the lockfile license for licenseDeclared when present", () => {
    const doc = buildSpdxDocument(allPackages, [], null, "1.0.0");
    expect(doc.packages.find(p => p.name === "lodash")!.licenseDeclared).toBe("MIT");
  });

  it("falls back to NOASSERTION when the lockfile records no license", () => {
    const doc = buildSpdxDocument(allPackages, [], null, "1.0.0");
    expect(doc.packages.find(p => p.name === "express")!.licenseDeclared).toBe("NOASSERTION");
  });

  it("declares that package file contents were not analysed", () => {
    // Omitting filesAnalyzed defaults it to true, which asserts we inspected
    // package contents. We only ever read a lockfile.
    const doc = buildSpdxDocument(allPackages, [], null, "1.0.0");
    for (const pkg of doc.packages) {
      expect(pkg.filesAnalyzed).toBe(false);
    }
  });

  it("carries a supplier, an NTIA minimum element", () => {
    const doc = buildSpdxDocument(allPackages, [], null, "1.0.0");
    for (const pkg of doc.packages) {
      expect(pkg.supplier).toBe("NOASSERTION");
    }
  });

  it("never concludes a license, since we only observe what was declared", () => {
    const doc = buildSpdxDocument(allPackages, [], null, "1.0.0");
    for (const pkg of doc.packages) {
      expect(pkg.licenseConcluded).toBe("NOASSERTION");
    }
  });

  it("attaches a purl as a PACKAGE-MANAGER external reference", () => {
    const doc = buildSpdxDocument(allPackages, [], null, "1.0.0");
    const lodash = doc.packages.find(p => p.name === "lodash")!;
    expect(lodash.externalRefs).toContainEqual({
      referenceCategory: "PACKAGE-MANAGER",
      referenceType: "purl",
      referenceLocator: "pkg:npm/lodash@4.17.21",
    });
  });

  it("percent-encodes the scope in a scoped package purl", () => {
    const doc = buildSpdxDocument(allPackages, [], null, "1.0.0");
    const scoped = doc.packages.find(p => p.name === "@babel/core")!;
    const purl = scoped.externalRefs.find(r => r.referenceType === "purl")!;
    expect(purl.referenceLocator).toBe("pkg:npm/%40babel/core@7.0.0");
  });

  it("describes the root project via a DESCRIBES relationship", () => {
    const doc = buildSpdxDocument(allPackages, [], { name: "my-app", version: "1.2.3" }, "1.0.0");
    const root = doc.packages.find(p => p.name === "my-app")!;
    expect(root).toBeDefined();
    expect(doc.relationships).toContainEqual({
      spdxElementId: "SPDXRef-DOCUMENT",
      relatedSpdxElement: root.SPDXID,
      relationshipType: "DESCRIBES",
    });
  });
});

function makeFinding(
  name: string,
  version: string,
  advisoryIds: string[],
  severity: "critical" | "high" | "medium" | "low" | "unknown" = "high",
): Finding {
  return {
    pkg: makePackage(name, version),
    vulnerabilities: advisoryIds.map(id => ({ id })),
    severity,
    cveAliases: [],
    dependencyPaths: [[name]],
    relationship: "direct",
    firstFixedVersion: "9.9.9",
    validatedFirstFixedVersion: "9.9.9",
  };
}

describe("buildSpdxDocument vulnerability overlay", () => {
  const findings = [makeFinding("lodash", "4.17.21", ["GHSA-aaaa-bbbb-cccc", "CVE-2021-1234"])];

  it("adds one SECURITY advisory reference per advisory on the affected package", () => {
    const doc = buildSpdxDocument(allPackages, findings, null, "1.0.0");
    const lodash = doc.packages.find(p => p.name === "lodash")!;
    const security = lodash.externalRefs.filter(r => r.referenceCategory === "SECURITY");
    expect(security).toHaveLength(2);
    expect(security.map(r => r.referenceLocator)).toEqual([
      "https://osv.dev/vulnerability/GHSA-aaaa-bbbb-cccc",
      "https://osv.dev/vulnerability/CVE-2021-1234",
    ]);
    expect(security.every(r => r.referenceType === "advisory")).toBe(true);
  });

  it("leaves packages with no findings free of SECURITY references", () => {
    const doc = buildSpdxDocument(allPackages, findings, null, "1.0.0");
    const express = doc.packages.find(p => p.name === "express")!;
    expect(express.externalRefs.some(r => r.referenceCategory === "SECURITY")).toBe(false);
  });

  it("records severity and remediation in an annotation, not in a reference locator", () => {
    const doc = buildSpdxDocument(allPackages, findings, null, "1.0.0");
    const lodash = doc.packages.find(p => p.name === "lodash")!;
    expect(lodash.annotations).toHaveLength(1);
    const note = lodash.annotations![0];
    expect(note.annotationType).toBe("OTHER");
    expect(note.annotator).toBe("Tool: CVE Lite CLI-1.0.0");
    expect(note.annotationDate).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
    expect(note.comment).toContain("high");
  });

  it("does not repeat the advisory list already carried in externalRefs", () => {
    const doc = buildSpdxDocument(allPackages, findings, null, "1.0.0");
    const lodash = doc.packages.find(p => p.name === "lodash")!;
    const comment = lodash.annotations![0].comment;
    expect(comment).not.toContain("GHSA-aaaa-bbbb-cccc");
    expect(comment).not.toContain("CVE-2021-1234");
  });

  it("names the remediation in the annotation, since SPDX cannot model a fix", () => {
    const doc = buildSpdxDocument(allPackages, findings, null, "1.0.0");
    const lodash = doc.packages.find(p => p.name === "lodash")!;
    expect(lodash.annotations![0].comment).toMatch(/fix=/);
  });

  it("ignores a finding that carries no advisories at all", () => {
    // A supplemental advisory pass can yield an empty finding for a package that
    // already has real findings. Annotating it produces a "no known fix" note
    // that contradicts the real remediation sitting next to it.
    const empty = makeFinding("lodash", "4.17.21", [], "unknown");
    const doc = buildSpdxDocument(allPackages, [...findings, empty], null, "1.0.0");
    const lodash = doc.packages.find(p => p.name === "lodash")!;
    expect(lodash.annotations).toHaveLength(1);
    expect(lodash.annotations![0].comment).not.toContain("advisories=0");
  });

  it("emits no annotation for a package whose only finding is empty", () => {
    const doc = buildSpdxDocument(allPackages, [makeFinding("express", "4.18.0", [])], null, "1.0.0");
    const express = doc.packages.find(p => p.name === "express")!;
    expect(express.annotations).toBeUndefined();
    expect(express.externalRefs.some(r => r.referenceCategory === "SECURITY")).toBe(false);
  });

  it("lists an advisory once even when two sources both report it", () => {
    const fromOsv = makeFinding("lodash", "4.17.21", ["GHSA-dupe-dupe-dupe"]);
    const fromNpm = makeFinding("lodash", "4.17.21", ["GHSA-dupe-dupe-dupe"]);
    const doc = buildSpdxDocument(allPackages, [fromOsv, fromNpm], null, "1.0.0");
    const lodash = doc.packages.find(p => p.name === "lodash")!;
    const security = lodash.externalRefs.filter(r => r.referenceCategory === "SECURITY");
    expect(security).toHaveLength(1);
  });

  it("keeps shell fix commands out of externalRefs, which must hold URIs", () => {
    const doc = buildSpdxDocument(allPackages, findings, null, "1.0.0");
    const lodash = doc.packages.find(p => p.name === "lodash")!;
    for (const ref of lodash.externalRefs) {
      expect(ref.referenceLocator).toMatch(/^(pkg:|https?:)/);
    }
  });
});

describe("buildSpdxDocument inventory-only mode", () => {
  const findings = [makeFinding("lodash", "4.17.21", ["GHSA-aaaa-bbbb-cccc"])];

  it("emits no SECURITY references", () => {
    const doc = buildSpdxDocument(allPackages, findings, null, "1.0.0", null, { inventoryOnly: true });
    const refs = doc.packages.flatMap(p => p.externalRefs);
    expect(refs.some(r => r.referenceCategory === "SECURITY")).toBe(false);
  });

  it("emits no annotations", () => {
    const doc = buildSpdxDocument(allPackages, findings, null, "1.0.0", null, { inventoryOnly: true });
    expect(doc.packages.every(p => p.annotations === undefined)).toBe(true);
  });

  it("still lists every package with its purl and license", () => {
    const doc = buildSpdxDocument(allPackages, findings, null, "1.0.0", null, { inventoryOnly: true });
    expect(doc.packages).toHaveLength(3);
    const lodash = doc.packages.find(p => p.name === "lodash")!;
    expect(lodash.licenseDeclared).toBe("MIT");
    expect(lodash.externalRefs.some(r => r.referenceType === "purl")).toBe(true);
  });

  it("produces an identical package section across runs for the same input", () => {
    const a = buildSpdxDocument(allPackages, findings, null, "1.0.0", null, { inventoryOnly: true });
    const b = buildSpdxDocument(allPackages, findings, null, "1.0.0", null, { inventoryOnly: true });
    expect(JSON.stringify(a.packages)).toBe(JSON.stringify(b.packages));
    expect(JSON.stringify(a.relationships)).toBe(JSON.stringify(b.relationships));
  });
});

/**
 * Field lists taken from the official SPDX 2.3 JSON schema
 * (spdx/spdx-spec, support/v2.3, schemas/spdx-schema.json). Asserting them
 * here keeps the emitted document valid without pulling in a schema validator.
 */
const REQUIRED_DOCUMENT_FIELDS = ["SPDXID", "creationInfo", "dataLicense", "name", "spdxVersion"];
const REQUIRED_PACKAGE_FIELDS = ["SPDXID", "downloadLocation", "name"];
const REQUIRED_EXTERNAL_REF_FIELDS = ["referenceCategory", "referenceLocator", "referenceType"];
const REQUIRED_RELATIONSHIP_FIELDS = ["spdxElementId", "relatedSpdxElement", "relationshipType"];
const REQUIRED_ANNOTATION_FIELDS = ["annotationDate", "annotationType", "annotator", "comment"];
const VALID_REFERENCE_CATEGORIES = ["OTHER", "PERSISTENT-ID", "SECURITY", "PACKAGE-MANAGER"];

describe("buildSpdxDocument schema contract", () => {
  const doc = buildSpdxDocument(
    allPackages,
    [makeFinding("lodash", "4.17.21", ["GHSA-aaaa-bbbb-cccc"])],
    { name: "my-app", version: "1.2.3" },
    "1.0.0",
  );

  it("carries every required document field", () => {
    for (const field of REQUIRED_DOCUMENT_FIELDS) {
      expect(doc).toHaveProperty(field);
    }
    expect(doc.creationInfo).toHaveProperty("created");
    expect(doc.creationInfo).toHaveProperty("creators");
  });

  it("carries every required package field", () => {
    for (const pkg of doc.packages) {
      for (const field of REQUIRED_PACKAGE_FIELDS) {
        expect(pkg).toHaveProperty(field);
      }
    }
  });

  it("carries every required external reference field with a valid category", () => {
    const refs = doc.packages.flatMap(p => p.externalRefs);
    expect(refs.length).toBeGreaterThan(0);
    for (const ref of refs) {
      for (const field of REQUIRED_EXTERNAL_REF_FIELDS) {
        expect(ref).toHaveProperty(field);
      }
      expect(VALID_REFERENCE_CATEGORIES).toContain(ref.referenceCategory);
    }
  });

  it("carries every required relationship field", () => {
    expect(doc.relationships.length).toBeGreaterThan(0);
    for (const rel of doc.relationships) {
      for (const field of REQUIRED_RELATIONSHIP_FIELDS) {
        expect(rel).toHaveProperty(field);
      }
    }
  });

  it("carries every required annotation field", () => {
    const notes = doc.packages.flatMap(p => p.annotations ?? []);
    expect(notes.length).toBeGreaterThan(0);
    for (const note of notes) {
      for (const field of REQUIRED_ANNOTATION_FIELDS) {
        expect(note).toHaveProperty(field);
      }
    }
  });

  it("serialises to JSON without undefined leaking into the output", () => {
    expect(JSON.stringify(doc)).not.toContain("undefined");
  });
});

function pkgWithPaths(name: string, version: string, paths: string[][]): PackageRef {
  return { name, version, ecosystem: "npm", paths };
}

describe("buildSpdxDocument dependency graph", () => {
  const meta = { name: "my-app", version: "1.0.0" };
  const tree = [
    pkgWithPaths("express", "4.18.0", [["project", "express"]]),
    pkgWithPaths("body-parser", "1.20.0", [["project", "express", "body-parser"]]),
    pkgWithPaths("bytes", "3.1.2", [["project", "express", "body-parser", "bytes"]]),
  ];

  function edges(doc: { relationships: Array<{ spdxElementId: string; relatedSpdxElement: string; relationshipType: string }> }) {
    return doc.relationships.filter(r => r.relationshipType === "DEPENDENCY_OF");
  }

  function idOf(doc: { packages: Array<{ name: string; SPDXID: string }> }, name: string) {
    return doc.packages.find(p => p.name === name)!.SPDXID;
  }

  it("links a direct dependency to the root project", () => {
    const doc = buildSpdxDocument(tree, [], meta, "1.0.0");
    expect(edges(doc)).toContainEqual({
      spdxElementId: idOf(doc, "express"),
      relatedSpdxElement: idOf(doc, "my-app"),
      relationshipType: "DEPENDENCY_OF",
    });
  });

  it("links a transitive dependency to its parent, not to the root", () => {
    const doc = buildSpdxDocument(tree, [], meta, "1.0.0");
    expect(edges(doc)).toContainEqual({
      spdxElementId: idOf(doc, "bytes"),
      relatedSpdxElement: idOf(doc, "body-parser"),
      relationshipType: "DEPENDENCY_OF",
    });
    expect(edges(doc)).not.toContainEqual({
      spdxElementId: idOf(doc, "bytes"),
      relatedSpdxElement: idOf(doc, "my-app"),
      relationshipType: "DEPENDENCY_OF",
    });
  });

  it("emits an edge for each distinct path to the same package", () => {
    const shared = [
      pkgWithPaths("a", "1.0.0", [["project", "a"]]),
      pkgWithPaths("b", "1.0.0", [["project", "b"]]),
      pkgWithPaths("dep", "1.0.0", [["project", "a", "dep"], ["project", "b", "dep"]]),
    ];
    const doc = buildSpdxDocument(shared, [], meta, "1.0.0");
    const depEdges = edges(doc).filter(r => r.spdxElementId === idOf(doc, "dep"));
    expect(depEdges).toHaveLength(2);
    expect(depEdges.map(r => r.relatedSpdxElement).sort()).toEqual(
      [idOf(doc, "a"), idOf(doc, "b")].sort(),
    );
  });

  it("does not repeat an identical edge", () => {
    const dup = [
      pkgWithPaths("a", "1.0.0", [["project", "a"]]),
      pkgWithPaths("dep", "1.0.0", [["project", "a", "dep"], ["project", "a", "dep"]]),
    ];
    const doc = buildSpdxDocument(dup, [], meta, "1.0.0");
    expect(edges(doc).filter(r => r.spdxElementId === idOf(doc, "dep"))).toHaveLength(1);
  });

  it("resolves the parent by path, so two versions of one name do not collide", () => {
    const twoVersions = [
      pkgWithPaths("lib", "1.0.0", [["project", "alpha", "lib"]]),
      pkgWithPaths("lib", "2.0.0", [["project", "beta", "lib"]]),
      pkgWithPaths("alpha", "1.0.0", [["project", "alpha"]]),
      pkgWithPaths("beta", "1.0.0", [["project", "beta"]]),
      pkgWithPaths("leaf", "1.0.0", [["project", "beta", "lib", "leaf"]]),
    ];
    const doc = buildSpdxDocument(twoVersions, [], meta, "1.0.0");
    const libV2 = doc.packages.find(p => p.name === "lib" && p.versionInfo === "2.0.0")!;
    expect(edges(doc)).toContainEqual({
      spdxElementId: idOf(doc, "leaf"),
      relatedSpdxElement: libV2.SPDXID,
      relationshipType: "DEPENDENCY_OF",
    });
  });

  it("prefers resolved graph edges over path reconstruction when supplied", () => {
    // qs has no `paths` at all here, so a path-derived graph would produce
    // nothing. The supplied edge still connects it.
    const graphOnly = [
      pkgWithPaths("express", "4.17.1", [["project", "express"]]),
      makePackage("qs", "6.7.0"),
    ];
    const doc = buildSpdxDocument(graphOnly, [], meta, "1.0.0", null, {
      dependencyEdges: [{ child: "qs@6.7.0", parent: "express@4.17.1" }],
    });
    expect(edges(doc)).toContainEqual({
      spdxElementId: idOf(doc, "qs"),
      relatedSpdxElement: idOf(doc, "express"),
      relationshipType: "DEPENDENCY_OF",
    });
  });

  it("anchors a null parent to the root project", () => {
    const doc = buildSpdxDocument([makePackage("express", "4.17.1")], [], meta, "1.0.0", null, {
      dependencyEdges: [{ child: "express@4.17.1", parent: null }],
    });
    expect(edges(doc)).toContainEqual({
      spdxElementId: idOf(doc, "express"),
      relatedSpdxElement: idOf(doc, "my-app"),
      relationshipType: "DEPENDENCY_OF",
    });
  });

  it("ignores a supplied edge whose parent is not in the document", () => {
    const doc = buildSpdxDocument([makePackage("qs", "6.7.0")], [], meta, "1.0.0", null, {
      dependencyEdges: [{ child: "qs@6.7.0", parent: "express@4.17.1" }],
    });
    expect(edges(doc).some(r => r.spdxElementId === idOf(doc, "qs"))).toBe(false);
  });

  it("falls back to path reconstruction when the supplied edge list is empty", () => {
    // resolveDependencyEdges returns [] for pnpm, Yarn and Bun. An empty array
    // is truthy, so this must be checked by length or those ecosystems lose
    // every edge.
    const doc = buildSpdxDocument(tree, [], meta, "1.0.0", null, { dependencyEdges: [] });
    expect(edges(doc)).toContainEqual({
      spdxElementId: idOf(doc, "bytes"),
      relatedSpdxElement: idOf(doc, "body-parser"),
      relationshipType: "DEPENDENCY_OF",
    });
  });

  it("falls back to path reconstruction when no edges are supplied", () => {
    const doc = buildSpdxDocument(tree, [], meta, "1.0.0");
    expect(edges(doc)).toContainEqual({
      spdxElementId: idOf(doc, "bytes"),
      relatedSpdxElement: idOf(doc, "body-parser"),
      relationshipType: "DEPENDENCY_OF",
    });
  });

  it("emits no dependency edges when there is no root project to anchor them", () => {
    const doc = buildSpdxDocument(tree, [], null, "1.0.0");
    expect(edges(doc).some(r => r.relatedSpdxElement.includes("DOCUMENT"))).toBe(false);
  });

  it("keeps the dependency graph in inventory-only mode, since it is inventory", () => {
    const doc = buildSpdxDocument(tree, [], meta, "1.0.0", null, { inventoryOnly: true });
    expect(edges(doc).length).toBeGreaterThan(0);
  });
});
