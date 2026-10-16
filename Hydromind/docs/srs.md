# Software Requirements Specification (SRS)
## Hydromind: Real-Time IoT Water Quality Index (WQI) Platform (Leisure Edition)

---

### 1. Introduction & Executive Summary

#### 1.1 Purpose
This Software Requirements Specification (SRS) describes the complete architectural, functional, hardware, and algorithmic requirements for **Hydromind (Leisure Edition)**. Hydromind is an automated, continuous, low-cost IoT and Edge AI platform engineered to monitor water safety at individual leisure facilities (resorts, swimming pools, waterparks, and recreational lakes).

#### 1.2 The Problem: Regional Opaque Air Quality vs. Localized Leisure Water
In the post-pandemic era, public health consciousness has surged. However, whereas atmospheric monitoring relies on regional Air Quality Index (AQI) broadcasts, **water safety is hyper-local and point-of-use**. 
Resort management currently relies on manual, periodic water testing kits (e.g., chemical dipsticks, orthotolidine chlorine drop tests) performed behind closed maintenance doors. These tests are:
- Infrequent (often once every 12 to 24 hours).
- Vulnerable to human transcription errors.
- **Completely opaque to guests**, leaving parents and swimmers unable to verify water sanitary conditions before entering.

#### 1.3 Proposed Solution
Hydromind decentralizes water quality monitoring by deploying edge telemetry microcontrollers directly at pool skimmers, filtration intakes, or lake docks. By pairing physical multi-sensor probes (temperature, turbidity) with computer vision (ESP32-CAM optical hue and clarity profiling) and cloud-edge Machine Learning (RandomForestRegressor), Hydromind converts raw telemetry into an instant **0–100 Water Quality Index (WQI)** accessible to guests via poolside QR codes.

---

### 2. Why WQI is Fundamentally Different from AQI

| Dimension | AQI (Air Quality Index) | Hydromind WQI (Water Quality Index) |
| :--- | :--- | :--- |
| **Physical Scope** | Regional & macro-atmospheric (citywide, 10–50 km radius) | Decentralized, point-of-use, micro-body (specific pool, slide, or lake) |
| **Deployment Model**| Centralized governmental/municipal monitoring stations | Distributed low-cost IoT edge nodes at each water attraction |
| **Data Accessibility**| Public regional broadcasts (weather apps, TV news) | Hyper-local, guest-facing live dashboard accessed via poolside QR code |
| **Direct Stakeholders**| Broad general public / commuters | Facility operators, maintenance crews, and immediate swimmers/families |
| **Sampling Cadence** | Hourly or daily averages | Continuous, real-time edge processing (every 5 seconds / event-driven) |
| **Actionable Threshold**| Wear masks, stay indoors | Close attraction, initiate flocculant dosing, boost chlorination, alert lifeguard |

---

### 3. System Architecture & Component Workflow

```
[ ESP32-CAM Edge Node ]
  ├── DS18B20 OneWire Temp Probe (GPIO 13)
  ├── ADS1115 16-Bit I2C ADC (SDA: 14, SCL: 15)
  │    └── R-0913 Analog Turbidity Probe
  └── OV2640 Optical Camera Sensor
          │
          │ HTTP POST /api/esp (JSON telemetry & Hue)
          ▼
[ FastAPI High-Performance Backend ] ◄───► [ WebSocket Manager ]
  ├── Ingestion & Validation (/api/esp, /api/data)          │
  ├── Feature Engineering Pipeline                          │ Real-time Stream
  └── Scikit-Learn RandomForestRegressor Model              │
          │                                                 ▼
          │ WQI Score (0-100) & Safety Tier       [ Responsive Frontend Dashboard ]
          ▼                                         ├── Radial WQI Gauge
  [ Safety & Alert Service ]                        ├── Physical Telemetry Cards
  └── Critical Cutoff Alerts (WQI > 60)             ├── Live ESP32-CAM Stream
                                                    └── Poolside Guest QR Portal
```

---

### 4. Edge Hardware & Embedded Firmware Specifications

#### 4.1 Hardware Bill of Materials (BOM)
1. **ESP32-CAM AI-Thinker Module**:
   - Xtensa Dual-Core 32-bit LX6 microprocessor (operating at 240 MHz).
   - 520 KB internal SRAM + 4 MB external PSRAM for image frame buffering.
   - Integrated 802.11 b/g/n Wi-Fi transceiver and onboard PCB antenna.
2. **DS18B20 Waterproof Temperature Sensor**:
   - Range: -55°C to +125°C, with ±0.5°C accuracy between -10°C and +85°C.
   - Communication: Dallas 1-Wire bus with external 4.7kΩ pull-up resistor.
3. **ADS1115 16-Bit Precision I2C ADC**:
   - Programmable Gain Amplifier (PGA) set to `GAIN_TWOTHIRDS` (0.1875 mV / LSB).
   - Dedicated I2C bus on GPIO 14 (SDA) and GPIO 15 (SCL).
4. **R-0913 Analog Optical Turbidity Probe**:
   - Transmits infrared light across a water gap to measure suspended particulate refraction.
   - Operating voltage range: 0.5 V (murky/opaque) to 3.0 V (crystal clear).

