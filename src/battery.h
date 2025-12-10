#pragma once
#include <Arduino.h>
#include <Adafruit_NeoPixel.h>

// === Hardware-Pins / Einstellungen ===
#ifndef BATTERY_ADC_PIN
#define BATTERY_ADC_PIN 34   // ADC1-Pin für Spannungsteiler
#endif

#ifndef BATTERY_LED_PIN
#define BATTERY_LED_PIN  21  // Daten-Pin WS2812B
#endif

#ifndef BATTERY_LED_COUNT
#define BATTERY_LED_COUNT 10 // Anzahl Segmente
#endif

// Initialisiert ADC und WS2812B-Stripe
void batteryInit();
// Misst Akkuspannung in Volt
float batteryReadVoltage();
// Wandelt Spannung in Prozent (0..100) um
int batteryPercent(float vbat);
// Setzt LED-Streifen passend zur Restkapazität
void batteryLedsShowPercent(int percent);
