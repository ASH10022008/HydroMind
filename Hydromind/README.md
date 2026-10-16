# Hydromind: Real-Time IoT Water Quality Index (WQI) Platform

Hydromind is an automated, continuous, low-cost IoT and Edge AI platform designed to track water safety at individual leisure sites (resorts, pools, waterparks). Unlike AQI (Air Quality Index), which monitors ambient air quality across regions, Hydromind brings decentralized, location-specific Water Quality Index (WQI) monitoring directly to the point of use — enabling real-time transparency for guests and operators without relying on centralized municipal reporting.

Instead of slow, traditional laboratory water testing, Hydromind captures multi-modal sensor telemetry and AI-powered predictions on the edge, hosting a live dashboard accessible via smartphone or QR code.

---

## Why WQI is Different from AQI

| Aspect | AQI (Air Quality) | WQI (Water Quality) |
| :--- | :--- | :--- |
| **Scope** | Regional / citywide atmospheric monitoring | Decentralized, location-specific water bodies |
| **Deployment Model** | Centralized government/municipal stations | Distributed edge devices at each water site |
| **Data Accessibility** | Public broadcasts (weather, gov websites) | Private, guest-facing, real-time per facility |
| **Use Case** | General population health awareness | Facility operators & direct swimmers/guests |
| **Monitoring Frequency**| Hourly or daily averages | Continuous, real-time edge processing |

Hydromind's decentralized architecture means each resort, pool, or waterpark maintains its own independent WQI system—no reliance on central authorities or delayed municipal reports.

---

## System Architecture & Workflow

### 1. Edge Telemetry & Vision Capture
- An **ESP32** microcontroller paired with a **DS18B20** waterproof temperature probe and an analog **turbidity sensor** (via an **ADS1115** 16-bit ADC) gathers physical water telemetry.
- An **ESP32-CAM** captures live video frames to analyze water color, clarity, and suspended particle features using OpenCV.

### 2. AI & Regression Processing
- A **FastAPI** backend ingests the combined sensor payloads and runs them through a **RandomForestRegressor** machine learning pipeline.
- The system computes a unified **Water Quality Index (WQI)** from 0 to 100:
  - **0–30: Optimal (Safe)**
  - **31–60: Caution (Moderate Risk)**
  - **61–100: Closed/Hazardous (Critical Alert)**

### 3. Dashboard Visualization
- End-users, guests, and facility operators monitor real-time sensor metrics, trend charts, and risk category alerts via a responsive web dashboard.
- QR codes enable guests to check water safety before entering.

```
[ Wake from Deep Sleep ]
       ↓
[ 1. Read Temperature ] (DS18B20 OneWire poll on GPIO 13)
       ↓
[ 2. Read Turbidity ]   (ADS1115 I2C ADC on GPIO 14/15)
       ↓
[ 3. Capture Frame ]    (ESP32-CAM frame snap & Hue extraction)
       ↓
[ 4. Wi-Fi Transmission] (Stream raw sensor payload via HTTP POST to /api/esp)
       ↓
[ Go Back to Deep Sleep / Serve Stream ]
```

---

## Repository Structure

