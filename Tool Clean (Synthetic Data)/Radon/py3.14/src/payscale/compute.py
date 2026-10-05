"""Tax and take-home computed by walking the bracket table."""

from payscale.brackets import BRACKETS


def tax_cents(gross_cents: int) -> int:
    """Progressive tax owed on a gross amount, in whole cents."""
    owed = 0
    lower = 0
    for bracket in BRACKETS:
        ceiling = bracket.ceiling_cents or gross_cents
        taxable = min(gross_cents, ceiling) - lower
        if taxable > 0:
            owed += taxable * bracket.rate_per_mille // 1000
        lower = ceiling
    return owed


def take_home_cents(gross_cents: int) -> int:
    """Gross amount less the progressive tax owed on it."""
    return gross_cents - tax_cents(gross_cents)
