# Semgrep

**py3.7 boundary variant -- code-only.** No Python 3.7 interpreter exists in the available build environments (uv's python-build-standalone starts at 3.8). This source is verified, not asserted, to be valid here: `ast.parse(..., feature_version=(3,7))` passes, and this folder's own pytest suite runs unmodified and green under an available interpreter after downgrading builtin generic subscripting (`list[int]` etc., which needs 3.9+) to `typing.List`/`typing.Dict`/etc. It was not run against the real tool listed below.


Synthetic, clean-by-design Python project for **Semgrep**.

Domain: placeholder substitution in plain-text templates.

## What a passing result looks like

`semgrep --config=auto` reports 0 findings. Substitution is done with `str.replace` over an explicit allow-list of placeholder names -- never `eval`, `exec`, `str.format` on untrusted input, f-string interpolation of caller data into code, or a template engine with autoescaping disabled.

## Command

```bash
semgrep --config=semgrep-rules.yml --error --quiet src/
```

Expected: `0 findings`

## Layout

```text
plainquill/
  pyproject.toml      project root marker; zero dependencies
  src/plainquill/
    __init__.py
    tokens.py
    render.py
  tests/
    test_plainquill.py
  semgrep-rules.yml
```

## Notes

The tempting shortcut here is `template.format(**values)`, which Semgrep flags because attribute access in a format string can reach object internals. An explicit placeholder allow-list avoids the sink rather than suppressing the rule.

The folder ships its own `semgrep-rules.yml` rather than relying on `--config=auto`, because auto resolves the ruleset from `semgrep.dev`, which is refused at this environment's egress proxy (403 at the tunnel). A corpus whose clean result depends on a network fetch is not reproducible; a committed ruleset makes the claim exact, and it is the same choice the platform makes by shipping `tools/whitebox/python/semgrep-ruleset.yml` into its worker image. Run `--config=auto` as well wherever the registry is reachable.
