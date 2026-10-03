#ifndef CONFIG_ESP1_H
#define CONFIG_ESP1_H

// Firmware Version and Identification
#define FIRMWARE_VERSION "1.2.0"
#define DEVICE_NAME      "ESP1-Camera-Motor"
#define HOSTNAME_MDNS    "esp1"

// Wi-Fi Credentials (Can be overridden via compile flags or local config)
#ifndef WIFI_SSID
#define WIFI_SSID "Your_WiFi_SSID"
#endif

#ifndef WIFI_PASS
#define WIFI_PASS "Your_WiFi_Password"
#endif

// Safety Watchdog: If no motor command or keepalive is received within this duration, STOP immediately.
#define MOTOR_TIMEOUT_MS 1500

// L298N Motor Pin Assignments (ESP32-CAM safe external pins)
// Note: ENA and ENB on L298N must have the factory 5V pull-up jumpers installed.
#define PIN_MOTOR_A_IN1 12
#define PIN_MOTOR_A_IN2 13
#define PIN_MOTOR_B_IN3 14
#define PIN_MOTOR_B_IN4 15

// LEDC PWM Settings for ESP32 Motor Speed Control
#define PWM_FREQ         20000 // 20 kHz ultrasonic to prevent motor whine
#define PWM_RESOLUTION   8     // 8-bit resolution (0 - 255)
#define PWM_CH_A1        0
#define PWM_CH_A2        1
#define PWM_CH_B1        2
#define PWM_CH_B2        3

// Default Motor Speed (0 - 255)
#define DEFAULT_SPEED    190

// Camera Streaming Configuration
#define STREAM_PORT      80

#endif // CONFIG_ESP1_H
