# Opengrep

**py3.14 boundary variant -- NOT INSTALLED (interpreter 3.14.0rc2).** Same
binary-egress block as py3.11/py3.13. Semgrep stand-in measured: 10 of 10
rule IDs fire, identical to py3.11/py3.13.

Synthetic Python project for **Opengrep**, deliberately engineered to fail.

Domain: a short-link redirect service (URL shortener/forwarder).

## What a genuinely wrong result looks like

No live Opengrep binary in this environment (egress-blocked, same as the
clean corpus). Standing in with Semgrep against the same committed
`semgrep-rules.yml`: `eval()` expanding a stored macro, `os.system()` purging
expired redirects, `pickle.loads()` restoring a redirect table,
`hashlib.md5()` deriving a slug, `tempfile.mktemp()` for a staging path,
`template.format(**values)` rendering a landing page, string-concatenated
SQL in a redirect lookup, `urllib.request.urlopen()` with no timeout
fetching a preview, a bare `assert` checking a destination, and a hardcoded
forge API token.

## Command

```bash
opengrep --config=semgrep-rules.yml --error src/
```

Expected (when a real binary is available): 10 findings, one per rule ID.
Measured here instead with the stand-in below.

## Layout

```text
linkforge/
  pyproject.toml          project root marker; zero dependencies
  semgrep-rules.yml        same committed ruleset as the Semgrep folder
  src/linkforge/
    __init__.py
    expand.py              no-eval-or-exec
    purge.py                no-os-command
    restore.py              no-unsafe-deserialisation
    slugs.py                no-weak-hash
    staging.py               no-insecure-temp-file
    pages.py                 no-format-string-template-injection
    lookup.py                 no-string-built-sql
    preview.py                 no-request-without-timeout
    health.py                   no-assert-in-source
    settings.py                  no-hardcoded-secret
    stats.py                      clean -- not matched by any rule
  tests/
    test_linkforge.py
```

## Notes

Opengrep is a standalone binary and its release host is refused at this
environment's egress proxy, so it could not be invoked here -- identical
situation to the clean corpus's own Opengrep folder. Opengrep is the
Semgrep fork and shares the rule format, so this folder was measured with
`semgrep --config=semgrep-rules.yml` as a stand-in: **10 of 10 rule IDs
genuinely fired**. Re-run the real binary before treating this folder as
proven: a stand-in is evidence, not proof. The ruleset is committed rather
than fetched with `--config=auto`, which needs semgrep.dev and is 403 at
this proxy.

