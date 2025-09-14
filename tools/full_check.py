#!/usr/bin/env python3
"""Cross-file consistency audit. Runs with no third-party dependencies.

Rule groups, in the order the sibling corpora learned to need them:
  1  every trigger.yaml resolves to a runner that exists
  2  manifest / dataset.json / README agree on the target framework
  3  the planted package table matches the manifests
  4  README sections present and in order (matched to WHOLE LINES -- 'body.find("## Run")'
     matches inside '## Running here' and reported a spurious FAIL in the Python corpus)
  5  the duplicate pair is identical modulo names
  6  no empty source directories (an empty package is valid and invisible to every
     other gate; building the wheel is what exposed it in the Python corpus)
  7  all XML parses
  8  PROSE AUDIT: no line states a version other than this branch's
  9  no template placeholder survived into shipped output
"""
import json, os, re, sys, xml.etree.ElementTree as ET

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FAILS = []


def fail(rule, msg):
    FAILS.append("%s: %s" % (rule, msg))


def load_dataset():
    with open(os.path.join(ROOT, "dataset.json")) as fh:
        return json.load(fh)


def rule_triggers_resolve(ds):
    tools_dir = os.path.join(ROOT, "tools")
    for name in sorted(os.listdir(tools_dir)):
        d = os.path.join(tools_dir, name)
        if not os.path.isdir(d):
            continue
        trig = os.path.join(d, "trigger.yaml")
        if not os.path.exists(trig):
            fail("triggers", "%s has no trigger.yaml" % name)
            continue
        body = open(trig).read()
        m = re.search(r"^runner:\s*(\S+)", body, re.M)
        if not m:
            fail("triggers", "%s trigger.yaml declares no runner" % name)
        elif not os.path.exists(os.path.join(ROOT, m.group(1))):
            fail("triggers", "%s runner %s does not exist" % (name, m.group(1)))
    declared = {t["slug"] for t in ds["tools"]}
    on_disk = {n for n in os.listdir(tools_dir)
               if os.path.isdir(os.path.join(tools_dir, n))}
    if declared - on_disk:
        fail("triggers", "declared but absent: %s" % sorted(declared - on_disk))
    if on_disk - declared:
        fail("triggers", "on disk but undeclared: %s" % sorted(on_disk - declared))


def rule_tfm_agrees(ds):
    tfm = ds["targetFramework"]
    for dirpath, _, names in os.walk(os.path.join(ROOT, "src")):
        for n in names:
            if n.endswith(".csproj"):
                body = open(os.path.join(dirpath, n)).read()
                if "<TargetFramework>" in body:
                    if "<TargetFramework>%s<" % tfm not in body:
                        fail("tfm", "%s does not target %s" % (n, tfm))
                elif "<TargetFrameworkVersion>" not in body:
                    fail("tfm", "%s declares no target framework at all" % n)


def rule_planted_matches(ds):
    planted = {p["id"]: p["version"] for p in ds["plantedFixtures"]["plantedPackages"]}
    found = {}
    for dirpath, _, names in os.walk(ROOT):
        if "/.git" in dirpath:
            continue
        for n in names:
            if n in ("packages.config", "paket.lock", "paket.dependencies",
                     "Directory.Packages.props") or n.endswith(".csproj"):
                body = open(os.path.join(dirpath, n), errors="replace").read()
                for pid, ver in planted.items():
                    if pid in body and ver in body:
                        found[pid] = True
    missing = set(planted) - set(found)
    if missing:
        fail("planted", "declared in dataset.json but in no manifest: %s" % sorted(missing))
    src = os.path.join(ROOT, "src")
    hits = 0
    for dirpath, _, names in os.walk(src):
        for n in names:
            if n.endswith(".cs"):
                body = open(os.path.join(dirpath, n), errors="replace").read()
                hits += sum(1 for pid in planted if pid in body)
    if hits < len(planted):
        fail("planted", "not every planted package is named in source; the TypeScript "
                        "corpus shipped declared-but-unimported packages and measured zero")


README_ORDER = ["## Branch", "## Cell", "## Target framework", "## Language version",
                "## Supported tools", "## Build", "## Test", "## Tool entry points",
                "## What is expected to fire"]


