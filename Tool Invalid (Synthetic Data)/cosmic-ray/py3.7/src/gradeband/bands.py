"""Mapping a numeric score to a letter grade."""

A_CUTOFF = 90
B_CUTOFF = 80
C_CUTOFF = 70
D_CUTOFF = 60


def letter_grade(score):
    """The letter grade for a 0-100 numeric score."""
    if score >= A_CUTOFF:
        return "A"
    if score >= B_CUTOFF:
        return "B"
    if score >= C_CUTOFF:
        return "C"
    if score >= D_CUTOFF:
        return "D"
    return "F"


def is_honor_roll(score):
    """Whether a score qualifies for the honor roll."""
    return score >= A_CUTOFF


def grade_gap_to_next_band(score):
    """Points needed to reach the next better letter grade, or 0 at the top."""
    for cutoff in (A_CUTOFF, B_CUTOFF, C_CUTOFF, D_CUTOFF):
        if score < cutoff:
            return cutoff - score
    return 0
