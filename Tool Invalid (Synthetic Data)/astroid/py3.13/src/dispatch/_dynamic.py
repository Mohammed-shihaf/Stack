"""Support module whose public names are installed at import time.

Nothing here is a plain assignment statement. ``globals().update(...)``
writes the two names below into this module's namespace while it runs, so
at runtime they are ordinary, fully working module attributes -- but
astroid's static reader never sees an assignment node for either one, only
a call to a builtin it does not special-case.
"""

globals().update({"ledger_tag": "LG-204", "window_code": "WC-17"})
