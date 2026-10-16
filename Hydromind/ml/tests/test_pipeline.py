"""Smoke tests for the Hydromind ML & CV pipeline.

Run from the project root::

    pytest ml/tests -q
"""

from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
import pytest

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))

from ml import config  # noqa: E402
from ml.dataset import compute_wqi, generate_dataset  # noqa: E402
from ml.feature_extractor import extract_image_features  # noqa: E402
from ml.preprocessing import (  # noqa: E402
    build_feature_vector,
    estimate_dissolved_oxygen,
    voltage_to_ntu,
    wqi_category,
)


def test_voltage_to_ntu_bounds():
    assert voltage_to_ntu(config.TURBIDITY_CLEAR_VOLTAGE) == 0.0
    assert voltage_to_ntu(config.TURBIDITY_MAX_VOLTAGE) == config.TURBIDITY_MAX_NTU
    assert 0.0 <= voltage_to_ntu(1.75) <= config.TURBIDITY_MAX_NTU


def test_dissolved_oxygen_decreases_with_temperature():
    cold = estimate_dissolved_oxygen(10.0, 0.0)
    warm = estimate_dissolved_oxygen(30.0, 0.0)
    assert cold > warm > 0.0


def test_build_feature_vector_shape():
    vector = build_feature_vector(2.7, 24.5, 60.0, 40.0, 120.0, 250.0)
    assert vector.shape == (1, len(config.FEATURE_NAMES))


def test_wqi_categories():
    assert wqi_category(10.0)[0] == "Optimal"
    assert wqi_category(45.0)[0] == "Caution"
    assert wqi_category(80.0)[0] == "Closed"


def test_dataset_schema_and_range():
    frame = generate_dataset(n_samples=200, seed=1)
    assert list(frame.columns) == config.FEATURE_NAMES + [config.TARGET_NAME]
    assert frame[config.TARGET_NAME].between(0, 100).all()


def test_compute_wqi_monotonic_in_turbidity():
    base = generate_dataset(n_samples=50, seed=2)
    clear = base.copy()
    clear["ntu"] = 0.0
    murky = base.copy()
    murky["ntu"] = 500.0
    assert compute_wqi(clear).mean() < compute_wqi(murky).mean()


def test_extract_image_features_on_synthetic_frame():
    cv2 = pytest.importorskip("cv2")
    frame = np.full((120, 160, 3), (60, 140, 30), dtype=np.uint8)
    features = extract_image_features(frame)
    assert set(features) == {"hue_mean", "saturation_mean", "value_mean", "clarity_index"}


def test_extract_image_features_handles_garbage():
    features = extract_image_features(b"not-an-image")
    assert features["clarity_index"] == 0.0
