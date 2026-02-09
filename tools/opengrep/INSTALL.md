# Opengrep

Opengrep is a standalone binary with its own parser, not a PyPI distribution,
so it carries an install note rather than a pin. It never loads the project
interpreter, which is why it is one of the few tools in this roster that runs
on a Python 3.6 branch at all.

```
curl -fsSL https://raw.githubusercontent.com/opengrep/opengrep/main/install.sh | bash
opengrep --version
```

The runner exits 3 (SKIPPED) if `opengrep` is not on `PATH`.
