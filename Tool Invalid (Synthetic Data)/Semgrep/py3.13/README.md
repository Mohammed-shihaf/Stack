# Semgrep

**py3.13 boundary variant -- measured.** semgrep 1.178.0 actually installed
and invoked against this folder, under Python 3.13.13. Identical result to
py3.11: all 10 rule IDs fire, exit code 1.

Synthetic Python project for **Semgrep**, deliberately engineered to fail.

Domain: a webhook feed relay forwarding subscriber notifications.

## What a genuinely wrong result looks like

`semgrep --config=semgrep-rules.yml` reports a real, distinct finding for
every one of the ruleset's 10 rule IDs: `eval()` evaluating a subscriber
filter, `os.system()` shelling out to rsync a mirror, `pickle.loads()`
restoring a relay snapshot, `hashlib.sha1()` fingerprinting a payload,
`tempfile.mktemp()` for a batch scratch path, `template.format(**values)`
rendering a notice, string-concatenated SQL in a subscription lookup,
`urllib.request.urlopen()` with no timeout fetching a feed, a bare `assert`
validating a response, and a hardcoded relay API key.

## Command

```bash
semgrep --config=semgrep-rules.yml --error --quiet src/
```

Expected: 10 findings, one per rule ID; exit code 1.

## Layout

```text
feedrelay/
  pyproject.toml          project root marker; zero dependencies
  semgrep-rules.yml        copied byte-for-byte from the clean corpus
  src/feedrelay/
    __init__.py
    evaluator.py           no-eval-or-exec
    shell.py               no-os-command
    snapshots.py           no-unsafe-deserialisation
    fingerprint.py         no-weak-hash
    scratch.py             no-insecure-temp-file
    notify.py              no-format-string-template-injection
    records.py             no-string-built-sql
    fetch.py               no-request-without-timeout
    validate.py            no-assert-in-source
    settings.py             no-hardcoded-secret
    stats.py                clean -- not matched by any rule
  tests/
    test_feedrelay.py
```

## Notes

The folder ships its own `semgrep-rules.yml` rather than `--config=auto`,
for the same reproducibility reason the clean corpus gives: `auto` resolves
from semgrep.dev, which this environment's egress proxy refuses. `fetch.py`
uses stdlib `urllib.request` rather than the third-party `requests` package
specifically so the fixture keeps zero third-party dependencies while still
matching the `no-request-without-timeout` rule, which covers both.

