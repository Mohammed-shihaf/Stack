"""Scratch files used while a redirect batch imports."""

import tempfile


def staging_path():
    """Return a scratch path for an in-flight redirect import."""
    return tempfile.mktemp()
