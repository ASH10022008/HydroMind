# Hydromind ML & CV Pipeline

Edge-AI water quality intelligence: converts ESP32 sensor telemetry and
ESP32-CAM frames into a unified **Water Quality Index (WQI, 0-100)** using a
`RandomForestRegressor`.

Owned by **Shaurya (Machine Learning & Computer Vision)**.

## Pipeline

```
ESP32-CAM frame / RGB means ──► RGB feature extractor ──► red / green / blue / clarity
DS18B20 temp               ──► physics pre-processing ──► temperature_c
R-0913 voltage             ──► physics pre-processing ──► NTU ──► dissolved O2
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

## Demo RGB classification

The averaged camera channels are classified directly from RGB: Blue when
`blue >= red * 1.05` and `blue >= green * 0.80`; Green when `green >= blue *
1.15` and `green >= red * 1.05`; otherwise Brown. The camera firmware averages
a center crop so surrounding background colors have less influence. For demo WQI labels, Blue
has the lowest color-risk contribution, Green a medium contribution, and
Brown the highest. This is a visual demonstration rule, not a water-safety
standard. Retrain the model with `python -m ml.train` after changing this
pipeline so its saved predictions use the updated labels.

## Layout

```
ml/
├── config.py            # Feature schema, calibration, WQI bands, paths
├── preprocessing.py     # Voltage->NTU, dissolved-oxygen estimate, bands
├── feature_extractor.py # OpenCV RGB + clarity descriptors
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
python -m ml.inference --turbidity-voltage 2.7 --temperature 24.5 --red-mean 20 --green-mean 45 --blue-mean 210

# 3. Test
pytest ml/tests -q
```

## Backend integration

The Node.js backend invokes the inference CLI for each new ESP32 telemetry
update and exposes the latest result through `GET /api/wqi`. It passes the
sensor temperature, turbidity voltage, and camera's averaged red, green, and
blue values. RGB means are used when a camera frame is not supplied.

```bash
node backend/server.js
```

## Training on real data

`ml/dataset.py` generates physically-grounded synthetic samples. To train on
field data instead, provide a CSV with the current RGB feature columns from
`config.FEATURE_NAMES` plus `wqi`, then run:

```bash
python -m ml.train --reuse-dataset --dataset ml/datasets/wqi_training_data.csv
```

## Feature schema (frozen)

`ntu`, `temperature_c`, `dissolved_o2`, `red_mean`, `green_mean`,
`blue_mean`, `clarity_index`.
