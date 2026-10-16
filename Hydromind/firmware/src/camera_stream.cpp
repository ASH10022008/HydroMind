#include "camera_stream.h"
#include <WiFi.h>
#include <WiFiClient.h>
#include <HTTPClient.h>
#include <math.h>

bool initCamera() {
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
        Serial.printf("[Camera] Init failed with error 0x%x\n", cameraError);
        return false;
    }
    Serial.println("[Camera] Initialized successfully");
    return true;
}

float calculateHue(byte r, byte g, byte b) {
    float rf = r / 255.0f;
    float gf = g / 255.0f;
    float bf = b / 255.0f;
    float maxVal = max(rf, max(gf, bf));
    float minVal = min(rf, min(gf, bf));
    float delta = maxVal - minVal;

    if (delta == 0.0f) return 0.0f;

    float hue;
    if (maxVal == rf) {
        hue = 60.0f * fmodf((gf - bf) / delta, 6.0f);
    } else if (maxVal == gf) {
        hue = 60.0f * (((bf - rf) / delta) + 2.0f);
    } else {
        hue = 60.0f * (((rf - gf) / delta) + 4.0f);
    }
    return hue < 0.0f ? hue + 360.0f : hue;
}

String colorFromHue(float hue) {
    if (hue < 22.5f || hue >= 337.5f) return "Red";
    if (hue < 67.5f) return "Yellow";
    if (hue < 157.5f) return "Green";
    if (hue < 202.5f) return "Cyan";
    if (hue < 247.5f) return "Blue";
    if (hue < 292.5f) return "Magenta";
    return "Red";
}

bool readAverageHue(camera_fb_t* fb, float& hue, String& color) {
    if (!fb || fb->format != PIXFORMAT_RGB565 || fb->len < 2) return false;

    uint32_t redSum = 0;
    uint32_t greenSum = 0;
    uint32_t blueSum = 0;
    uint32_t samples = 0;
    const uint16_t* pixels = reinterpret_cast<const uint16_t*>(fb->buf);
    const size_t pixelCount = fb->len / 2;
    const size_t stride = 16;

    for (size_t i = 0; i < pixelCount; i += stride) {
        uint16_t pixel = pixels[i];
        redSum += ((pixel >> 11) & 0x1F) * 255 / 31;
        greenSum += ((pixel >> 5) & 0x3F) * 255 / 63;
        blueSum += (pixel & 0x1F) * 255 / 31;
        ++samples;
    }

    if (samples == 0) return false;

    byte red = redSum / samples;
    byte green = greenSum / samples;
    byte blue = blueSum / samples;
    hue = calculateHue(red, green, blue);

    uint8_t maxChannel = max(red, max(green, blue));
    uint8_t minChannel = min(red, min(green, blue));
    color = (maxChannel - minChannel < 12) ? "Neutral" : colorFromHue(hue);
    return true;
}

bool sampleOpticalFeatures(Telemetry& telemetry) {
    camera_fb_t* fb = esp_camera_fb_get();
    if (fb) {
        telemetry.hasColor = readAverageHue(fb, telemetry.hueAngle, telemetry.color);
        esp_camera_fb_return(fb);
        return telemetry.hasColor;
    } else {
        telemetry.hasColor = false;
        Serial.println("[Camera] Capture failed while sampling color");
        return false;
    }
}

void handleStream(WebServer& server, Telemetry& latest) {
    WiFiClient client = server.client();
    client.println("HTTP/1.1 200 OK");
    client.println("Content-Type: multipart/x-mixed-replace; boundary=frame");
    client.println("Access-Control-Allow-Origin: *");
    client.println("Cache-Control: no-cache");
    client.println();

    unsigned long lastStreamTelemetry = millis();

    while (client.connected()) {
        camera_fb_t* fb = esp_camera_fb_get();
        if (!fb) {
            Serial.println("[Stream] Camera capture failed for frame");
            break;
        }

        uint8_t* jpegBuffer = nullptr;
        size_t jpegLength = 0;
        bool encoded = frame2jpg(fb, 80, &jpegBuffer, &jpegLength);
        esp_camera_fb_return(fb);
        if (!encoded) {
            Serial.println("[Stream] Failed to encode camera frame to JPEG");
            break;
        }

        client.println("--frame");
        client.println("Content-Type: image/jpeg");
        client.printf("Content-Length: %u\r\n\r\n", static_cast<unsigned int>(jpegLength));
        client.write(jpegBuffer, jpegLength);
        client.print("\r\n");
        free(jpegBuffer);

        if (millis() - lastStreamTelemetry >= TELEMETRY_INTERVAL_MS) {
            sendTelemetryToBackend(latest);
            lastStreamTelemetry = millis();
        }
        delay(30);
    }
    client.stop();
}

bool sendTelemetryToBackend(const Telemetry& latest) {
    if (WiFi.status() != WL_CONNECTED) {
        Serial.println("[Telemetry] Skipped: Wi-Fi disconnected");
        return false;
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
        payload += "\"hue_angle\":" + String(latest.hueAngle, 1);
        payload += ",\"color\":\"" + latest.color + "\"";
        hasField = true;
    }
    if (hasField) payload += ",";
    payload += "\"cameraUrl\":\"http://" + WiFi.localIP().toString() + "/stream\"}";

    WiFiClient client;
    HTTPClient http;
    if (!http.begin(client, BACKEND_URL)) {
        Serial.println("[Telemetry] Failed to initialize HTTP client");
        return false;
    }

    http.addHeader("Content-Type", "application/json");
    http.setTimeout(5000);
    Serial.printf("[Telemetry] POST %s -> %s\n", BACKEND_URL, payload.c_str());
    int status = http.POST(payload);
    bool success = false;
    if (status > 0) {
        Serial.printf("[Telemetry] Backend response: %d\n", status);
        Serial.println(http.getString());
        success = (status >= 200 && status < 300);
    } else {
        Serial.printf("[Telemetry] Backend POST failed: %s\n", http.errorToString(status).c_str());
    }
    http.end();
    return success;
}
