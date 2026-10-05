# pylint

**py3.11 boundary variant -- measured.** A real Python 3.11 interpreter and
this tool's own current release were both actually installed and invoked
against this folder in the build environment; the result below is real, not
asserted.

Synthetic Python project deliberately broken for **pylint**.

Domain: a helpdesk ticket queue and routing module.

## What a failing result looks like

```text
Your code has been rated at 4.86/10
```

34 messages total -- **1 error, 11 warning, 4 refactor, 18 convention** --
over 74 analysed statements. No `# pylint: disable` appears anywhere.

Highlights: `missing-module/class/function-docstring` everywhere (no
docstrings at all, the one hygiene rule deliberately broken here),
`unused-import` (`json`, `os`), `unused-variable` (x3), `invalid-name`
(`Pop`, `routeTicket`, `runExpr`), `broad-exception-caught`, `bare-except`,
`too-many-arguments`/`too-many-positional-arguments`/`too-many-branches` on
a 7-argument, 15-branch function, `eval-used`, `unspecified-encoding` +
`consider-using-with` on an unclosed `open()`, `global-statement`,
`dangerous-default-value`, and `function-redefined` (the one `error`-level
finding, from a second `def score(...)` later in the same module).

## Command

```bash
pylint src/deskqueue --fail-under=10
```

Tool version used: `pylint 4.1.1` (astroid 4.3.3).

## Layout

```text
deskqueue/
  pyproject.toml      project root marker; zero dependencies
  src/deskqueue/
    __init__.py
    tickets.py
    utils.py
  tests/
    test_deskqueue.py
```

## Notes

`--fail-under=10` is what turns 4.86/10 into a nonzero exit code. Every
finding above is real and unsuppressed; nothing is silenced with a disable
comment.
