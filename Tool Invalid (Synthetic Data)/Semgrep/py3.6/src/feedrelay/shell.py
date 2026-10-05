"""Shelling out to refresh a mirrored feed directory."""

import os


def refresh_mirror(path):
    """Refresh the on-disk mirror for a feed directory."""
    return os.system("rsync -a " + path + " /var/mirror/")
