"""Settings layers, merged lowest precedence first."""

from collections.abc import Mapping, Sequence
from typing import Dict


class Layer:
    """A named settings layer and its values."""

    def __init__(self, name, values):
        self.name = name
        self.values = values


def merge_layers(layers: Sequence[Layer]) -> Dict[str, str]:
    """Merge layers so later layers override earlier ones."""
    merged: Dict[str, str] = {}
    for layer in layers:
        merged.update(layer.values)
    return merged
