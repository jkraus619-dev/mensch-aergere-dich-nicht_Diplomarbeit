#pragma once
#include <Arduino.h>

// === Hardware anpassen ===
#ifndef BATTERY_ADC_PIN
#define BATTERY_ADC_PIN 34   // wähle einen ADC1-Pin, passend zu deinem Anschluss
#endif

// Teiler: Akku+ -- R1 --o-- R2 -- GND ; o -> ADC
constexpr float BAT_R1 = 10000.0f;    // 10k
constexpr float BAT_R2 = 10000.0f;    // 10k

constexpr int   BAT_ADC_MAX = 4095;   // 12-bit
constexpr float BAT_VREF    = 3.30f;  // 3.3 V Referenz
extern float    BAT_VREF_CAL;         // Kalibrierfaktor (1.00 = default)

void  batteryInit();
float batteryReadVoltage();           // Akkuspannung in V
int   batteryPercent(float vbat);     // 0..100