#### 4.2 Firmware Pinout Allocation Matrix
| Functional Peripheral | Hardware Component | ESP32-CAM GPIO Pin | Description |
| :--- | :--- | :--- | :--- |
| **OneWire Bus** | DS18B20 Temp Probe | `GPIO 13` | Dallas OneWire communication bus |
| **I2C SDA** | ADS1115 ADC | `GPIO 14` | I2C Serial Data line |
| **I2C SCL** | ADS1115 ADC | `GPIO 15` | I2C Serial Clock line |
| **Analog ADC A0** | Turbidity Probe | `ADS1115 A0` | High-resolution voltage readout |
| **Camera D0 - D7** | OV2640 Sensor | `5, 18, 19, 21, 36, 39, 34, 35` | Parallel pixel bus |
| **Camera Clocks** | OV2640 Sensor | `XCLK: 0`, `PCLK: 22` | Pixel & Master clock |
| **Camera Sync** | OV2640 Sensor | `VSYNC: 25`, `HREF: 23` | Frame synchronization |
| **Camera SCCB** | OV2640 Sensor | `SIOD: 26`, `SIOC: 27` | I2C Camera Configuration |

#### 4.3 Low-Power Edge Workflow
```
[ Wake from Deep Sleep / Power On ]
        │
        ▼
[ 1. OneWire Temperature Poll ] ──> Acquire temp in Celsius
        │
        ▼
[ 2. ADS1115 Precision Sample ] ──> Acquire voltage from A0
        │
        ▼
[ 3. Optical Frame Grab ]       ──> Grab RGB565 buffer & extract average Hue
        │
        ▼
[ 4. Wi-Fi JSON Dispatch ]      ──> HTTP POST /api/esp payload
        │
        ▼
[ 5. Duty-Cycle Sleep / Stream ] ──> Deep sleep or serve /stream route
```

---

### 5. Machine Learning & Computer Vision Pipeline

#### 5.1 Frozen Feature Schema (7-Dimensional Vector)
The Hydromind `RandomForestRegressor` operates on a standardized 7-dimensional feature vector:
1. `ntu` ($x_1$): Nephelometric Turbidity Units, mapped linearly from sensor voltage $V_{\text{turb}} \in [0.5, 3.0]$.
   $$\text{NTU} = \max\left(0, \frac{3.0 - V_{\text{turb}}}{2.5} \times 1000\right)$$
2. `temperature_c` ($x_2$): Physical water temperature in degrees Celsius from the DS18B20 probe.
3. `dissolved_o2` ($x_3$): Dissolved oxygen estimation (mg/L) using Henry's law solubility approximation with turbidity and algae penalties:
   $$\text{DO}_{\text{base}} = 14.6 - 0.33 \cdot T + 0.004 \cdot T^2$$
4. `hue_mean` ($x_4$): Average hue angle derived from OpenCV HSV color space (0–180 scale).
5. `saturation_mean` ($x_5$): Average color saturation (0–255), detecting algae blooms or chemical tinting.
6. `value_mean` ($x_6$): Average brightness (0–255), identifying lighting conditions or opacity.
7. `clarity_index` ($x_7$): Variance of the Laplacian operator on the frame:
   $$\text{Var}(\nabla^2 I) = \frac{1}{N} \sum (L(x,y) - \bar{L})^2$$

#### 5.2 Water Quality Index (WQI) Tiers
Hydromind defines an inverted scale where **lower scores represent safer, cleaner water**:
- **0.0 – 30.0: Optimal (Safe)**
  - Water is crystal clear ($\text{NTU} < 80$), temperature is within standard comfort levels (24–29°C), and chemical balancing is verified.
- **30.1 – 60.0: Caution (Moderate Risk)**
  - Mild particulate cloudiness or thermal imbalance. Swimmers should exercise caution; facility maintenance should trigger backwash cycles.
- **60.1 – 100.0: Closed / Hazardous (Critical Alert)**
  - Severe turbidity, microbial bloom risk, or extreme thermal deviation. Facility access is halted immediately.

---

### 6. Cloud & Backend Specifications (FastAPI)

#### 6.1 Endpoints
- `POST /api/esp`: Telemetry ingestion from hardware edge.
- `GET /api/data`: Backward-compatible telemetry and WQI status endpoint.
- `GET /api/telemetry/latest`: Full telemetry object with visual features and predictions.
- `GET /api/telemetry/history?limit=50`: Time-series records for trend charts.
- `GET /api/camera-url`: Current ESP32-CAM stream endpoint.
- `GET /api/alerts`: Active alerts list.
- `POST /api/alerts/{id}/acknowledge`: Staff acknowledge alert action.
- `GET /api/health`: Container health check.
- `WebSocket /ws` & `/api/ws`: Real-time bidirectional streaming for UI updates.

---

### 7. Frontend Transparency Dashboard

#### 7.1 Key Views & Elements
1. **Interactive WQI Gauge**: Semi-circular SVG gauge with real-time numeric score and dynamic safety badges.
2. **Multi-Modal Metric Cards**: High-visibility readouts for Temperature (°C/°F), Turbidity (V and NTU), Dissolved Oxygen, and Optical Profile.
3. **ESP32-CAM Feed Window**: Live video feed from the poolside edge camera with connection status indicator.
4. **Historical Trend Charts**: Interactive SVG line charts tracking 50-point trends for WQI, Temperature, and Turbidity with threshold indicators.
5. **Poolside Guest QR Portal**: Renders an on-screen QR code allowing swimmers to scan before jumping into the water.
6. **Role-Based Toggle**: Switch between Guest View (simplified safety verdict) and Operator View (full telemetry, sensor bus diagnostics, and thresholds).

---

### 8. Team Responsibilities
- **Ashmit (Embedded Systems)**: ESP32 & ESP32-CAM firmware, ADS1115 ADC driver, OneWire bus timing, low-power deep sleep cycles.
- **Badri (Backend Architecture)**: FastAPI REST endpoints, WebSocket manager, telemetry ring buffer, and automated alert service.
- **Shaurya (Machine Learning & CV)**: OpenCV HSV feature extractor, model training pipeline, RandomForestRegressor hyper-parameter optimization.
- **Ganesh (Frontend Dashboard)**: Responsive React/Vite dashboard, SVG WQI gauge, time-series charts, and mobile guest QR portal.
