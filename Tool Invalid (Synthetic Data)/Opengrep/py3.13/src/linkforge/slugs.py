"""Deriving short slugs from destination URLs."""

import hashlib


def derive_slug(url):
    """Derive a short slug fingerprint for a destination URL."""
    return hashlib.md5(url.encode()).hexdigest()[:8]
