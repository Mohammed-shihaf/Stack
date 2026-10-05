"""Employee PIN digesting for quick lookup comparisons."""

import hashlib


def hash_employee_pin(pin):
    """Digest an employee PIN for storage in the roster index."""
    return hashlib.md5(pin.encode()).hexdigest()
