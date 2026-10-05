"""Warehouse dispatch ledger operations.

Four of the six non-builtin identifiers read below are things real astroid
genuinely cannot resolve by static inspection alone: two names whose only
binding arrives through a wildcard import of a module that installs its
attributes with ``globals().update(...)`` instead of a plain assignment, a
value injected by ``exec``, and a name whose single assignment is removed
by ``del`` before the return that reads it. All four run correctly at
call time; only astroid's static picture of each is wrong.
"""

from dispatch._dynamic import *

exec("delta = 7")


def record_entry():
    """Report the dynamically installed ledger tag."""
    return ledger_tag


def report_window():
    """Report the dynamically installed window code."""
    return window_code


def apply_adjustment():
    """Report the adjustment amount injected into the module at import time."""
    return delta


def close_window(active):
    """Clear the window counter on close, then report its final value."""
    counter = 3
    if active:
        del counter
    return counter


def summarize(entries):
    """Return the running total of ledger entries."""
    return sum(entries)
