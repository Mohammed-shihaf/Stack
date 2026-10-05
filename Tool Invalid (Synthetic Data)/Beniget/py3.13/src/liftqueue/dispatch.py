"""Elevator dispatch bookkeeping for a single shaft.

Five of this module's identifier uses are genuinely unbound under beniget's
own def-use analysis, and each one is a real scoping defect rather than a
contrived one: a name read after `del`, a name read after the exception
variable an `except ... as name:` clause binds (which Python itself deletes
at the end of that clause), and a comprehension's loop variable read outside
the comprehension (which never leaks into the enclosing scope in Python 3).
All five are real bugs: every function below raises at call time exactly as
beniget's static analysis says it will, which the tests document.
"""

PRIORITY = 5


def record_request():
    """Record the current dispatch tag, then report it -- after clearing it."""
    tag = PRIORITY
    del tag
    return tag


def close_call(trigger):
    """Close out a maintenance call and report who raised it."""
    try:
        trigger()
    except RuntimeError as fault:
        pass
    return fault


def tally_requests(requests):
    """Collect the floors seen, then report the last one -- outside scope."""
    [floor for floor in requests]
    return floor


def audit_trail():
    """Audit a stalled call, chaining two names that are each cleared first."""
    try:
        1 / 0
    except ZeroDivisionError as cause:
        pass
    first = cause
    del first
    return first
