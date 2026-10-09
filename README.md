# Hydromind: Real-Time IoT Water Quality Index (WQI) Platform

Hydromind is an automated, continuous, low-cost IoT and Edge AI platform designed to track water safety at individual leisure sites (resorts, pools, waterparks). Unlike AQI (Air Quality Index), which monitors ambient air quality across regions, **Hydromind brings decentralized, location-specific Water Quality Index (WQI) monitoring directly to the point of use** — enabling real-time transparency for guests and operators without relying on centralized municipal reporting.

Instead of slow, traditional laboratory water testing, Hydromind captures multi-modal sensor telemetry and AI-powered predictions on the edge, hosting a live dashboard accessible via smartphone or QR code.

---

## **Why WQI is Different from AQI**

| Aspect | AQI (Air Quality) | WQI (Water Quality) |
|--------|------------------|-------------------|
| **Scope** | Regional / citywide atmospheric monitoring | Decentralized, location-specific water bodies |
| **Deployment Model** | Centralized government/municipal stations | Distributed edge devices at each water site |
| **Data Accessibility** | Public broadcasts (weather, gov websites) | Private, guest-facing, real-time per facility |
| **Use Case** | General population health awareness | Facility operators & direct swimmers/guests |
| **Monitoring Frequency** | Hourly or daily averages | Continuous, real-time edge processing |

Hydromind's **decentralized architecture** means each resort, pool, or waterpark maintains its own independent WQI system—no reliance on central authorities or delayed municipal reports.

---

## **System Architecture & Workflow**

1. **Edge Telemetry & Vision Capture**:
   * An ESP32 microcontroller paired with a DS18B20 temperature probe and turbidity sensor gathers physical water telemetry.
   * An ESP32-CAM captures live video frames to analyze water color, clarity, and suspended particle features using OpenCV.

2. **AI & Regression Processing**:
   * A FastAPI backend ingests the combined sensor payloads and runs them through a `RandomForestRegressor` machine learning pipeline.
   * The system computes a unified **Water Quality Index (WQI) from 0 to 100**:
     * **0–30**: Optimal (Safe)
     * **31–60**: Caution (Moderate Risk)
     * **61–100**: Closed/Hazardous (Critical Alert)

3. **Dashboard Visualization**:
   * End-users, guests, and facility operators monitor real-time sensor metrics, trend charts, and risk category alerts via a responsive web dashboard.
   * QR codes enable guests to check water safety before entering.

---

## **Repository Structure**

```text
hydromind/
│
├── firmware/                  # Embedded Systems (ESP32 / ESP32-CAM)
│   ├── include/               # Header files & sensor pin configurations
│   ├── src/
│   │   ├── main.cpp           # Main loop, deep sleep & Wi-Fi management
│   │   ├── sensor_handler.cpp # DS18B20 & Turbidity reading logic
│   │   └── camera_stream.cpp  # ESP32-CAM frame capture & HTTP post
│   └── platformio.ini         # PlatformIO project configuration
│
├── backend/                   # Cloud & API Architecture (FastAPI)
│   ├── app/
│   │   ├── api/               # API routers (telemetry, alerts)
│   │   ├── core/              # Config, security, database connections
│   │   ├── models/            # Database schemas & Pydantic models
│   │   ├── services/          # Business logic & WebSocket manager
│   │   └── main.py            # FastAPI application entry point
│   ├── Dockerfile             # Container configuration for backend
│   └── requirements.txt       # Python dependencies
│
├── ml/                        # Computer Vision & ML Pipeline
│   ├── datasets/              # Sample images and training logs
│   ├── notebooks/             # Jupyter notebooks for model experimentation
│   ├── models/                # Saved model weights (.pkl / .joblib)
│   ├── inference.py           # OpenCV processing & sklearn prediction wrapper
│   └── train.py               # Model training script
│
├── frontend/                  # User Dashboard (Web / Mobile)
│   ├── public/                # Static assets & icons
│   ├── src/
│   │   ├── components/        # UI elements (Charts, Alert Banners, Gauges)
│   │   ├── views/             # Dashboard screens & layout views
│   │   ├── services/          # API & WebSocket client hooks
│   │   ├── App.jsx            # Root component
│   │   └── main.jsx           # Frontend entry point
│   └── package.json           # Node.js dependencies
│
├── docs/                      # Documentation & SRS
│   ├── srs.md                 # Full Software Requirements Specification
│   └── architecture.png       # System design diagrams
│
├── docker-compose.yml         # Local multi-service orchestration
└── README.md                  # Project overview and instructions

```

---

## **Tech Stack**

* **Hardware**: ESP32, ESP32-CAM, DS18B20 Temperature Probe, Turbidity Sensor.
* **Backend**: Python 3.10+, FastAPI, Uvicorn, WebSockets.
* **Machine Learning & Vision**: OpenCV, Scikit-Learn (`RandomForestRegressor`).
* **Frontend**: Modern JavaScript framework with responsive metric charts and risk indicators.

---

## **Edge Firmware Workflow**

```
[Wake from Deep Sleep] 
       ↓
[1. Read Temperature] (DS18B20 OneWire poll)
       ↓
[2. Read Turbidity] (ADC analog voltage read)
       ↓
[3. Capture Frame] (ESP32-CAM frame snap & immediate buffer release)
       ↓
[4. Wi-Fi Transmission] (Stream raw sensor payload & image via HTTP POST)
       ↓
[Go Back to Deep Sleep]
```

---

## **Getting Started**

### **1. Prerequisites**

* Python 3.10+
* Node.js & npm (for frontend)
* PlatformIO (for ESP32 firmware flashing)
* Docker & Docker Compose (optional, for running containers locally)

### **2. Running the Backend**

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload

```

### **3. Running the Frontend**

```bash
cd frontend
npm install
npm run dev

```

### **4. Running via Docker Compose**

To spin up the backend and supporting services together:

```bash
docker-compose up --build

```

---

## **Team Responsibilities**

* **Ashmit (Embedded Systems)**: Firmware development, sensor wiring, and low-power power management.
* **Badri (Backend Architecture)**: FastAPI REST endpoints, WebSocket streaming, and database integration.
* **Shaurya (Machine Learning & CV)**: OpenCV image feature extraction pipelines and `RandomForestRegressor` optimization.
* **Ganesh (Frontend Dashboard)**: UI components, real-time data visualization charts, and alert status panels.

---

## **License**

MIT License — See LICENSE file for details.
