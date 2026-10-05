# sys.settrace driver

A stdlib-only line tracer. It is the alternative tool for "Reporting Validation
/ Audit Trail Verification", and on this branch it carries more weight than
that: Coverage.py (primary for 40 metrics) and SlipCover (alternative for 22)
both refuse to install on Python 3.7, so this driver is still the only
coverage-shaped measurement available at all.

It is not a substitute for either. It measures executed lines against an
`ast`-derived statement set, with no branch or arc analysis, and it exercises a
fixed scenario rather than the test suite.
