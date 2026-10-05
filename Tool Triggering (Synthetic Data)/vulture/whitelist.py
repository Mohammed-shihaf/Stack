"""vulture whitelist.

Names referenced only through the framework or through tests, which vulture
cannot see. The four planted dead definitions in analysis/dead_code.py are
deliberately NOT whitelisted -- vulture must report them.
"""
from_mapping = None
processed_count = None
known_channels = None
process_all = None
summary = None
health = None
quote = None
price_batch = None
handle = None
