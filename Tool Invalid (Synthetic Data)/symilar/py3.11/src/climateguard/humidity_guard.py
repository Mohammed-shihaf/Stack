"""Humidity guard for greenhouse zone monitoring."""


def check_humidity_guard(reading, zone_name, alerts):
    """Evaluate a reading against the safe band for this guard."""
    if reading is None:
        alerts.append("missing reading for " + zone_name)
        return False
    if reading < 30.0:
        alerts.append("reading too low in " + zone_name)
        return False
    if reading > 85.0:
        alerts.append("reading too high in " + zone_name)
        return False
    alerts.append("reading nominal in " + zone_name)
    return True
