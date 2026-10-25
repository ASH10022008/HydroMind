#include "esp_camera.h"
#include <WiFi.h>
#include <WiFiClient.h>
#include <WebServer.h>
#include <HTTPClient.h>
#include <Wire.h>
#include <Adafruit_ADS1X15.h>
#include <OneWire.h>
#include <DallasTemperature.h>
#include <math.h>

const char* ssid = "Ash";
const char* password = "ash10022008";
const char* BACKEND_URL = "http://10.116.216.27:3000/api/esp";

WebServer server(80);

#define ONE_WIRE_BUS 13
OneWire oneWire(ONE_WIRE_BUS);
DallasTemperature sensors(&oneWire);

Adafruit_ADS1115 ads;
bool adsReady = false;

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

struct Telemetry {
    float temperatureC;
    float turbidityVoltage;
    float redMean;
    float greenMean;
    float blueMean;
    String color;
    bool hasTemperature;
    bool hasTurbidity;
    bool hasColor;
};

Telemetry latest = {};
unsigned long lastTelemetryAt = 0;
unsigned long lastWifiAttemptAt = 0;
const unsigned long TELEMETRY_INTERVAL_MS = 5000;
const unsigned long WIFI_RETRY_INTERVAL_MS = 10000;

String colorFromRgb(float red, float green, float blue) {
    if (red == 0.0f && green == 0.0f && blue == 0.0f) return "Brown";
    if (green > blue && green >= blue * 1.15f && green >= red * 1.05f) return "Green";
    if (blue > red && blue >= red * 1.05f && blue >= green * 0.80f) return "Blue";
    return "Brown";
}

bool readAverageRgb(camera_fb_t* fb, float& red, float& green, float& blue, String& color) {
    if (!fb || fb->format != PIXFORMAT_RGB565 || fb->len < 2 ||
        fb->width == 0 || fb->height == 0) return false;

    uint32_t redSum = 0;
    uint32_t greenSum = 0;
    uint32_t blueSum = 0;
    uint32_t samples = 0;
    const uint16_t* pixels = reinterpret_cast<const uint16_t*>(fb->buf);
    const size_t width = fb->width;
    const size_t height = fb->height;
    const size_t centerLeft = width / 4;
    const size_t centerRight = width - centerLeft;
    const size_t centerTop = height / 4;
    const size_t centerBottom = height - centerTop;
    const size_t stride = 4;

    for (size_t y = centerTop; y < centerBottom; y += stride) {
        for (size_t x = centerLeft; x < centerRight; x += stride) {
            const size_t index = y * width + x;
            if ((index + 1) * sizeof(uint16_t) > fb->len) return false;
            const uint16_t pixel = pixels[index];
            redSum += ((pixel >> 11) & 0x1F) * 255 / 31;
            greenSum += ((pixel >> 5) & 0x3F) * 255 / 63;
            blueSum += (pixel & 0x1F) * 255 / 31;
            ++samples;
        }
    }

    if (samples == 0) return false;

    red = static_cast<float>(redSum) / samples;
    green = static_cast<float>(greenSum) / samples;
    blue = static_cast<float>(blueSum) / samples;
    color = colorFromRgb(red, green, blue);
    return true;
}

void sendTelemetry() {
    if (WiFi.status() != WL_CONNECTED) {
        Serial.println("Backend POST skipped: Wi-Fi is disconnected");
        return;
    }

    sensors.requestTemperatures();
    float temperatureC = sensors.getTempCByIndex(0);
    if (temperatureC != DEVICE_DISCONNECTED_C && !isnan(temperatureC)) {
        latest.temperatureC = temperatureC;
        latest.hasTemperature = true;
    } else {
        latest.hasTemperature = false;
        Serial.println("DS18B20 read failed");
    }

    if (adsReady) {
        int16_t adc = ads.readADC_SingleEnded(0);
        latest.turbidityVoltage = ads.computeVolts(adc);
        latest.hasTurbidity = true;
    } else {
        latest.hasTurbidity = false;
        Serial.println("Turbidity reading skipped: ADS1115 is unavailable");
    }

    camera_fb_t* fb = esp_camera_fb_get();
    if (fb) {
        latest.hasColor = readAverageRgb(
            fb, latest.redMean, latest.greenMean, latest.blueMean, latest.color
        );
        if (latest.hasColor) {
            Serial.printf(
                "Camera RGB: %.0f, %.0f, %.0f -> %s\n",
                latest.redMean, latest.greenMean, latest.blueMean, latest.color.c_str()
            );
        }
        esp_camera_fb_return(fb);
    } else {
        latest.hasColor = false;
        Serial.println("Camera capture failed while sampling color");
    }

    String payload = "{";
    bool hasField = false;
    if (latest.hasTemperature) {
        payload += "\"temperature\":" + String(latest.temperatureC, 2);
        hasField = true;
    }
    if (latest.hasTurbidity) {
        if (hasField) payload += ",";
        payload += "\"turbidity_voltage\":" + String(latest.turbidityVoltage, 3);
        hasField = true;
    }
    if (latest.hasColor) {
        if (hasField) payload += ",";
        payload += "\"red_mean\":" + String(latest.redMean, 1);
        payload += ",\"green_mean\":" + String(latest.greenMean, 1);
        payload += ",\"blue_mean\":" + String(latest.blueMean, 1);
        payload += ",\"color\":\"" + latest.color + "\"";
        hasField = true;
    }
    if (hasField) payload += ",";
    payload += "\"cameraUrl\":\"http://" + WiFi.localIP().toString() + "/stream\"}";

    WiFiClient client;
    HTTPClient http;
    if (!http.begin(client, BACKEND_URL)) {
        Serial.println("Could not initialize backend HTTP connection");
        return;
    }

    http.addHeader("Content-Type", "application/json");
    http.setTimeout(5000);
    Serial.printf("POSTing telemetry to %s\n", BACKEND_URL);
    int status = http.POST(payload);
    if (status > 0) {
        Serial.printf("Backend HTTP status: %d\n", status);
        Serial.println(http.getString());
    } else {
        Serial.printf("Backend POST failed: %s\n", http.errorToString(status).c_str());
    }
    http.end();
}

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
        json += "\"red_mean\":" + String(latest.redMean, 1);
        json += ",\"green_mean\":" + String(latest.greenMean, 1);
        json += ",\"blue_mean\":" + String(latest.blueMean, 1);
        json += ",\"color\":\"" + latest.color + "\"";
    }
    json += "}";
    return json;
}

