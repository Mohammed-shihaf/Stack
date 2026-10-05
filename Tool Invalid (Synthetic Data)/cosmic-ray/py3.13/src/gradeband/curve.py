"""Applying a flat curve bonus and checking a pass/fail cutoff."""

MAX_SCORE = 100
PASS_CUTOFF = 60


def apply_curve(score, bonus):
    """Add a flat bonus to a score, capped at the maximum score."""
    curved = score + bonus
    if curved > MAX_SCORE:
        return MAX_SCORE
    return curved


def passes(score, cutoff=PASS_CUTOFF):
    """Whether a score meets or exceeds the passing cutoff."""
    return score >= cutoff


def points_above_cutoff(score, cutoff=PASS_CUTOFF):
    """How many points a score is above the cutoff, floored at zero."""
    diff = score - cutoff
    if diff < 0:
        return 0
    return diff
