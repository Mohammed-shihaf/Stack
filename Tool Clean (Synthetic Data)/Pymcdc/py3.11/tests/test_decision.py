"""The four MC/DC cases, one independence pair per condition."""

from eligibility import Applicant, is_eligible

# Baseline: every condition true, decision true.
BASE = Applicant(has_income=True, is_resident=True, has_guarantor=False)


def test_baseline_is_eligible() -> None:
    assert is_eligible(BASE) is True


def test_income_independence() -> None:
    """Flipping has_income alone flips the decision."""
    flipped = Applicant(has_income=False, is_resident=True,
                        has_guarantor=False)
    assert is_eligible(flipped) is False


def test_resident_independence() -> None:
    """With no guarantor, flipping is_resident alone flips the decision."""
    flipped = Applicant(has_income=True, is_resident=False,
                        has_guarantor=False)
    assert is_eligible(flipped) is False


def test_guarantor_independence() -> None:
    """With no residency, flipping has_guarantor alone flips the decision."""
    without = Applicant(has_income=True, is_resident=False,
                        has_guarantor=False)
    with_guarantor = Applicant(has_income=True, is_resident=False,
                               has_guarantor=True)
    assert is_eligible(without) is False
    assert is_eligible(with_guarantor) is True