def rule_readme(ds):
    path = os.path.join(ROOT, "README.md")
    if not os.path.exists(path):
        fail("readme", "no README.md")
        return
    lines = open(path).read().splitlines()
    seen = [ln.strip() for ln in lines if ln.strip() in README_ORDER]
    if seen != [s for s in README_ORDER if s in seen]:
        fail("readme", "sections out of order: %s" % seen)
    for want in README_ORDER:
        if want not in seen:
            fail("readme", "missing section %s" % want)


def rule_duplicate_pair():
    a = b = None
    for dirpath, _, names in os.walk(os.path.join(ROOT, "src")):
        for n in names:
            if n == "DuplicateProcessorA.cs":
                a = open(os.path.join(dirpath, n)).read()
            if n == "DuplicateProcessorB.cs":
                b = open(os.path.join(dirpath, n)).read()
    if a is None or b is None:
        fail("duplicate", "the planted duplicate pair is not both present")
        return
    norm = lambda s: re.sub(r"\s+", " ", s.replace("DuplicateProcessorA", "X")
                                          .replace("DuplicateProcessorB", "X")).strip()
    if norm(a) != norm(b):
        fail("duplicate", "the pair is not identical modulo names")


def rule_no_empty_dirs():
    for base in ("src", "tools", "tests"):
        for dirpath, dirnames, names in os.walk(os.path.join(ROOT, base)):
            if not dirnames and not names:
                fail("empty", "empty directory %s" % os.path.relpath(dirpath, ROOT))


def rule_xml_parses():
    for dirpath, _, names in os.walk(ROOT):
        if "/.git" in dirpath:
            continue
        for n in names:
            if n.endswith((".csproj", ".props", ".config")) or n == "packages.config":
                p = os.path.join(dirpath, n)
                try:
                    ET.parse(p)
                except Exception as exc:
                    fail("xml", "%s does not parse: %s" % (os.path.relpath(p, ROOT), exc))


VER_RE = re.compile(r"\bnet(?:4[0-9]{1,2}|standard[0-9.]+|[0-9]+\.[0-9])\b")


def rule_prose(ds):
    """A claim in prose is checked against the artifact it claims about, or it may
    not name a version at all. The first draft of this rule in the Python corpus
    PASSED the bug it was written to catch, because it exempted any line containing
    the word 'family'. The distinction that works is arithmetic: count the versions
    on the line. A line naming several is a comparison and is allowed."""
    ours = ds["targetFramework"]
    allowed = ds.get("prose", {}).get("additionalVersionsAllowed", {})
    docs = [os.path.join(ROOT, "README.md")]
    for dirpath, _, names in os.walk(os.path.join(ROOT, "tools")):
        docs += [os.path.join(dirpath, n) for n in names if n.endswith(".md")]
    for doc in docs:
        if not os.path.exists(doc):
            continue
        rel = os.path.relpath(doc, ROOT)
        for i, line in enumerate(open(doc, errors="replace"), 1):
            found = set(VER_RE.findall(line))
            if len(found) == 1 and ours not in found:
                v = found.pop()
                if v not in allowed.get(rel, []):
                    fail("prose", "%s:%d states %s, not %s: %s"
                         % (rel, i, v, ours, line.strip()[:70]))


def rule_no_placeholders():
    for dirpath, _, names in os.walk(ROOT):
        if "/.git" in dirpath:
            continue
        for n in names:
            if n.endswith((".md", ".cs", ".csproj", ".json", ".yaml", ".sh", ".cake")):
                p = os.path.join(dirpath, n)
                body = open(p, errors="replace").read()
                for m in re.finditer(r"\{[A-Z_]{3,}\}", body):
                    fail("placeholder", "%s contains %s"
                         % (os.path.relpath(p, ROOT), m.group(0)))


def main():
    ds = load_dataset()
    rule_triggers_resolve(ds)
    rule_tfm_agrees(ds)
    rule_planted_matches(ds)
    rule_readme(ds)
    rule_duplicate_pair()
    rule_no_empty_dirs()
    rule_xml_parses()
    rule_prose(ds)
    rule_no_placeholders()
    if FAILS:
        print("FAIL (%d)" % len(FAILS))
        for f in FAILS:
            print("  -", f)
        return 1
    print("OK - 9 rule groups clean")
    return 0


if __name__ == "__main__":
    sys.exit(main())
