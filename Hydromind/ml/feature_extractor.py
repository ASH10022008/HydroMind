"""OpenCV computer-vision feature extraction for Hydromind.

The ESP32-CAM streams a JPEG frame alongside the physical telemetry. From that
frame we derive four compact visual descriptors describing colour, turbidity
and clarity of the water sample. These feed the RandomForest together with the
DS18B20 / R-0913 probe channels.
"""

from __future__ import annotations

from pathlib import Path
from typing import Mapping

import cv2
import numpy as np

FEATURE_KEYS = ("hue_mean", "saturation_mean", "value_mean", "clarity_index")


def _decode(image: bytes | np.ndarray | str | Path) -> np.ndarray | None:
    if isinstance(image, np.ndarray):
        return image
    if isinstance(image, (str, Path)):
        return cv2.imread(str(image), cv2.IMREAD_COLOR)
    buffer = np.frombuffer(image, np.uint8)
    return cv2.imdecode(buffer, cv2.IMREAD_COLOR)


def extract_image_features(
    image: bytes | np.ndarray | str | Path,
) -> dict[str, float]:
    """Extract HSV colour statistics and a clarity index from a frame.

    Parameters
    ----------
    image:
        Raw JPEG bytes from the ESP32-CAM, a file path, or an already decoded
        BGR ndarray.

    Returns
    -------
    dict
        ``hue_mean`` (0-180), ``saturation_mean`` (0-255), ``value_mean``
        (0-255) and ``clarity_index`` (variance of the Laplacian). A failed
        decode yields a neutral, all-zero mapping so callers can continue.
    """
    img = _decode(image)

    if img is None or img.size == 0:
        return {key: 0.0 for key in FEATURE_KEYS}

    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
    hue_mean = float(np.mean(hsv[:, :, 0]))
    saturation_mean = float(np.mean(hsv[:, :, 1]))
    value_mean = float(np.mean(hsv[:, :, 2]))

    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    clarity_index = float(cv2.Laplacian(gray, cv2.CV_64F).var())

    return {
        "hue_mean": round(hue_mean, 2),
        "saturation_mean": round(saturation_mean, 2),
        "value_mean": round(value_mean, 2),
        "clarity_index": round(clarity_index, 2),
    }


def feature_dict_to_row(features: Mapping[str, float]) -> dict[str, float]:
    """Fill in missing keys with zeros so every row matches the schema."""
    return {key: float(features.get(key, 0.0)) for key in FEATURE_KEYS}