```
Hydromind/
│
├── firmware/                  # Embedded Systems (ESP32 / ESP32-CAM)
│   ├── include/               # Header files & sensor pin configurations
│   │   ├── config.h           # Wi-Fi credentials, backend URL, GPIO pinouts
│   │   ├── sensor_handler.h   # DS18B20 & ADS1115 reading declarations
│   │   └── camera_stream.h    # ESP32-CAM frame capture & MJPEG streaming declarations
│   ├── src/
│   │   ├── main.cpp           # Main loop, deep sleep & Wi-Fi management
│   │   ├── sensor_handler.cpp # DS18B20 & Turbidity reading logic
│   │   └── camera_stream.cpp  # ESP32-CAM frame capture & HTTP post
│   ├── platformio.ini         # PlatformIO project configuration
│   └── README.md              # Firmware flashing & wiring documentation
│
├── backend/                   # Cloud & API Architecture (FastAPI)
│   ├── app/
│   │   ├── api/               # API routers (telemetry, alerts)
│   │   ├── core/              # Config, security, database connections
│   │   ├── models/            # Database schemas & Pydantic models
│   │   ├── services/          # Business logic & WebSocket manager
│   │   └── main.py            # FastAPI application entry point
│   ├── tests/                 # API unit & integration tests
│   ├── Dockerfile             # Container configuration for backend
│   └── requirements.txt       # Python dependencies
│
├── ml/                        # Computer Vision & ML Pipeline
│   ├── datasets/              # Sample images and training logs
│   ├── notebooks/             # Jupyter notebooks for model experimentation
│   ├── models/                # Saved model weights (.pkl / .joblib)
│   ├── inference.py           # OpenCV processing & sklearn prediction wrapper
│   ├── train.py               # Model training script
│   ├── tests/                 # ML pipeline test suite
│   └── requirements.txt       # ML Python dependencies
│
├── frontend/                  # User Dashboard (Web / Mobile)
│   ├── public/                # Static assets & icons
│   ├── src/
│   │   ├── components/        # UI elements (WQI Gauge, Charts, Alert Banners)
│   │   ├── views/             # Dashboard screens & layout views
│   │   ├── services/          # API & WebSocket client hooks
│   │   ├── App.jsx            # Root component
│   │   └── main.jsx           # Frontend entry point
│   ├── legacy-vanilla/        # Lightweight static vanilla HTML/JS fallback
│   ├── vite.config.js         # Vite bundler & reverse proxy config
│   └── package.json           # Node.js dependencies
│
├── docs/                      # Documentation & SRS
│   ├── srs.md                 # Full Software Requirements Specification
│   ├── architecture.svg       # Vector system design diagrams
│   └── architecture.png       # System design diagrams
│
├── docker-compose.yml         # Local multi-service orchestration
└── README.md                  # Project overview and instructions
```

---

## Tech Stack

- **Hardware**: ESP32-CAM (AI-Thinker), DS18B20 Temperature Probe, Turbidity Sensor (R-0913), ADS1115 16-Bit I2C ADC.
- **Backend**: Python 3.10+, FastAPI, Uvicorn, WebSockets, Pydantic.
- **Machine Learning & Vision**: OpenCV, Scikit-Learn (RandomForestRegressor), NumPy, Pandas, Joblib.
- **Frontend**: React 18, Vite, Lucide Icons, Modern Responsive Dark UI with Radial WQI Gauge and SVG Trend Charts.

---

## Getting Started

### 1. Prerequisites
- Python 3.10+ (Python 3.13 tested and verified)
- Node.js 18+ & npm (for frontend)
- PlatformIO (for ESP32 firmware flashing)
- Docker & Docker Compose (optional, for containerized multi-service deployment)

### 2. Running the Backend
```bash
cd backend
python -m venv venv
# On Windows:
venv\Scripts\activate
# On Linux/macOS:
source venv/bin/activate

pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 3000 --reload
```
The interactive API documentation is available at `http://localhost:3000/docs`.

### 3. Running the Frontend
```bash
cd frontend
npm install
npm run dev
```
Open `http://localhost:5173` in your browser. The frontend automatically connects to the backend WebSocket stream.

### 4. Running via Docker Compose
To spin up the backend and frontend together with a single command:
```bash
docker-compose up --build
```

### 5. Running the Tests
To run backend and ML unit tests:
```bash
# Test the ML pipeline
pytest ml/tests

# Test the FastAPI backend endpoints
pytest backend/tests
```

---

## Team Responsibilities

- **Ashmit (Embedded Systems)**: Firmware development, sensor wiring (DS18B20 GPIO 13, ADS1115 I2C 14/15), and low-power power management.
- **Badri (Backend Architecture)**: FastAPI REST endpoints, WebSocket streaming, and telemetry buffering.
- **Shaurya (Machine Learning & CV)**: OpenCV image feature extraction pipelines and RandomForestRegressor optimization.
- **Ganesh (Frontend Dashboard)**: UI components, real-time data visualization charts, and alert status panels.

---

## License

MIT License — See [LICENSE](LICENSE) file for details.
