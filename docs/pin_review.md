# ESP32 Pin Conflict & Hardware Compatibility Review

This document provides the mandatory engineering review required by **Section 8** and **Section 53** before deploying firmware or connecting physical hardware.

---

## 1. ESP1: ESP32-CAM (AI-Thinker Board) Pin Review

### 1.1 Internal Pin Allocations (Reserved by Hardware)
The AI-Thinker ESP32-CAM board connects an Omnivision OV2640 camera and 4MB / 8MB external PSRAM directly to the ESP32 chip. These pins CANNOT be used for external motor control or general I/O:

| ESP32 Pin | Camera / Internal Function | Dedicated Hardware Role | Usable for GPIO? |
|---|---|---|---|
| GPIO 0 | OV2640 XCLK | Camera Master Clock / Boot mode strapping | **NO** (Reserved for Camera Clock) |
| GPIO 2 | MicroSD D0 / Onboard LED | Pulled to GND on boot / Flash strapping | **RESTRICTED** (Must stay low during boot) |
| GPIO 4 | Flash Light LED / MicroSD D1 | Ultra-bright white illumination LED | **AVOID** (Will flash bright light when toggled) |
| GPIO 5 | OV2640 Y2 (D0) | Camera 8-bit Data Bus bit 0 | **NO** |
| GPIO 16 | PSRAM CS / Clock | PSRAM SPI Interface | **NO** (Crucial for camera frame buffer!) |
| GPIO 17 | PSRAM SPI | PSRAM SPI Interface | **NO** (Crucial for camera frame buffer!) |
| GPIO 18 | OV2640 Y3 (D1) | Camera 8-bit Data Bus bit 1 | **NO** |
| GPIO 19 | OV2640 Y4 (D2) | Camera 8-bit Data Bus bit 2 | **NO** |
| GPIO 21 | OV2640 Y5 (D3) | Camera 8-bit Data Bus bit 3 | **NO** |
| GPIO 22 | OV2640 PCLK | Camera Pixel Clock | **NO** |
| GPIO 23 | OV2640 HREF | Camera Horizontal Reference | **NO** |
| GPIO 25 | OV2640 VSYNC | Camera Vertical Sync | **NO** |
| GPIO 26 | OV2640 SIOD | Camera I2C (SCCB) Data | **NO** (Dedicated SCCB) |
| GPIO 27 | OV2640 SIOC | Camera I2C (SCCB) Clock | **NO** (Dedicated SCCB) |
| GPIO 32 | OV2640 PWDN | Camera Power Down | **NO** |
| GPIO 34 | OV2640 Y8 (D6) | Camera Data (Input only) | **NO** |
| GPIO 35 | OV2640 Y9 (D7) | Camera Data (Input only) | **NO** |
| GPIO 36 | OV2640 Y6 (D4) | Camera Data (Input only) | **NO** |
| GPIO 39 | OV2640 Y7 (D5) | Camera Data (Input only) | **NO** |
| GPIO 1 | U0TXD | Serial Output for flashing / debug logs | **RESERVED** for USB-UART debugging |
| GPIO 3 | U0RXD | Serial Input for flashing / firmware upload | **RESERVED** for USB-UART debugging |

---

### 1.2 Available Pins on AI-Thinker ESP32-CAM Header
When MicroSD card logging is **disabled** (streaming directly to Wi-Fi/LAN), the following pins become accessible on the external pin header:
- **GPIO 12** (HS2_DATA2)
- **GPIO 13** (HS2_DATA3)
- **GPIO 14** (HS2_CLK)
- **GPIO 15** (HS2_CMD)

#### Crucial Bootstrapping Note on GPIO 12 (`MTDI`):
- GPIO 12 sets the internal flash LDO voltage:
  - If GPIO 12 is sampled **HIGH (3.3V)** during reset/boot, the ESP32 switches internal flash voltage to **1.8V**, which causes flash read failure and an infinite bootloop (`flash read err, 1000`)!
  - Therefore, whatever is connected to GPIO 12 must **NOT pull the pin HIGH at power-up**.
  - **L298N Compatibility**: The L298N logic input circuits have internal pull-downs or high-impedance inputs that remain at 0V when unpowered or idle. Thus, connecting GPIO 12 to L298N IN1 is safe, provided no external pull-up resistor is added.

---

### 1.3 The L298N Pin Conflict & Practical Solution
An L298N driver typically expects 6 pins:
- 4 Direction inputs: `IN1`, `IN2`, `IN3`, `IN4`
- 2 Enable / PWM inputs: `ENA`, `ENB`

Because the ESP32-CAM has only **4 safe, unconflicted external output GPIOs (12, 13, 14, 15)**, connecting 6 pins directly is physically impossible without breaking the camera or flash LED.

