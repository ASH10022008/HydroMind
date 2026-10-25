"""Smoke tests for the Hydromind ML & CV pipeline.

Run from the project root::

    pytest ml/tests -q
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

import numpy as np
import pytest

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))

from ml import config  # noqa: E402
from ml.dataset import compute_wqi, generate_dataset  # noqa: E402
from ml.feature_extractor import extract_image_features  # noqa: E402
from ml.inference import HydromindModel  # noqa: E402
from ml.preprocessing import (  # noqa: E402
    build_feature_vector,
    color_category,
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


def test_demo_color_rgb_classification():
    assert color_category(0.0, 0.0, 255.0) == "Blue"
    assert color_category(0.0, 255.0, 0.0) == "Green"
    assert color_category(15.0, 10.0, 20.0) == "Blue"
    assert color_category(40.0, 100.0, 90.0) == "Blue"
    assert color_category(40.0, 120.0, 100.0) == "Green"
    assert color_category(40.0, 140.0, 50.0) == "Green"
    assert color_category(150.0, 70.0, 25.0) == "Brown"
    assert color_category(100.0, 100.0, 100.0) == "Brown"
    assert color_category(0.0, 0.0, 0.0) == "Brown"


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


def test_demo_blue_has_lower_wqi_than_green_and_brown():
    sample = generate_dataset(n_samples=1, seed=3).drop(columns=[config.TARGET_NAME])
    sample["ntu"] = 120.0
    sample["temperature_c"] = 26.0
    sample["dissolved_o2"] = 8.0
    sample["clarity_index"] = 300.0
    blue = sample.assign(red_mean=10.0, green_mean=40.0, blue_mean=200.0)
    green = sample.assign(red_mean=20.0, green_mean=180.0, blue_mean=30.0)
    brown = sample.assign(red_mean=160.0, green_mean=70.0, blue_mean=25.0)

    blue_score = compute_wqi(blue).iloc[0]
    green_score = compute_wqi(green).iloc[0]
    brown_score = compute_wqi(brown).iloc[0]

    assert blue_score < green_score < brown_score


def test_extract_image_features_on_synthetic_frame():
    cv2 = pytest.importorskip("cv2")
    frame = np.full((120, 160, 3), (30, 140, 60), dtype=np.uint8)
    features = extract_image_features(frame)
    assert set(features) == {"red_mean", "green_mean", "blue_mean", "clarity_index"}
    assert (features["red_mean"], features["green_mean"], features["blue_mean"]) == (60.0, 140.0, 30.0)


def test_extract_image_features_handles_garbage():
    features = extract_image_features(b"not-an-image")
    assert features["clarity_index"] == 0.0


def test_inference_uses_firmware_rgb_without_image():
    class RecordingModel:
        def predict(self, vector):
            assert np.array_equal(vector[0, 3:6], [10.0, 40.0, 200.0])
            return np.array([25.0])

    engine = HydromindModel.__new__(HydromindModel)
    engine.model = RecordingModel()

    result = engine.predict(
        None, 2.7, 24.5, red_mean=10.0, green_mean=40.0, blue_mean=200.0
    )

    assert result["wqi"] == 25.0
    assert result["color"] == "Blue"


def test_model_rejects_metadata_from_old_hue_schema(tmp_path):
    model_path = tmp_path / "model.joblib"
    model_path.touch()
    metadata_path = model_path.with_suffix(".metadata.json")
    metadata_path.write_text(
        json.dumps({"feature_names": [
            "ntu", "temperature_c", "dissolved_o2", "hue_mean",
            "saturation_mean", "value_mean", "clarity_index",
        ]}),
        encoding="utf-8",
    )

    with pytest.raises(ValueError, match="different feature schema"):
        HydromindModel(model_path)
