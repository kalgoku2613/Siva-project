export type TabType =
  | 'dashboard'
  | 'camera'
  | 'robot'
  | 'sensors'
  | 'moisture'
  | 'automation'
  | 'predictions'
  | 'history'
  | 'devices'
  | 'diagnostics'
  | 'settings';

export type DeviceState = 'ONLINE' | 'OFFLINE' | 'DEGRADED' | 'RECONNECTING';

export interface DeviceStatus {
  id: 'ESP1' | 'ESP2';
  name: string;
  state: DeviceState;
  ip: string;
  rssi: number;
  uptimeSeconds: number;
  freeHeap: number;
  firmware: string;
  lastSeen: number;
  latencyMs: number;
}

export interface SensorReading {
  id?: number;
  timestamp: number;
  temperature: number;
  humidity: number;
  dhtValid: boolean;
  mq132Raw: number;
  mq132Index: number;
  mq132WarmedUp: boolean;
  mq5Raw: number;
  mq5Index: number;
  mq5WarmedUp: boolean;
  soilRaw: number;
  soilPercent: number;
  soilState: 'DRY' | 'MODERATE' | 'WET' | 'INACTIVE';
  soilActive: boolean;
  sequenceState: string;
  servoAngle: number;
  pumpActive: boolean;
  pumpElapsedMs: number;
  isSimulated: boolean;
}

export type MotorDirection = 'FORWARD' | 'BACKWARD' | 'LEFT' | 'RIGHT' | 'STOP';

export interface AutomationRule {
  id: string;
  name: string;
  enabled: boolean;
  conditionType: 'soil_moisture_below' | 'temp_above' | 'humidity_below' | 'mq132_above' | 'mq5_above';
  threshold: number;
  actionType: 'deploy_and_water' | 'trigger_alert' | 'retract_soil';
  durationSeconds: number;
  cooldownSeconds: number;
  lastTriggered?: number;
  createdAt: number;
}

export interface MLPrediction {
  id?: number;
  target: string;
  horizonMinutes: number;
  predictedValue: number;
  confidenceLower: number;
  confidenceUpper: number;
  confidenceLevel: 'High' | 'Medium' | 'Low';
  timestamp: number;
}

export interface MLMetrics {
  mae: number;
  rmse: number;
  r2: number;
  sampleCount: number;
  lastTrained: number;
  status: 'Insufficient data' | 'Training' | 'Ready';
}

export interface SystemEvent {
  id?: number;
  timestamp: number;
  device: string;
  severity: 'info' | 'warning' | 'critical';
  message: string;
  metadata?: string;
}

export interface SystemHealthReport {
  timestamp: number;
  healthy: boolean;
  subsystems: {
    esp1CameraMotor: { online: boolean; ip: string; latencyMs: number };
    esp2Sensors: { online: boolean; ip: string; latencyMs: number };
    database: { connected: boolean; path: string; totalReadings: number };
    webSocket: { activeConnections: number };
    safetyWatchdog: { pumpCutoffArmed: boolean; motorWatchdogArmed: boolean };
    mlEngine: { soilModelStatus: string; tempModelStatus: string };
  };
  summary: string;
}
