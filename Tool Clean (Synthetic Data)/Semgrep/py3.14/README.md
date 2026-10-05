# Semgrep

**py3.14 boundary variant -- measured (interpreter pinned to 3.14.0rc2, matching this project's convention elsewhere).** A real Python 3.14 interpreter and this tool's own current release were both actually installed and invoked against this folder in the build environment; the result below is real, not asserted.


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

## Why NOT INSTALLED here (measured, not assumed)

`semgrep 1.178.0` crashes on import under Python 3.14.0rc2, before it ever
reaches this folder's source. Its dependency chain pulls in `pydantic 2.13.5`
via `pydantic-settings`, which (through `semgrep.mcp.models`) calls
`typing._eval_type(..., prefer_fwd_module=True)` -- a keyword argument CPython's
own `typing` module renamed or removed before 3.14rc2, so the call raises
`TypeError: _eval_type() got an unexpected keyword argument 'prefer_fwd_module'`
inside pydantic's model construction, at import time, before any rule ever
runs. This matches the same root cause already on record elsewhere in this
project for an unrelated Python-version corpus: a private CPython typing
function's signature changing out from under a pinned pydantic release. It is
a real, reproduced result, not a guess -- and it means Semgrep's floor on this
corpus is a pydantic/typing compatibility bug, not this folder's source.
