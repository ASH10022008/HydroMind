# Hydromind Edge Firmware (ESP32 / ESP32-CAM)

This directory contains the edge telemetry and computer vision firmware for the Hydromind Real-Time IoT WQI Platform.

## Hardware Components
- **ESP32-CAM AI-Thinker Module** (Dual-core Xtensa 32-bit LX6, OV2640 camera sensor, onboard Wi-Fi)
- **DS18B20 Digital Temperature Sensor** (OneWire protocol, waterproof stainless steel probe)
- **Turbidity Sensor (R-0913 analog optical clarity probe)**
- **ADS1115 16-Bit I2C ADC Module** (High-precision analog-to-digital conversion)

## Pinout Mapping (Hardware Configuration)
| Peripheral / Signal | ESP32-CAM GPIO | Notes |
|---------------------|----------------|-------|
| DS18B20 OneWire DQ  | GPIO 13        | 4.7kΩ pull-up resistor to 3.3V |
| ADS1115 I2C SDA     | GPIO 14        | Connect to ADS1115 SDA |
| ADS1115 I2C SCL     | GPIO 15        | Connect to ADS1115 SCL |
| Turbidity Analog In | ADS1115 A0     | Connected to probe signal pin |
| Camera D0 - D7      | GPIO 5, 18, 19, 21, 36, 39, 34, 35 | AI-Thinker bus |
| Camera XCLK / PCLK  | GPIO 0 / 22    | Clock lines |
| Camera VSYNC / HREF | GPIO 25 / 23   | Synchronization |
| Camera SIOD / SIOC  | GPIO 26 / 27   | I2C SCCB control |

## Directory Structure
```
firmware/
├── include/
│   ├── config.h           # Wi-Fi credentials, backend URL, GPIO pinouts
│   ├── sensor_handler.h   # DS18B20 & ADS1115 reading declarations
│   └── camera_stream.h    # ESP32-CAM frame capture & MJPEG streaming declarations
├── src/
│   ├── main.cpp           # Main loop, Wi-Fi management & dispatch logic
│   ├── sensor_handler.cpp # DS18B20 & Turbidity reading logic
│   └── camera_stream.cpp  # ESP32-CAM frame capture & HTTP post implementation
└── platformio.ini         # PlatformIO build configuration
```

## Flashing Instructions
1. Install [PlatformIO Core](https://platformio.org/) or the PlatformIO IDE extension in VS Code.
2. Connect your ESP32-CAM using an FTDI USB-to-TTL programmer:
   - FTDI VCC (5V) -> ESP32-CAM 5V
   - FTDI GND -> ESP32-CAM GND
   - FTDI RX -> ESP32-CAM U0T (GPIO 1)
   - FTDI TX -> ESP32-CAM U0R (GPIO 3)
   - **Bridge GPIO 0 to GND** before powering on to enter flashing mode.
3. Build and upload:
   ```bash
   pio run --target upload
   ```
4. Disconnect GPIO 0 from GND and press the RST button to boot the firmware.
