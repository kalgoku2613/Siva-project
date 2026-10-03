#ifndef WEB_DEBUG_ESP2_H
#define WEB_DEBUG_ESP2_H

#include <Arduino.h>
#include <WiFi.h>
#include <WebServer.h>
#include "config.h"
#include "servo_pump.h"
#include "sensor_manager.h"

WebServer server(80);

// Embedded HTML5 Debug Webpage for ESP2
static const char PROGMEM INDEX_HTML_ESP2[] = R"rawliteral(
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ESP2: Sensor & Actuator Debug</title>
  <style>
    :root {
      --bg: #f8fafc;
      --card: #ffffff;
      --text: #0f172a;
      --sub: #64748b;
      --accent: #0284c7;
      --accent-hover: #0369a1;
      --border: #e2e8f0;
      --danger: #ef4444;
      --success: #10b981;
      --warning: #f59e0b;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    body { background: var(--bg); color: var(--text); padding: 1.5rem; line-height: 1.5; }
    .container { max-width: 960px; margin: 0 auto; }
    header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; border-bottom: 1px solid var(--border); padding-bottom: 1rem; }
    h1 { font-size: 1.5rem; font-weight: 600; }
    .badge { background: #dcfce7; color: #166534; padding: 0.25rem 0.75rem; border-radius: 9999px; font-size: 0.8rem; font-weight: 500; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1.25rem; }
    .card { background: var(--card); border: 1px solid var(--border); border-radius: 1rem; padding: 1.25rem; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
    .card h2 { font-size: 1.1rem; margin-bottom: 1rem; color: var(--text); font-weight: 600; display: flex; justify-content: space-between; }
    .val-large { font-size: 2.2rem; font-weight: 700; color: var(--text); }
    .val-unit { font-size: 1rem; color: var(--sub); font-weight: normal; margin-left: 0.25rem; }
    .stat-row { display: flex; justify-content: space-between; padding: 0.35rem 0; border-bottom: 1px solid #f1f5f9; font-size: 0.9rem; }
    .stat-row:last-child { border-bottom: none; }
    .stat-label { color: var(--sub); }
    .stat-val { font-weight: 500; }
    .btn-group { display: flex; flex-wrap: wrap; gap: 0.5rem; margin-top: 1rem; }
    button { background: var(--card); border: 1px solid var(--border); padding: 0.6rem 1rem; border-radius: 0.5rem; font-size: 0.9rem; font-weight: 600; cursor: pointer; transition: all 0.15s ease; color: var(--text); }
    button:hover { background: #f1f5f9; }
    button.primary { background: var(--accent); color: white; border-color: var(--accent); }
    button.primary:hover { background: var(--accent-hover); }
    button.danger { background: #fee2e2; color: var(--danger); border-color: #fca5a5; }
    button.danger:hover { background: #fecaca; }
    .status-pill { display: inline-block; padding: 0.2rem 0.5rem; border-radius: 0.375rem; font-size: 0.75rem; font-weight: 600; }
    .pill-green { background: #dcfce7; color: #15803d; }
    .pill-amber { background: #fef3c7; color: #b45309; }
    .pill-red { background: #fee2e2; color: #b91c1c; }
    .pill-gray { background: #f1f5f9; color: #64748b; }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <div>
        <h1>ESP2: Environmental Sensors & Actuators</h1>
        <p style="color:var(--sub); font-size:0.85rem;">Local Hardware Debug Server</p>
      </div>
      <span class="badge">● Online (LAN)</span>
    </header>

    <div class="grid">
      <!-- DHT22 Card -->
      <div class="card">
        <h2>Atmospheric Sensing (DHT22)</h2>
        <div style="display:flex; justify-content:space-between; align-items:baseline; margin-bottom:1rem;">
          <div>
            <div class="val-large" id="val-temp">--<span class="val-unit">°C</span></div>
            <div style="font-size:0.8rem; color:var(--sub);">Ambient Temperature</div>
          </div>
          <div>
            <div class="val-large" id="val-hum">--<span class="val-unit">%</span></div>
            <div style="font-size:0.8rem; color:var(--sub);">Relative Humidity</div>
          </div>
        </div>
        <div class="stat-row"><span class="stat-label">Sensor Status:</span><span class="stat-val" id="dht-status">Reading...</span></div>
      </div>

      <!-- Soil Moisture Deployment Card -->
      <div class="card">
        <h2>Soil Moisture Deployment</h2>
        <div style="display:flex; justify-content:space-between; align-items:baseline; margin-bottom:0.75rem;">
          <div>
            <div class="val-large" id="val-soil-pct">--<span class="val-unit">%</span></div>
            <div style="font-size:0.8rem; color:var(--sub);">Calibrated Moisture</div>
          </div>
          <div>
            <span id="pill-soil-state" class="status-pill pill-gray">INACTIVE</span>
          </div>
        </div>
        <div class="stat-row"><span class="stat-label">Sequence State:</span><span class="stat-val" id="seq-state">IDLE</span></div>
        <div class="stat-row"><span class="stat-label">Raw ADC:</span><span class="stat-val" id="soil-raw">--</span></div>
        <div class="stat-row"><span class="stat-label">Dry/Wet Calibration:</span><span class="stat-val" id="soil-cal">-- / --</span></div>
        <div class="btn-group">
          <button class="primary" onclick="postCmd('/api/moisture/deploy-and-read')">Deploy & Measure</button>
          <button onclick="postCmd('/api/servo/retract')">Retract Arm</button>
        </div>
      </div>

      <!-- Gas Sensors Card -->
      <div class="card">
        <h2>Air Quality & Gas Sensing</h2>
        <div class="stat-row">
          <span class="stat-label">MQ-132 (Hazardous Gas/Air):</span>
          <span class="stat-val" id="mq132-val">-- (Raw ADC: --)</span>
        </div>
        <div class="stat-row">
          <span class="stat-label">MQ-132 Warm-up:</span>
          <span class="stat-val" id="mq132-warm">--</span>
        </div>
        <div class="stat-row">
          <span class="stat-label">MQ-5 (Combustible Gas/LPG):</span>
          <span class="stat-val" id="mq5-val">-- (Raw ADC: --)</span>
        </div>
        <div class="stat-row">
          <span class="stat-label">MQ-5 Warm-up:</span>
          <span class="stat-val" id="mq5-warm">--</span>
        </div>
        <p style="font-size:0.75rem; color:var(--sub); margin-top:0.75rem;">Note: Raw ADC scaled to normalized air quality index (0-100).</p>
      </div>

      <!-- Actuators Card: Pump & Servo -->
      <div class="card">
        <h2>Actuator Controls</h2>
        <div class="stat-row"><span class="stat-label">Servo Angle:</span><span class="stat-val" id="servo-deg">0°</span></div>
        <div class="stat-row"><span class="stat-label">Water Pump:</span><span class="stat-val" id="pump-state">OFF</span></div>
        <div class="btn-group" style="margin-top:0.75rem;">
          <button onclick="postCmd('/api/servo/angle?val=0')">Servo 0°</button>
          <button onclick="postCmd('/api/servo/angle?val=90')">Servo 90°</button>
          <button onclick="postCmd('/api/servo/angle?val=180')">Servo 180°</button>
        </div>
        <div class="btn-group">
          <button class="primary" onclick="postCmd('/api/pump/on?duration=4000')">Pump ON (4s)</button>
          <button class="danger" onclick="postCmd('/api/pump/off')">Pump OFF</button>
        </div>
        <div style="font-size:0.75rem; color:var(--danger); margin-top:0.5rem;">Watchdog: Max pump runtime hard-limited to 10s.</div>
      </div>

      <!-- Health Card -->
      <div class="card" style="grid-column: 1 / -1;">
        <h2>System Telemetry & Network</h2>
        <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap:1rem;">
          <div>
            <div class="stat-row"><span class="stat-label">Device Name:</span><span class="stat-val">ESP2-Sensor-Controller</span></div>
            <div class="stat-row"><span class="stat-label">Firmware:</span><span class="stat-val" id="d-fw">--</span></div>
            <div class="stat-row"><span class="stat-label">Uptime:</span><span class="stat-val" id="d-uptime">--</span></div>
          </div>
          <div>
            <div class="stat-row"><span class="stat-label">IP Address:</span><span class="stat-val" id="d-ip">--</span></div>
            <div class="stat-row"><span class="stat-label">Wi-Fi RSSI:</span><span class="stat-val" id="d-rssi">--</span></div>
            <div class="stat-row"><span class="stat-label">Free Heap:</span><span class="stat-val" id="d-heap">--</span></div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <script>
    async function postCmd(endpoint) {
      try {
        await fetch(endpoint, { method: 'POST' });
        pollSensors();
      } catch (e) {
        console.error('Action failed', e);
      }
    }

    async function pollSensors() {
      try {
        const res = await fetch('/api/sensors');
        const data = await res.json();

        // DHT22
        document.getElementById('val-temp').innerHTML = (data.dht_valid ? data.temperature.toFixed(1) : '--') + '<span class="val-unit">°C</span>';
        document.getElementById('val-hum').innerHTML = (data.dht_valid ? data.humidity.toFixed(1) : '--') + '<span class="val-unit">%</span>';
        document.getElementById('dht-status').innerText = data.dht_valid ? 'Valid (OK)' : 'Sensor Error / NaN';

        // Soil
        document.getElementById('val-soil-pct').innerHTML = data.soil_percent + '<span class="val-unit">%</span>';
        document.getElementById('seq-state').innerText = data.sequence_state;
        document.getElementById('soil-raw').innerText = data.soil_raw;
        document.getElementById('soil-cal').innerText = data.soil_dry_adc + ' / ' + data.soil_wet_adc;

        const pill = document.getElementById('pill-soil-state');
        pill.innerText = data.soil_state;
        pill.className = 'status-pill ' + (data.soil_state === 'WET' ? 'pill-green' : data.soil_state === 'MODERATE' ? 'pill-amber' : data.soil_state === 'DRY' ? 'pill-red' : 'pill-gray');

        // Gas
        document.getElementById('mq132-val').innerText = data.mq132_index.toFixed(1) + ' / 100 (Raw: ' + data.mq132_raw + ')';
        document.getElementById('mq132-warm').innerText = data.mq132_warmed_up ? 'Ready' : 'Warming up...';
        document.getElementById('mq5-val').innerText = data.mq5_index.toFixed(1) + ' / 100 (Raw: ' + data.mq5_raw + ')';
        document.getElementById('mq5-warm').innerText = data.mq5_warmed_up ? 'Ready' : 'Warming up...';

        // Actuators
        document.getElementById('servo-deg').innerText = data.servo_angle + '°';
        document.getElementById('pump-state').innerText = data.pump_active ? 'ACTIVE (RUNNING)' : 'OFF';

        // Health
        document.getElementById('d-fw').innerText = data.firmware;
        document.getElementById('d-uptime').innerText = data.uptime_seconds + 's';
        document.getElementById('d-ip').innerText = data.ip;
        document.getElementById('d-rssi').innerText = data.rssi + ' dBm';
        document.getElementById('d-heap').innerText = Math.round(data.free_heap / 1024) + ' KB';
      } catch (e) {}
    }

    setInterval(pollSensors, 1500);
    pollSensors();
  </script>
</body>
</html>
)rawliteral";

void sendCorsHeaders() {
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.sendHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  server.sendHeader("Access-Control-Allow-Headers", "Content-Type");
}

void handleOptions() {
  sendCorsHeaders();
  server.send(204);
}

void handleIndex() {
  sendCorsHeaders();
  server.send_P(200, "text/html", INDEX_HTML_ESP2);
}

void handleStatus() {
  sendCorsHeaders();
  char buf[384];
  snprintf(buf, sizeof(buf),
    "{\"device\":\"%s\",\"firmware\":\"%s\",\"uptime_seconds\":%lu,\"ip\":\"%s\",\"rssi\":%d,\"free_heap\":%u,\"status\":\"ONLINE\"}",
    DEVICE_NAME,
    FIRMWARE_VERSION,
    millis() / 1000,
    WiFi.localIP().toString().c_str(),
    WiFi.RSSI(),
    ESP.getFreeHeap()
  );
  server.send(200, "application/json", buf);
}

void handleSensors() {
  sendCorsHeaders();
  const SensorReadings &r = sensors.getReadings();

  char buf[640];
  snprintf(buf, sizeof(buf),
    "{\"device\":\"%s\",\"firmware\":\"%s\",\"uptime_seconds\":%lu,\"ip\":\"%s\",\"rssi\":%d,\"free_heap\":%u,"
    "\"temperature\":%.2f,\"humidity\":%.2f,\"dht_valid\":%s,"
    "\"mq132_raw\":%d,\"mq132_index\":%.2f,\"mq132_warmed_up\":%s,"
    "\"mq5_raw\":%d,\"mq5_index\":%.2f,\"mq5_warmed_up\":%s,"
    "\"soil_raw\":%d,\"soil_percent\":%d,\"soil_state\":\"%s\",\"soil_active\":%s,\"sequence_state\":\"%s\","
    "\"soil_dry_adc\":%d,\"soil_wet_adc\":%d,"
    "\"servo_angle\":%d,\"pump_active\":%s,\"pump_elapsed_ms\":%lu}",
    DEVICE_NAME,
    FIRMWARE_VERSION,
    millis() / 1000,
    WiFi.localIP().toString().c_str(),
    WiFi.RSSI(),
    ESP.getFreeHeap(),
    r.temperature,
    r.humidity,
    r.dht_valid ? "true" : "false",
    r.mq132_raw,
    r.mq132_index,
    r.mq132_warmed_up ? "true" : "false",
    r.mq5_raw,
    r.mq5_index,
    r.mq5_warmed_up ? "true" : "false",
    r.soil_raw,
    r.soil_percent,
    r.soil_state,
    r.soil_active ? "true" : "false",
    sensors.getSequenceStateString(),
    sensors.getSoilDryAdc(),
    sensors.getSoilWetAdc(),
    actuators.getServoAngle(),
    actuators.isPumpActive() ? "true" : "false",
    actuators.getPumpRuntimeElapsed()
  );
  server.send(200, "application/json", buf);
}

void handleDeployAndRead() {
  sendCorsHeaders();
  sensors.startSoilDeploymentSequence();
  server.send(200, "application/json", "{\"success\":true,\"message\":\"Soil deployment sequence initiated\"}");
}

void handleServoRetract() {
  sendCorsHeaders();
  sensors.retractSoilSensor();
  server.send(200, "application/json", "{\"success\":true,\"message\":\"Servo retracted to 0 deg\"}");
}

void handleServoDeploy() {
  sendCorsHeaders();
  actuators.deployServo();
  server.send(200, "application/json", "{\"success\":true,\"message\":\"Servo deployed to 180 deg\"}");
}

void handleServoAngle() {
  sendCorsHeaders();
  if (server.hasArg("val")) {
    int angle = server.arg("val").toInt();
    actuators.setServoTargetAngle(angle);
    server.send(200, "application/json", "{\"success\":true,\"angle\":" + String(angle) + "}");
  } else {
    server.send(400, "application/json", "{\"success\":false,\"error\":\"Missing 'val' query parameter\"}");
  }
}

void handlePumpOn() {
  sendCorsHeaders();
  unsigned long duration = DEFAULT_PUMP_PULSE_MS;
  if (server.hasArg("duration")) {
    duration = server.arg("duration").toInt();
  }
  bool ok = actuators.turnPumpOn(duration);
  if (ok) {
    server.send(200, "application/json", "{\"success\":true,\"pump\":true,\"duration_ms\":" + String(duration) + "}");
  } else {
    server.send(429, "application/json", "{\"success\":false,\"error\":\"Pump cooldown active or safety violation\"}");
  }
}

void handlePumpOff() {
  sendCorsHeaders();
  actuators.turnPumpOff();
  server.send(200, "application/json", "{\"success\":true,\"pump\":false}");
}

void handleCalibrateSoil() {
  sendCorsHeaders();
  if (server.hasArg("dry") && server.hasArg("wet")) {
    int dry = server.arg("dry").toInt();
    int wet = server.arg("wet").toInt();
    sensors.setSoilCalibration(dry, wet);
    server.send(200, "application/json", "{\"success\":true,\"dry\":" + String(dry) + ",\"wet\":" + String(wet) + "}");
  } else {
    server.send(400, "application/json", "{\"success\":false,\"error\":\"Requires 'dry' and 'wet' parameters\"}");
  }
}

void setupWebServerESP2() {
  server.on("/", HTTP_GET, handleIndex);
  server.on("/api/status", HTTP_GET, handleStatus);
  server.on("/api/sensors", HTTP_GET, handleSensors);
  server.on("/api/moisture/deploy-and-read", HTTP_POST, handleDeployAndRead);
  server.on("/api/servo/deploy", HTTP_POST, handleServoDeploy);
  server.on("/api/servo/retract", HTTP_POST, handleServoRetract);
  server.on("/api/servo/angle", HTTP_POST, handleServoAngle);
  server.on("/api/pump/on", HTTP_POST, handlePumpOn);
  server.on("/api/pump/off", HTTP_POST, handlePumpOff);
  server.on("/api/calibrate/soil", HTTP_POST, handleCalibrateSoil);

  server.onNotFound([]() {
    if (server.method() == HTTP_OPTIONS) {
      handleOptions();
    } else {
      server.send(404, "text/plain", "Not Found");
    }
  });

  server.begin();
  Serial.println("[HTTP] ESP2 Web Debug Server started on port 80");
}

#endif // WEB_DEBUG_ESP2_H
