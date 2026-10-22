import math
from datetime import datetime, timedelta

# Baseline safe holding time at reference temperature (25°C) in hours, and Q10 temperature coefficient
BASE_HOURS = {
    "Cooked rice and grains": 6.0,
    "Dairy and paneer gravies": 4.0,
    "Bakery items": 24.0,
    "Fresh produce": 48.0,
    "General cooked food": 5.0
}

def calculate_safe_window(category: str, temperature_c: float) -> float:
    """
    Calculates the microbiological safe holding window in hours
    using temperature-dependent deterioration model:
    t_safe = t_base * 2^((25 - T) / 10), capped between 0.5h and 72h.
    """
    base_h = BASE_HOURS.get(category, 5.0)
    # Each 10°C increase halves shelf life; each 10°C decrease doubles it
    factor = math.pow(2.0, (25.0 - temperature_c) / 10.0)
    calculated_h = base_h * factor
    return max(0.5, round(calculated_h, 1))

def get_urgency_status(remaining_hours: float) -> tuple[str, str]:
    """
    Returns (urgency_code, label) based on remaining safe window.
    """
    if remaining_hours <= 2.0:
        return "critical", "Critical (< 2h)"
    elif remaining_hours <= 5.0:
        return "moderate", "Moderate (2-5h)"
    else:
        return "comfortable", "Comfortable (> 5h)"
