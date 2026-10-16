#pragma once

#include <Arduino.h>

// =============================================================================
// Network & Backend Configuration
// =============================================================================
extern const char* WIFI_SSID;
extern const char* WIFI_PASSWORD;
extern const char* BACKEND_URL;

// =============================================================================
// Pin Configurations (Preserved exactly for the physical hardware setup)
// =============================================================================
// DS18B20 One-Wire Bus
#define ONE_WIRE_BUS 13

// ADS1115 I2C Bus
#define I2C_SDA_PIN 14
#define I2C_SCL_PIN 15

// AI-Thinker ESP32-CAM Pinout
#define PWDN_GPIO_NUM     32
#define RESET_GPIO_NUM    -1
#define XCLK_GPIO_NUM      0
#define SIOD_GPIO_NUM     26
#define SIOC_GPIO_NUM     27
#define Y9_GPIO_NUM       35
#define Y8_GPIO_NUM       34
#define Y7_GPIO_NUM       39
#define Y6_GPIO_NUM       36
#define Y5_GPIO_NUM       21
#define Y4_GPIO_NUM       19
#define Y3_GPIO_NUM       18
#define Y2_GPIO_NUM        5
#define VSYNC_GPIO_NUM    25
#define HREF_GPIO_NUM     23
#define PCLK_GPIO_NUM     22

// =============================================================================
// Timing Configuration
// =============================================================================
constexpr unsigned long TELEMETRY_INTERVAL_MS = 5000;
constexpr unsigned long WIFI_RETRY_INTERVAL_MS = 10000;

// Deep sleep interval (in microseconds) for battery/solar edge deployments
constexpr uint64_t TIME_TO_SLEEP_US = 15ULL * 1000000ULL; // 15 seconds

// =============================================================================
// Telemetry Data Structure
// =============================================================================
struct Telemetry {
    float temperatureC = 0.0f;
    float turbidityVoltage = 0.0f;
    float hueAngle = 0.0f;
    String color = "Unknown";
    bool hasTemperature = false;
    bool hasTurbidity = false;
    bool hasColor = false;
};
