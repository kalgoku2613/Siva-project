# ESP32 Smart Monitoring, Camera, Motor, Environmental Sensing, ML Prediction & PWA Control System

A complete, production-grade, local-first IoT system integrating two ESP32 microcontrollers (**ESP1: ESP32-CAM** and **ESP2: Standard ESP32**) communicating over the local Wi-Fi network with an Apple-inspired Progressive Web App (PWA), embedded hardware debug pages, time-series machine learning forecasting, and fail-safe hardware watchdogs.

---

## 1. System Overview & Architecture

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

## 2. Hardware Bill of Materials (BOM)

| Component | Quantity | Purpose | Operating Voltage |
|---|---|---|---|
| **AI-Thinker ESP32-CAM** | 1 | Camera streaming + L298N motor driver | 5V Regulated (2A peak) |
| **Standard ESP32 DevKit** | 1 | Sensors + Servo + Water pump relay | 5V / 3.3V Logic |
| **L298N Dual H-Bridge Driver** | 1 | 2x DC Motor bidirectional speed control | 7V – 12V Motor Rail |
| **Geared DC Motors & Chassis** | 2 | Differential mobile robot platform | 6V – 12V |
| **DHT22 (AM2302)** | 1 | Ambient temperature and humidity | 3.3V (with 10kΩ pull-up) |
| **MQ-132 Gas Sensor** | 1 | Hazardous gas / air quality indicator | 5V (Heater coil) |
| **MQ-5 Gas Sensor** | 1 | Combustible gas / LPG / smoke indicator | 5V (Heater coil) |
| **Capacitive Soil Moisture Probe**| 1 | Corrosion-free soil dielectric measurement | 3.3V (Switched via GPIO 25) |
| **SG90 / MG996R Servo** | 1 | Mechanical arm dipping probe into soil | 5V External Supply |
| **Submersible 5V/12V DC Pump** | 1 | Automated precision soil irrigation | 5V – 12V External Supply |
| **5V Relay or IRLZ44N MOSFET** | 1 | DC water pump power driver | Logic 3.3V / 5V |
| **1N4007 / 1N5819 Diode** | 1 | Inductive flyback clamp across pump | Reverse polarity clamp |
| **LM2596 / Buck Converter** | 1 | Regulated 5V 3A step-down from 12V battery | 12V in -> 5.0V out |
| **$100\mu\text{F}$ & $0.1\mu\text{F}$ Capacitors** | 2 | Decoupling filters across ESP32 5V rails | Sags and spike suppression |

---

## 3. Strict Pin Assignment Tables

