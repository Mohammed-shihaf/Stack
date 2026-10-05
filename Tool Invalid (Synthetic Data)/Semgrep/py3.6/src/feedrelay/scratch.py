"""Scratch file handling for in-flight feed batches."""

import tempfile


def batch_scratch_path():
    """Return a scratch path for an in-flight feed batch."""
    return tempfile.mktemp()
