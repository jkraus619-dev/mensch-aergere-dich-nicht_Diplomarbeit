#include "battery_WS2812B.h"
#include <Adafruit_NeoPixel.h>

static Adafruit_NeoPixel strip(BATTERY_LED_COUNT, BATTERY_LED_PIN, NEO_GRB + NEO_KHZ800);

// Hilfsfunktion zum schnellen Farbwert bauen
static uint32_t col(uint8_t r, uint8_t g, uint8_t b){ return strip.Color(r,g,b); }

// Initialisiert den LED-Streifen für die Akkuanzeige
void batteryLedsInit() {
  strip.begin();
  strip.setBrightness(64);   // 0..255
  strip.show();
}

// Zeigt den Ladezustand als Balken und Warnblinken bei <10 %
void batteryLedsShowPercent(int p) {
  int seg = (p <= 0) ? 0 : (p >= 100 ? BATTERY_LED_COUNT : (p + 9) / 10);

  for (int i = 0; i < BATTERY_LED_COUNT; ++i) {
    uint32_t c = col(0,0,0);
    if (i < seg) {
      // i 0..2 = rot, 3..6 = gelb, 7..9 = grün  (physisch so verdrahten!)
      if (i <= 2)      c = col(200,  20,  20);
      else if (i <= 6) c = col(220, 150,  10);
      else             c = col( 20, 180,  40);
    }
    strip.setPixelColor(i, c);
  }

  if (p > 0 && p < 10) {         // Warnblinken bei <10 %
    static bool t = false; t = !t;
    strip.setPixelColor(0, t ? col(255,30,30) : col(100,0,0));
  }

  strip.show();
}
