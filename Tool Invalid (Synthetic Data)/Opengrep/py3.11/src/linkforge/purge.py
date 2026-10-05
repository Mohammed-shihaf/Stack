"""Purging expired redirect entries from disk."""

import os


def purge_expired(directory):
    """Purge expired redirect files from a cache directory."""
    return os.system("find " + directory + " -mtime +30 -delete")
