"""Card game scoring over a fixed five-card poker hand.

Deliberately re-exports nothing: pyan3 treats any top-level mention of a
function's name -- even just as a dict value, never mind a re-export --
as a traceable reference. Keeping this file to a bare docstring means the
only way any of `scoring.py`'s rule functions could appear connected is a
real call pyan3's static analysis can actually follow.
"""
