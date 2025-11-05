#include "battery_adc.h"

float BAT_VREF_CAL = 1.05f;  // Kalibrierfaktor, bei Bedarf mit Multimeter justieren

void batteryInit() {
  analogReadResolution(12);
  pinMode(BATTERY_ADC_PIN, INPUT);
}

float batteryReadVoltage() {
  const int N = 32;
  uint32_t acc = 0;
  for (int i = 0; i < N; i++) {
    acc += analogRead(BATTERY_ADC_PIN);
    delayMicroseconds(200);
  }
  float adc = acc / float(N);

  float v_adc = (adc / BAT_ADC_MAX) * BAT_VREF * BAT_VREF_CAL;
  float v_bat = v_adc * (BAT_R1 + BAT_R2) / BAT_R2;
  return v_bat;
}

int batteryPercent(float v) {
  struct P { float volt; int prozent; } pts[] = {
    {3.00f, 0}, {3.30f, 10}, {3.60f, 30}, {3.70f, 50}, {3.90f, 80}, {4.20f, 100}
  };
  if (v <= pts[0].volt) return 0;
  if (v >= pts[5].volt) return 100;
  for (int i = 0; i < 5; ++i) {
    if (v >= pts[i].volt && v <= pts[i+1].volt) {
      float t = (v - pts[i].volt) / (pts[i+1].volt - pts[i].volt);
      return int(pts[i].prozent + t * (pts[i+1].prozent - pts[i].prozent) + 0.5f);
    }
  }
  return 0;
}
