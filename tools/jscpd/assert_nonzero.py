#!/usr/bin/env python3
"""Refuse a zero this runner cannot explain.

jscpd given `--format "c#"` warns on stderr, matches no files, writes a valid
report saying `clones: 0`, and exits 0. That is indistinguishable from a genuinely
clean repository unless something asserts the expected count -- the same shape as
the TypeScript corpus's OpenTelemetry bootstrap, which registered a no-op processor,
exported nothing and exited 0.

dataset.json declares the expected floor; this script enforces it.
"""
import json, sys

d = json.load(open(sys.argv[1]))
t = d["statistics"]["total"]
if t["sources"] == 0:
    sys.exit("STRUCTURALLY ZERO: jscpd matched no files. Check the --format token: "
             "'c#' is not a supported format and yields exit 0 with an empty report. "
             "The correct token is 'csharp'.")
if len(d["duplicates"]) < 1:
    sys.exit("STRUCTURALLY ZERO: the planted duplicate pair was not found, but "
             "dataset.json asserts jscpd.duplicates >= 1.")
print("jscpd: %d sources, %d clones, %.2f%% duplicated"
      % (t["sources"], len(d["duplicates"]), t["percentage"]))
