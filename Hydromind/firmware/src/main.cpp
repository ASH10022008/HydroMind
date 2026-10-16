#include <Arduino.h>
#include <WiFi.h>
#include <WebServer.h>
#include "config.h"
#include "sensor_handler.h"
#include "camera_stream.h"

// =============================================================================
// Network Credentials & Endpoint (Matches your existing hardware setup)
// =============================================================================
const char* WIFI_SSID = "Ash";
const char* WIFI_PASSWORD = "ash10022008";
const char* BACKEND_URL = "http://10.47.151.27:3000/api/esp";

// =============================================================================
// Globals & Server Instance
// =============================================================================
WebServer server(80);
Telemetry latest = {};
unsigned long lastTelemetryAt = 0;
unsigned long lastWifiAttemptAt = 0;

// Set to 1 if deploying with solar/battery deep-sleep duty cycling
#define ENABLE_DEEP_SLEEP 0

String latestDataJson() {
    String json = "{";
    bool hasField = false;
    if (latest.hasTemperature) {
        json += "\"temperature\":" + String(latest.temperatureC, 2);
        hasField = true;
    }
    if (latest.hasTurbidity) {
        if (hasField) json += ",";
        json += "\"turbidity_voltage\":" + String(latest.turbidityVoltage, 3);
        hasField = true;
    }
    if (latest.hasColor) {
        if (hasField) json += ",";
        json += "\"hue_angle\":" + String(latest.hueAngle, 1);
        json += ",\"color\":\"" + latest.color + "\"";
        hasField = true;
    }
    if (hasField) json += ",";
    json += "\"cameraUrl\":\"http://" + WiFi.localIP().toString() + "/stream\"}";
    return json;
}

void triggerTelemetryCycle() {
    pollSensors(latest);
    sampleOpticalFeatures(latest);
    sendTelemetryToBackend(latest);
    lastTelemetryAt = millis();
}

void handle_stream_route() {
    handleStream(server, latest);
}

void handle_data_route() {
    triggerTelemetryCycle();
    server.send(200, "application/json", latestDataJson());
}

void setup() {
    Serial.begin(115200);
    delay(500);
    Serial.println("\n==========================================");
    Serial.println("  Hydromind Edge Firmware v1.0.0");
    Serial.println("==========================================");

    // 1. Initialize physical sensors (DS18B20 & ADS1115)
    initSensors();

    // 2. Initialize ESP32-CAM module
    initCamera();

    // 3. Connect to Wi-Fi
    WiFi.mode(WIFI_STA);
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
    lastWifiAttemptAt = millis();
    unsigned long wifiWaitStartedAt = millis();

    Serial.print("Connecting to Wi-Fi: ");
    Serial.println(WIFI_SSID);
    while (WiFi.status() != WL_CONNECTED && millis() - wifiWaitStartedAt < 20000) {
        delay(500);
        Serial.print(".");
    }
    Serial.println();

    if (WiFi.status() == WL_CONNECTED) {
        Serial.println("[Wi-Fi] Connected successfully!");
        Serial.print("[Wi-Fi] Device IP: ");
        Serial.println(WiFi.localIP());
        Serial.print("[Wi-Fi] Stream endpoint: http://");
        Serial.print(WiFi.localIP());
        Serial.println("/stream");
    } else {
        Serial.println("[Wi-Fi] Initial connection timeout. Will retry in loop.");
    }

    Serial.printf("[Backend] Target endpoint: %s\n", BACKEND_URL);

    // 4. Setup Local HTTP server routes
    server.on("/stream", HTTP_GET, handle_stream_route);
    server.on("/data", HTTP_GET, handle_data_route);
    server.begin();
    Serial.println("[Server] Local webserver running on port 80");

    // 5. Initial telemetry dispatch
    if (WiFi.status() == WL_CONNECTED) {
        triggerTelemetryCycle();
    }

#if ENABLE_DEEP_SLEEP
    Serial.println("[Power] Deep sleep mode active. Sleeping...");
    esp_sleep_enable_timer_wakeup(TIME_TO_SLEEP_US);
    esp_deep_sleep_start();
#endif
}

void loop() {
    server.handleClient();

    // Wi-Fi auto-reconnect logic
    if (WiFi.status() != WL_CONNECTED && millis() - lastWifiAttemptAt >= WIFI_RETRY_INTERVAL_MS) {
        Serial.println("[Wi-Fi] Disconnected; retrying connection...");
        WiFi.disconnect();
        WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
        lastWifiAttemptAt = millis();
    }

    // Periodic telemetry cycle
    if (millis() - lastTelemetryAt >= TELEMETRY_INTERVAL_MS) {
        if (WiFi.status() == WL_CONNECTED) {
            triggerTelemetryCycle();
        }
    }
}
