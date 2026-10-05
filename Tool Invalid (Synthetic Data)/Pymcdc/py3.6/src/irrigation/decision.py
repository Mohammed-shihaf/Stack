"""A single three-condition irrigation decision."""


class FieldState:
    """The three facts the decision depends on."""

    def __init__(self, moisture_low, forecast_dry, override_on):
        self.moisture_low = moisture_low
        self.forecast_dry = forecast_dry
        self.override_on = override_on


def should_irrigate(state):
    """Irrigate when moisture is low and either the forecast is dry or
    the manual override is on."""
    return state.moisture_low and (
        state.forecast_dry or state.override_on
    )
