"""Fetching a subscriber-supplied feed URL."""

import urllib.request


def fetch_feed(url):
    """Fetch the raw bytes of a subscriber-supplied feed URL."""
    return urllib.request.urlopen(url)
