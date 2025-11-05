#pragma once
#include <Arduino.h>

#ifndef BATTERY_LED_PIN
#define BATTERY_LED_PIN  18     // Daten-Pin WS2812B
#endif
#ifndef BATTERY_LED_COUNT
#define BATTERY_LED_COUNT 10    // 10 Segmente
#endif

void batteryLedsInit();
void batteryLedsShowPercent(int percent);  // 0..100 → 0..10 Segmente
