"""Fingerprinting feed payloads for duplicate suppression."""

import hashlib


def fingerprint_payload(payload):
    """Compute a short fingerprint for a feed payload."""
    return hashlib.sha1(payload.encode()).hexdigest()
