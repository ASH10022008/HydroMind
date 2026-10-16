"""Central configuration for the Hydromind ML & CV pipeline.

Everything the training and inference stages must agree on lives here: the
frozen feature schema, sensor calibration constants, WQI risk bands and the
on-disk locations of the produced artefacts.
"""

from __future__ import annotations

from pathlib import Path

# --------------------------------------------------------------------------
# Paths
# --------------------------------------------------------------------------
ML_DIR = Path(__file__).resolve().parent
MODELS_DIR = ML_DIR / "models"
DATASETS_DIR = ML_DIR / "datasets"
NOTEBOOKS_DIR = ML_DIR / "notebooks"

DEFAULT_MODEL_PATH = MODELS_DIR / "hydromind_wqi_model.joblib"
DEFAULT_DATASET_PATH = DATASETS_DIR / "wqi_training_data.csv"

# --------------------------------------------------------------------------
# Feature schema (frozen)
#
# Order is baked into every trained model. The first three channels come from
# the ESP32 physical telemetry (DS18B20 + R-0913 turbidity probe); the last
# four are visual descriptors extracted from ESP32-CAM frames with OpenCV.
# --------------------------------------------------------------------------
FEATURE_NAMES = [
    "ntu",              # turbidity, Nephelometric Turbidity Units
    "temperature_c",    # DS18B20 water temperature, Celsius
    "dissolved_o2",     # estimated dissolved oxygen, mg/L
    "hue_mean",         # mean OpenCV HSV hue (0-180)
    "saturation_mean",  # mean OpenCV HSV saturation (0-255)
    "value_mean",       # mean OpenCV HSV value / brightness (0-255)
    "clarity_index",    # Laplacian variance (sharpness / clarity proxy)
]

TARGET_NAME = "wqi"

# --------------------------------------------------------------------------
# Sensor calibration
# --------------------------------------------------------------------------
TURBIDITY_CLEAR_VOLTAGE = 3.0     # ~clear water  (~0 NTU)
TURBIDITY_MAX_VOLTAGE = 0.5       # ~murky water  (~1000 NTU)
TURBIDITY_MAX_NTU = 1000.0

IDEAL_TEMP_C = 26.0               # ideal leisure-water temperature
TEMP_DEVIATION_SPAN_C = 15.0

DO_REFERENCE_MG_L = 9.0           # DO saturation reference at ideal temp

CLARITY_REFERENCE = 400.0         # Laplacian variance considered sharply clear
NTU_WATER_QUALITY_SPAN = 50.0     # NTU mapped onto the full 0-100 sub-index

# --------------------------------------------------------------------------
# WQI risk bands
#
# Hydromind WQI runs 0-100 where HIGHER = WORSE (more contamination).
#   0  - 30 : Optimal  (Safe)
#   31 - 60 : Caution  (Moderate risk)
#   61 - 100: Closed   (Hazardous / critical alert)
# --------------------------------------------------------------------------
WQI_BANDS = [
    (0.0, 30.0, "Optimal", "good"),
    (30.0, 60.0, "Caution", "moderate"),
    (60.0, 100.0, "Closed", "critical"),
]

# --------------------------------------------------------------------------
# Training hyper-parameters
# --------------------------------------------------------------------------
RANDOM_STATE = 42
N_SAMPLES = 8000
TEST_SIZE = 0.2
N_ESTIMATORS = 300
MAX_DEPTH = 14
MIN_SAMPLES_LEAF = 3
CV_FOLDS = 5

MODEL_VERSION = "1.0.0"
