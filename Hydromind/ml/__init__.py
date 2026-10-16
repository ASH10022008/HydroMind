"""Hydromind ML & CV pipeline.

Modules
-------
config            Feature schema, calibration constants, WQI bands, paths.
preprocessing     Raw telemetry -> NTU / dissolved-oxygen physics.
feature_extractor OpenCV HSV + clarity descriptors from ESP32-CAM frames.
dataset           Synthetic labelled dataset generation.
train             RandomForestRegressor training and evaluation.
inference         Runtime prediction wrapper used by the FastAPI backend.
"""

from __future__ import annotations

__version__ = "1.0.0"
