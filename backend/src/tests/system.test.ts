import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import path from 'path';
import fs from 'fs';
import { dbManager } from '../database/db';
import { Repository } from '../database/repository';
import { SafetyWatchdog } from '../services/safetyWatchdog';
import { Simulator } from '../services/simulator';
import { MLService } from '../services/mlService';
import { AutomationEngine } from '../services/automationEngine';
import { SensorReading } from '../types';

describe('ESP Smart Control Backend System Tests', () => {
  before(async () => {
    await dbManager.init();
    await AutomationEngine.init();
  });

  after(() => {
    Repository.clearAllSensorData();
    dbManager.close();
  });

  describe('Database and Repository', () => {
    it('should successfully store and retrieve sensor readings', () => {
      const reading: SensorReading = {
        timestamp: Date.now(),
        temperature: 25.4,
        humidity: 58.2,
        dhtValid: true,
        mq132Raw: 890,
        mq132Index: 21.7,
        mq132WarmedUp: true,
        mq5Raw: 640,
        mq5Index: 15.6,
        mq5WarmedUp: true,
        soilRaw: 2100,
        soilPercent: 55,
        soilState: 'MODERATE',
        soilActive: false,
        sequenceState: 'IDLE',
        servoAngle: 0,
        pumpActive: false,
        pumpElapsedMs: 0,
        isSimulated: true
      };

      Repository.insertSensorReading(reading);
      const recent = Repository.getRecentReadings(10);
      assert.ok(recent.length > 0, 'Recent readings should not be empty');
      const latest = recent[recent.length - 1];
      assert.strictEqual(latest.soilPercent, 55);
      assert.strictEqual(latest.temperature, 25.4);
    });

    it('should query readings within a specified timestamp range', () => {
      const now = Date.now();
      const readings = Repository.getReadingsInRange(now - (3600 * 1000), now + 1000);
      assert.ok(Array.isArray(readings));
    });
  });

  describe('Safety Watchdog', () => {
    it('should enforce pump activation cooldown and prevent double-triggering', () => {
      SafetyWatchdog.registerPumpOn(5000, 'test');
      const checkDuringRun = SafetyWatchdog.canActivatePump();
      assert.strictEqual(checkDuringRun.allowed, false, 'Should disallow activation while already running');

      SafetyWatchdog.registerPumpOff('MANUAL');
      const checkDuringCooldown = SafetyWatchdog.canActivatePump();
      assert.strictEqual(checkDuringCooldown.allowed, false, 'Should disallow activation during cooldown');
    });

    it('should enforce motor command timeout on inactivity', () => {
      SafetyWatchdog.pingMotor();
      assert.strictEqual(SafetyWatchdog.isMotorTimedOut(), false);
    });
  });

  describe('Hardware Simulator Physics', () => {
    it('should generate valid bounded sensor telemetry', () => {
      Simulator.update(1.0);
      const sim = Simulator.getSimulatedSensors();
      assert.ok(sim.temperature >= -10 && sim.temperature <= 60, 'Temperature within physical range');
      assert.ok(sim.humidity >= 0 && sim.humidity <= 100, 'Humidity within 0-100%');
      assert.ok(sim.soilPercent >= 0 && sim.soilPercent <= 100, 'Soil percent within 0-100%');
      assert.ok(['DRY', 'MODERATE', 'WET', 'INACTIVE'].includes(sim.soilState));
    });

    it('should animate virtual servo and deployment sequence', () => {
      Simulator.triggerSoilSequence();
      Simulator.update(1.0);
      const sim = Simulator.getSimulatedSensors();
      assert.ok(sim.sequenceState !== 'IDLE');
    });
  });

  describe('Machine Learning & Predictive Engine', () => {
    it('should compute valid model metrics without fabricating data', async () => {
      await MLService.trainModels();
      const metrics = MLService.getMetrics();
      assert.ok(['Insufficient data', 'Training', 'Ready'].includes(metrics.soil.status));
      assert.ok(metrics.soil.mae >= 0);
      assert.ok(metrics.soil.rmse >= 0);
    });

    it('should generate multi-horizon forecasts with expanding uncertainty bounds', () => {
      const forecasts = MLService.generateForecast('soil_moisture');
      assert.strictEqual(forecasts.length, 6, 'Should generate 6 prediction horizons (+0.5h, 1h, 3h, 6h, 12h, 24h)');

      // Verify uncertainty accumulation
      const first = forecasts[0];
      const last = forecasts[forecasts.length - 1];
      const firstSpread = first.confidenceUpper - first.confidenceLower;
      const lastSpread = last.confidenceUpper - last.confidenceLower;
      assert.ok(lastSpread > firstSpread, 'Uncertainty must accumulate for longer horizons');
    });

    it('should provide clear irrigation recommendations based on forecast', () => {
      const recDry = MLService.getIrrigationRecommendation(25, 20);
      assert.strictEqual(recDry.recommendation, 'Likely Irrigation Required');

      const recWet = MLService.getIrrigationRecommendation(80, 75);
      assert.strictEqual(recWet.recommendation, 'Likely No Irrigation');
    });
  });

  describe('Automation Engine', () => {
    it('should evaluate rules and protect against unsafe parameters', async () => {
      const testTelemetry: SensorReading = {
        timestamp: Date.now(),
        temperature: 38.5, // High temp
        humidity: 45.0,
        dhtValid: true,
        mq132Raw: 900,
        mq132Index: 22.0,
        mq132WarmedUp: true,
        mq5Raw: 600,
        mq5Index: 14.0,
        mq5WarmedUp: true,
        soilRaw: 3100,
        soilPercent: 20, // Low soil moisture
        soilState: 'DRY',
        soilActive: false,
        sequenceState: 'IDLE',
        servoAngle: 0,
        pumpActive: false,
        pumpElapsedMs: 0,
        isSimulated: true
      };

      await AutomationEngine.evaluate(testTelemetry);
      const events = Repository.getEvents(10);
      assert.ok(events.length > 0, 'Automation should generate event logs');
    });
  });
});
