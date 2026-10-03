export type DeviceType = 'ESP1' | 'ESP2';
export type DeviceState = 'ONLINE' | 'OFFLINE' | 'DEGRADED' | 'RECONNECTING';

export interface DeviceStatus {
  id: DeviceType;
  name: string;
  state: DeviceState;
  ip: string;
  rssi: number;
  uptimeSeconds: number;
  freeHeap: number;
  firmware: string;
  lastSeen: number; // Unix timestamp ms
  latencyMs: number;
}

export interface SensorReading {
  id?: number;
  timestamp: number; // UTC unix ms
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

export interface MotorStatus {
  direction: MotorDirection;
  speed: number;
  lastCommandMsAgo: number;
}

export interface ActuatorState {
  servoAngle: number;
  servoTargetAngle: number;
  pumpActive: boolean;
  pumpRuntimeMs: number;
  pumpCooldownRemainingMs: number;
  soilSequenceState: string;
}

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
  target: 'soil_moisture' | 'temperature' | 'humidity';
  horizonMinutes: number;
  predictedValue: number;
  confidenceLower: number;
  confidenceUpper: number;
  confidenceLevel: 'High' | 'Medium' | 'Low';
  timestamp: number;
}

export interface MLModelMetrics {
  mae: number;
  rmse: number;
  r2: number;
  sampleCount: number;
  lastTrained: number;
  status: 'Insufficient data' | 'Training' | 'Ready';
}

export type EventSeverity = 'info' | 'warning' | 'critical';

export interface SystemEvent {
  id?: number;
  timestamp: number;
  device: string;
  severity: EventSeverity;
  message: string;
  metadata?: string;
}

export interface HealthCheckReport {
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

export interface SystemSettings {
  wifiSsid: string;
  esp1Ip: string;
  esp2Ip: string;
  soilDryAdc: number;
  soilWetAdc: number;
  maxPumpRuntimeSeconds: number;
  pumpCooldownSeconds: number;
  motorTimeoutMs: number;
  simulationMode: boolean;
}

export interface WebSocketMessage {
  type: 'telemetry' | 'device_status' | 'event' | 'automation_trigger' | 'motor_ack' | 'pump_ack' | 'alert' | 'heartbeat';
  payload: any;
  timestamp: number;
}
