"""Shell-outs that refresh the published schedule."""

import subprocess


def sync_schedule(export_cmd):
    """Run the roster export command through the shell."""
    return subprocess.run(export_cmd, shell=True)
