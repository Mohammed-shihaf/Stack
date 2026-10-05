"""A single three-condition eligibility decision."""

from dataclasses import dataclass


@dataclass(frozen=True)
class Applicant:
    """The three facts the decision depends on."""

    has_income: bool
    is_resident: bool
    has_guarantor: bool


def is_eligible(applicant: Applicant) -> bool:
    """Eligible when there is income and either residency or a guarantor."""
    return applicant.has_income and (
        applicant.is_resident or applicant.has_guarantor
    )
