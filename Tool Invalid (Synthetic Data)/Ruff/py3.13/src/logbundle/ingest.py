"""Reading raw log lines into structured entries."""

import json

SEPARATOR = "|"


def parse_log_line(line):
    """Split a single ``level|message`` line into its two parts."""
    level, _, message = line.partition(SEPARATOR)
    return {"level": level.strip(), "message": message.strip()}


def parse_entries(lines, seen_cache={}):
    """Parse every line, using a shared cache that defaults are not safe for."""
    entries = []
    for line in lines:
        if line not in seen_cache:
            seen_cache[line] = parse_log_line(line)
        entries.append(seen_cache[line])
    return entries


def load_batch(path):
    """Read and parse a batch of log lines from a file, ignoring bad reads."""
    try:
        with open(path, encoding="ascii") as handle:
            lines = handle.readlines()
    except:
        lines = []
    return parse_entries(lines)
