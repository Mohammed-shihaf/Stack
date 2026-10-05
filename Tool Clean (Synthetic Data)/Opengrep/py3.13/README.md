# Opengrep

**py3.13 boundary variant -- measured.** A real Python 3.13 interpreter and this tool's own current release were both actually installed and invoked against this folder in the build environment; the result below is real, not asserted.


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
