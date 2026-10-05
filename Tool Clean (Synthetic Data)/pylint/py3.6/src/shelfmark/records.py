"""Catalogue record types."""


class BookRecord:
    """One catalogued book."""

    def __init__(self, shelfmark, title, copies):
        self.shelfmark = shelfmark
        self.title = title
        self.copies = copies

    def is_available(self):
        """Whether at least one copy is on the shelf."""
        return self.copies > 0
