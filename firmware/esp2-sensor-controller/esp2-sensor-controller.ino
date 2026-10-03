#include <Arduino.h>
#include <WiFi.h>
#include <ESPmDNS.h>
#include "config.h"
#include "servo_pump.h"
#include "sensor_manager.h"
#include "web_debug.h"

ActuatorManager actuators;
SensorManager sensors;

static unsigned long lastHeartbeat = 0;
static unsigned long lastWifiCheck = 0;
static unsigned long lastBtnDebounce = 0;
static bool lastBtnState = HIGH;

void connectWiFi() {
  Serial.printf("[WIFI] Connecting to SSID: %s\n", WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASS);

  unsigned long start = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - start < 15000) {
    delay(500);
    Serial.print(".");
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n[WIFI] ESP2 Connected!");
    Serial.printf("[WIFI] IP Address: %s\n", WiFi.localIP().toString().c_str());
    Serial.printf("[WIFI] RSSI: %d dBm\n", WiFi.RSSI());

    if (MDNS.begin(HOSTNAME_MDNS)) {
      Serial.printf("[mDNS] Responder started: http://%s.local\n", HOSTNAME_MDNS);
      MDNS.addService("http", "tcp", 80);
    }
  } else {
    Serial.println("\n[WIFI] Connection timeout. Running offline with periodic reconnect...");
  }
}

void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("\n==========================================");
  Serial.println("  ESP2: Environmental Sensors & Actuators");
  Serial.printf("  Firmware: v%s\n", FIRMWARE_VERSION);
  Serial.println("==========================================");

  // Status LED
  pinMode(PIN_STATUS_LED, OUTPUT);
  digitalWrite(PIN_STATUS_LED, HIGH);

  // Manual deployment pushbutton
  pinMode(PIN_DEPLOY_BTN, INPUT_PULLUP);

  // Initialize Actuators (Pump OFF, Servo Home)
  actuators.begin();

  // Initialize Sensors
  sensors.begin();

  // Connect Wi-Fi
  connectWiFi();

  // Start HTTP debug server
  setupWebServerESP2();

  digitalWrite(PIN_STATUS_LED, LOW);
  Serial.println("[SYSTEM] ESP2 ready for sensing and actuation.");
}

void loop() {
  // Handle HTTP REST & Debug Webpage requests
  server.handleClient();

  // Update sensor reading cycles and deployment state machine
  sensors.update();

  // Update servo progression and pump safety timer
  actuators.update();

  // Check manual hardware deployment pushbutton (with debounce)
  int btnReading = digitalRead(PIN_DEPLOY_BTN);
  if (btnReading != lastBtnState) {
    lastBtnDebounce = millis();
  }
  if ((millis() - lastBtnDebounce) > 50) {
    if (btnReading == LOW && lastBtnState == HIGH) {
      Serial.println("[BUTTON] Hardware deploy button pressed!");
      sensors.startSoilDeploymentSequence();
    }
  }
  lastBtnState = btnReading;

  // Wi-Fi Auto-reconnect watchdog
  if (millis() - lastWifiCheck > 5000) {
    lastWifiCheck = millis();
    if (WiFi.status() != WL_CONNECTED) {
      Serial.println("[WIFI] Disconnected! Reconnecting...");
      WiFi.reconnect();
    }
  }

  // 10-second Heartbeat log
  if (millis() - lastHeartbeat > 10000) {
    lastHeartbeat = millis();
    const SensorReadings &r = sensors.getReadings();
    Serial.printf("[HEARTBEAT] ESP2 Online | RSSI: %d dBm | Heap: %u B | Temp: %.1fC | Hum: %.1f%% | Soil: %d%% (%s) | Pump: %s\n",
      WiFi.RSSI(),
      ESP.getFreeHeap(),
      r.temperature,
      r.humidity,
      r.soil_percent,
      r.soil_state,
      actuators.isPumpActive() ? "ON" : "OFF"
    );

    // Heartbeat LED flash
    digitalWrite(PIN_STATUS_LED, HIGH);
    delay(20);
    digitalWrite(PIN_STATUS_LED, LOW);
  }

  delay(2);
}
