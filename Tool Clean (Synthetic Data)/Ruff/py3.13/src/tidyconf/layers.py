"""Settings layers, merged lowest precedence first."""

from collections.abc import Mapping, Sequence
from dataclasses import dataclass


@dataclass(frozen=True)
class Layer:
    """A named settings layer and its values."""

    name: str
    values: Mapping[str, str]


def merge_layers(layers: Sequence[Layer]) -> dict[str, str]:
    """Merge layers so later layers override earlier ones."""
    merged: dict[str, str] = {}
    for layer in layers:
        merged.update(layer.values)
    return merged