### 3.1 ESP1: ESP32-CAM Pin Allocation
*See [docs/pin_review.md](file:///c:/Users/Dell/OneDrive/Desktop/project/Auto%20watering%20and%20weather%20ststion/docs/pin_review.md) for full conflict validation.*

| ESP32-CAM Pin | L298N Terminal | Role / Function | Electrical Notes |
|---|---|---|---|
| **GPIO 12** | **IN1** | Motor A Forward PWM | **MTDI Bootstrapping Pin:** Must NOT be pulled HIGH externally at boot! |
| **GPIO 13** | **IN2** | Motor A Reverse PWM | Safe external output |
| **GPIO 14** | **IN3** | Motor B Forward PWM | Safe external output |
| **GPIO 15** | **IN4** | Motor B Reverse PWM | Safe external output |
| *(Factory Jumper)* | **ENA / ENB** | Jumpered to 5V permanently | Enables 4-pin direct PWM direction mode |
| **5V & GND** | Power Rails | Logic supply & Ground | $100\mu\text{F}$ buffer capacitor required |

### 3.2 ESP2: Sensor Controller Pin Allocation
*Strictly uses **ADC1** pins to prevent Wi-Fi ADC2 hardware contention.*

| ESP2 Pin | Component Signal | Sensor Role | Notes |
|---|---|---|---|
| **GPIO 4** | DHT22 DATA | Temperature & Humidity | Requires **10kΩ pull-up** to 3.3V |
| **GPIO 35** | MQ-132 AO | Hazardous Gas Analog Out | **ADC1_CH7** (Input only, 0-3.3V safe) |
| **GPIO 32** | MQ-5 AO | Combustible Gas Analog Out | **ADC1_CH4** (0-3.3V safe) |
| **GPIO 34** | Soil Probe AO | Capacitive Moisture Out | **ADC1_CH6** (0-3.3V safe) |
| **GPIO 25** | Transistor Base / Gate | Soil Sensor Power Switch | Energized ONLY during sampling to stop corrosion |
| **GPIO 18** | Servo Signal | 50Hz PWM Arm Movement | 0° (Home) to 180° (Deploy) |
| **GPIO 26** | Pump Driver Control | Relay / MOSFET Gate | Hard 10s maximum runtime limit |
| **GPIO 27** | Pushbutton Input | Hardware Manual Deploy | `INPUT_PULLUP` enabled; pulls to GND |
| **GPIO 2** | Onboard LED | Status & Heartbeat Flash | Visual activity indicator |

---

## 4. Power Isolation & Common Grounding

```text
       +──────────────────────────────────────────────────────────+
       │           12V DC Power Supply (e.g. 12V 3A / 3S LiPo)    │
       +──────┬────────────────────────────┬──────────────────────+
              │ +12V                       │ +12V
              │                            │
       +──────▼──────────────+      +──────▼──────────────+
       │  L298N VMS (+12V)   │      │ 12V Water Pump (+)  │
       │  (Motor Power Rail) │      │ (Via Relay / MOSFET)│
       +─────────────────────+      +─────────────────────+
              │
       +──────▼───────────────────────────────────+
       │ Step-Down Buck Converter (LM2596 / XL4015)│
       │ Output: Regulated 5.0V @ 3.0A Max        │
       +──────┬────────────────────┬──────────────+
              │ +5V                │ +5V
              │                    │
     +────────▼────────+    +──────▼─────────+    +───────────────+
     │ ESP32-CAM (5V)  │    │  ESP2 Dev (5V) │    │ Servo (5V)    │
     +────────┬────────+    +──────┬─────────+    +───────┬───────+
              │                    │                      │
              └────────────────────┼──────────────────────┘
                                   │
              +────────────────────▼──────────────────────+
              │            COMMON GROUND (GND)            │
              │  Star Topology - All GNDs Connected Here  │
              +───────────────────────────────────────────+
```

1. **Common Ground**: All negative terminals (Power supplies, ESP32 boards, L298N, Servo, Pump, and Sensors) must be bonded together in a star topology.
2. **Flyback Protection**: A **1N4007** diode in reverse polarity across the pump motor terminals clamps inductive back-EMF spikes.
3. **Dedicated Servo Rail**: Servos draw up to 1.5A stall current and must never be powered from the ESP32 3.3V or 5V regulator pin.

---

## 5. Firmware Flashing Instructions

### Flashing ESP1 (ESP32-CAM)
1. Connect a USB-to-UART FTDI adapter:
   - FTDI `TX` $\rightarrow$ ESP32-CAM `U0RXD` (GPIO 3)
   - FTDI `RX` $\rightarrow$ ESP32-CAM `U0TXD` (GPIO 1)
   - FTDI `5V` $\rightarrow$ ESP32-CAM `5V`
   - FTDI `GND` $\rightarrow$ ESP32-CAM `GND`
   - **Connect GPIO 0 to GND** with a jumper wire to enter download mode.
2. Open `firmware/esp1-camera-motor/esp1-camera-motor.ino` in Arduino IDE.
3. Select Board: **"AI Thinker ESP32-CAM"**.
4. Enable PSRAM: **Tools $\rightarrow$ PSRAM: "Enabled"**.
5. Set Wi-Fi credentials in `config.h` or via compiler defines.
6. Click **Upload**. When finished, **remove the GPIO 0 jumper** and press the RESET button.

### Flashing ESP2 (Sensor Controller)
1. Connect the ESP32 DevKit directly via Micro-USB.
2. Open `firmware/esp2-sensor-controller/esp2-sensor-controller.ino`.
3. Select Board: **"ESP32 Dev Module"**.
4. Set Wi-Fi credentials in `config.h`.
5. Click **Upload**.

---

## 6. Software Setup & Running

### Automated Windows Start:
Double-click `start-app.bat` or run:
```cmd
start-app.bat
```
This script checks the runtime, starts the backend (port 5000) and frontend (port 3000), and launches your default browser.

### Manual Launch:
```bash
# 1. Start Backend Server
cd backend
npm install
npm run build
npm start

# 2. Start Frontend PWA (in a separate terminal)
cd frontend
npm install
npm run dev
```

Open `http://localhost:3000` in any modern web browser.

---

## 7. Hardware-Independent Simulation Mode
If ESP32 hardware is not yet wired, the platform automatically activates **Simulation Mode** (`SIMULATION_MODE=true` in `.env`). The built-in physical simulator:
- Generates realistic diurnal sinusoidal temperature & humidity cycles.
- Models physical soil moisture evaporation over hours.
- Animates virtual servo arm movements and samples synthetic moisture readings.
- Responds to water pump pulses by increasing virtual soil moisture.
- Provides virtual camera patterns and D-pad driving feedback.

To generate a full 7-day correlated historical dataset for the ML engine:
```bash
cd backend
node ./node_modules/tsx/dist/cli.mjs ../scripts/generate_synthetic_data.ts
```

---

## 8. Running Automated Test Suites

```bash
# Run backend database, safety watchdogs, ML, and automation tests
cd backend
npm test

# Run hardware-independent mock verification script
cd backend
node ./node_modules/tsx/dist/cli.mjs ../scripts/test_hardware_mocks.ts

# Build and typecheck production frontend bundle
cd frontend
npm run build
```

---

## 9. Safety & Fail-Safe Features

1. **Pump Safety Cutoff**: Hard-coded 10-second continuous runtime limit; automatic emergency shutoff protects reservoir and soil.
2. **Mandatory Cooldown**: 30-second cooldown period between irrigation pulses prevents pump burnout.
3. **Motor Timeout Watchdog**: Motors automatically stop within 1500ms if communication drops.
4. **Initial Boot Safety**: Both motors and water pump are guaranteed OFF at microcontroller startup.
5. **Soil Corrosion Protection**: Capacitive sensor power is turned ON only during the 11-step sampling window.
6. **One-Click Emergency Stop**: Accessible from the UI header ribbon or by pressing the **Space** key.

---

## 10. Technical Documentation Index
- [Architecture Technical Specification](file:///c:/Users/Dell/OneDrive/Desktop/project/Auto%20watering%20and%20weather%20ststion/docs/architecture.md)
- [Complete Electrical Wiring Guide](file:///c:/Users/Dell/OneDrive/Desktop/project/Auto%20watering%20and%20weather%20ststion/docs/wiring.md)
- [Hardware Pin Review & Conflict Validation](file:///c:/Users/Dell/OneDrive/Desktop/project/Auto%20watering%20and%20weather%20ststion/docs/pin_review.md)
- [Commissioning & Operating Manual](file:///c:/Users/Dell/OneDrive/Desktop/project/Auto%20watering%20and%20weather%20ststion/docs/operation.md)
- [REST API & WebSocket Reference](file:///c:/Users/Dell/OneDrive/Desktop/project/Auto%20watering%20and%20weather%20ststion/docs/api.md)
- [Sensor Calibration Procedures](file:///c:/Users/Dell/OneDrive/Desktop/project/Auto%20watering%20and%20weather%20ststion/docs/calibration.md)
- [Hardware Troubleshooting Guide](file:///c:/Users/Dell/OneDrive/Desktop/project/Auto%20watering%20and%20weather%20ststion/docs/troubleshooting.md)
