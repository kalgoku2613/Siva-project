#include <Arduino.h>
#include <WiFi.h>
#include <ESPmDNS.h>
#include "esp_camera.h"
#include "config.h"
#include "camera_pins.h"
#include "motor_controller.h"
#include "web_debug.h"

MotorController motors;

static unsigned long lastHeartbeat = 0;
static unsigned long lastWifiCheck = 0;

void initCamera() {
  camera_config_t config;
  config.ledc_channel = LEDC_CHANNEL_0;
  config.ledc_timer = LEDC_TIMER_0;
  config.pin_d0 = Y2_GPIO_NUM;
  config.pin_d1 = Y3_GPIO_NUM;
  config.pin_d2 = Y4_GPIO_NUM;
  config.pin_d3 = Y5_GPIO_NUM;
  config.pin_d4 = Y6_GPIO_NUM;
  config.pin_d5 = Y7_GPIO_NUM;
  config.pin_d6 = Y8_GPIO_NUM;
  config.pin_d7 = Y9_GPIO_NUM;
  config.pin_xclk = XCLK_GPIO_NUM;
  config.pin_pclk = PCLK_GPIO_NUM;
  config.pin_vsync = VSYNC_GPIO_NUM;
  config.pin_href = HREF_GPIO_NUM;
  config.pin_sccb_sda = SIOD_GPIO_NUM;
  config.pin_sccb_scl = SIOC_GPIO_NUM;
  config.pin_pwdn = PWDN_GPIO_NUM;
  config.pin_reset = RESET_GPIO_NUM;
  config.xclk_freq_hz = 20000000;
  config.pixel_format = PIXFORMAT_JPEG;

  if (psramFound()) {
    config.frame_size = FRAMESIZE_SVGA; // 800x600 for balance of clarity and frame rate
    config.jpeg_quality = 12;            // 10-63 lower means higher quality
    config.fb_count = 2;
    config.grab_mode = CAMERA_GRAB_LATEST;
  } else {
    config.frame_size = FRAMESIZE_VGA;  // 640x480 fallback
    config.jpeg_quality = 14;
    config.fb_count = 1;
  }

  esp_err_t err = esp_camera_init(&config);
  if (err != ESP_OK) {
    Serial.printf("[CAMERA] Camera init failed with error 0x%x\n", err);
    return;
  }

  sensor_t *s = esp_camera_sensor_get();
  if (s != NULL) {
    s->set_brightness(s, 0);
    s->set_contrast(s, 0);
    s->set_saturation(s, 0);
    s->set_whitebal(s, 1);
    s->set_awb_gain(s, 1);
  }
  Serial.println("[CAMERA] Camera initialized successfully");
}

void connectWiFi() {
  Serial.printf("[WIFI] Connecting to SSID: %s\n", WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.setSleep(false); // Disable Wi-Fi sleep for reliable real-time camera streaming
  WiFi.begin(WIFI_SSID, WIFI_PASS);

  unsigned long start = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - start < 15000) {
    delay(500);
    Serial.print(".");
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n[WIFI] Connected!");
    Serial.printf("[WIFI] IP Address: %s\n", WiFi.localIP().toString().c_str());
    Serial.printf("[WIFI] RSSI: %d dBm\n", WiFi.RSSI());

    if (MDNS.begin(HOSTNAME_MDNS)) {
      Serial.printf("[mDNS] Responder started: http://%s.local\n", HOSTNAME_MDNS);
      MDNS.addService("http", "tcp", 80);
    }
  } else {
    Serial.println("\n[WIFI] Connection timeout. Retrying in background...");
  }
}

void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("\n==========================================");
  Serial.println("  ESP1: ESP32-CAM Camera & Motor Control");
  Serial.printf("  Firmware: v%s\n", FIRMWARE_VERSION);
  Serial.println("==========================================");

  // Initialize motors FIRST for guaranteed initial STOP state
  motors.begin();

  // Initialize Camera
  initCamera();

  // Connect to Wi-Fi
  connectWiFi();

  // Start embedded web server & stream
  startCameraServer();

  Serial.println("[SYSTEM] Ready. Local Web Debug server running on Port 80 and Stream on Port 81.");
}

void loop() {
  // Motor watchdog: Stops motors if communication drops
  motors.update();

  // Periodic Wi-Fi connection check & auto-reconnect
  if (millis() - lastWifiCheck > 5000) {
    lastWifiCheck = millis();
    if (WiFi.status() != WL_CONNECTED) {
      Serial.println("[WIFI] Disconnected! Attempting reconnect...");
      WiFi.reconnect();
    }
  }

  // Heartbeat log every 10 seconds
  if (millis() - lastHeartbeat > 10000) {
    lastHeartbeat = millis();
    Serial.printf("[HEARTBEAT] ESP1 Online | RSSI: %d dBm | Free Heap: %u B | Motor: %s | Speed: %u\n",
      WiFi.RSSI(),
      ESP.getFreeHeap(),
      motors.getDirectionString(),
      motors.getSpeed()
    );
  }

  delay(5);
}
