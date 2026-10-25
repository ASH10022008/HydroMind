# Hydromind

Hydromind combines ESP32 water-sensor readings, a trained ML model, and a
browser dashboard to show an experimental Water Quality Index (WQI).

## Project parts

- `firmware/` reads water temperature, turbidity voltage, and camera RGB, then
  posts telemetry to the backend.
- `backend/` receives ESP32 telemetry, runs ML inference, and exposes the
  latest readings and WQI through an HTTP API.
- `ml/` contains the training pipeline and the model inference code.
- `frontend/` displays live sensor readings and a separate WQI score tab.

## Train the model

Install the ML dependencies and train the model from the project root:

```bash
python -m pip install -r ml/requirements.txt
python -m ml.train
```

Training creates `ml/models/hydromind_wqi_model.joblib`. The WQI endpoint
reports an actionable message until this file has been generated.
The demo classifies camera RGB as Brown, Green, or Blue; Blue has a lower
color-risk contribution to WQI. If you change the demo color bands or scoring
logic, retrain with `python -m ml.train` before restarting the backend.

## Run the app

Start the backend from the project root:

```bash
node backend/server.js
```

Serve the frontend in another terminal:

```bash
cd frontend
python -m http.server 5500
```

Open http://localhost:5500. If the required Python interpreter is not named
`python` on Windows or `python3` on other platforms, set the `PYTHON`
environment variable before starting the backend.

The frontend reads `/api/data`; the WQI is also available directly from
`/api/wqi`. The ESP32 posts to `/api/esp` every five seconds. Update
`BACKEND_URL` in `firmware/src/main.cpp` to use the computer's LAN IP address
and keep the device and backend on the same network.

WQI scores are experimental model estimates, not a substitute for certified
water testing.
