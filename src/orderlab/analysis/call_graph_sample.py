"""Call-graph fixture.

Planted for pyan3 + astroid and for Beniget's def-use chains. Contains one
five-deep linear chain and one two-node recursive cycle, so a graph tool has
both a depth answer and a cycle answer to report.

  entry_point -> stage_one -> stage_two -> stage_three -> stage_four
  ping <-> pong          (mutual recursion, depth-bounded)
"""


def stage_four(value):
    return value + 1


def stage_three(value):
    return stage_four(value) * 2


def stage_two(value):
    return stage_three(value) - 3


def stage_one(value):
    return stage_two(value) + stage_four(value)


def entry_point(value=1):
    """Depth-5 chain, and stage_four is reached by two distinct paths."""
    return stage_one(value)


def ping(depth):
    if depth <= 0:
        return "ping"
    return pong(depth - 1)


def pong(depth):
    if depth <= 0:
        return "pong"
    return ping(depth - 1)


def fan_out(values):
    """One caller, three callees -- a fan-out of 3 for coupling metrics."""
    return [entry_point(v) for v in values], ping(4), stage_three(0)
