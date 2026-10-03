# System Operation & Commissioning Procedures

Follow this strict step-by-step procedure when assembling, powering, testing, and operating the system for the first time.

---

## 1. Initial Commissioning & First-Boot Checklist (Section 52)

```text
[ ] STEP 1: Lift robot chassis so wheels do not touch the ground during initial testing.
[ ] STEP 2: Verify common ground (GND) is connected across ESP32, L298N, Servo, and Pump supplies.
[ ] STEP 3: Power the ESP2 Sensor Controller via 5V regulated input or USB.
[ ] STEP 4: Power the ESP1 ESP32-CAM via 5V regulated input (ensure min 2A capacity).
[ ] STEP 5: Observe Wi-Fi connection on serial monitor (115200 baud) or router client list.
[ ] STEP 6: Verify ESP1 assigned IP (e.g. 192.168.1.150) and ESP2 assigned IP (e.g. 192.168.1.151).
[ ] STEP 7: Open standalone hardware debug pages in browser:
            - ESP1 Debug: http://<ESP1-IP>/
            - ESP2 Debug: http://<ESP2-IP>/
[ ] STEP 8: Test live video preview in ESP1 debug page.
[ ] STEP 9: Test motor Forward/Backward/Left/Right briefly while chassis is suspended.
[ ] STEP 10: Verify DHT22 displays valid Temperature and Humidity readings on ESP2 page.
[ ] STEP 11: Verify MQ-132 and MQ-5 sensors show active ADC values (allow 60s preheat).
[ ] STEP 12: Perform dry air and wet soil calibration on capacitive probe.
[ ] STEP 13: Test servo angles: 0° (Home), 90°, and 180° (Deploy). Ensure mechanical arm does not bind.
[ ] STEP 14: Test water pump pulse (4 seconds). Verify liquid flows and stops automatically.
[ ] STEP 15: Trigger full Soil Deployment Sequence from web interface.
[ ] STEP 16: Verify telemetry appears in central Web App / PWA dashboard.
[ ] STEP 17: Enable autonomous irrigation rules only after all manual checks pass.
```

---

## 2. Operating the Central Web Application

### 2.1 Starting the System
Execute `start-app.bat` from the root directory on Windows:
```cmd
start-app.bat
```
This automatically verifies the Node.js runtime, launches the backend server on port 5000, starts the frontend Vite server on port 3000, and opens your default browser at `http://localhost:3000`.

### 2.2 Installing as a PWA
1. Open `http://localhost:3000` in Google Chrome, Microsoft Edge, or Safari on iOS.
2. Click the **"Install App"** button located in the top header ribbon, or click the browser's install icon in the URL bar.
3. The app will launch in an independent, chromeless window matching desktop OS applications.

### 2.3 Robot Navigation Hotkeys
- **W** or **Up Arrow**: Drive Forward
- **S** or **Down Arrow**: Drive Reverse
- **A** or **Left Arrow**: Turn Left
- **D** or **Right Arrow**: Turn Right
- **Space** or **Escape**: Emergency Stop / Halt Motors

### 2.4 Emergency Stop Protocol
Clicking the red **"E-STOP"** button in the header ribbon or pressing the **Space** key triggers an immediate dual-level hardware shutdown:
1. All H-Bridge PWM outputs on ESP1 are set to 0.
2. The water pump relay on ESP2 is immediately de-energized.
3. A critical event is logged to the SQLite database.
