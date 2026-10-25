# Datasets

Training data and logs produced by `ml/dataset.py` and `ml/train.py`.

| File                    | Produced by  | Description                                    |
|-------------------------|--------------|------------------------------------------------|
| `wqi_training_data.csv` | `ml.dataset` | Synthetic labelled samples (features + `wqi`). |
| `training_log.json`     | `ml.train`   | Append-only history of training runs + metrics.|

## Real-world data

Drop field-collected CSVs here using the current frozen schema
(`ntu, temperature_c, dissolved_o2, red_mean, green_mean, blue_mean,
clarity_index, wqi`) and train with:

```bash
python -m ml.train --reuse-dataset --dataset ml/datasets/your_file.csv
```
