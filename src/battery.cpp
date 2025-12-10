#include "battery.h"

static Adafruit_NeoPixel strip(BATTERY_LED_COUNT, BATTERY_LED_PIN, NEO_GRB + NEO_KHZ800);

static constexpr float BAT_R1 = 10000.0f;
static constexpr float BAT_R2 = 10000.0f;
static constexpr int   BAT_ADC_MAX = 4095;
static constexpr float BAT_VREF    = 3.30f;
static constexpr int   SAMPLE_COUNT = 64;
static constexpr int   SAMPLE_DELAY_US = 150;
static float BAT_VREF_CAL = 1.05f;

// Liest den ADC mehrfach und bildet einen Mittelwert ohne Ausreißer
static float readFilteredAdc() {
  uint32_t acc = 0;
  uint16_t minv = 0xFFFF, maxv = 0; // Merkt kleinsten/groessten Wert, um Ausreisser herauszunehmen
  for (int i = 0; i < SAMPLE_COUNT; i++) {
    uint16_t s = analogRead(BATTERY_ADC_PIN);
    acc += s;
    if (s < minv) minv = s;
    if (s > maxv) maxv = s;
    delayMicroseconds(SAMPLE_DELAY_US);
  }
  return (acc - minv - maxv) / float(SAMPLE_COUNT - 2);
}

// Initialisiert ADC und LED-Streifen
void batteryInit() {
  analogReadResolution(12);
  analogSetPinAttenuation(BATTERY_ADC_PIN, ADC_11db);
  pinMode(BATTERY_ADC_PIN, INPUT);

  strip.begin();
  strip.setBrightness(64);
  strip.show();
}

// Misst die Akkuspannung in Volt
float batteryReadVoltage() {
  float adc = readFilteredAdc();
  float v_adc = (adc / BAT_ADC_MAX) * BAT_VREF * BAT_VREF_CAL;
  return v_adc * (BAT_R1 + BAT_R2) / BAT_R2;
}

// Spannungs-zu-Prozent-Umrechnung
int batteryPercent(float v) {
  struct P { float volt; int prozent; } pts[] = {
    {3.00f,   0}, {3.10f,   8}, {3.20f,  17}, {3.30f,  25},
    {3.40f,  33}, {3.50f,  42}, {3.60f,  50}, {3.70f,  58},
    {3.80f,  67}, {3.90f,  75}, {4.00f,  83}, {4.10f,  92},
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

// Setzt den LED-Streifen entsprechend Ladezustand (Warnblinken <10 %)
void batteryLedsShowPercent(int p) {
  auto col = [](uint8_t r, uint8_t g, uint8_t b){ return strip.Color(r,g,b); };

  int clamped = constrain(p, 0, 100);
  int seg = (clamped + 9) / 10; // 0..10 Segmente

  for (int i = 0; i < BATTERY_LED_COUNT; ++i) {
    uint32_t c = col(0,0,0);
    if (i < seg) {
      if (i <= 2)      c = col(200,  20,  20);  // rot
      else if (i <= 6) c = col(220, 150,  10);  // gelb
      else             c = col( 20, 180,  40);  // gruen
    }
    strip.setPixelColor(i, c);
  }

  if (clamped > 0 && clamped < 10) {
    static bool t = false; t = !t;
    strip.setPixelColor(0, t ? col(255,30,30) : col(100,0,0));
  }

  strip.show();
}