void handle_stream() {
    WiFiClient client = server.client();
    client.println("HTTP/1.1 200 OK");
    client.println("Content-Type: multipart/x-mixed-replace; boundary=frame");
    client.println("Access-Control-Allow-Origin: *");
    client.println("Cache-Control: no-cache");
    client.println();

    while (client.connected()) {
        camera_fb_t* fb = esp_camera_fb_get();
        if (!fb) {
            Serial.println("Camera capture failed for stream");
            break;
        }

        uint8_t* jpegBuffer = nullptr;
        size_t jpegLength = 0;
        bool encoded = frame2jpg(fb, 80, &jpegBuffer, &jpegLength);
        esp_camera_fb_return(fb);
        if (!encoded) {
            Serial.println("Could not encode camera frame as JPEG");
            break;
        }

        client.println("--frame");
        client.println("Content-Type: image/jpeg");
        client.printf("Content-Length: %u\r\n\r\n", static_cast<unsigned int>(jpegLength));
        client.write(jpegBuffer, jpegLength);
        client.print("\r\n");
        free(jpegBuffer);

        if (millis() - lastTelemetryAt >= TELEMETRY_INTERVAL_MS) {
            sendTelemetry();
            lastTelemetryAt = millis();
        }
        delay(30);
    }
    client.stop();
}

void handle_data() {
    sendTelemetry();
    server.send(200, "application/json", latestDataJson());
}

void setup() {
    Serial.begin(115200);
    Serial.println();

    sensors.begin();
    Wire.begin(14, 15);
    ads.setGain(GAIN_TWOTHIRDS);
    adsReady = ads.begin();
    if (!adsReady) {
        Serial.println("Failed to initialize ADS1115");
    }

    camera_config_t config = {};
    config.ledc_channel = LEDC_CHANNEL_0;
    config.ledc_timer = LEDC_TIMER_0;
    config.pin_d0 = Y2_GPIO_NUM;
    config.pin_d1 = Y3_GPIO_NUM;
    config.pin_d2 = Y4_GPIO_NUM;
    config.pin_d3 = Y5_GPIO_NUM;
    config.pin_d4 = Y6_GPIO_NUM;
    config.pin_d5 = Y7_GPIO_NUM;
    config.pin_d6 = Y8_GPIO_NUM;
    config.pin_d7 = Y9_GPIO_NUM;
    config.pin_xclk = XCLK_GPIO_NUM;
    config.pin_pclk = PCLK_GPIO_NUM;
    config.pin_vsync = VSYNC_GPIO_NUM;
    config.pin_href = HREF_GPIO_NUM;
    config.pin_sccb_sda = SIOD_GPIO_NUM;
    config.pin_sccb_scl = SIOC_GPIO_NUM;
    config.pin_pwdn = PWDN_GPIO_NUM;
    config.pin_reset = RESET_GPIO_NUM;
    config.xclk_freq_hz = 20000000;
    config.pixel_format = PIXFORMAT_RGB565;
    config.frame_size = psramFound() ? FRAMESIZE_QVGA : FRAMESIZE_QQVGA;
    config.fb_count = psramFound() ? 2 : 1;

    esp_err_t cameraError = esp_camera_init(&config);
    if (cameraError != ESP_OK) {
        Serial.printf("Camera init failed with error 0x%x\n", cameraError);
        return;
    }

    WiFi.mode(WIFI_STA);
    WiFi.begin(ssid, password);
    lastWifiAttemptAt = millis();
    unsigned long wifiWaitStartedAt = millis();
    while (WiFi.status() != WL_CONNECTED && millis() - wifiWaitStartedAt < 20000) {
        delay(500);
        Serial.print(".");
    }
    Serial.println();
    if (WiFi.status() == WL_CONNECTED) {
        Serial.println("Wi-Fi connected");
        Serial.print("ESP32-CAM stream: http://");
        Serial.print(WiFi.localIP());
        Serial.println("/stream");
    } else {
        Serial.println("Wi-Fi not connected yet; will retry automatically");
    }
    Serial.printf("Backend endpoint: %s\n", BACKEND_URL);

    server.on("/stream", HTTP_GET, handle_stream);
    server.on("/data", HTTP_GET, handle_data);
    server.begin();

    if (WiFi.status() == WL_CONNECTED) {
        sendTelemetry();
        lastTelemetryAt = millis();
    }
}

void loop() {
    server.handleClient();
    if (WiFi.status() != WL_CONNECTED &&
        millis() - lastWifiAttemptAt >= WIFI_RETRY_INTERVAL_MS) {
        Serial.println("Wi-Fi disconnected; retrying connection");
        WiFi.disconnect();
        WiFi.begin(ssid, password);
        lastWifiAttemptAt = millis();
    }
    if (millis() - lastTelemetryAt >= TELEMETRY_INTERVAL_MS) {
        if (WiFi.status() == WL_CONNECTED) {
            sendTelemetry();
        }
        lastTelemetryAt = millis();
    }
}