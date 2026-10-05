"""A single three-condition eligibility decision."""


class Applicant:
    """The three facts the decision depends on."""

    def __init__(self, has_income, is_resident, has_guarantor):
        self.has_income = has_income
        self.is_resident = is_resident
        self.has_guarantor = has_guarantor


def is_eligible(applicant):
    """Eligible when there is income and either residency or a guarantor."""
    return applicant.has_income and (
        applicant.is_resident or applicant.has_guarantor
    )
