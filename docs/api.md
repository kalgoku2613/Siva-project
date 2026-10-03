# System API Reference & Protocol Specification

This document provides complete documentation for the REST API endpoints and WebSocket messages implemented across the Node.js backend hub, ESP1 (ESP32-CAM), and ESP2 (Sensor Controller).

---

## 1. Central Backend REST API (Port 5000)

### 1.1 System & Telemetry

#### `GET /api/system/status`
Returns overall health status, online/offline states of both ESP nodes, latest sensor frame, and safety watchdog statuses.
- **Response `200 OK`**:
```json
{
  "success": true,
  "simulationMode": false,
  "devices": [
    {
      "id": "ESP1",
      "name": "ESP1-Camera-Motor",
      "state": "ONLINE",
      "ip": "192.168.1.150",
      "rssi": -55,
      "uptimeSeconds": 1420,
      "freeHeap": 142800,
      "firmware": "1.2.0",
      "latencyMs": 14
    },
    {
      "id": "ESP2",
      "name": "ESP2-Sensor-Controller",
      "state": "ONLINE",
      "ip": "192.168.1.151",
      "rssi": -62,
      "uptimeSeconds": 1420,
      "freeHeap": 185200,
      "firmware": "1.2.0",
      "latencyMs": 18
    }
  ],
  "telemetry": {
    "temperature": 24.6,
    "humidity": 58.2,
    "dhtValid": true,
    "soilPercent": 48,
    "soilState": "MODERATE",
    "mq132Index": 21.4,
    "mq5Index": 15.2,
    "servoAngle": 0,
    "pumpActive": false
  },
  "timestamp": 1727938492000
}
```

#### `GET /api/system/health`
Triggers full diagnostic probing of ESP1, ESP2, SQLite database, WebSockets, and safety watchdogs.
- **Response `200 OK`**:
```json
{
  "success": true,
  "report": {
    "timestamp": 1727938492000,
    "healthy": true,
    "subsystems": {
      "esp1CameraMotor": { "online": true, "ip": "192.168.1.150", "latencyMs": 14 },
      "esp2Sensors": { "online": true, "ip": "192.168.1.151", "latencyMs": 18 },
      "database": { "connected": true, "totalReadings": 673 },
      "webSocket": { "activeConnections": 1 },
      "safetyWatchdog": { "pumpCutoffArmed": true, "motorWatchdogArmed": true }
    },
    "summary": "All hardware modules operating nominally."
  }
}
```

#### `POST /api/system/emergency-stop`
Immediate dual-level shutdown: halts all robot motors and disables the water pump.
- **Response `200 OK`**:
```json
{
  "success": true,
  "message": "All hardware stopped immediately."
}
```

---

### 1.2 Robot & Motor Control

#### `POST /api/robot/move`
Dispatches directional drive commands with PWM speed.
- **Request Body**:
```json
{
  "direction": "FORWARD", // "FORWARD" | "BACKWARD" | "LEFT" | "RIGHT" | "STOP"
  "speed": 190            // 0 - 255
}
```
- **Response `200 OK`**:
```json
{
  "success": true,
  "direction": "FORWARD"
}
```
- **Error `400 Bad Request`**:
```json
{
  "success": false,
  "error": "Invalid motor direction"
}
```

---

### 1.3 Actuator & Soil Deployment

#### `POST /api/moisture/deploy`
Initiates autonomous 11-step servo deployment into soil.
- **Response `200 OK`**:
```json
{
  "success": true,
  "message": "Deployment command sent to ESP2"
}
```

#### `POST /api/pump/on`
Energizes water pump for a specific duration (capped at 10s maximum).
- **Request Body**:
```json
{
  "durationMs": 4000
}
```
- **Response `200 OK`**:
```json
{
  "success": true,
  "active": true
}
```
- **Error `429 Too Many Requests` (Cooldown Active)**:
```json
{
  "success": false,
  "active": false,
  "error": "Pump cooldown active. Please wait 24s"
}
```

---

### 1.4 Machine Learning & Predictions

#### `GET /api/ml/forecast?target=soil_moisture`
Returns recursive multi-horizon forecast with upper and lower confidence uncertainty bounds.
- **Query Params**: `target` = `soil_moisture` | `temperature` | `humidity`
- **Response `200 OK`**:
```json
{
  "success": true,
  "target": "soil_moisture",
  "forecast": [
    { "horizonMinutes": 30, "predictedValue": 47.8, "confidenceLower": 46.6, "confidenceUpper": 49.0, "confidenceLevel": "High" },
    { "horizonMinutes": 60, "predictedValue": 47.2, "confidenceLower": 45.5, "confidenceUpper": 48.9, "confidenceLevel": "High" },
    { "horizonMinutes": 180, "predictedValue": 45.1, "confidenceLower": 42.7, "confidenceUpper": 47.5, "confidenceLevel": "Medium" },
    { "horizonMinutes": 1440, "predictedValue": 32.4, "confidenceLower": 26.2, "confidenceUpper": 38.6, "confidenceLevel": "Low" }
  ]
}
```

---

## 2. ESP Hardware Local APIs

### 2.1 ESP1: ESP32-CAM (`http://ESP1-IP/`)
- `GET /`: Lightweight HTML5/CSS debug server with live camera preview and D-pad buttons.
- `GET /stream`: Port 81 multipart/x-mixed-replace MJPEG video stream.
- `GET /snapshot`: Still JPEG capture.
- `GET /api/status`: JSON telemetry (uptime, RSSI, heap, motor direction, motor speed).
- `POST /api/motor/forward`, `/backward`, `/left`, `/right`, `/stop`
- `POST /api/motor/speed?val=<0-255>`

### 2.2 ESP2: Sensor Controller (`http://ESP2-IP/`)
- `GET /`: Lightweight HTML5/CSS debug server with sensor readings and test buttons.
- `GET /api/status`: Device health JSON.
- `GET /api/sensors`: Full sensor readout JSON (temp, humidity, gas ADC, soil ADC, servo angle, pump status).
- `POST /api/moisture/deploy-and-read`: Triggers deployment sequence.
- `POST /api/servo/deploy`, `/api/servo/retract`, `/api/servo/angle?val=<0-180>`
- `POST /api/pump/on?duration=<ms>`, `/api/pump/off`
- `POST /api/calibrate/soil?dry=<adc>&wet=<adc>`
