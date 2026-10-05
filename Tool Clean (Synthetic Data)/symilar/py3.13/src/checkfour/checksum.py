"""Account-number validation by weighted digit sum."""

MODULUS = 11


def has_valid_checksum(digits: str) -> bool:
    """Whether a digit string satisfies the weighted modulus-11 check."""
    if not digits.isdigit():
        return False
    weighted = 0
    weight = len(digits)
    for character in digits:
        weighted += int(character) * weight
        weight -= 1
    return weighted % MODULUS == 0
