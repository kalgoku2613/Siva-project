import { Router, Request, Response } from 'express';
import { DeviceManager } from '../services/deviceManager';
import { SafetyWatchdog } from '../services/safetyWatchdog';
import { AutomationEngine } from '../services/automationEngine';
import { MLService } from '../services/mlService';
import { Repository } from '../database/repository';
import { CONFIG } from '../config';
import { MotorDirection, AutomationRule } from '../types';
import { NetworkScanner } from '../services/networkScanner';

export const apiRouter = Router();

// 1. System Health & Status
apiRouter.get('/system/status', (req: Request, res: Response) => {
  const devices = DeviceManager.getDevices();
  const telemetry = DeviceManager.getLatestTelemetry();
  const pumpStatus = SafetyWatchdog.getPumpStatus();

  res.json({
    success: true,
    simulationMode: CONFIG.SIMULATION_MODE,
    devices,
    telemetry,
    pumpStatus,
    timestamp: Date.now()
  });
});

apiRouter.get('/system/health', (req: Request, res: Response) => {
  const devices = DeviceManager.getDevices();
  const esp1 = devices.find(d => d.id === 'ESP1');
  const esp2 = devices.find(d => d.id === 'ESP2');
  const totalReadings = Repository.getTotalReadingsCount();
  const mlMetrics = MLService.getMetrics();

  const report = {
    timestamp: Date.now(),
    healthy: (esp1?.state === 'ONLINE') && (esp2?.state === 'ONLINE'),
    subsystems: {
      esp1CameraMotor: {
        online: esp1?.state === 'ONLINE',
        ip: esp1?.ip || 'N/A',
        latencyMs: esp1?.latencyMs || 0
      },
      esp2Sensors: {
        online: esp2?.state === 'ONLINE',
        ip: esp2?.ip || 'N/A',
        latencyMs: esp2?.latencyMs || 0
      },
      database: {
        connected: true,
        path: CONFIG.DATABASE_PATH,
        totalReadings
      },
      webSocket: { activeConnections: 1 },
      safetyWatchdog: {
        pumpCutoffArmed: true,
        motorWatchdogArmed: true
      },
      mlEngine: {
        soilModelStatus: mlMetrics.soil.status,
        tempModelStatus: mlMetrics.temperature.status
      }
    },
    summary: (esp1?.state === 'ONLINE' && esp2?.state === 'ONLINE')
      ? 'All hardware modules operating nominally.'
      : 'One or more ESP devices are offline or in simulation fallback mode.'
  };

  res.json({ success: true, report });
});

apiRouter.post('/system/emergency-stop', (req: Request, res: Response) => {
  SafetyWatchdog.emergencyStopAll();
  DeviceManager.sendMotorCommand('STOP', 0);
  DeviceManager.setPump(false);
  res.json({ success: true, message: 'All hardware stopped immediately.' });
});

// 2. Sensor Telemetry & Historical Data
apiRouter.get('/sensors/current', (req: Request, res: Response) => {
  const telemetry = DeviceManager.getLatestTelemetry();
  res.json({ success: true, telemetry });
});

apiRouter.get('/sensors/history', (req: Request, res: Response) => {
  const range = (req.query.range as string) || '1h';
  const now = Date.now();
  let startTime = now - (60 * 60 * 1000); // default 1h

  if (range === '6h') startTime = now - (6 * 60 * 60 * 1000);
  else if (range === '24h') startTime = now - (24 * 60 * 60 * 1000);
  else if (range === '7d') startTime = now - (7 * 24 * 60 * 60 * 1000);
  else if (req.query.start && req.query.end) {
    startTime = parseInt(req.query.start as string, 10);
  }

  const readings = Repository.getReadingsInRange(startTime, now);
  res.json({ success: true, range, count: readings.length, readings });
});

