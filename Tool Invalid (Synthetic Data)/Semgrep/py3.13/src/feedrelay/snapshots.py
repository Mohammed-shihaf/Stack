"""Restoring relay snapshots between process restarts."""

import pickle


def restore_snapshot(blob):
    """Restore a relay snapshot from a pickled blob."""
    return pickle.loads(blob)
