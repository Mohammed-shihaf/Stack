import { Project } from "ts-morph";

/**
 * Drives ts-morph's real Compiler-API-backed Project to load orchardSurvey.ts
 * and confirm every identifier it references resolves to a real declaration --
 * a stand-in for "the type-aware tool loads this project without error",
 * which is what ts-morph is actually for.
 */
function main(): void {
  const project = new Project({ tsConfigFilePath: "tsconfig.json" });
  const sourceFile = project.getSourceFileOrThrow("src/orchardSurvey.ts");

  const diagnostics = project.getPreEmitDiagnostics().filter(
    (d) => d.getSourceFile()?.getFilePath() === sourceFile.getFilePath()
  );

  let unresolvedIdentifiers = 0;
  sourceFile.forEachDescendant((node) => {
    if (node.getKindName() === "Identifier") {
      const symbol = node.getSymbol();
      if (!symbol) {
        // Declaration-position identifiers (class/interface/property names)
        // have no separate "usage" symbol -- only flag ones that read as a
        // reference but still fail to resolve.
        const parentKind = node.getParent()?.getKindName();
        const isDeclarationName =
          parentKind === "ClassDeclaration" ||
          parentKind === "InterfaceDeclaration" ||
          parentKind === "PropertySignature" ||
          parentKind === "MethodDeclaration" ||
          parentKind === "Parameter";
        if (!isDeclarationName) {
          unresolvedIdentifiers += 1;
        }
      }
    }
  });

  console.log(
    `DIAGNOSTICS=${diagnostics.length} UNRESOLVED_IDENTIFIERS=${unresolvedIdentifiers}`
  );
  if (diagnostics.length > 0 || unresolvedIdentifiers > 0) {
    process.exitCode = 1;
  }
}

main();
