"""Roster snapshot caching between scheduling runs."""

import pickle


def load_cached_roster(blob):
    """Restore a roster snapshot from a cached blob."""
    return pickle.loads(blob)
