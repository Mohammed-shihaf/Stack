# Opengrep

**py3.7 boundary variant -- code-only.** No Python 3.7 interpreter exists in the available build environments (uv's python-build-standalone starts at 3.8). This source is verified, not asserted, to be valid here: `ast.parse(..., feature_version=(3,7))` passes, and this folder's own pytest suite runs unmodified and green under an available interpreter after downgrading builtin generic subscripting (`list[int]` etc., which needs 3.9+) to `typing.List`/`typing.Dict`/etc. It was not run against the real tool listed below.


Synthetic, clean-by-design Python project for **Opengrep**.

Domain: URL slug construction from free text.

## What a passing result looks like

No rule matches. The package reaches no dangerous sink: no `os.system`, `subprocess`, `eval`, `exec`, `pickle`, `marshal`, `yaml.load`, `input`-to-sink flow, no string-built SQL, no request without a timeout, and no weak hash. There is no taint path because there is no sink to reach.

## Command

```bash
opengrep --config=semgrep-rules.yml --error src/
```

Expected: `0 findings`

## Layout

```text
slugsmith/
  pyproject.toml      project root marker; zero dependencies
  src/slugsmith/
    __init__.py
    normalise.py
    slug.py
  tests/
    test_slugsmith.py
  semgrep-rules.yml
```

## Notes

Opengrep is a standalone binary and its release host is refused at this environment's egress proxy, so it could not be invoked here. Opengrep is the Semgrep fork and shares the rule format, so this folder was measured with `semgrep --config=semgrep-rules.yml` as a stand-in and reported 0 findings. Re-run the real binary before treating this folder as proven: a stand-in is evidence, not proof. The ruleset is committed rather than fetched with `--config=auto`, which needs semgrep.dev and is 403 at this proxy.
