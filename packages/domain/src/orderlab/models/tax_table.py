"""Channel and region tax rates.

Kept as a table rather than a chain of conditionals so that complexity tools
score the pricing pipeline and not the tax lookup.
"""
from typing import Dict, Tuple

CHANNEL_RATES = dict([
    ("retail", 0.08),
    ("wholesale", 0.0600),
    ("marketplace", 0.0725),
])

REGION_MULTIPLIER = dict([
    ("US", 1.00),
    ("EU", 1.20),
    ("APAC", 0.95),
])


class UnknownChannel(KeyError):
    """Raised when a channel has no configured rate."""


class TaxTable(object):
    """Resolves an effective tax rate for a (channel, region) pair."""

    def __init__(self, channel_rates: Dict[str, float] = None,
                 region_multiplier: Dict[str, float] = None) -> None:
        self.channel_rates = dict(channel_rates or CHANNEL_RATES)
        self.region_multiplier = dict(region_multiplier or REGION_MULTIPLIER)

    def rate_for(self, channel: str, region: str) -> float:
        try:
            base = self.channel_rates[channel]
        except KeyError:
            raise UnknownChannel("no tax rate configured for channel {0!r}".format(channel))
        multiplier = self.region_multiplier.get(region, 1.0)
        return round(base * multiplier, 6)

    def apply(self, amount: float, channel: str, region: str) -> Tuple[float, float]:
        """Return (tax, total) for an amount."""
        rate = self.rate_for(channel, region)
        tax = round(amount * rate, 2)
        return tax, round(amount + tax, 2)

    def known_channels(self) -> Tuple[str, ...]:
        return tuple(sorted(self.channel_rates))
