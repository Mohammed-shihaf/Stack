"""Fetching a destination page for link preview generation."""

import urllib.request


def fetch_preview(url):
    """Fetch the destination page for preview thumbnailing."""
    return urllib.request.urlopen(url)
