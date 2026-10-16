"""Synthetic training-data generation for the Hydromind WQI model.

Labelled water samples are expensive to collect, so the model is bootstrapped
on physically-grounded synthetic data: sensor and vision channels are sampled
over realistic ranges and fused through a hand-crafted Water Quality Index
(WQI) built from four sub-indices. ``generate_dataset`` can be swapped for a
loader over field-collected CSVs (same columns) once available.
"""

from __future__ import annotations

from pathlib import Path

import numpy as np
import pandas as pd

from . import config
from .preprocessing import estimate_dissolved_oxygen, voltage_to_ntu


def _sub_indices(frame: pd.DataFrame) -> pd.DataFrame:
    """Compute the four 0-100 sub-indices (higher means worse)."""
    turbidity_si = np.clip(
        frame["ntu"] / config.NTU_WATER_QUALITY_SPAN * 100.0, 0.0, 100.0
    )
    temp_si = np.clip(
        np.abs(frame["temperature_c"] - config.IDEAL_TEMP_C)
        / config.TEMP_DEVIATION_SPAN_C
        * 100.0,
        0.0,
        100.0,
    )
    do_si = np.clip(
        (config.DO_REFERENCE_MG_L - frame["dissolved_o2"])
        / config.DO_REFERENCE_MG_L
        * 100.0,
        0.0,
        100.0,
    )
    clarity_term = (
        1.0 - np.clip(frame["clarity_index"] / config.CLARITY_REFERENCE, 0.0, 1.0)
    ) * 40.0
    colour_term = (frame["saturation_mean"] / 255.0) * 60.0
    visual_si = np.clip(colour_term + clarity_term, 0.0, 100.0)

    return pd.DataFrame(
        {
            "turbidity_si": turbidity_si,
            "temperature_si": temp_si,
            "do_si": do_si,
            "visual_si": visual_si,
        }
    )


def compute_wqi(frame: pd.DataFrame) -> pd.Series:
    """Weighted fusion of the sub-indices into the final 0-100 WQI.

    Weights reflect the relative impact on leisure-water safety: turbidity
    0.45, dissolved oxygen 0.25, temperature 0.15 and visual appearance 0.15.
    """
    si = _sub_indices(frame)
    wqi = (
        0.45 * si["turbidity_si"]
        + 0.25 * si["do_si"]
        + 0.15 * si["temperature_si"]
        + 0.15 * si["visual_si"]
    )
    return np.clip(wqi, 0.0, 100.0)


def generate_dataset(
    n_samples: int = config.N_SAMPLES, seed: int = config.RANDOM_STATE
) -> pd.DataFrame:
    """Generate a labelled dataset using the frozen Hydromind feature schema."""
    rng = np.random.default_rng(seed)

    turbidity_voltage = rng.uniform(
        config.TURBIDITY_MAX_VOLTAGE, config.TURBIDITY_CLEAR_VOLTAGE, n_samples
    )
    temperature_c = rng.uniform(15.0, 35.0, n_samples)
    hue_mean = rng.uniform(0.0, 180.0, n_samples)
    saturation_mean = rng.uniform(0.0, 255.0, n_samples)
    value_mean = rng.uniform(0.0, 255.0, n_samples)
    clarity_index = rng.uniform(10.0, 600.0, n_samples)

    ntu = np.array([voltage_to_ntu(v) for v in turbidity_voltage])
    dissolved_o2 = np.array(
        [
            estimate_dissolved_oxygen(t, n, h, s)
            for t, n, h, s in zip(
                temperature_c, ntu, hue_mean, saturation_mean
            )
        ]
    )

    frame = pd.DataFrame(
        {
            "ntu": ntu,
            "temperature_c": temperature_c,
            "dissolved_o2": dissolved_o2,
            "hue_mean": hue_mean,
            "saturation_mean": saturation_mean,
            "value_mean": value_mean,
            "clarity_index": clarity_index,
        }
    )
    frame[config.TARGET_NAME] = compute_wqi(frame)
    return frame


def save_dataset(frame: pd.DataFrame, path=config.DEFAULT_DATASET_PATH) -> None:
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    frame.to_csv(path, index=False)


def load_dataset(path=config.DEFAULT_DATASET_PATH) -> pd.DataFrame:
    return pd.read_csv(path)
