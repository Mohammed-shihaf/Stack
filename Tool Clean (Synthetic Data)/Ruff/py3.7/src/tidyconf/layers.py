"""Settings layers, merged lowest precedence first."""

from dataclasses import dataclass
from typing import Dict, Mapping, Sequence


@dataclass(frozen=True)
class Layer:
    """A named settings layer and its values."""

    name: str
    values: Mapping[str, str]


def merge_layers(layers: Sequence[Layer]) -> Dict[str, str]:
    """Merge layers so later layers override earlier ones."""
    merged: Dict[str, str] = {}
    for layer in layers:
        merged.update(layer.values)
    return merged
