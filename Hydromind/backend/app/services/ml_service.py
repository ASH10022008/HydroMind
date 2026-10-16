from __future__ import annotations
import sys
from pathlib import Path
from typing import Optional, Dict, Any

from app.core.config import ML_DIR, MODEL_PATH, ROOT_DIR

# Ensure ml package is resolvable on sys.path
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

try:
    from ml.inference import HydromindModel
    from ml.preprocessing import voltage_to_ntu, estimate_dissolved_oxygen, build_feature_vector, wqi_category
    from ml.feature_extractor import feature_dict_to_row
except ImportError as err:
    print(f"[ML Service] Warning: Direct ML import failed ({err}), using fallback loader")
    HydromindModel = None

class MLService:
    def __init__(self, model_path: Path = MODEL_PATH):
        self.model_path = model_path
        self._model_instance: Optional[Any] = None
        self._load_model()

    def _load_model(self) -> None:
        if HydromindModel is not None and self.model_path.exists():
            try:
                self._model_instance = HydromindModel(self.model_path)
                print(f"[ML Service] Successfully loaded RandomForestRegressor from {self.model_path}")
            except Exception as e:
                print(f"[ML Service] Error loading model from {self.model_path}: {e}")
                self._model_instance = None
        else:
            print(f"[ML Service] Model file not found at {self.model_path}. Using fallback heuristic.")

    def predict(
        self,
        temperature_c: float,
        turbidity_voltage: float,
        hue_angle: Optional[float] = None,
        color: Optional[str] = None,
        image_bytes: Optional[bytes] = None,
    ) -> Dict[str, Any]:
        """Runs WQI prediction using the trained ML model or physics pipeline."""
        # Clean inputs
        temp = float(temperature_c) if temperature_c is not None else 25.0
        v_turb = float(turbidity_voltage) if turbidity_voltage is not None else 2.8

        # 1. Use the trained RandomForestRegressor if available
        if self._model_instance is not None:
            try:
                # If image is provided, run full OpenCV feature extraction
                if image_bytes is not None:
                    return self._model_instance.predict(image_bytes, v_turb, temp)
                
                # Otherwise, construct optical features from edge-computed hue
                opencv_hue = (hue_angle / 2.0) if hue_angle is not None else 90.0
                opencv_sat = 110.0 if (color and color.lower() in ("green", "yellow", "cyan")) else 40.0
                opencv_val = 180.0
                clarity = 350.0 if v_turb > 2.5 else 120.0

                vector = build_feature_vector(
                    turbidity_voltage=v_turb,
                    temperature_c=temp,
                    hue_mean=opencv_hue,
                    saturation_mean=opencv_sat,
                    value_mean=opencv_val,
                    clarity_index=clarity,
                )
                raw_wqi = float(self._model_instance.model.predict(vector)[0])
                wqi = round(max(0.0, min(100.0, raw_wqi)), 1)
                label, severity = wqi_category(wqi)
                ntu = voltage_to_ntu(v_turb)
                do = estimate_dissolved_oxygen(temp, ntu, opencv_hue, opencv_sat)

                return {
                    "wqi": wqi,
                    "category": label,
                    "severity": severity,
                    "ntu": ntu,
                    "temperature_c": round(temp, 2),
                    "dissolved_o2": do,
                    "visual_features": {
                        "hue_mean": round(opencv_hue, 2),
                        "saturation_mean": round(opencv_sat, 2),
                        "value_mean": round(opencv_val, 2),
                        "clarity_index": round(clarity, 2),
                    },
                }
            except Exception as ex:
                print(f"[ML Service] Prediction failed ({ex}), falling back to deterministic formula")

        # 2. Heuristic fallback in case ML model is unavailable
        ntu = max(0.0, round((3.0 - max(0.5, min(3.0, v_turb))) / 2.5 * 1000.0, 2))
        temp_penalty = max(0.0, abs(temp - 26.0) * 1.5)
        turb_penalty = (ntu / 1000.0) * 60.0
        wqi = round(min(100.0, max(0.0, 10.0 + temp_penalty + turb_penalty)), 1)

        if wqi <= 30.0:
            category, severity = "Optimal", "good"
        elif wqi <= 60.0:
            category, severity = "Caution", "moderate"
        else:
            category, severity = "Closed", "critical"

        do = round(max(1.0, 14.6 - 0.33 * temp + 0.004 * (temp ** 2) - (ntu / 1000.0) * 2.5), 2)

        return {
            "wqi": wqi,
            "category": category,
            "severity": severity,
            "ntu": ntu,
            "temperature_c": round(temp, 2),
            "dissolved_o2": do,
            "visual_features": {
                "hue_mean": round((hue_angle or 0.0) / 2.0, 2),
                "saturation_mean": 50.0,
                "value_mean": 180.0,
                "clarity_index": 300.0,
            },
        }

ml_service = MLService()
