#include <Arduino.h>
#include "wifi_ap.h"

// Vorwärtsdeklaration (Tick aus wifi_ap.cpp)
void wifi_ap_loop_batteryTick();

void setup() {
  Serial.begin(115200);
  delay(100);
  setupWiFi();
}

void loop() {
  wifi_ap_loop_batteryTick();   // zyklische Akku-Updates (WS + LEDs)
  delay(20);
}
