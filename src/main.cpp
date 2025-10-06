#include <Arduino.h>
#include "wifi_ap.h"

void setup() {
  Serial.begin(115200);
  delay(100);
  setupWiFi();
}

void loop() {
  delay(1000);
}
