#pragma once

#include "config.h"

// Initialize DS18B20 OneWire bus and ADS1115 I2C ADC
bool initSensors();

// Poll DS18B20 and ADS1115 sensors, updating the Telemetry structure
void pollSensors(Telemetry& telemetry);

// Read raw temperature in Celsius
float readTemperature();

// Read raw turbidity voltage in Volts from ADS1115 channel 0
float readTurbidityVoltage();
