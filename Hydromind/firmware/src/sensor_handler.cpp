#include "sensor_handler.h"
#include <Wire.h>
#include <Adafruit_ADS1X15.h>
#include <OneWire.h>
#include <DallasTemperature.h>

static OneWire oneWire(ONE_WIRE_BUS);
static DallasTemperature sensors(&oneWire);
static Adafruit_ADS1115 ads;
static bool adsReady = false;

bool initSensors() {
    sensors.begin();
    Wire.begin(I2C_SDA_PIN, I2C_SCL_PIN);
    ads.setGain(GAIN_TWOTHIRDS);
    adsReady = ads.begin();
    if (!adsReady) {
        Serial.println("[Sensors] Failed to initialize ADS1115 on I2C (14, 15)");
    } else {
        Serial.println("[Sensors] ADS1115 initialized successfully");
    }
    return adsReady;
}

float readTemperature() {
    sensors.requestTemperatures();
    float temp = sensors.getTempCByIndex(0);
    return temp;
}

float readTurbidityVoltage() {
    if (!adsReady) {
        return -1.0f;
    }
    int16_t adc = ads.readADC_SingleEnded(0);
    return ads.computeVolts(adc);
}

void pollSensors(Telemetry& telemetry) {
    float temp = readTemperature();
    if (temp != DEVICE_DISCONNECTED_C && !isnan(temp)) {
        telemetry.temperatureC = temp;
        telemetry.hasTemperature = true;
    } else {
        telemetry.hasTemperature = false;
        Serial.println("[Sensors] DS18B20 temperature read failed");
    }

    if (adsReady) {
        float volts = readTurbidityVoltage();
        if (volts >= 0.0f) {
            telemetry.turbidityVoltage = volts;
            telemetry.hasTurbidity = true;
        } else {
            telemetry.hasTurbidity = false;
        }
    } else {
        telemetry.hasTurbidity = false;
        Serial.println("[Sensors] ADS1115 turbidity skipped: ADC not ready");
    }
}
