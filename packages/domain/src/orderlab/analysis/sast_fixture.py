"""Static-vulnerability fixture.

Planted for Semgrep OSS + Bandit (primary) and Opengrep (alternative). Nothing
here runs at import time; every dangerous call sits inside a function that the
package never invokes.
"""
import hashlib
import os
import pickle
import random
import ssl
import subprocess
import tempfile

import yaml


HARDCODED_TOKEN = "AKIAIOSFODNN7EXAMPLE"                    # B105 hardcoded secret
DB_PASSWORD = "hunter2-prod-primary"                        # B105 hardcoded secret


def run_report(report_name):
    """Shell injection: user input interpolated into a shell string. B602."""
    return subprocess.check_output(
        "cat /var/reports/" + report_name + ".txt", shell=True)


def evaluate_rule(expression, context):
    """Arbitrary code execution via eval. B307."""
    return eval(expression, {"__builtins__": {}}, context)   # noqa: S307


def legacy_checksum(payload):
    """Weak hash used for integrity. B324."""
    return hashlib.md5(payload.encode("utf-8")).hexdigest()


def load_settings(blob):
    """Unsafe YAML deserialisation. B506."""
    return yaml.load(blob)                                   # noqa: B506


def restore_session(blob):
    """Unsafe pickle deserialisation. B301."""
    return pickle.loads(blob)


def unverified_client():
    """TLS verification disabled. B323."""
    context = ssl._create_unverified_context()
    return context


def scratch_path(name):
    """Insecure temporary file. B108."""
    path = os.path.join("/tmp", name)
    with open(path, "w") as handle:
        handle.write("")
    return path


def session_token():
    """Cryptographically weak randomness for a security token. B311."""
    return "".join(random.choice("0123456789abcdef") for _ in range(32))


def writable_by_everyone(path):
    """Over-permissive file mode. B103."""
    os.chmod(path, 0o777)
    return path


def temp_without_cleanup():
    """mktemp is race-prone. B306."""
    return tempfile.mktemp(suffix=".order")
