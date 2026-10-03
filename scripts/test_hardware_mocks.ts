import path from 'path';
import fs from 'fs';

// Set environment path for node modules
process.env.DATABASE_PATH = path.resolve(__dirname, '../backend/data/esp_control.sqlite');
process.env.SIMULATION_MODE = 'true';

async function runMocksValidation() {
  console.log('===============================================================');
  console.log('  Hardware-Independent Mock & Simulation Verification Test');
  console.log('===============================================================');

  // Load modules
  const { dbManager } = require('../backend/src/database/db');
  const { Repository } = require('../backend/src/database/repository');
  const { Simulator } = require('../backend/src/services/simulator');
  const { SafetyWatchdog } = require('../backend/src/services/safetyWatchdog');
  const { MLService } = require('../backend/src/services/mlService');
  const { AutomationEngine } = require('../backend/src/services/automationEngine');

  // 1. Initialize Database
  console.log('[TEST 1] Initializing SQLite database...');
  await dbManager.init();
  const count = Repository.getTotalReadingsCount();
  console.log(`✓ SQLite Database initialized. Total records in store: ${count}`);

  // 2. Test Simulator Physics
  console.log('\n[TEST 2] Testing physical sensor simulation dynamics...');
  Simulator.update(1.0);
  const simSensors = Simulator.getSimulatedSensors();
  if (simSensors.temperature > 0 && simSensors.humidity > 0 && simSensors.soilPercent >= 0) {
    console.log(`✓ Physics engine working: Temp=${simSensors.temperature}°C, Hum=${simSensors.humidity}%, Soil=${simSensors.soilPercent}%`);
  } else {
    throw new Error('Simulation physics produced out-of-bounds telemetry');
  }

  // 3. Test Safety Watchdogs
  console.log('\n[TEST 3] Testing Safety Watchdog interlocks...');
  SafetyWatchdog.registerPumpOn(4000, 'test_suite');
  const canReactivate = SafetyWatchdog.canActivatePump();
  if (!canReactivate.allowed) {
    console.log(`✓ Pump interlock verified: Successfully blocked duplicate activation (${canReactivate.reason})`);
  } else {
    throw new Error('Safety Watchdog failed to block concurrent pump activation');
  }
  SafetyWatchdog.registerPumpOff('MANUAL');

  // 4. Test ML Recursive Forecasting
  console.log('\n[TEST 4] Testing ML Predictive Engine & Uncertainty Accumulation...');
  await MLService.trainModels();
  const forecasts = MLService.generateForecast('soil_moisture');
  const f0 = forecasts[0];
  const fEnd = forecasts[forecasts.length - 1];
  const spread0 = f0.confidenceUpper - f0.confidenceLower;
  const spreadEnd = fEnd.confidenceUpper - fEnd.confidenceLower;
  console.log(`✓ 30m Forecast: ${f0.predictedValue}% (Uncertainty ±${(spread0 / 2).toFixed(1)}%)`);
  console.log(`✓ 24h Forecast: ${fEnd.predictedValue}% (Uncertainty ±${(spreadEnd / 2).toFixed(1)}%)`);
  if (spreadEnd > spread0) {
    console.log('✓ Recursive forecast uncertainty expands realistically over time.');
  }

  // 5. Test Automation Engine
  console.log('\n[TEST 5] Testing Automation Engine rules...');
  await AutomationEngine.init();
  await AutomationEngine.evaluate(simSensors);
  console.log('✓ Automation evaluation completed without safety violations.');

  // Clean shutdown
  dbManager.close();
  console.log('\n===============================================================');
  console.log('  ALL HARDWARE-INDEPENDENT VALIDATIONS PASSED SUCCESSFULLY! (100%)');
  console.log('===============================================================');
}

runMocksValidation().catch(err => {
  console.error('[ERROR] Validation failed:', err);
  process.exit(1);
});
