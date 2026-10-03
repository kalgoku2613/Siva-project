# Hardware Calibration Procedures & Formulae

This guide explains how to calibrate the analog capacitive soil moisture probe, MQ gas sensors, and servo deployment linkage.

---

## 1. Capacitive Soil Moisture Sensor Calibration

Capacitive moisture sensors (v1.2 / v2.0) operate by measuring dielectric permittivity via a high-frequency 555-timer oscillator circuit. Because capacitance increases in water, the oscillation frequency changes, causing the rectified DC voltage output to **decrease as moisture increases**.

### 1.1 Calibration Procedure
1. **Dry Air Reading ($ADC_{dry}$)**:
   - Hold the clean probe in dry air (ensure no water or fingers touch the sensing trace).
   - Observe the raw ADC reading on the debug page (`http://ESP2-IP/`) or Settings page.
   - Typical ESP32 12-bit ADC value in air: $\approx 3100 - 3400$.
   - Record this value as `DRY_ADC`.

2. **Water Saturated Reading ($ADC_{wet}$)**:
   - Dip the probe into a glass of tap water up to the maximum immersion white line (never submerge the top electronics or cable connector!).
   - Wait 10 seconds for the signal to stabilize.
   - Typical ESP32 12-bit ADC value in water: $\approx 1200 - 1500$.
   - Record this value as `WET_ADC`.

### 1.2 Mathematical Mapping Formula
The firmware and backend use an inverted linear constraint formula:
$$\text{Moisture (\%)} = \text{clamp}\left( \frac{ADC_{dry} - ADC_{raw}}{ADC_{dry} - ADC_{wet}} \times 100,\; 0,\; 100 \right)$$

### 1.3 Soil Classification Thresholds
- **$0\% - 34\%$ (DRY)**: Low dielectric constant; urgent watering required.
- **$35\% - 70\%$ (MODERATE)**: Optimal agricultural root moisture level.
- **$71\% - 100\%$ (WET)**: Saturated/flooded; irrigation suspended to prevent root hypoxia.

---

## 2. MQ-132 & MQ-5 Gas Sensors Calibration

### 2.1 Physics & Preheating Requirement
MQ series sensors use a heated tin dioxide ($SnO_2$) semiconductor layer.
- **Preheating**: Sensor heaters require **5.0V** (never 3.3V!) and draw $\approx 150\text{mA}$.
- **Burn-in**: New MQ sensors require a 24-to-48 hour initial burn-in period before stabilization.
- **Boot Warm-up**: The firmware enforces a 60-second warm-up timer (`MQ_WARMUP_TIME_MS = 60000`) before marking the sensor reading as valid.

### 2.2 Normalized Index vs. PPM
> [!IMPORTANT]
> Raw analog ADC readings from MQ sensors without a laboratory gas chamber and temperature/humidity compensation curves cannot accurately measure true parts-per-million (PPM). To adhere to honest engineering standards, the system computes a **Normalized Air Quality Index ($0 - 100$)** proportional to $ADC / 4095 \times 100$ rather than falsified PPM values.

---

## 3. Servo Mechanical Range Calibration
Standard SG90 and MG996R servos use a 50Hz PWM cycle with pulse widths between $500\mu\text{s}$ and $2500\mu\text{s}$:
- $500\mu\text{s} \rightarrow 0^\circ$ (Mechanical Home / Retracted)
- $1500\mu\text{s} \rightarrow 90^\circ$ (Halfway transition)
- $2500\mu\text{s} \rightarrow 180^\circ$ (Full Deployment / Probe immersed)

Use the manual slider in the **Soil Deployment** page to step the servo in $10^\circ$ increments to ensure the probe arm clears the robot chassis without mechanical stall or motor binding.
