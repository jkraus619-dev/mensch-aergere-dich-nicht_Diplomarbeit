#include "battery_adc.h"

float BAT_VREF_CAL = 1.05f;  // Kalibrierfaktor, bei Bedarf mit Multimeter justieren

// Initialisiert den ADC für die Akku-Messung
void batteryInit() {
  analogReadResolution(12);
  analogSetPinAttenuation(BATTERY_ADC_PIN, ADC_11db); // stabilerer Bereich bis ~3.9 V am Pin
  pinMode(BATTERY_ADC_PIN, INPUT);
}

// Misst die Akkuspannung mit gleitendem Mittel und Ausreißer-Filter
float batteryReadVoltage() {
  const int N = 64;
  uint32_t acc = 0;
  uint16_t minv = 0xFFFF, maxv = 0;
  for (int i = 0; i < N; i++) {
    uint16_t s = analogRead(BATTERY_ADC_PIN);
    acc += s;
    if (s < minv) minv = s;
    if (s > maxv) maxv = s;
    delayMicroseconds(150);
  }
  // simple Ausreißer-Filter: min/max rausnehmen
  float adc = (acc - minv - maxv) / float(N - 2);

  float v_adc = (adc / BAT_ADC_MAX) * BAT_VREF * BAT_VREF_CAL;
  float v_bat = v_adc * (BAT_R1 + BAT_R2) / BAT_R2;
  return v_bat;
}

// Rechnet Akkuspannung in Prozent (kurve) um
int batteryPercent(float v) {
  struct P { float volt; int prozent; } pts[] = {
    {3.00f,   0},
    {3.10f,   8},
    {3.20f,  17},
    {3.30f,  25},
    {3.40f,  33},
    {3.50f,  42},
    {3.60f,  50},
    {3.70f,  58},
    {3.80f,  67},
    {3.90f,  75},
    {4.00f,  83},
    {4.10f,  92},
    {4.20f, 100}
  };
  constexpr int N = sizeof(pts) / sizeof(pts[0]);
  if (v <= pts[0].volt) return 0;
  if (v >= pts[N-1].volt) return 100;
  for (int i = 0; i < N - 1; ++i) {
    if (v >= pts[i].volt && v <= pts[i+1].volt) {
      float t = (v - pts[i].volt) / (pts[i+1].volt - pts[i].volt);
      return int(pts[i].prozent + t * (pts[i+1].prozent - pts[i].prozent) + 0.5f);
    }
  }
  return 0;
}
