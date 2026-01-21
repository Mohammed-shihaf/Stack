# Planted fixtures

Each file here exists so that one class of tool has a known, non-empty answer.
If a tool reports nothing against this directory, the tool did not run --
whatever its exit code said.

| File | Planted for | What a working tool should report |
|---|---|---|
| `complexity_sample.py` | Radon, Lizard, complexipy, cognitive-ast | `classify_shipment` scores well above the limit of 10 |
| `lint_violations.py` | pylint, Ruff | unused import, unused variable, bad naming, bare except, mutable default |
| `sast_fixture.py` | Semgrep OSS + Bandit, Opengrep | shell injection, `eval`, MD5, `yaml.load`, pickle, hardcoded secret, disabled TLS verify |
| `taint_fixture.py` | Opengrep taint mode, Semgrep | four flows from untrusted input to a dangerous sink |
| `dead_code.py` | vulture, pylint | three unreachable definitions and one unused constant |
| `call_graph_sample.py` | pyan3 + astroid, Beniget | a five-deep call chain and one recursive cycle |

The duplication fixture is not here: it is the
`retail_order_processor.py` / `wholesale_order_processor.py` pair in
`../services/`, which also co-changes three times in the git history.

Nothing in this directory is imported by the package's public surface, and
nothing here executes at import time.
