"""Hand-ranking rules reached only through a computed attribute lookup.

Four of this module's five functions are never called by name anywhere in
this package: `score_flush`, `score_straight` and `score_pair` are reached
only through `dispatch_score`'s `getattr(module, "score_" + kind)`, a
computed attribute pyan3's static call-graph builder cannot resolve back to
any one of them, and `rank_hand` itself is never called from `src/` at all
(only from the test suite, which pyan3 never scans). Only `dispatch_score`
has a real, traceable incoming call edge, from `rank_hand`.
"""

import sys


def score_flush(hand: list) -> int:
    """Score a flush hand."""
    return 50


def score_straight(hand: list) -> int:
    """Score a straight hand."""
    return 40


def score_pair(hand: list) -> int:
    """Score a pair hand."""
    return 10


def dispatch_score(hand: list, kind: str) -> int:
    """Look up and call the scoring rule for `kind` by computed name."""
    module = sys.modules[__name__]
    rule = getattr(module, "score_" + kind)
    return rule(hand)


def rank_hand(hand: list, kind: str) -> int:
    """Rank a hand by delegating to the dispatch table."""
    return dispatch_score(hand, kind)
