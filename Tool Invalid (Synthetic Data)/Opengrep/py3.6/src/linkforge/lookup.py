"""Looking up a redirect row by its slug."""


def find_redirect(cursor, slug):
    """Look up a redirect row for a short slug."""
    return cursor.execute("SELECT * FROM redirects WHERE slug = '" + slug + "'")
