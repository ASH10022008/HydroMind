#include <Arduino.h>
#include <WiFi.h>
#include <WiFiClient.h>
#include <HTTPClient.h>
#include <OneWire.h>
#include <DallasTemperature.h>

const char* WIFI_SSID = "Ash";
const char* WIFI_PASSWORD = "ash10022008";
const char* BACKEND_URL = "http:// 10.116.216.27:3000/api/esp";

constexpr uint8_t TEMP_SENSOR_PIN = 4;
constexpr uint8_t TURBIDITY_SENSOR_PIN = 34;
constexpr uint8_t RED_CHANNEL_PIN = 35;
constexpr uint8_t GREEN_CHANNEL_PIN = 36;
constexpr uint8_t BLUE_CHANNEL_PIN = 39;

OneWire oneWire(TEMP_SENSOR_PIN);
DallasTemperature temperatureSensors(&oneWire);

float clampValue(float value, float minValue, float maxValue) {
  return constrain(value, minValue, maxValue);
}

float readTemperature() {
  temperatureSensors.requestTemperatures();
  float temperature = temperatureSensors.getTempCByIndex(0);

  if (isnan(temperature) || temperature == DEVICE_DISCONNECTED_C) {
    Serial.println("DS18B20 not detected, using fallback value");
    return 25.0f;
  }

  return temperature;
}

float readTurbidity() {
  int raw = analogRead(TURBIDITY_SENSOR_PIN);
  float voltage = raw * (3.3f / 4095.0f);

  // Example calibration for an analog turbidity sensor.
  // The output voltage rises as the water becomes cloudier, so we convert it
  // into an approximate NTU reading.
  float ntu = (voltage / 3.3f) * 1000.0f;
  return clampValue(ntu, 0.0f, 1000.0f);
}

struct RgbReading {
  float red;
  float green;
  float blue;
};

RgbReading readRgbSensor() {
  RgbReading reading = {0.0f, 0.0f, 0.0f};
  reading.red = analogRead(RED_CHANNEL_PIN);
  reading.green = analogRead(GREEN_CHANNEL_PIN);
  reading.blue = analogRead(BLUE_CHANNEL_PIN);
  return reading;
}

String detectColorFromRgb(float red, float green, float blue) {
  float normalizedRed = (red / 4095.0f) * 255.0f;
  float normalizedGreen = (green / 4095.0f) * 255.0f;
  float normalizedBlue = (blue / 4095.0f) * 255.0f;

  if (normalizedRed == 0.0f && normalizedGreen == 0.0f && normalizedBlue == 0.0f) return "Brown";
  if (normalizedGreen > normalizedBlue && normalizedGreen >= normalizedBlue * 1.15f && normalizedGreen >= normalizedRed * 1.05f) return "Green";
  if (normalizedBlue > normalizedRed && normalizedBlue >= normalizedRed * 1.05f && normalizedBlue >= normalizedGreen * 0.80f) return "Blue";
  return "Brown";
}

String detectColor(const RgbReading& rgb) {
  return detectColorFromRgb(rgb.red, rgb.green, rgb.blue);
}

bool connectWiFi() {
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  unsigned long startTime = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - startTime < 15000) {
    delay(200);
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("WiFi connected");
    Serial.println(WiFi.localIP());
    return true;
  }

  Serial.println("WiFi failed");
  return false;
}

void sendToBackend(float temperature, float turbidity, const RgbReading& rgb) {
  if (WiFi.status() != WL_CONNECTED) {
    return;
  }

  WiFiClient client;
  HTTPClient http;

  if (!http.begin(client, BACKEND_URL)) {
    Serial.println("HTTP begin failed");
    return;
  }

  http.addHeader("Content-Type", "application/json");
  http.setTimeout(5000);

  String payload = "{";
  payload += "\"temperature\":" + String(temperature, 1) + ",";
  payload += "\"turbidity\":" + String(turbidity, 1) + ",";
  payload += "\"red_mean\":" + String((rgb.red / 4095.0f) * 255.0f, 1) + ",";
  payload += "\"green_mean\":" + String((rgb.green / 4095.0f) * 255.0f, 1) + ",";
  payload += "\"blue_mean\":" + String((rgb.blue / 4095.0f) * 255.0f, 1) + ",";
  payload += "\"color\":\"" + detectColor(rgb) + "\"";
  payload += "}";

  int httpCode = http.POST(payload);

  if (httpCode > 0) {
    Serial.printf("HTTP status: %d\n", httpCode);
    Serial.println(http.getString());
  } else {
    Serial.printf("POST failed: %s\n", http.errorToString(httpCode).c_str());
  }

  http.end();
}

void setup() {
  Serial.begin(115200);
  delay(1000);

  analogReadResolution(12);
  analogSetPinAttenuation(TURBIDITY_SENSOR_PIN, ADC_11db);
  analogSetPinAttenuation(RED_CHANNEL_PIN, ADC_11db);
  analogSetPinAttenuation(GREEN_CHANNEL_PIN, ADC_11db);
  analogSetPinAttenuation(BLUE_CHANNEL_PIN, ADC_11db);

  temperatureSensors.begin();

  Serial.println("Hydromind firmware started");
  connectWiFi();
}

void loop() {
  if (WiFi.status() == WL_CONNECTED) {
    float temperature = readTemperature();
    float turbidity = readTurbidity();
    RgbReading rgb = readRgbSensor();
    String color = detectColor(rgb);

    Serial.printf(
        "Temperature: %.1f C | Turbidity: %.1f NTU | RGB: %.0f, %.0f, %.0f | Color: %s\n",
        temperature, turbidity, rgb.red, rgb.green, rgb.blue, color.c_str()
    );

    sendToBackend(temperature, turbidity, rgb);
  }

  delay(5000);
}
