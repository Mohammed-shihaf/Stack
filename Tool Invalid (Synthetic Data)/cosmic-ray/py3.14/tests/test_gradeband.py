"""A weak test suite: loose assertions, success paths only."""

from gradeband import apply_curve, average, letter_grade, passes
from gradeband.bands import grade_gap_to_next_band, is_honor_roll
from gradeband.curve import points_above_cutoff
from gradeband.stats import highest, lowest


def test_letter_grade_is_a_known_letter():
    assert letter_grade(85) in ("A", "B", "C", "D", "F")


def test_is_honor_roll_true_case():
    assert is_honor_roll(95)


def test_grade_gap_to_next_band_non_negative():
    assert grade_gap_to_next_band(85) >= 0


def test_apply_curve_does_not_exceed_max():
    assert apply_curve(90, 20) <= 100


def test_passes_true_case():
    assert passes(75)


def test_points_above_cutoff_non_negative():
    assert points_above_cutoff(75) >= 0


def test_average_is_a_number():
    assert average([70, 80, 90]) > 0


def test_highest_and_lowest_are_present():
    scores = [70, 80, 90]
    assert highest(scores) in scores
    assert lowest(scores) in scores
