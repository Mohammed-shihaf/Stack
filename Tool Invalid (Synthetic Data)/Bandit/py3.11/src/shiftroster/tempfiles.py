"""Scratch file handling for roster export jobs."""

import tempfile


def scratch_path():
    """Return a scratch file path for a one-off export."""
    return tempfile.mktemp()
