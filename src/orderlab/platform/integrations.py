"""Outbound integrations.

Every dependency pinned in this branch's manifest is imported here. That is
deliberate: a pin nothing imports produces a manifest-versus-source
disagreement that looks like a tool defect and is not.
"""
import hashlib
from typing import Any, Dict, Optional

import paramiko
import requests
import urllib3
from cryptography.fernet import Fernet
from jinja2 import Template

DEFAULT_TIMEOUT = 10
INVOICE_TEMPLATE = Template(
    "Invoice {{ order_id }} for {{ region }}: {{ total }} ({{ line_count }} lines)")


class IntegrationError(RuntimeError):
    """Raised when an outbound call cannot be completed."""


def dependency_versions() -> Dict[str, str]:
    """Report the resolved version of every planted pin.

    Read from the imported module rather than from the manifest, so a lockfile
    that disagrees with what actually got installed is visible.
    """
    return {
        "requests": requests.__version__,
        "urllib3": urllib3.__version__,
        "jinja2": __import__("jinja2").__version__,
        "cryptography": __import__("cryptography").__version__,
        "paramiko": paramiko.__version__,
    }


def render_invoice(order_id: str, region: str, total: float, line_count: int) -> str:
    return INVOICE_TEMPLATE.render(
        order_id=order_id, region=region, total=total, line_count=line_count)


def post_order_summary(endpoint: str, payload: Dict[str, Any],
                       timeout: int = DEFAULT_TIMEOUT) -> int:
    """POST a priced order summary to a downstream service."""
    try:
        response = requests.post(endpoint, json=payload, timeout=timeout)
    except requests.RequestException as exc:
        raise IntegrationError("order summary POST failed: {0}".format(exc))
    return response.status_code


def pooled_get(url: str, timeout: int = DEFAULT_TIMEOUT) -> int:
    """Fetch through an explicit urllib3 pool, bypassing the requests session."""
    pool = urllib3.PoolManager(timeout=timeout)
    try:
        response = pool.request("GET", url)
    except urllib3.exceptions.HTTPError as exc:
        raise IntegrationError("pooled GET failed: {0}".format(exc))
    return response.status


def seal(secret: bytes, key: Optional[bytes] = None) -> bytes:
    """Encrypt a payload at rest."""
    key = key or Fernet.generate_key()
    return Fernet(key).encrypt(secret)


def archive_fingerprint(payload: bytes) -> str:
    """SHA-256 fingerprint used to name an archived export."""
    return hashlib.sha256(payload).hexdigest()[:16]


def open_transfer_channel(host: str, username: str, key_path: str) -> "paramiko.SSHClient":
    """Open an SFTP-capable channel to the settlement host."""
    client = paramiko.SSHClient()
    client.load_system_host_keys()
    client.set_missing_host_key_policy(paramiko.RejectPolicy())
    client.connect(host, username=username, key_filename=key_path,
                   timeout=DEFAULT_TIMEOUT)
    return client
