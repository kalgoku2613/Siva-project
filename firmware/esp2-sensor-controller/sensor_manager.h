#ifndef SENSOR_MANAGER_H
#define SENSOR_MANAGER_H

#include <Arduino.h>
#include <DHT.h>
#include "config.h"
#include "servo_pump.h"

enum SoilSequenceState {
  SEQ_IDLE = 0,
  SEQ_DEPLOYING_SERVO,
  SEQ_POWERING_SENSOR,
  SEQ_SAMPLING,
  SEQ_COMPLETED,
  SEQ_RETRACTING
};

struct SensorReadings {
  float temperature;
  float humidity;
  bool dht_valid;

  int mq132_raw;
  float mq132_index;
  bool mq132_warmed_up;

  int mq5_raw;
  float mq5_index;
  bool mq5_warmed_up;

  int soil_raw;
  int soil_percent;
  char soil_state[16]; // "DRY", "MODERATE", "WET", "INACTIVE"
  bool soil_active;

  unsigned long timestamp_ms;
};

class SensorManager {
private:
  DHT _dht;
  SensorReadings _currentReadings;

  int _soilDryAdc;
  int _soilWetAdc;

  unsigned long _bootTime;
  unsigned long _lastDhtRead;
  unsigned long _lastGasRead;

  // Deployment sequence tracking
  SoilSequenceState _seqState;
  unsigned long _seqTimer;
  int _sampleAccumulator;
  int _samplesCollected;

public:
  SensorManager()
    : _dht(PIN_DHT22, DHT22),
      _soilDryAdc(DEFAULT_SOIL_DRY_ADC),
      _soilWetAdc(DEFAULT_SOIL_WET_ADC),
      _bootTime(0),
      _lastDhtRead(0),
      _lastGasRead(0),
      _seqState(SEQ_IDLE),
      _seqTimer(0),
      _sampleAccumulator(0),
      _samplesCollected(0) {
    memset(&_currentReadings, 0, sizeof(SensorReadings));
    strcpy(_currentReadings.soil_state, "INACTIVE");
  }

  void begin() {
    _bootTime = millis();

    // Setup Soil power switch pin
    pinMode(PIN_SOIL_PWR, OUTPUT);
    digitalWrite(PIN_SOIL_PWR, LOW); // Sensor unpowered by default

    // Setup ADC resolution & attenuation (12-bit: 0 - 4095, up to ~3.3V)
    analogReadResolution(12);
    analogSetAttenuation(ADC_11db);

    _dht.begin();
    Serial.println("[SENSORS] Sensor Manager initialized.");
  }

  void setSoilCalibration(int dryAdc, int wetAdc) {
    if (dryAdc > 0 && wetAdc > 0 && dryAdc != wetAdc) {
      _soilDryAdc = dryAdc;
      _soilWetAdc = wetAdc;
      Serial.printf("[SENSORS] Calibration updated: Dry=%d, Wet=%d\n", dryAdc, wetAdc);
    }
  }

  int getSoilDryAdc() const { return _soilDryAdc; }
  int getSoilWetAdc() const { return _soilWetAdc; }

  void startSoilDeploymentSequence() {
    if (_seqState != SEQ_IDLE && _seqState != SEQ_COMPLETED) {
      Serial.println("[SEQUENCE] Already running!");
      return;
    }
    Serial.println("[SEQUENCE] Initiating Soil Moisture Deployment Sequence...");
    actuators.deployServo();
    _seqState = SEQ_DEPLOYING_SERVO;
    _seqTimer = millis();
  }

  void retractSoilSensor() {
    digitalWrite(PIN_SOIL_PWR, LOW);
    _currentReadings.soil_active = false;
    actuators.retractServo();
    _seqState = SEQ_RETRACTING;
    _seqTimer = millis();
    Serial.println("[SEQUENCE] Retracting soil arm to HOME...");
  }

  SoilSequenceState getSequenceState() const {
    return _seqState;
  }

  const char* getSequenceStateString() const {
    switch (_seqState) {
      case SEQ_IDLE: return "IDLE";
      case SEQ_DEPLOYING_SERVO: return "DEPLOYING_ARM";
      case SEQ_POWERING_SENSOR: return "SETTLING_SENSOR";
      case SEQ_SAMPLING: return "SAMPLING_MOISTURE";
      case SEQ_COMPLETED: return "MEASUREMENT_READY";
      case SEQ_RETRACTING: return "RETRACTING_ARM";
      default: return "UNKNOWN";
    }
  }

