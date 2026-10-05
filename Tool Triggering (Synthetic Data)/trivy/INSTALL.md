# Trivy

Trivy is a standalone Go binary. It scans manifests and lockfiles, never the
interpreter, so the branch's Python version is irrelevant to it.

```
curl -sfL https://raw.githubusercontent.com/aquasecurity/trivy/main/contrib/install.sh \
  | sh -s -- -b /usr/local/bin
trivy --version
```

On this branch Trivy reads the manifest and `requirements-runtime.txt`, and
should report advisories against all five planted pins. It is the alternative
tool for the eight Dependency Risk (SCA) metrics, whose primary -- pip-audit --
cannot install on Python 3.7.

The runner exits 3 (SKIPPED) if `trivy` is not on `PATH`.
