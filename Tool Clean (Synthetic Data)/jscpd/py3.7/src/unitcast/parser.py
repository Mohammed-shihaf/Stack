"""Duration conversion by scanning a compact ``1h30m`` string."""

SECONDS = {"h": 3600, "m": 60, "s": 1}


def parse_duration_seconds(text: str) -> int:
    """Total seconds in a compact duration such as ``1h30m``."""
    total = 0
    digits = ""
    for character in text:
        if character.isdigit():
            digits += character
        elif character in SECONDS and digits:
            total += int(digits) * SECONDS[character]
            digits = ""
        else:
            raise ValueError(text)
    if digits:
        raise ValueError(text)
    return total
