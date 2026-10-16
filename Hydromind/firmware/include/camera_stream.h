#pragma once

#include "config.h"
#include "esp_camera.h"
#include <WebServer.h>

// Initialize the ESP32-CAM optical sensor module
bool initCamera();

// Compute hue and classify broad color from RGB
float calculateHue(byte r, byte g, byte b);
String colorFromHue(float hue);

// Sample frame buffer and compute average hue and color classification
bool readAverageHue(camera_fb_t* fb, float& hue, String& color);

// Sample camera frame to extract optical telemetry
bool sampleOpticalFeatures(Telemetry& telemetry);

// Stream live MJPEG video over HTTP
void handleStream(WebServer& server, Telemetry& latest);

// Send JSON telemetry payload to the FastAPI backend
bool sendTelemetryToBackend(const Telemetry& latest);