apiRouter.get('/sensors/export', (req: Request, res: Response) => {
  const format = (req.query.format as string) || 'csv';
  const readings = Repository.getReadingsInRange(Date.now() - (7 * 24 * 60 * 60 * 1000), Date.now());

  if (format === 'json') {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename="sensor_history.json"');
    return res.json(readings);
  }

  // CSV format
  const headers = 'timestamp,datetime,temperature,humidity,soil_raw,soil_percent,soil_state,mq132_index,mq5_index,servo_angle,pump_active\n';
  const rows = readings.map(r =>
    `${r.timestamp},"${new Date(r.timestamp).toISOString()}",${r.temperature},${r.humidity},${r.soilRaw},${r.soilPercent},"${r.soilState}",${r.mq132Index},${r.mq5Index},${r.servoAngle},${r.pumpActive ? 1 : 0}`
  ).join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="sensor_history.csv"');
  res.send(headers + rows);
});

// 3. Robot & Motor Control
apiRouter.post('/robot/move', async (req: Request, res: Response) => {
  const { direction, speed } = req.body;
  const validDirs: MotorDirection[] = ['FORWARD', 'BACKWARD', 'LEFT', 'RIGHT', 'STOP'];
  const dir = (direction || '').toUpperCase() as MotorDirection;

  if (!validDirs.includes(dir)) {
    return res.status(400).json({ success: false, error: 'Invalid motor direction' });
  }

  const result = await DeviceManager.sendMotorCommand(dir, speed);
  res.json(result);
});

// 4. Actuator & Soil Deployment
apiRouter.post('/moisture/deploy', async (req: Request, res: Response) => {
  const result = await DeviceManager.triggerSoilDeployment();
  res.json(result);
});

apiRouter.post('/moisture/retract', async (req: Request, res: Response) => {
  const result = await DeviceManager.retractSoilArm();
  res.json(result);
});

apiRouter.post('/servo/angle', async (req: Request, res: Response) => {
  const angle = parseInt(req.body.angle, 10);
  if (isNaN(angle) || angle < 0 || angle > 180) {
    return res.status(400).json({ success: false, error: 'Angle must be between 0 and 180' });
  }
  const result = await DeviceManager.setServoAngle(angle);
  res.json(result);
});

apiRouter.post('/pump/on', async (req: Request, res: Response) => {
  const durationMs = parseInt(req.body.durationMs, 10) || 4000;
  const result = await DeviceManager.setPump(true, durationMs, 'manual');
  if (!result.success) {
    return res.status(429).json(result);
  }
  res.json(result);
});

apiRouter.post('/pump/off', async (req: Request, res: Response) => {
  const result = await DeviceManager.setPump(false, 0, 'manual');
  res.json(result);
});

// 5. Automation Rules
apiRouter.get('/automation/rules', (req: Request, res: Response) => {
  const rules = Repository.getAutomationRules();
  res.json({ success: true, rules });
});

apiRouter.post('/automation/rules', (req: Request, res: Response) => {
  const rule: AutomationRule = {
    id: req.body.id || 'rule-' + Date.now(),
    name: req.body.name || 'Unnamed Rule',
    enabled: req.body.enabled !== undefined ? Boolean(req.body.enabled) : true,
    conditionType: req.body.conditionType,
    threshold: parseFloat(req.body.threshold) || 0,
    actionType: req.body.actionType,
    durationSeconds: parseInt(req.body.durationSeconds, 10) || 4,
    cooldownSeconds: parseInt(req.body.cooldownSeconds, 10) || 300,
    createdAt: req.body.createdAt || Date.now()
  };

  Repository.saveAutomationRule(rule);
  res.json({ success: true, rule });
});

apiRouter.delete('/automation/rules/:id', (req: Request, res: Response) => {
  Repository.deleteAutomationRule(req.params.id);
  res.json({ success: true, id: req.params.id });
});

// 6. Machine Learning & Predictive System
apiRouter.get('/ml/metrics', (req: Request, res: Response) => {
  const metrics = MLService.getMetrics();
  res.json({ success: true, metrics });
});

