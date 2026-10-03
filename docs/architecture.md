# System Architecture & Technical Specification

## 1. High-Level Topology

```text
                           ┌───────────────────────────┐
                           │      Wi-Fi Router / AP    │
                           │   Local 2.4GHz LAN Mesh   │
                           └─────────────┬─────────────┘
                                         │
                 ┌───────────────────────┴───────────────────────┐
                 │                                               │
          ┌──────▼───────┐                                ┌──────▼───────┐
          │     ESP1     │                                │     ESP2     │
          │  ESP32-CAM   │                                │ Normal ESP32 │
          │              │                                │              │
          │ Camera Stream│                                │ DHT22        │
          │ L298N Motors │                                │ MQ-132       │
          │ Web Debug UI │                                │ MQ-5         │
          │ Port 80 / 81 │                                │ Soil Probe   │
          │ REST API     │                                │ Servo Arm    │
          └──────┬───────┘                                │ Water Pump   │
                 │                                        │ Web Debug UI │
                 │                                        │ REST API     │
                 │                                        └──────┬───────┘
                 │                                               │
                 └───────────────────────┬───────────────────────┘
                                         │
                           HTTP REST / Real-Time WebSocket
                                         │
                           ┌─────────────▼─────────────┐
                           │    Node.js Local Server   │
                           │  Port 5000 (Express + WS) │
                           │                           │
                           │ SQLite Database           │
                           │ Safety Watchdogs          │
                           │ Automation Engine         │
                           │ ML Prediction Engine      │
                           │ Hardware Simulator        │
                           └─────────────┬─────────────┘
                                         │
                               Local LAN / Localhost
                                         │
                           ┌─────────────▼─────────────┐
                           │   React + Vite PWA Client │
                           │        Port 3000          │
                           │                           │
                           │ Apple-Inspired Light/Dark │
                           │ Real-Time HUD & Controls  │
                           │ Offline Shell Service Wkr │
                           └───────────────────────────┘
```

---

## 2. Component Roles & Communication

### 2.1 Microcontroller Nodes
1. **ESP1: ESP32-CAM (Camera + Robot Chassis)**
   - Hosts OV2640 camera driver with dual-framebuffer DMA streaming.
   - Outputs MJPEG HTTP stream on Port 81 (`/stream`).
   - Serves static JPEG snapshots on Port 80 (`/snapshot`).
   - Executes PWM motor direction commands with hard-coded 1500ms safety timeout watchdog.
   - Hosts independent lightweight HTML5/CSS debug server at `http://ESP1-IP/`.

2. **ESP2: Environmental Sensing & Actuator Node**
   - Polls DHT22 sensor (temperature and humidity) every 3 seconds.
   - Continuously samples MQ-132 (hazardous gas/air quality) and MQ-5 (combustible gas) on ADC1 channels.
   - Controls capacitive soil moisture sensor power via a dedicated GPIO-controlled transistor switch (GPIO 25) to eliminate galvanic corrosion.
   - Manages servo deployment arm (0° Home to 180° Deploy).
   - Manages water pump via MOSFET/Relay with flyback diode and firmware-level 10s maximum runtime interlock.
   - Hosts independent lightweight HTML5/CSS debug server at `http://ESP2-IP/`.

### 2.2 Local Backend Server (Node.js + TypeScript)
- **Local-First LAN Operation**: Zero public cloud dependencies; operates entirely offline on the local network.
- **REST API (`/api/*`)**: Handles command dispatch, configuration updates, and historical queries.
- **WebSocket Server (`/ws`)**: Pushes real-time 1.5s telemetry broadcasts to connected browser clients.
- **SQLite Engine (`sql.js`)**: Stores sensor history, actuator events, automation rules, and ML predictions in indexed binary database file `esp_control.sqlite`.
- **Safety Interlock Watchdog**:
  - Automatically turns off water pump if continuous activation exceeds `MAX_PUMP_RUNTIME_SECONDS` (10s).
  - Enforces mandatory `PUMP_COOLDOWN_SECONDS` (30s) between irrigation cycles.
  - Automatically stops motors if no command or heartbeat is received within `MOTOR_TIMEOUT_MS` (1500ms).
- **Physical Simulator (`Simulator`)**:
  - Automatically activates when `SIMULATION_MODE=true` or physical devices are offline.
  - Simulates diurnal temperature/humidity oscillations, capacitive soil drying curves, virtual pump watering spikes, and synthetic camera patterns.

### 2.3 Progressive Web Application (PWA Frontend)
- **Design System**: Apple-inspired clean, minimalist surface hierarchy with smooth transitions, responsive D-pad controls, and high-contrast dark mode support.
- **Offline Shell**: Service Worker (`sw.js`) caches HTML, JS, CSS, and SVG icons for instantaneous loading without internet access.
- **Installation**: Can be installed to desktop (Windows/macOS/Linux) or mobile home screens (iOS/Android).

---

## 3. Network Resilience & Graceful Degradation
- If ESP1 drops offline: Camera card displays graceful reconnect HUD; robot driving controls automatically disable and motors halt.
- If ESP2 drops offline: Environmental cards display stale-data warning timers; automation engine skips irrigation triggers safely.
- If both ESPs are offline: System can toggle on Simulation Mode to allow full UI and ML pipeline testing without hardware.
- WebSocket automatically reconnects with exponential backoff if the local server restarts.
