#ifndef MOTOR_CONTROLLER_H
#define MOTOR_CONTROLLER_H

#include <Arduino.h>
#include "config.h"

enum MotorDirection {
  MOTOR_STOP = 0,
  MOTOR_FORWARD,
  MOTOR_BACKWARD,
  MOTOR_LEFT,
  MOTOR_RIGHT
};

class MotorController {
private:
  uint8_t _speed;
  MotorDirection _currentDirection;
  unsigned long _lastCommandTime;
  bool _watchdogEnabled;

  void applyOutputs(uint8_t a1, uint8_t a2, uint8_t b1, uint8_t b2) {
    #if ESP_ARDUINO_VERSION >= ESP_ARDUINO_VERSION_VAL(3, 0, 0)
      ledcWrite(PIN_MOTOR_A_IN1, a1);
      ledcWrite(PIN_MOTOR_A_IN2, a2);
      ledcWrite(PIN_MOTOR_B_IN3, b1);
      ledcWrite(PIN_MOTOR_B_IN4, b2);
    #else
      ledcWrite(PWM_CH_A1, a1);
      ledcWrite(PWM_CH_A2, a2);
      ledcWrite(PWM_CH_B1, b1);
      ledcWrite(PWM_CH_B2, b2);
    #endif
  }

public:
  MotorController() : _speed(DEFAULT_SPEED), _currentDirection(MOTOR_STOP), _lastCommandTime(0), _watchdogEnabled(true) {}

  void begin() {
    #if ESP_ARDUINO_VERSION >= ESP_ARDUINO_VERSION_VAL(3, 0, 0)
      ledcAttach(PIN_MOTOR_A_IN1, PWM_FREQ, PWM_RESOLUTION);
      ledcAttach(PIN_MOTOR_A_IN2, PWM_FREQ, PWM_RESOLUTION);
      ledcAttach(PIN_MOTOR_B_IN3, PWM_FREQ, PWM_RESOLUTION);
      ledcAttach(PIN_MOTOR_B_IN4, PWM_FREQ, PWM_RESOLUTION);
    #else
      ledcSetup(PWM_CH_A1, PWM_FREQ, PWM_RESOLUTION);
      ledcSetup(PWM_CH_A2, PWM_FREQ, PWM_RESOLUTION);
      ledcSetup(PWM_CH_B1, PWM_FREQ, PWM_RESOLUTION);
      ledcSetup(PWM_CH_B2, PWM_FREQ, PWM_RESOLUTION);

      ledcAttachPin(PIN_MOTOR_A_IN1, PWM_CH_A1);
      ledcAttachPin(PIN_MOTOR_A_IN2, PWM_CH_A2);
      ledcAttachPin(PIN_MOTOR_B_IN3, PWM_CH_B1);
      ledcAttachPin(PIN_MOTOR_B_IN4, PWM_CH_B2);
    #endif

    // Startup safety: Absolute STOP
    stop();
  }

  void setSpeed(uint8_t speed) {
    _speed = speed;
    _lastCommandTime = millis();
    // Re-apply speed to current movement
    setDirection(_currentDirection);
  }

  uint8_t getSpeed() const {
    return _speed;
  }

  void setDirection(MotorDirection dir) {
    _lastCommandTime = millis();
    _currentDirection = dir;

    switch (dir) {
      case MOTOR_FORWARD:
        applyOutputs(_speed, 0, _speed, 0);
        break;
      case MOTOR_BACKWARD:
        applyOutputs(0, _speed, 0, _speed);
        break;
      case MOTOR_LEFT:
        // Skid steer: Left backwards, Right forward
        applyOutputs(0, _speed, _speed, 0);
        break;
      case MOTOR_RIGHT:
        // Skid steer: Left forward, Right backwards
        applyOutputs(_speed, 0, 0, _speed);
        break;
      case MOTOR_STOP:
      default:
        applyOutputs(0, 0, 0, 0);
        break;
    }
  }

  void forward()  { setDirection(MOTOR_FORWARD); }
  void backward() { setDirection(MOTOR_BACKWARD); }
  void turnLeft() { setDirection(MOTOR_LEFT); }
  void turnRight(){ setDirection(MOTOR_RIGHT); }
  void stop()     { setDirection(MOTOR_STOP); }

  void pingWatchdog() {
    _lastCommandTime = millis();
  }

  void update() {
    // Safety watchdog: Automatically stop motors if no command received within timeout
    if (_watchdogEnabled && _currentDirection != MOTOR_STOP) {
      if (millis() - _lastCommandTime > MOTOR_TIMEOUT_MS) {
        stop();
      }
    }
  }

  MotorDirection getDirection() const {
    return _currentDirection;
  }

  const char* getDirectionString() const {
    switch (_currentDirection) {
      case MOTOR_FORWARD:  return "FORWARD";
      case MOTOR_BACKWARD: return "BACKWARD";
      case MOTOR_LEFT:     return "LEFT";
      case MOTOR_RIGHT:    return "RIGHT";
      case MOTOR_STOP:     return "STOP";
      default:             return "UNKNOWN";
    }
  }

  unsigned long getLastCommandElapsed() const {
    return millis() - _lastCommandTime;
  }
};

extern MotorController motors;

#endif // MOTOR_CONTROLLER_H
