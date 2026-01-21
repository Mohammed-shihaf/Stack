"""Lint fixture.

Planted for pylint and Ruff. Every violation below is intentional; the file is
excluded from the package's public surface and is never imported at runtime.
Do not "fix" it -- a clean run here means the linter did not look.
"""
import json          # noqa -- unused on purpose (F401 / W0611)
import os
import sys           # noqa -- unused on purpose (F401 / W0611)


UnusedConstant = 42          # invalid-name: should be UPPER_CASE (C0103)


def BadlyNamedFunction(InputValue, otherArg=[]):    # C0103, W0102 mutable default
    """Bad naming, a mutable default argument and an unused local."""
    unused_local = InputValue * 2                   # W0612 unused-variable
    otherArg.append(InputValue)
    result = 0
    for i in range(len(otherArg)):                  # C0200 consider-using-enumerate
        result += otherArg[i]
    return result


def swallow_everything(path):
    """A bare except that hides the failure entirely (W0702 / E722)."""
    try:
        with open(path) as handle:
            return handle.read()
    except:                                          # noqa: E722
        pass
    return None


def compare_singletons(value):
    """Identity comparisons written as equality (C0121)."""
    if value == None:                                # noqa: E711
        return "none"
    if value == True:                                # noqa: E712
        return "true"
    return "other"


def shadow_builtin(list, dict):                      # W0622 redefined-builtin
    """Two shadowed builtins and an f-string with no placeholders."""
    message = f"nothing interpolated here"           # noqa: F541
    return message, len(list), len(dict), os.sep
