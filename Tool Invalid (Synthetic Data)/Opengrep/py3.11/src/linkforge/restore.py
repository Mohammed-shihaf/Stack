"""Restoring a redirect table from a cached snapshot."""

import pickle


def restore_table(blob):
    """Restore a redirect table from a pickled snapshot."""
    return pickle.loads(blob)
