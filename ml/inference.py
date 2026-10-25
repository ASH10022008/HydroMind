"""Runtime inference wrapper for the Hydromind WQI model.

``HydromindModel`` combines raw ESP32 telemetry with an optional ESP32-CAM
frame into a unified Water Quality Index and risk category.

Usage (from the ``Hydromind`` project root)::

    python -m ml.inference --turbidity-voltage 2.7 --temperature 24.5
    python ml/inference.py --image frame.jpg --turbidity-voltage 0.9 --temperature 33
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import joblib
import numpy as np

if __package__ in (None, ""):
    sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
    from ml import config
    from ml.feature_extractor import extract_image_features, feature_dict_to_row
    from ml.preprocessing import (
        build_feature_vector,
        color_category,
        estimate_dissolved_oxygen,
        voltage_to_ntu,
        wqi_category,
    )
else:
    from . import config
    from .feature_extractor import extract_image_features, feature_dict_to_row
    from .preprocessing import (
        build_feature_vector,
        color_category,
        estimate_dissolved_oxygen,
        voltage_to_ntu,
        wqi_category,
    )


class HydromindModel:
    """Loads a persisted WQI regressor and predicts on live sensor payloads."""

    def __init__(self, model_path: Path | str = config.DEFAULT_MODEL_PATH):
        self.model_path = Path(model_path)
        if not self.model_path.exists():
            raise FileNotFoundError(
                f"No trained model at {self.model_path}. Run `python -m ml.train` first."
            )
        metadata_path = self.model_path.with_suffix(".metadata.json")
        if not metadata_path.exists():
            raise FileNotFoundError(
                f"No model metadata at {metadata_path}. Retrain with `python -m ml.train`."
            )
        metadata = json.loads(metadata_path.read_text(encoding="utf-8"))
        if metadata.get("feature_names") != config.FEATURE_NAMES:
            raise ValueError(
                "The saved model uses a different feature schema. "
                "Retrain with `python -m ml.train` before running inference."
            )
        self.model = joblib.load(self.model_path)

    def predict(
        self,
        image: bytes | np.ndarray | str | Path | None,
        turbidity_voltage: float,
        temperature_c: float,
        red_mean: float = 0.0,
        green_mean: float = 0.0,
        blue_mean: float = 0.0,
    ) -> dict:
        """Predict the WQI and risk category from one telemetry payload.

        Parameters
        ----------
        image:
            ESP32-CAM frame as raw JPEG bytes, a file path, a decoded BGR
            ndarray, or None when only physical telemetry is available.
        turbidity_voltage:
            Raw R-0913 analog voltage from the ESP32 ADC.
        temperature_c:
            DS18B20 water temperature in degrees Celsius.
        red_mean, green_mean, blue_mean:
            Optional averaged ESP32-CAM RGB channels (0-255), used when no
            image is supplied.
        """
        if image is not None:
            visual = extract_image_features(image)
        else:
            visual = feature_dict_to_row({
                "red_mean": red_mean,
                "green_mean": green_mean,
                "blue_mean": blue_mean,
            })

        vector = build_feature_vector(
            turbidity_voltage=turbidity_voltage,
            temperature_c=temperature_c,
            red_mean=visual["red_mean"],
            green_mean=visual["green_mean"],
            blue_mean=visual["blue_mean"],
            clarity_index=visual["clarity_index"],
        )

        raw_wqi = float(self.model.predict(vector)[0])
        wqi = float(np.clip(raw_wqi, 0.0, 100.0))
        label, severity = wqi_category(wqi)

        ntu = voltage_to_ntu(turbidity_voltage)
        dissolved_o2 = estimate_dissolved_oxygen(
            temperature_c,
            ntu,
            visual["red_mean"],
            visual["green_mean"],
            visual["blue_mean"],
        )

        return {
            "wqi": round(wqi, 1),
            "category": label,
            "severity": severity,
            "color": color_category(
                visual["red_mean"], visual["green_mean"], visual["blue_mean"]
            ),
            "ntu": ntu,
            "temperature_c": round(float(temperature_c), 2),
            "dissolved_o2": dissolved_o2,
            "visual_features": visual,
        }


def _parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run a single Hydromind WQI prediction.")
    parser.add_argument("--model-path", type=Path, default=config.DEFAULT_MODEL_PATH)
    parser.add_argument("--image", type=Path, default=None, help="Optional JPEG frame from the ESP32-CAM.")
    parser.add_argument("--turbidity-voltage", type=float, required=True, help="R-0913 analog voltage (0.5-3.0 V).")
    parser.add_argument("--temperature", type=float, required=True, help="DS18B20 temperature in Celsius.")
    parser.add_argument("--red-mean", type=float, default=0.0, help="Mean ESP32-CAM red channel (0-255).")
    parser.add_argument("--green-mean", type=float, default=0.0, help="Mean ESP32-CAM green channel (0-255).")
    parser.add_argument("--blue-mean", type=float, default=0.0, help="Mean ESP32-CAM blue channel (0-255).")
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> None:
    args = _parse_args(argv)

    image = args.image if args.image else None
    engine = HydromindModel(args.model_path)
    result = engine.predict(
        image,
        args.turbidity_voltage,
        args.temperature,
        args.red_mean,
        args.green_mean,
        args.blue_mean,
    )

    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
