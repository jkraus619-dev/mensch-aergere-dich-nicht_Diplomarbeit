#include "wifi_ap.h"
#include <WiFi.h>
#include <AsyncTCP.h>
#include <ESPAsyncWebServer.h>
#include <SPIFFS.h>
#include <ArduinoJson.h>

AsyncWebServer server(80);
AsyncWebSocket ws("/ws");

const char* ssid = "Ludo_ESP32";
const char* password = "12345678";

void broadcastJson(const JsonDocument &doc) {
  String out;
  serializeJson(doc, out);
  ws.textAll(out);
}

void handleWsMessage(void *arg, uint8_t *data, size_t len) {
  AwsFrameInfo *info = (AwsFrameInfo*)arg;
  if (info->opcode != WS_TEXT) return;
  String msg;
  for (size_t i = 0; i < len; i++) msg += (char)data[i];
  msg.trim();
  Serial.printf("WS received: %s\n", msg.c_str());

  if (msg == "roll") {
    int v = random(1,7);
    StaticJsonDocument<128> doc;
    doc["type"] = "dice_result";
    doc["value"] = v;
    broadcastJson(doc);
  } else if (msg == "startGame") {
    StaticJsonDocument<128> doc;
    doc["type"] = "start";
    doc["ok"] = true;
    broadcastJson(doc);
  } else if (msg == "switch") {
    StaticJsonDocument<128> doc;
    doc["type"] = "action";
    doc["action"] = "switch";
    broadcastJson(doc);
  } else if (msg == "done") {
    StaticJsonDocument<128> doc;
    doc["type"] = "action";
    doc["action"] = "done";
    broadcastJson(doc);
  } else {
    StaticJsonDocument<128> doc;
    doc["type"] = "echo";
    doc["msg"] = msg;
    broadcastJson(doc);
  }
}

void onEvent(AsyncWebSocket * serverPtr, AsyncWebSocketClient * client,
             AwsEventType type, void * arg, uint8_t *data, size_t len) {
  if (type == WS_EVT_CONNECT) {
    Serial.printf("WS: Client #%u connected\n", client->id());
    StaticJsonDocument<128> doc;
    doc["type"] = "welcome";
    doc["msg"] = "Willkommen beim Ludo-Server";
    String out; serializeJson(doc, out);
    client->text(out);
  } else if (type == WS_EVT_DISCONNECT) {
    Serial.println("WS: Client disconnected");
  } else if (type == WS_EVT_DATA) {
    AwsFrameInfo *info = (AwsFrameInfo*)arg;
    if (info->final && info->index == 0 && info->len == len) {
      handleWsMessage(arg, data, len);
    }
  }
}

void setupWiFi() {
  WiFi.softAP(ssid, password);
  Serial.println();
  Serial.println("Access Point gestartet!");
  Serial.print("IP-Adresse: ");
  Serial.println(WiFi.softAPIP());

  if (!SPIFFS.begin(true)) {
    Serial.println("Fehler beim Mounten von SPIFFS ❌");
    return;
  }

  Serial.printf("index.html: %d\n", SPIFFS.exists("/index.html"));
  Serial.printf("register.html: %d\n", SPIFFS.exists("/register.html"));
  Serial.printf("dashboard.html: %d\n", SPIFFS.exists("/dashboard.html"));
  Serial.printf("style.css: %d\n", SPIFFS.exists("/style.css"));
  Serial.printf("script.js: %d\n", SPIFFS.exists("/script.js"));

  ws.onEvent(onEvent);
  server.addHandler(&ws);

  server.on("/", HTTP_GET, [](AsyncWebServerRequest *request){
    request->send(SPIFFS, "/index.html", "text/html");
  });
  server.on("/index.html", HTTP_GET, [](AsyncWebServerRequest *request){
    request->send(SPIFFS, "/index.html", "text/html");
  });
  server.on("/register.html", HTTP_GET, [](AsyncWebServerRequest *request){
    request->send(SPIFFS, "/register.html", "text/html");
  });
  server.on("/dashboard.html", HTTP_GET, [](AsyncWebServerRequest *request){
    request->send(SPIFFS, "/dashboard.html", "text/html");
  });

  server.on("/style.css", HTTP_GET, [](AsyncWebServerRequest *request){
    request->send(SPIFFS, "/style.css", "text/css");
  });
  server.on("/script.js", HTTP_GET, [](AsyncWebServerRequest *request){
    request->send(SPIFFS, "/script.js", "application/javascript");
  });

  server.onNotFound([](AsyncWebServerRequest *request){
    request->send(404, "text/plain", "Not found");
  });

  server.begin();
  randomSeed(esp_random());
  Serial.println("Webserver + WebSocket gestartet!");
}
