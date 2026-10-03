#ifndef CONFIG_ESP2_H
#define CONFIG_ESP2_H

#define FIRMWARE_VERSION "1.2.0"
#define DEVICE_NAME      "ESP2-Sensor-Controller"
#define HOSTNAME_MDNS    "esp2"

// Wi-Fi Credentials
#ifndef WIFI_SSID
#define WIFI_SSID "Your_WiFi_SSID"
#endif

#ifndef WIFI_PASS
#define WIFI_PASS "Your_WiFi_Password"
#endif

// Pin Assignments (Strictly ADC1 for Analog & Conflict-Free GPIOs)
#define PIN_DHT22        4   // Digital I/O (requires 10k pull-up to 3.3V)
#define PIN_MQ132_AO     35  // ADC1_CH7 (Air Quality / Hazardous Gas)
#define PIN_MQ5_AO       32  // ADC1_CH4 (Combustible Gas / LPG)
#define PIN_SOIL_AO      34  // ADC1_CH6 (Capacitive Moisture Sensor AO)
#define PIN_SOIL_PWR     25  // Digital Output (Transistor switch to power sensor only during read)
#define PIN_SERVO        18  // LEDC PWM (Servo Signal 50Hz)
#define PIN_PUMP         26  // Digital Output (Relay / MOSFET Gate)
#define PIN_DEPLOY_BTN   27  // Digital Input with internal pull-up (Manual button)
#define PIN_STATUS_LED   2   // Onboard Blue Status LED

// Servo Configuration
#define SERVO_HOME_ANGLE      0
#define SERVO_DEPLOY_ANGLE    180
#define SERVO_MIN_PULSE_US    500
#define SERVO_MAX_PULSE_US    2500
#define SERVO_MOVE_SPEED_MS   15  // Milliseconds per degree step for smooth deployment

// Soil Moisture Sampling Configuration
#define MOISTURE_SETTLE_TIME_MS      1000
#define MOISTURE_SAMPLE_COUNT        10
#define MOISTURE_SAMPLE_INTERVAL_MS  150

// Default Calibration Values (Can be updated via Web UI / REST API)
#define DEFAULT_SOIL_DRY_ADC         3200
#define DEFAULT_SOIL_WET_ADC         1350

// Water Pump Safety Watchdog Parameters
#define MAX_PUMP_RUNTIME_MS          10000 // 10 seconds maximum continuous run
#define DEFAULT_PUMP_PULSE_MS        4000  // 4 seconds default watering pulse
#define PUMP_COOLDOWN_MS             30000 // 30 seconds required between watering cycles

// MQ Sensor Warm-up Duration (Minimum 60 seconds recommended for stability)
#define MQ_WARMUP_TIME_MS            60000

#endif // CONFIG_ESP2_H
