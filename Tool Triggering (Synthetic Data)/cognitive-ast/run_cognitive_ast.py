#!/usr/bin/env python
"""cognitive-ast -- cognitive complexity from the stdlib `ast` module.

There is no PyPI distribution called `cognitive-ast`; the name resolves to
nothing under any spelling. It is implemented here directly, which is also why
it is one of the few primary tools that runs on Python 3.6 at all.

Scoring follows Campbell's rules: +1 for each control-flow break, +nesting for
each nested break, +1 for each boolean-operator sequence, no increment for the
structures that do not add understanding cost.

Written 3.6-clean: no dataclasses, no walrus, no f-string `=` specifier.
"""
from __future__ import print_function

import ast
import json
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SRC = os.path.join(ROOT, *"packages/domain/src".split("/"))
PKG = "orderlab"
THRESHOLD = 15

NESTING = (ast.If, ast.For, ast.While, ast.Try, ast.ExceptHandler)


class Scorer(ast.NodeVisitor):
    def __init__(self):
        self.score = 0
        self.depth = 0

    def _increment(self, nested):
        self.score += 1 + (self.depth if nested else 0)

    def _descend(self, node):
        self.depth += 1
        self.generic_visit(node)
        self.depth -= 1

    def visit_If(self, node):
        self._increment(True)
        for clause in node.orelse:
            if not isinstance(clause, ast.If):
                self.score += 1
                break
        self._descend(node)

    def visit_For(self, node):
        self._increment(True)
        self._descend(node)

    visit_AsyncFor = visit_For

    def visit_While(self, node):
        self._increment(True)
        self._descend(node)

    def visit_Try(self, node):
        self._increment(True)
        self._descend(node)

    def visit_ExceptHandler(self, node):
        self._increment(True)
        self._descend(node)

    def visit_BoolOp(self, node):
        self.score += 1
        self.generic_visit(node)

    def visit_IfExp(self, node):
        self._increment(True)
        self._descend(node)

    def visit_Lambda(self, node):
        self._descend(node)


def score_function(node):
    scorer = Scorer()
    for child in node.body:
        scorer.visit(child)
    return scorer.score


def walk(path):
    with open(path, "r") as handle:
        source = handle.read()
    try:
        tree = ast.parse(source, path)
    except SyntaxError as exc:
        return [{"file": path, "function": "<unparseable>", "line": exc.lineno,
                 "score": None, "error": str(exc)}]
    rows = []
    for node in ast.walk(tree):
        if isinstance(node, (ast.FunctionDef,)) or (
                hasattr(ast, "AsyncFunctionDef") and isinstance(node, ast.AsyncFunctionDef)):
            rows.append({
                "file": os.path.relpath(path, ROOT).replace(os.sep, "/"),
                "function": node.name,
                "line": node.lineno,
                "score": score_function(node),
            })
    return rows


def main():
    target = os.path.join(SRC, PKG)
    if not os.path.isdir(target):
        print("STATUS: SKIPPED")
        print("  tool   : cognitive-ast")
        print("  reason : source root %s not found" % target)
        return 3
    rows = []
    for dirpath, dirnames, filenames in os.walk(target):
        dirnames[:] = [d for d in dirnames if d != "__pycache__"]
        for name in sorted(filenames):
            if name.endswith(".py"):
                rows.extend(walk(os.path.join(dirpath, name)))
    rows.sort(key=lambda r: (-(r["score"] or 0), r["file"], r["function"]))
    over = [r for r in rows if (r["score"] or 0) > THRESHOLD]
    report = {
        "tool": "cognitive-ast",
        "threshold": THRESHOLD,
        "interpreter": "%d.%d.%d" % sys.version_info[:3],
        "functions": len(rows),
        "over_threshold": len(over),
        "worst": rows[:5],
        "rows": rows,
    }
    outdir = os.path.join(ROOT, "reports")
    if not os.path.isdir(outdir):
        os.makedirs(outdir)
    with open(os.path.join(outdir, "cognitive-ast.json"), "w") as handle:
        json.dump(report, handle, indent=2, sort_keys=True)
    print("cognitive-ast: %d functions, %d over threshold %d"
          % (len(rows), len(over), THRESHOLD))
    for row in rows[:5]:
        print("  %-28s %-30s %s" % (row["file"], row["function"], row["score"]))
    if not over:
        print("WARNING: nothing exceeded the threshold. The planted fixture "
              "classify_shipment should. Check that %s was actually scanned." % target)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
