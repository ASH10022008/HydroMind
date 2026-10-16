# Hydromind project

This project is split into three parts:

- `firmware/` -> ESP32 code only. It reads sensor values and sends JSON to the backend.
- `backend/` -> simple Node.js API that receives data from the ESP and exposes it to the frontend.
- `frontend/` -> browser dashboard with black background, camera feed, and three metric cards.

## Run backend

```bash
cd backend
node server.js
```

## Run frontend

Open the file directly in a browser, or serve it locally:

```bash
cd frontend
python -m http.server 5500
```

Then open: http://localhost:5500

## ESP32 config

Before uploading, edit the Wi-Fi credentials and `BACKEND_URL` in
`firmware/src/main.cpp`. Set `BACKEND_URL` to the computer's LAN IP address
running the backend; do not use `localhost` because that would refer to the
ESP32-CAM itself. The computer and ESP32-CAM must be on the same network.

The firmware posts temperature, ADS1115 turbidity-sensor voltage, camera-derived
hue/color, and the ESP32-CAM stream URL to `/api/esp` every five seconds. The
turbidity value is sent as volts because NTU conversion requires calibration
for the specific turbidity sensor.
