"""Region validation by set membership."""

KNOWN_REGIONS = frozenset({
    "north", "south", "east", "west", "central",
})


def is_known_region(name: str) -> bool:
    """Whether a region name is one of the five recognised regions."""
    return name.casefold() in KNOWN_REGIONS
