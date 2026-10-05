"""A single three-condition irrigation decision."""

from dataclasses import dataclass


@dataclass(frozen=True)
class FieldState:
    """The three facts the decision depends on."""

    moisture_low: bool
    forecast_dry: bool
    override_on: bool


def should_irrigate(state: FieldState) -> bool:
    """Irrigate when moisture is low and either the forecast is dry or
    the manual override is on."""
    return state.moisture_low and (
        state.forecast_dry or state.override_on
    )