#### Solution 1: 4-Pin Direct PWM Mode (Selected - Standard Architecture)
We keep the factory jumpers installed on `ENA` and `ENB` (pulling both Enable pins permanently HIGH to +5V).
Instead of pulsing ENA/ENB:
- **Motor A Forward**: Apply PWM duty cycle $S \in [0, 255]$ on **IN1 (GPIO 12)** and write **IN2 (GPIO 13) = LOW**.
- **Motor A Reverse**: Write **IN1 = LOW** and apply PWM duty cycle $S$ on **IN2 (GPIO 13)**.
- **Motor A Stop**: Both **IN1 = LOW**, **IN2 = LOW**.
- **Motor B Forward**: Apply PWM duty cycle $S$ on **IN3 (GPIO 14)** and write **IN4 (GPIO 15) = LOW**.
- **Motor B Reverse**: Write **IN3 = LOW** and apply PWM duty cycle $S$ on **IN4 (GPIO 15)**.
- **Motor B Stop**: Both **IN3 = LOW**, **IN4 = LOW**.

This achieves **independent speed control (PWM)** and **bidirectional steering** for both DC motors using **exactly 4 GPIO pins** without adding any extra microchips!

#### Solution 2: I2C Expander / PCA9685 (Optional Add-On)
If the user prefers a dedicated hardware PWM expander, a PCA9685 16-channel 12-bit PWM I2C module can be connected to the I2C bus, controlling all 6 pins of the L298N using 2 wire I2C.

---

## 2. ESP2: Sensor & Actuator Pin Review (Standard ESP32 30/38 Pin)

ESP32 has two ADC units:
- **ADC1** (Channels 0–7): GPIO 32, 33, 34, 35, 36, 39.
- **ADC2** (Channels 0–9): GPIO 0, 2, 4, 12, 13, 14, 15, 25, 26, 27.

### ADC2 Wi-Fi Limitation:
When Wi-Fi is active, the ESP32 Wi-Fi driver continuously uses ADC2 for radio calibration. Any call to `analogRead()` on an ADC2 pin will return `ESP_ERR_INVALID_STATE` or random noise while Wi-Fi is connected!
**RULE**: All analog sensor inputs (MQ-132, MQ-5, Soil Moisture) MUST be placed on **ADC1**.

### 2.1 ESP2 Pin Mapping Table

| Component | Signal | ESP2 Pin | Pin Capability | Notes / Electrical Protection |
|---|---|---|---|---|
| **DHT22** | DATA | **GPIO 4** | Digital I/O | Requires 10kΩ pull-up resistor to 3.3V rail |
| **MQ-132** | AO (Analog Out) | **GPIO 35** | ADC1_CH7 | Input only pin (safe for analog); 0-3.3V scaled |
| **MQ-5** | AO (Analog Out) | **GPIO 32** | ADC1_CH4 | ADC1 analog input; 0-3.3V scaled |
| **Soil Moisture** | AO (Analog Out) | **GPIO 34** | ADC1_CH6 | ADC1 analog input; 0-3.3V scaled |
| **Soil Power Switch**| Enable (Gate/Base) | **GPIO 25** | Digital Output | Drives NPN (2N2222) / MOSFET switch to only power sensor during read cycle |
| **Servo Motor** | Signal (PWM) | **GPIO 18** | LEDC PWM (50Hz) | 50Hz PWM signal (500µs–2500µs pulse width) |
| **Water Pump** | Control | **GPIO 26** | Digital Output | Drives Optocoupled Relay / IRLZ44N MOSFET with 1N4007 flyback diode |
| **Deploy Button** | Pushbutton Input | **GPIO 27** | Digital Input | Internal `INPUT_PULLUP` enabled; pulls to GND when pressed |
| **Status / Heartbeat** | LED | **GPIO 2** | Digital Output | Onboard Blue LED on standard ESP32 DevKit |

---

## 3. Power Isolation and Grounding Strategy

Inductive loads (motors, pump, servo) draw significant peak currents and create inductive flyback spikes that can instantly reset or damage the ESP32 microcontrollers.

1. **Logic Rail (3.3V & 5V)**:
   - ESP32-CAM: Powered via regulated 5V (minimum 2A capacity for Wi-Fi + camera transmission bursts).
   - ESP2: Powered via USB 5V or regulated 5V pin.
2. **Servo Supply (5V–6V External)**:
   - Standard SG90 / MG995 / MG996R servos draw up to 1.5A stall current. Powered from dedicated external 5V regulator.
3. **Motor Supply (7V–12V External)**:
   - Connected to L298N `VMS` terminal block.
4. **Pump Supply (5V–12V External)**:
   - Connected to Relay NO / COM contacts or MOSFET drain circuit.
5. **Common Ground (`GND`)**:
   - The grounds of the ESP32, L298N, Servo, Pump Power Supply, and Sensors MUST be bonded together at a single star-ground point to ensure consistent logic reference voltage.
