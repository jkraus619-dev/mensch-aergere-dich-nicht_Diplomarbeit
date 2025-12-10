#include <Arduino.h>
#include <WiFi.h>
#include <AsyncTCP.h>
#include <ESPAsyncWebServer.h>
#include <LittleFS.h>
#include <ArduinoJson.h>

#include "battery.h"
#include "lcd_dice.h"

AsyncWebServer server(80);
AsyncWebSocket ws("/ws");

const char* ssid = "Ludo_ESP32";
const char* password = "12345678";

static unsigned long lastBatMs = 0;
static bool batterySendRequested = false;

// Sendet ein JSON-Dokument an alle WebSocket-Clients
static void broadcastJson(const JsonDocument &doc) {
  String out;
  serializeJson(doc, out);
  ws.textAll(out);
}

// Liest Akku-Daten, schickt sie per WS und aktualisiert LEDs
static void sendBatterySnapshot() {
  float v = batteryReadVoltage();
  int pct = batteryPercent(v);
  batteryLedsShowPercent(pct);
  Serial.printf("Batterie: %.2f V (%d%%)\n", v, pct);

  JsonDocument doc;
  doc["type"]    = "battery";
  doc["mv"]      = int(v * 1000 + 0.5f);
  doc["percent"] = pct;
  doc["ts"]      = (uint32_t) millis();
  broadcastJson(doc);
}

// Verarbeitet eingehende Text-WS-Nachrichten
static void handleWsMessage(void *arg, uint8_t *data, size_t len) {
  AwsFrameInfo *info = (AwsFrameInfo*)arg;
  if (info->opcode != WS_TEXT) return;
  String msg;
  for (size_t i = 0; i < len; i++) msg += (char)data[i];
  msg.trim();
  Serial.printf("WS received: %s\n", msg.c_str());

  if (msg == "roll") {
    if (lcdDiceIsBusy()) {
      JsonDocument doc;              // Meldet, dass die Wuerfel-Animation blockiert
      doc["type"] = "busy";
      doc["what"] = "dice";
      broadcastJson(doc);
    } else {
      int v = random(1,7);
      lcdDiceRoll(v);
      JsonDocument doc;              // Antwort mit Wuerfelwert
      doc["type"] = "dice_result";
      doc["value"] = v;
      broadcastJson(doc);
    }
  } else if (msg == "startGame") {
    JsonDocument doc;              // Start-Info an Clients
    doc["type"] = "start";
    doc["ok"] = true;
    broadcastJson(doc);

  } else if (msg == "switch") {
    JsonDocument doc;              // Beispiel-Action switch
    doc["type"] = "action";
    doc["action"] = "switch";
    broadcastJson(doc);

  } else if (msg == "done") {
    JsonDocument doc;              // Beispiel-Action done
    doc["type"] = "action";
    doc["action"] = "done";
    broadcastJson(doc);

  } else if (msg == "battery?") {
    batterySendRequested = true; // Messung im Hauptloop triggern
  } else {
    JsonDocument doc;              // Echo fuer unbekannte Kommandos
    doc["type"] = "echo";
    doc["msg"] = msg;
    broadcastJson(doc);
  }
}

// Handhabt WS-Events (connect/disconnect/data)
static void onEvent(AsyncWebSocket * serverPtr, AsyncWebSocketClient * client,
             AwsEventType type, void * arg, uint8_t *data, size_t len) {
  if (type == WS_EVT_CONNECT) {
    Serial.printf("WS: Client #%u connected\n", client->id());
    JsonDocument doc;              // Begruessung fuer neuen Client
    doc["type"] = "welcome";
    doc["msg"] = "Willkommen beim Ludo-Server";
    String out; serializeJson(doc, out);
    client->text(out);

    batterySendRequested = true; // Messung im Hauptloop triggern

  } else if (type == WS_EVT_DISCONNECT) {
    Serial.println("WS: Client disconnected");

  } else if (type == WS_EVT_DATA) {
    AwsFrameInfo *info = (AwsFrameInfo*)arg;
    if (info->final && info->index == 0 && info->len == len) {
      handleWsMessage(arg, data, len);
    }
  }
}

