# Complete Hardware Wiring & Electrical Architecture

This document provides schematics, pin-by-pin hookup instructions, power distribution diagrams, and electrical protection details for the complete dual-ESP32 IoT system.

---

## 1. System Power Architecture

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
     │ Requires ~2A pk │    │  Requires ~1A  │    │ MG996R/SG90   │
     +────────┬────────+    +──────┬─────────+    +───────┬───────+
              │                    │                      │
              └────────────────────┼──────────────────────┘
                                   │
              +────────────────────▼──────────────────────+
              │            COMMON GROUND (GND)            │
              │  Star Topology - All GNDs Connected Here  │
              +───────────────────────────────────────────+
```

### Safety and Electrical Protection Rules:
1. **Flyback Diodes (1N4007 or 1N5819 Schottky)**:
   - Must be installed in parallel across inductive loads (the DC water pump motor coils) in reverse polarity (Cathode to +12V/5V, Anode to MOSFET Drain/Relay contact) to clamp back-EMF voltage spikes when turning off.
2. **Decoupling Capacitors**:
   - Place a $100\mu\text{F}$ electrolytic capacitor in parallel with a $0.1\mu\text{F}$ ceramic capacitor directly across the ESP32-CAM 5V and GND pins to prevent brownouts during Wi-Fi transmission bursts and camera sensor initialization.
3. **Common Ground Reference**:
   - The negative terminals of all power supplies, the ESP32 boards, the L298N driver, the servo, and the sensors MUST be connected together. Never operate without a shared ground reference!

---

## 2. ESP1: ESP32-CAM Wiring Diagram

### 2.1 Connections to L298N Motor Driver

| ESP32-CAM Pin | L298N Pin | Function / Direction | Logic Level |
|---|---|---|---|
| **GPIO 12** | **IN1** | Motor A Forward PWM | 3.3V Logic into L298N |
| **GPIO 13** | **IN2** | Motor A Reverse PWM | 3.3V Logic into L298N |
| **GPIO 14** | **IN3** | Motor B Forward PWM | 3.3V Logic into L298N |
| **GPIO 15** | **IN4** | Motor B Reverse PWM | 3.3V Logic into L298N |
| **GND** | **GND** | Logic Common Ground | Ground Reference |
| *(None - Jumper ON)* | **ENA** | Motor A Enable (Tied to 5V via jumper) | 5V |
| *(None - Jumper ON)* | **ENB** | Motor B Enable (Tied to 5V via jumper) | 5V |

### 2.2 L298N Motor and Power Connections
- **VMS Terminal**: Connect to +7V to +12V battery / power supply positive.
- **GND Terminal**: Connect to battery / power supply negative AND ESP32-CAM GND.
- **5V Terminal**: (If onboard 5V regulator jumper is installed, this can output 5V or leave disconnected if powering from external buck converter).
- **OUT1 & OUT2**: Connect to Left DC Motor terminals.
- **OUT3 & OUT4**: Connect to Right DC Motor terminals.

### 2.3 ESP32-CAM Power & Flashing Header
- **5V Pin**: Connect to regulated 5.0V output of buck converter.
- **GND Pin**: Connect to common ground.
- **GPIO 0 to GND**: Connect only during flashing via USB-UART adapter (CP2102/FTDI); remove jumper for normal execution.

---

## 3. ESP2: Sensor & Actuator Controller Wiring Diagram

### 3.1 Sensor Wiring Details

#### 1. DHT22 Temperature & Humidity Sensor
- **Pin 1 (VCC)**: Connect to **3.3V** rail of ESP2.
- **Pin 2 (DATA)**: Connect to **GPIO 4**.
  - Install a **10kΩ pull-up resistor** between Pin 2 (DATA) and Pin 1 (3.3V).
- **Pin 3 (NC)**: No connection.
- **Pin 4 (GND)**: Connect to **GND**.

#### 2. MQ-132 Hazardous Gas / Air Quality Sensor
- **VCC**: Connect to **5V** (Heater coil requires 5V for proper operation).
- **GND**: Connect to **GND**.
- **AO (Analog Out)**: Connect to **GPIO 35** (ADC1 Channel 7).
- *Note*: An external voltage divider (e.g. 10kΩ / 20kΩ) or limiting resistor can be used if the sensor AO exceeds 3.3V under maximum concentration.

#### 3. MQ-5 Combustible Gas / Smoke Sensor
- **VCC**: Connect to **5V** (Heater requires 5V).
- **GND**: Connect to **GND**.
- **AO (Analog Out)**: Connect to **GPIO 32** (ADC1 Channel 4).

#### 4. Capacitive Soil Moisture Sensor (v1.2 / v2.0)
To avoid accelerated galvanic corrosion and power drain, the capacitive sensor is powered via a GPIO-switched transistor switch:
- **VCC**: Connect to Emitter of 2N3906 (PNP) or Source of P-Channel MOSFET driven by **GPIO 25**, OR directly from **GPIO 25** (ESP32 GPIO source limit is 12mA, capacitive sensors draw ~5mA @ 3.3V, but an external 2N2222 / 2N7000 switch is best practice).
- **GND**: Connect to **GND**.
- **AOUT (Analog Out)**: Connect to **GPIO 34** (ADC1 Channel 6).

#### 5. Servo Motor (Moisture Sensor Arm)
- **VCC (Red wire)**: Connect to **5V External Servo Supply** (Do NOT connect to ESP32 3.3V!).
- **GND (Brown/Black wire)**: Connect to **Common GND**.
- **Signal (Orange/Yellow wire)**: Connect to **GPIO 18**.

#### 6. Water Pump Relay / MOSFET Driver
- **Driver Module VCC**: Connect to **5V** (or 3.3V depending on optocoupler logic).
- **Driver Module GND**: Connect to **Common GND**.
- **Driver Module IN**: Connect to **GPIO 26**.
- **Relay Switch Contacts**:
  - **COM**: Connect to +12V Pump Power Supply.
  - **NO (Normally Open)**: Connect to Pump (+) wire.
  - **Pump (-) wire**: Connect to Pump Power Supply Ground.
- **Flyback Diode**: 1N4007 placed in reverse parallel across Pump (+) and Pump (-).

#### 7. Manual Soil Deployment Pushbutton (Hardware Override)
- **Terminal 1**: Connect to **GPIO 27**.
- **Terminal 2**: Connect to **GND**.
- Configured with internal `INPUT_PULLUP`.

---

## 4. Summary Pin Connections Reference

```text
ESP1 (ESP32-CAM):
├── GPIO 12 ──────> L298N IN1 (Motor A Forward PWM)
├── GPIO 13 ──────> L298N IN2 (Motor A Reverse PWM)
├── GPIO 14 ──────> L298N IN3 (Motor B Forward PWM)
├── GPIO 15 ──────> L298N IN4 (Motor B Reverse PWM)
├── 5V     <────── Regulated 5V (from Buck Converter)
└── GND    ─────── Common Ground

ESP2 (Standard ESP32):
├── GPIO 4  ──────> DHT22 Data (with 10k pull-up to 3.3V)
├── GPIO 35 <────── MQ-132 Analog Output (AO) [ADC1_CH7]
├── GPIO 32 <────── MQ-5 Analog Output (AO) [ADC1_CH4]
├── GPIO 34 <────── Soil Moisture Analog Out (AOUT) [ADC1_CH6]
├── GPIO 25 ──────> Soil Sensor Power Enable Switch
├── GPIO 18 ──────> Servo Motor Signal (PWM 50Hz)
├── GPIO 26 ──────> Water Pump Relay / MOSFET Gate
├── GPIO 27 <────── Deploy Pushbutton (Active Low, Pulled Up)
├── GPIO 2  ──────> Onboard Status LED
├── 5V / VIN<────── 5V Power Supply
└── GND    ─────── Common Ground
```
