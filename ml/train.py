"""Train the Hydromind WQI regressor.

Usage (from the ``Hydromind`` project root)::

    python -m ml.train
    python ml/train.py --samples 12000 --no-cv

The script generates (or loads) a labelled dataset, fits a
``RandomForestRegressor`` on the frozen 7-D feature schema, evaluates it with a
held-out split and k-fold cross-validation, then persists the model, a metadata
file, the feature importances and a training log.
"""

from __future__ import annotations

import argparse
import json
import sys
import time
from pathlib import Path

import joblib
import numpy as np

if __package__ in (None, ""):
    sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
    from ml import config
    from ml.dataset import generate_dataset, load_dataset, save_dataset
else:
    from . import config
    from .dataset import generate_dataset, load_dataset, save_dataset

from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import KFold, cross_val_score, train_test_split


def _parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Train the Hydromind WQI model.")
    parser.add_argument("--samples", type=int, default=config.N_SAMPLES)
    parser.add_argument("--seed", type=int, default=config.RANDOM_STATE)
    parser.add_argument("--test-size", type=float, default=config.TEST_SIZE)
    parser.add_argument("--estimators", type=int, default=config.N_ESTIMATORS)
    parser.add_argument("--max-depth", type=int, default=config.MAX_DEPTH)
    parser.add_argument("--dataset", type=Path, default=config.DEFAULT_DATASET_PATH)
    parser.add_argument("--model-path", type=Path, default=config.DEFAULT_MODEL_PATH)
    parser.add_argument("--reuse-dataset", action="store_true", help="Load an existing CSV instead of regenerating.")
    parser.add_argument("--no-cv", action="store_true", help="Skip k-fold cross-validation.")
    return parser.parse_args(argv)


def _load_or_generate(args: argparse.Namespace):
    if args.reuse_dataset and args.dataset.exists():
        print(f"[data] loading existing dataset -> {args.dataset}")
        return load_dataset(args.dataset)

    print(f"[data] generating {args.samples} synthetic samples (seed={args.seed})")
    frame = generate_dataset(n_samples=args.samples, seed=args.seed)
    save_dataset(frame, args.dataset)
    print(f"[data] saved dataset -> {args.dataset}")
    return frame


def train(args: argparse.Namespace) -> dict:
    started = time.time()
    frame = _load_or_generate(args)

    feature_names = config.FEATURE_NAMES
    missing = [name for name in feature_names if name not in frame.columns]
    if missing:
        raise ValueError(f"Dataset missing feature columns: {missing}")
    if config.TARGET_NAME not in frame.columns:
        raise ValueError(f"Dataset missing target column: {config.TARGET_NAME!r}")

    x = frame[feature_names].to_numpy(dtype=np.float64)
    y = frame[config.TARGET_NAME].to_numpy(dtype=np.float64)

    x_train, x_test, y_train, y_test = train_test_split(
        x, y, test_size=args.test_size, random_state=args.seed
    )

    model = RandomForestRegressor(
        n_estimators=args.estimators,
        max_depth=args.max_depth,
        min_samples_leaf=config.MIN_SAMPLES_LEAF,
        random_state=args.seed,
        n_jobs=-1,
    )
    model.fit(x_train, y_train)

    predictions = model.predict(x_test)
    metrics = {
        "mae": float(mean_absolute_error(y_test, predictions)),
        "rmse": float(np.sqrt(mean_squared_error(y_test, predictions))),
        "r2": float(r2_score(y_test, predictions)),
    }

    if not args.no_cv:
        print(f"[eval] {config.CV_FOLDS}-fold cross-validation ...")
        cv = KFold(n_splits=config.CV_FOLDS, shuffle=True, random_state=args.seed)
        cv_scores = cross_val_score(model, x, y, cv=cv, scoring="r2", n_jobs=-1)
        metrics["cv_r2_mean"] = float(cv_scores.mean())
        metrics["cv_r2_std"] = float(cv_scores.std())

    importances = sorted(
        zip(feature_names, model.feature_importances_.tolist()),
        key=lambda pair: pair[1],
        reverse=True,
    )

    args.model_path.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(model, args.model_path)

    metadata = {
        "model_version": config.MODEL_VERSION,
        "feature_names": feature_names,
        "target": config.TARGET_NAME,
        "n_samples": int(len(frame)),
        "n_estimators": args.estimators,
        "max_depth": args.max_depth,
        "seed": args.seed,
        "metrics": metrics,
        "feature_importances": dict(importances),
        "wqi_bands": [
            {"low": low, "high": high, "label": label, "severity": severity}
            for low, high, label, severity in config.WQI_BANDS
        ],
        "trained_at": time.strftime("%Y-%m-%dT%H:%M:%S"),
        "train_seconds": round(time.time() - started, 3),
    }

    metadata_path = args.model_path.with_suffix(".metadata.json")
    metadata_path.write_text(json.dumps(metadata, indent=2), encoding="utf-8")

    importance_path = args.model_path.parent / "feature_importances.csv"
    with importance_path.open("w", encoding="utf-8") as handle:
        handle.write("feature,importance\n")
        for name, value in importances:
            handle.write(f"{name},{value:.6f}\n")

    log_path = args.dataset.parent / "training_log.json"
    log_path.parent.mkdir(parents=True, exist_ok=True)
    history = []
    if log_path.exists():
        try:
            history = json.loads(log_path.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            history = []
    history.append(metadata)
    log_path.write_text(json.dumps(history, indent=2), encoding="utf-8")

    print(f"[save] model       -> {args.model_path}")
    print(f"[save] metadata    -> {metadata_path}")
    print(f"[save] importances -> {importance_path}")
    print(f"[eval] MAE={metrics['mae']:.3f}  RMSE={metrics['rmse']:.3f}  R2={metrics['r2']:.4f}")
    if "cv_r2_mean" in metrics:
        print(f"[eval] CV R2={metrics['cv_r2_mean']:.4f} +/- {metrics['cv_r2_std']:.4f}")
    print("[eval] feature importances:")
    for name, value in importances:
        print(f"        {name:<16} {value:.4f}")

    return metadata


def main(argv: list[str] | None = None) -> None:
    train(_parse_args(argv))


if __name__ == "__main__":
    main()