  void update() {
    unsigned long now = millis();

    // 1. Periodic DHT22 Read (every 3 seconds)
    if (now - _lastDhtRead > 3000) {
      _lastDhtRead = now;
      float t = _dht.readTemperature();
      float h = _dht.readHumidity();
      if (!isnan(t) && !isnan(h)) {
        _currentReadings.temperature = t;
        _currentReadings.humidity = h;
        _currentReadings.dht_valid = true;
      } else {
        _currentReadings.dht_valid = false;
      }
    }

    // 2. Periodic MQ Gas Read (every 1 second)
    if (now - _lastGasRead > 1000) {
      _lastGasRead = now;
      _currentReadings.mq132_warmed_up = (now - _bootTime >= MQ_WARMUP_TIME_MS);
      _currentReadings.mq5_warmed_up = (now - _bootTime >= MQ_WARMUP_TIME_MS);

      // Average 4 fast ADC reads to suppress electrical noise
      long mq132_sum = 0;
      long mq5_sum = 0;
      for (int i = 0; i < 4; i++) {
        mq132_sum += analogRead(PIN_MQ132_AO);
        mq5_sum += analogRead(PIN_MQ5_AO);
        delayMicroseconds(250);
      }
      _currentReadings.mq132_raw = mq132_sum / 4;
      _currentReadings.mq5_raw = mq5_sum / 4;

      // Normalized Air Quality Index (0.0 to 100.0 estimate based on ADC scale)
      _currentReadings.mq132_index = (_currentReadings.mq132_raw / 4095.0f) * 100.0f;
      _currentReadings.mq5_index = (_currentReadings.mq5_raw / 4095.0f) * 100.0f;
      _currentReadings.timestamp_ms = now;
    }

    // 3. Soil Deployment State Machine
    switch (_seqState) {
      case SEQ_IDLE:
        // Ready for trigger
        break;

      case SEQ_DEPLOYING_SERVO:
        // Wait for servo to reach deployment position (180 deg)
        if (actuators.isServoAtTarget()) {
          Serial.println("[SEQUENCE] Arm deployed. Enabling power to capacitive soil sensor...");
          digitalWrite(PIN_SOIL_PWR, HIGH); // Power ON sensor
          _currentReadings.soil_active = true;
          _seqState = SEQ_POWERING_SENSOR;
          _seqTimer = now;
        }
        break;

      case SEQ_POWERING_SENSOR:
        // Allow capacitance and circuitry to stabilize
        if (now - _seqTimer >= MOISTURE_SETTLE_TIME_MS) {
          Serial.println("[SEQUENCE] Sensor settled. Sampling readings...");
          _seqState = SEQ_SAMPLING;
          _sampleAccumulator = 0;
          _samplesCollected = 0;
          _seqTimer = now;
        }
        break;

      case SEQ_SAMPLING:
        if (now - _seqTimer >= MOISTURE_SAMPLE_INTERVAL_MS) {
          _seqTimer = now;
          _sampleAccumulator += analogRead(PIN_SOIL_AO);
          _samplesCollected++;

          if (_samplesCollected >= MOISTURE_SAMPLE_COUNT) {
            int avgAdc = _sampleAccumulator / MOISTURE_SAMPLE_COUNT;
            _currentReadings.soil_raw = avgAdc;

            // Invert mapping: Lower ADC = Higher moisture in capacitive sensors
            int pct = map(avgAdc, _soilDryAdc, _soilWetAdc, 0, 100);
            _currentReadings.soil_percent = constrain(pct, 0, 100);

            if (_currentReadings.soil_percent < 35) {
              strcpy(_currentReadings.soil_state, "DRY");
            } else if (_currentReadings.soil_percent <= 70) {
              strcpy(_currentReadings.soil_state, "MODERATE");
            } else {
              strcpy(_currentReadings.soil_state, "WET");
            }

            // Power OFF sensor to protect against corrosion
            digitalWrite(PIN_SOIL_PWR, LOW);
            _currentReadings.soil_active = false;

            Serial.printf("[SEQUENCE] Finished! Raw ADC: %d, Moisture: %d%% (%s)\n",
              _currentReadings.soil_raw, _currentReadings.soil_percent, _currentReadings.soil_state);

            _seqState = SEQ_COMPLETED;
          }
        }
        break;

      case SEQ_COMPLETED:
        // Measurement ready
        break;

      case SEQ_RETRACTING:
        if (actuators.isServoAtTarget()) {
          _seqState = SEQ_IDLE;
          Serial.println("[SEQUENCE] Retraction complete. System IDLE.");
        }
        break;
    }
  }

  const SensorReadings& getReadings() const {
    return _currentReadings;
  }
};

extern SensorManager sensors;

#endif // SENSOR_MANAGER_H
