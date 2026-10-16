import os
from pathlib import Path
from typing import List

# Paths
BACKEND_DIR = Path(__file__).resolve().parent.parent.parent
ROOT_DIR = BACKEND_DIR.parent
ML_DIR = ROOT_DIR / "ml"
MODEL_PATH = ML_DIR / "models" / "hydromind_wqi_model.joblib"

# API & Server Settings
PROJECT_NAME = "Hydromind WQI Backend"
VERSION = "1.0.0"
API_PREFIX = "/api"
PORT = int(os.getenv("PORT", 3000))
HOST = os.getenv("HOST", "0.0.0.0")

# CORS
CORS_ORIGINS: List[str] = ["*"]

# Leisure Water Quality Thresholds
WQI_OPTIMAL_THRESHOLD = 30.0
WQI_CAUTION_THRESHOLD = 60.0
TEMP_MIN_COMFORT_C = 20.0
TEMP_MAX_COMFORT_C = 32.0
TURBIDITY_CLEAR_VOLTAGE = 3.0
TURBIDITY_MAX_VOLTAGE = 0.5
