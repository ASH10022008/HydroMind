# Hydromind ML & CV Pipeline

Edge-AI water quality intelligence: converts ESP32 sensor telemetry and
ESP32-CAM frames into a unified **Water Quality Index (WQI, 0-100)** using a
`RandomForestRegressor`.

Owned by **Shaurya (Machine Learning & Computer Vision)**.

## Pipeline

```
ESP32-CAM frame ──► OpenCV feature extractor ──► hue / saturation / value / clarity
DS18B20 temp    ──► physics pre-processing   ──► temperature_c
R-0913 voltage  ──► physics pre-processing   ──► NTU ──► dissolved O2
                                   │
                        7-D feature vector
                                   │
                     RandomForestRegressor
                                   │
                          WQI (0-100) + risk band
```

## WQI risk bands

| Range  | Category | Meaning              |
|--------|----------|----------------------|
| 0-30   | Optimal  | Safe                 |
| 31-60  | Caution  | Moderate risk        |
| 61-100 | Closed   | Hazardous / critical |

## Layout

```
ml/
├── config.py            # Feature schema, calibration, WQI bands, paths
├── preprocessing.py     # Voltage->NTU, dissolved-oxygen estimate, bands
├── feature_extractor.py # OpenCV HSV + clarity descriptors
├── dataset.py           # Synthetic labelled dataset generation
├── train.py             # RandomForestRegressor training + evaluation
├── inference.py         # HydromindModel runtime wrapper
├── tests/               # Pytest smoke tests
├── datasets/            # Generated training CSV + training log
├── notebooks/           # Experimentation notebooks
├── models/              # Saved model artefacts (.joblib + metadata)
└── requirements.txt
```

## Quickstart

```bash
cd Hydromind
python -m venv .venv
.venv\Scripts\activate            # Windows
pip install -r ml/requirements.txt

# 1. Train (writes ml/models/hydromind_wqi_model.joblib)
python -m ml.train

# 2. Predict
python -m ml.inference --turbidity-voltage 2.7 --temperature 24.5

# 3. Test
pytest ml/tests -q
```

## Using it from the backend

```python
from ml.inference import HydromindModel

engine = HydromindModel()
result = engine.predict(image_bytes, turbidity_voltage=2.7, temperature_c=24.5)
# {"wqi": 12.4, "category": "Optimal", "severity": "good", ...}
```

## Training on real data

`ml/dataset.py` generates physically-grounded synthetic samples. To train on
field data instead, provide a CSV with the columns from `config.FEATURE_NAMES`
plus `wqi`, then run:

```bash
python -m ml.train --reuse-dataset --dataset ml/datasets/wqi_training_data.csv
```

## Feature schema (frozen)

`ntu`, `temperature_c`, `dissolved_o2`, `hue_mean`, `saturation_mean`,
`value_mean`, `clarity_index`.
