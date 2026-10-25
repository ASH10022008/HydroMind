"""Physics pre-processing for Hydromind raw telemetry.

Turns raw ESP32 signals (analog turbidity voltage, DS18B20 temperature and a
few frame statistics from OpenCV) into the physically meaningful channels the
RandomForestRegressor consumes.
"""

from __future__ import annotations

import numpy as np

from . import config


def color_category(red: float, green: float, blue: float) -> str:
    """Classify averaged RGB channels into the three demo colors."""
    red, green, blue = (
        float(np.clip(channel, 0.0, 255.0))
        for channel in (red, green, blue)
    )
    if max(red, green, blue) == 0.0:
        return "Brown"
    if (
        green > blue
        and green >= blue * config.GREEN_BLUE_RATIO
        and green >= red * config.GREEN_RED_RATIO
    ):
        return "Green"
    if (
        blue > red
        and blue >= red * config.BLUE_RED_RATIO
        and blue >= green * config.BLUE_GREEN_RATIO
    ):
        return "Blue"
    return "Brown"


def voltage_to_ntu(turbidity_voltage: float) -> float:
    """Convert an R-0913 analog voltage into Nephelometric Turbidity Units.

    The probe is calibrated so ~3.0 V is clear water and ~0.5 V is highly
    turbid water. The response is treated as linear within that window.
    """
    clamped = float(
        np.clip(
            turbidity_voltage,
            config.TURBIDITY_MAX_VOLTAGE,
            config.TURBIDITY_CLEAR_VOLTAGE,
        )
    )
    span = config.TURBIDITY_CLEAR_VOLTAGE - config.TURBIDITY_MAX_VOLTAGE
    ntu = (config.TURBIDITY_CLEAR_VOLTAGE - clamped) / span * config.TURBIDITY_MAX_NTU
    return round(max(0.0, float(ntu)), 2)


def estimate_dissolved_oxygen(
    temperature_c: float,
    ntu: float,
    red_mean: float = 0.0,
    green_mean: float = 0.0,
    blue_mean: float = 0.0,
) -> float:
    """Estimate dissolved oxygen (mg/L) from temperature and visual cues.

    A temperature-based solubility curve gives the baseline (Henry's-law
    approximation). Turbidity and green algae blooms apply penalties because
    both displace oxygen and indicate organic load.
    """
    temp = float(temperature_c)
    base_do = 14.6 - 0.33 * temp + 0.004 * (temp ** 2)
    base_do = float(np.clip(base_do, 3.0, 12.0))

    turbidity_penalty = (ntu / config.TURBIDITY_MAX_NTU) * 2.5

    algae_penalty = 0.0
    if color_category(red_mean, green_mean, blue_mean) == "Green":
        algae_penalty = (float(np.clip(green_mean, 0.0, 255.0)) / 255.0) * 2.0

    do = max(1.0, base_do - turbidity_penalty - algae_penalty)
    return round(float(do), 2)


def build_feature_vector(
    turbidity_voltage: float,
    temperature_c: float,
    red_mean: float,
    green_mean: float,
    blue_mean: float,
    clarity_index: float,
) -> np.ndarray:
    """Assemble the frozen 7-D feature vector expected by the model."""
    ntu = voltage_to_ntu(turbidity_voltage)
    do = estimate_dissolved_oxygen(
        temperature_c, ntu, red_mean, green_mean, blue_mean
    )
    row = [
        ntu,
        temperature_c,
        do,
        red_mean,
        green_mean,
        blue_mean,
        clarity_index,
    ]
    return np.asarray([row], dtype=np.float64)


def wqi_category(wqi: float) -> tuple[str, str]:
    """Map a WQI value to its ``(label, severity)`` risk band."""
    value = float(np.clip(wqi, 0.0, 100.0))
    for low, high, label, severity in config.WQI_BANDS:
        if low <= value <= high:
            return label, severity
    return config.WQI_BANDS[-1][2], config.WQI_BANDS[-1][3]