// Initialisiert AP, Dateisystem, Webserver, WS und Hardware
static void setupSystem() {
  WiFi.softAP(ssid, password);
  Serial.println();
  Serial.println("Access Point gestartet!");
  Serial.print("IP-Adresse: ");
  Serial.println(WiFi.softAPIP());

  if (!LittleFS.begin(true)) {
    Serial.println("Fehler beim Mounten von LittleFS");
    return;
  }

  Serial.printf("index.html: %d\n", LittleFS.exists("/index.html"));
  Serial.printf("register.html: %d\n", LittleFS.exists("/register.html"));
  Serial.printf("dashboard.html: %d\n", LittleFS.exists("/dashboard.html"));
  Serial.printf("battery.html: %d\n", LittleFS.exists("/battery.html"));
  Serial.printf("profile.html: %d\n", LittleFS.exists("/profile.html"));
  Serial.printf("stats.html: %d\n", LittleFS.exists("/stats.html"));
  Serial.printf("style.css: %d\n", LittleFS.exists("/style.css"));
  Serial.printf("js/utils.js: %d\n", LittleFS.exists("/js/utils.js"));

  ws.onEvent(onEvent);
  server.addHandler(&ws);

  server.on("/", HTTP_GET, [](AsyncWebServerRequest *request){
    request->send(LittleFS, "/index.html", "text/html");
  });
  server.on("/index.html", HTTP_GET, [](AsyncWebServerRequest *request){
    request->send(LittleFS, "/index.html", "text/html");
  });
  server.on("/register.html", HTTP_GET, [](AsyncWebServerRequest *request){
    request->send(LittleFS, "/register.html", "text/html");
  });
  server.on("/dashboard.html", HTTP_GET, [](AsyncWebServerRequest *request){
    request->send(LittleFS, "/dashboard.html", "text/html");
  });
  server.on("/profile.html", HTTP_GET, [](AsyncWebServerRequest *request){
    request->send(LittleFS, "/profile.html", "text/html");
  });
  server.on("/stats.html", HTTP_GET, [](AsyncWebServerRequest *request){
    request->send(LittleFS, "/stats.html", "text/html");
  });
  server.on("/battery.html", HTTP_GET, [](AsyncWebServerRequest *request){
    request->send(LittleFS, "/battery.html", "text/html");
  });
  server.on("/pregame.html", HTTP_GET, [](AsyncWebServerRequest *request){
    request->send(LittleFS, "/pregame.html", "text/html");
  });
  server.on("/game.html", HTTP_GET, [](AsyncWebServerRequest *request){
    request->send(LittleFS, "/game.html", "text/html");
  });

  server.on("/style.css", HTTP_GET, [](AsyncWebServerRequest *request){
    request->send(LittleFS, "/style.css", "text/css");
  });
  server.serveStatic("/js", LittleFS, "/js");

  server.onNotFound([](AsyncWebServerRequest *request){
    request->send(404, "text/plain", "Not found");
  });

  server.begin();
  randomSeed(esp_random());
  Serial.println("Webserver + WebSocket gestartet!");

  batteryInit();
  lcdDiceInit();
}

// zyklische Akku-Updates (~5 s)
static void batteryTick() {
  const unsigned long periodMs = 3000;
  bool doSend = false;
  if (millis() - lastBatMs >= periodMs) {
    lastBatMs = millis();
    doSend = true;
  }
  if (batterySendRequested) {
    batterySendRequested = false;
    doSend = true;
  }
  if (doSend) {
    sendBatterySnapshot();
    ws.cleanupClients();
  }
}

// Startet die Hardware und WiFi/AP-Stack
void setup() {
  Serial.begin(115200);
  delay(100);
  setupSystem();
}

// Zyklischer Loop: aktuell nur WS/Batterie-Tick
void loop() {
  batteryTick();
}
