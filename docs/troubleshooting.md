# Hardware Troubleshooting & Diagnostic Guide

This guide provides diagnostic solutions for the most common electrical and firmware issues encountered when building and running the system.

---

## 1. ESP32-CAM Issues (ESP1)

### Symptom: ESP32-CAM Brownouts / Reboots during Wi-Fi Connection
- **Cause**: Wi-Fi RF transmission draws high instantaneous current pulses up to 450mA–600mA. If the 5V power supply lacks sufficient decoupling or transient response, the internal 3.3V LDO sags below 2.8V, triggering the ESP32 hardware Brownout Detector (`Brownout detector was triggered`).
- **Remedy**:
  1. Add a **$100\mu\text{F}$ electrolytic capacitor** in parallel with a **$0.1\mu\text{F}$ ceramic capacitor** directly across the 5V and GND pins of the ESP32-CAM module.
  2. Use a dedicated 5V buck converter (LM2596 or XL4015) capable of delivering at least 2.0A continuous.
  3. Avoid powering the ESP32-CAM from USB-UART FTDI programmer 5V pins, which typically supply less than 200mA.

### Symptom: ESP32-CAM Bootloop (`flash read err, 1000` or Boot Error)
- **Cause**: **GPIO 12 (`MTDI`)** was pulled HIGH at power-up. If sampled HIGH at reset, the ESP32 selects 1.8V flash voltage instead of 3.3V, preventing the CPU from reading program memory.
- **Remedy**:
  - Verify that L298N IN1 connected to GPIO 12 does not have an external pull-up resistor. Ensure GPIO 12 stays at 0V during power-on reset.

### Symptom: Camera Stream Frame Drops / High Latency
- **Cause**: Weak 2.4GHz Wi-Fi RSSI or PSRAM disabled.
- **Remedy**:
  - In Arduino IDE, ensure **"PSRAM: Enabled"** is selected under Tools. Without PSRAM, the ESP32 can only allocate a single frame buffer, reducing throughput.
  - Position the robot within range of a 2.4GHz Wi-Fi access point (RSSI > -70 dBm).

---

## 2. ESP2 Sensor & Actuator Issues

### Symptom: DHT22 Returns `NaN` or Read Error
- **Cause**: Missing pull-up resistor or bus contention.
- **Remedy**:
  - Connect a **$10\text{k}\Omega$ pull-up resistor** between the DHT22 DATA line (GPIO 4) and the 3.3V rail.
  - Verify the reading interval is not faster than 2.0 seconds (DHT22 sensor protocol requires minimum 2000ms between consecutive reads).

### Symptom: Analog Reads (MQ-132 / MQ-5 / Soil) Return 4095 or Random Noise
- **Cause**: Attempting to read ADC2 channels while Wi-Fi is active.
- **Remedy**:
  - Confirm pins are strictly on **ADC1** (GPIO 32, 34, 35 as configured in `pin_review.md`). Never use ADC2 pins (0, 2, 4, 12, 13, 14, 15, 25, 26, 27) for `analogRead()` when Wi-Fi is transmitting!

### Symptom: ESP2 Resets When Water Pump Switches OFF
- **Cause**: Inductive kickback (back-EMF). When the inductive coil of a DC motor turns off abruptly, $V = -L \frac{di}{dt}$ generates a negative spike of up to several hundred volts that propagates through common ground into the microcontroller.
- **Remedy**:
  - Install a **1N4007 or 1N5819 flyback diode** across the DC water pump terminals in reverse polarity (Cathode to Pump +, Anode to Pump -).
  - Use an optocoupled relay module with separate power rail for coil excitation.

### Symptom: Servo Jitters or Reboots Controller
- **Cause**: Servo motor is powered from the ESP32 3.3V or 5V regulator pin.
- **Remedy**:
  - Servos draw up to 1.5A stall current. **Never power a servo from the ESP32 onboard regulator!** Connect the servo VCC (red wire) directly to an external 5V 3A regulator, and bond GND to common ground.
