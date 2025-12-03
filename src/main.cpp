#include <Arduino.h>
#include "wifi_ap.h"

// Vorwärtsdeklaration (Tick aus wifi_ap.cpp)
void wifi_ap_loop_batteryTick();

// Startet die Hardware und WiFi/AP-Stack
void setup()
{
  Serial.begin(115200);
  delay(100);
  setupWiFi();
}

// Zyklischer Loop: aktuell nur WS/Batterie-Tick
void loop()
{
  // Websocket + WiFi Tick
  wifi_ap_loop_batteryTick();

  /*// Spiel starten, falls Flag gesetzt
  if (gameStarted && !spielRunning)
  {
    spielRunning = true;
    gameStarted = 0;
    spielinit(); // Spiel startet jetzt blockierend
  }
  if (turnround == 1 && rolled)
  {
    alle.wuerfeln();
    rolled = false;
    auswahl = false;
  }
  else if (turnround == 2 && auswahl)
  {
    alle.continueTurn(auswahl);
    auswahl = false;
  }*/
}
