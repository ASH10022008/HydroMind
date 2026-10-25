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

FEATURE_KEYS = ("red_mean", "green_mean", "blue_mean", "clarity_index")


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
    """Extract RGB channel means and a clarity index from a frame.

    Parameters
    ----------
    image:
        Raw JPEG bytes from the ESP32-CAM, a file path, or an already decoded
        BGR ndarray.

    Returns
    -------
    dict
        ``red_mean``, ``green_mean`` and ``blue_mean`` (0-255), plus
        ``clarity_index`` (variance of the Laplacian). A failed decode yields
        an all-zero mapping so callers can continue.
    """
    img = _decode(image)

    if img is None or img.size == 0:
        return {key: 0.0 for key in FEATURE_KEYS}

    rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)

    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    clarity_index = float(cv2.Laplacian(gray, cv2.CV_64F).var())

    return {
        "red_mean": round(float(np.mean(rgb[:, :, 0])), 2),
        "green_mean": round(float(np.mean(rgb[:, :, 1])), 2),
        "blue_mean": round(float(np.mean(rgb[:, :, 2])), 2),
        "clarity_index": round(clarity_index, 2),
    }


def feature_dict_to_row(features: Mapping[str, float]) -> dict[str, float]:
    """Fill in missing keys with zeros so every row matches the schema."""
    return {key: float(features.get(key, 0.0)) for key in FEATURE_KEYS}
