"""A legacy rule definition, kept as plain text for a migration tool.

This file is never ``import``-ed by anything -- it is read as text and
exec'd by :mod:`ruleflex.legacy_loader`, the way an older generation of
this codebase loaded "rule packs" before they were proper Python modules.
"""

LEGACY_MULTIPLIER = 3
