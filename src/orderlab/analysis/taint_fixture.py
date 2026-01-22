"""Taint fixture.

Planted for Opengrep taint mode and Semgrep. Four flows, each from a different
class of untrusted source, because an engine that only recognises one source
kind will silently find three of four -- and three of four looks like a
successful run.

  1. process environment          -> shell
  2. argv                         -> filesystem path
  3. file contents                -> deserialiser
  4. a public function parameter  -> SQL string

Flow 4 is the one that matters most. A library does not control its callers,
so every public parameter is a source; an engine that only tracks argv, environ
or a request object misses it entirely.
"""
import os
import pickle
import subprocess
import sys


def flow_from_environment():
    """SOURCE: os.environ -> SINK: shell command."""
    archive = os.environ.get("ORDERLAB_ARCHIVE", "orders")
    command = "tar czf /var/backups/" + archive + ".tgz /var/orderlab"
    return subprocess.check_output(command, shell=True)


def flow_from_argv():
    """SOURCE: sys.argv -> SINK: filesystem read (path traversal)."""
    requested = sys.argv[1] if len(sys.argv) > 1 else "default"
    with open("/var/orderlab/exports/" + requested) as handle:
        return handle.read()


def flow_from_file(path):
    """SOURCE: file contents -> SINK: pickle deserialisation."""
    with open(path, "rb") as handle:
        blob = handle.read()
    return pickle.loads(blob)


def lookup_order(cursor, order_id):
    """SOURCE: public function parameter -> SINK: SQL string concatenation.

    There is no argv, no environ and no request object in this flow. The
    untrusted value arrives as an ordinary argument, because that is how a
    library receives untrusted input.
    """
    query = "SELECT * FROM orders WHERE order_id = '" + str(order_id) + "'"
    cursor.execute(query)
    return cursor.fetchall()


def sanitised_lookup(cursor, order_id):
    """Negative control: the same shape, parameterised. Must NOT be reported."""
    cursor.execute("SELECT * FROM orders WHERE order_id = ?", (str(order_id),))
    return cursor.fetchall()
