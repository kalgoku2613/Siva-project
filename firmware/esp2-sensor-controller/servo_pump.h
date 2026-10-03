#ifndef SERVO_PUMP_H
#define SERVO_PUMP_H

#include <Arduino.h>
#include "config.h"

class ActuatorManager {
private:
  int _currentServoAngle;
  int _targetServoAngle;
  unsigned long _lastServoStepTime;

  bool _pumpActive;
  unsigned long _pumpStartTime;
  unsigned long _pumpDurationMs;
  unsigned long _lastPumpTurnOffTime;
  unsigned long _maxPumpRuntimeMs;

  void writeServoMicros(int us) {
    // Standard 50Hz PWM: 20ms period = 20,000us
    // 16-bit resolution: 0 to 65535
    uint32_t duty = (uint32_t)(((float)us / 20000.0f) * 65535.0f);
    #if ESP_ARDUINO_VERSION >= ESP_ARDUINO_VERSION_VAL(3, 0, 0)
      ledcWrite(PIN_SERVO, duty);
    #else
      ledcWrite(7, duty); // Channel 7
    #endif
  }

public:
  ActuatorManager()
    : _currentServoAngle(SERVO_HOME_ANGLE),
      _targetServoAngle(SERVO_HOME_ANGLE),
      _lastServoStepTime(0),
      _pumpActive(false),
      _pumpStartTime(0),
      _pumpDurationMs(0),
      _lastPumpTurnOffTime(0),
      _maxPumpRuntimeMs(MAX_PUMP_RUNTIME_MS) {}

  void begin() {
    // Pump pin setup - Ensure pump is OFF immediately
    pinMode(PIN_PUMP, OUTPUT);
    digitalWrite(PIN_PUMP, LOW);

    // Setup Servo PWM (50Hz, 16-bit resolution)
    #if ESP_ARDUINO_VERSION >= ESP_ARDUINO_VERSION_VAL(3, 0, 0)
      ledcAttach(PIN_SERVO, 50, 16);
    #else
      ledcSetup(7, 50, 16);
      ledcAttachPin(PIN_SERVO, 7);
    #endif

    setServoAngleImmediate(SERVO_HOME_ANGLE);
  }

  void setServoAngleImmediate(int angle) {
    if (angle < 0) angle = 0;
    if (angle > 180) angle = 180;
    _currentServoAngle = angle;
    _targetServoAngle = angle;
    int us = map(angle, 0, 180, SERVO_MIN_PULSE_US, SERVO_MAX_PULSE_US);
    writeServoMicros(us);
  }

  void setServoTargetAngle(int angle) {
    if (angle < 0) angle = 0;
    if (angle > 180) angle = 180;
    _targetServoAngle = angle;
  }

  void deployServo() {
    setServoTargetAngle(SERVO_DEPLOY_ANGLE);
  }

  void retractServo() {
    setServoTargetAngle(SERVO_HOME_ANGLE);
  }

  bool isServoAtTarget() const {
    return _currentServoAngle == _targetServoAngle;
  }

  int getServoAngle() const {
    return _currentServoAngle;
  }

  // Water Pump Controls
  bool turnPumpOn(unsigned long durationMs = DEFAULT_PUMP_PULSE_MS) {
    // Check cooldown
    if (millis() - _lastPumpTurnOffTime < PUMP_COOLDOWN_MS && _lastPumpTurnOffTime != 0) {
      Serial.println("[PUMP] Rejected: Cooldown active");
      return false;
    }

    if (durationMs > _maxPumpRuntimeMs) {
      durationMs = _maxPumpRuntimeMs;
    }

    _pumpDurationMs = durationMs;
    _pumpStartTime = millis();
    _pumpActive = true;
    digitalWrite(PIN_PUMP, HIGH);
    Serial.printf("[PUMP] Activated for %lu ms\n", durationMs);
    return true;
  }

  void turnPumpOff() {
    if (_pumpActive) {
      _lastPumpTurnOffTime = millis();
    }
    _pumpActive = false;
    digitalWrite(PIN_PUMP, LOW);
    Serial.println("[PUMP] Turned OFF");
  }

  void emergencyStop() {
    turnPumpOff();
    retractServo();
  }

  bool isPumpActive() const {
    return _pumpActive;
  }

  unsigned long getPumpRuntimeElapsed() const {
    if (!_pumpActive) return 0;
    return millis() - _pumpStartTime;
  }

  void update() {
    // 1. Smooth Servo Movement Step
    if (_currentServoAngle != _targetServoAngle) {
      if (millis() - _lastServoStepTime >= SERVO_MOVE_SPEED_MS) {
        _lastServoStepTime = millis();
        if (_currentServoAngle < _targetServoAngle) {
          _currentServoAngle++;
        } else {
          _currentServoAngle--;
        }
        int us = map(_currentServoAngle, 0, 180, SERVO_MIN_PULSE_US, SERVO_MAX_PULSE_US);
        writeServoMicros(us);
      }
    }

    // 2. Pump Safety Watchdog
    if (_pumpActive) {
      unsigned long elapsed = millis() - _pumpStartTime;
      if (elapsed >= _pumpDurationMs || elapsed >= _maxPumpRuntimeMs) {
        Serial.println("[PUMP] Safety cutoff triggered (runtime target reached)");
        turnPumpOff();
      }
    }
  }
};

extern ActuatorManager actuators;

#endif // SERVO_PUMP_H