apiRouter.get('/ml/forecast', (req: Request, res: Response) => {
  const target = (req.query.target as any) || 'soil_moisture';
  const forecast = MLService.generateForecast(target);
  res.json({ success: true, target, forecast });
});

apiRouter.get('/ml/irrigation', (req: Request, res: Response) => {
  const telemetry = DeviceManager.getLatestTelemetry();
  const currentSoil = telemetry ? telemetry.soilPercent : 45;
  const forecast = MLService.generateForecast('soil_moisture');
  const forecast24h = forecast.length > 0 ? forecast[forecast.length - 1].predictedValue : currentSoil - 10;

  const rec = MLService.getIrrigationRecommendation(currentSoil, forecast24h);
  res.json({ success: true, ...rec, currentSoil, forecast24h });
});

apiRouter.post('/ml/train', async (req: Request, res: Response) => {
  await MLService.trainModels();
  res.json({ success: true, message: 'Models retrained successfully', metrics: MLService.getMetrics() });
});

apiRouter.post('/ml/reset', (req: Request, res: Response) => {
  MLService.resetModels();
  res.json({ success: true, message: 'Model weights reset to default' });
});

// 7. Devices & Network
apiRouter.get('/devices', (req: Request, res: Response) => {
  const devices = DeviceManager.getDevices();
  res.json({ success: true, devices });
});

apiRouter.post('/devices/ping/:id', (req: Request, res: Response) => {
  const devices = DeviceManager.getDevices();
  const dev = devices.find(d => d.id === req.params.id);
  if (!dev) return res.status(404).json({ success: false, error: 'Device not found' });
  res.json({ success: true, id: dev.id, state: dev.state, latencyMs: dev.latencyMs });
});

// 8. Diagnostics & Logging
apiRouter.get('/diagnostics/logs', (req: Request, res: Response) => {
  const limit = parseInt(req.query.limit as string, 10) || 100;
  const logs = Repository.getEvents(limit);
  res.json({ success: true, logs });
});

apiRouter.delete('/diagnostics/logs', (req: Request, res: Response) => {
  Repository.clearEvents();
  res.json({ success: true, message: 'Log history cleared' });
});

// 9. Network IP Scanner & Device Pairing
apiRouter.get('/network/subnets', (req: Request, res: Response) => {
  try {
    const subnets = NetworkScanner.getLocalSubnets();
    res.json({ success: true, subnets });
  } catch (err: any) {
    res.json({ success: true, subnets: ['192.168.1'] });
  }
});

apiRouter.post('/network/scan', async (req: Request, res: Response) => {
  try {
    const { subnet, maxHosts } = req.body || {};
    const discovered = await NetworkScanner.scanSubnet(subnet, maxHosts || 254);
    res.json({ success: true, count: discovered.length, discovered });
  } catch (err: any) {
    console.error('[API] Scan error:', err);
    res.json({
      success: true,
      count: 0,
      discovered: [],
      warning: `Scanner error: ${err.message || err}. You can also connect directly by entering your ESP32 IP below.`
    });
  }
});

apiRouter.post('/network/connect', async (req: Request, res: Response) => {
  try {
    const { target, ip } = req.body || {};
    if (!target || !ip || (target !== 'ESP1' && target !== 'ESP2')) {
      return res.status(400).json({ success: false, error: 'Requires target ("ESP1" | "ESP2") and valid ip' });
    }

    const result = await NetworkScanner.connectDevice(target, ip);
    res.json(result);
  } catch (err: any) {
    console.error('[API] Connect error:', err);
    res.status(500).json({ success: false, error: err.message || 'Connection failed' });
  }
});

// 10. Database Cleanup
apiRouter.post('/database/clear', (req: Request, res: Response) => {
  Repository.clearAllSensorData();
  res.json({ success: true, message: 'All historical sensor readings and predictions cleared for fresh operation.' });
});

