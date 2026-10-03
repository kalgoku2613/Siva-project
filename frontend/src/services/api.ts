import {
  SensorReading,
  DeviceStatus,
  AutomationRule,
  MLPrediction,
  MLMetrics,
  SystemEvent,
  SystemHealthReport,
  MotorDirection
} from '../types';

const API_BASE = '/api';

export async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, options);
  if (!res.ok) {
    let errMsg = `HTTP Error ${res.status}`;
    try {
      const errObj = await res.json();
      if (errObj.error) errMsg = errObj.error;
    } catch {}
    throw new Error(errMsg);
  }
  return res.json();
}

export const api = {
  // System & Health
  getSystemStatus: () => fetchJson<{ success: boolean; devices: DeviceStatus[]; telemetry: SensorReading; simulationMode: boolean }>(`${API_BASE}/system/status`),
  getHealthReport: () => fetchJson<{ success: boolean; report: SystemHealthReport }>(`${API_BASE}/system/health`),
  emergencyStop: () => fetchJson<{ success: boolean; message: string }>(`${API_BASE}/system/emergency-stop`, { method: 'POST' }),

  // Sensors & History
  getLatestTelemetry: () => fetchJson<{ success: boolean; telemetry: SensorReading }>(`${API_BASE}/sensors/current`),
  getHistory: (range: string = '1h') => fetchJson<{ success: boolean; range: string; readings: SensorReading[] }>(`${API_BASE}/sensors/history?range=${range}`),

  // Robot Controls
  moveRobot: (direction: MotorDirection, speed: number = 190) =>
    fetchJson<{ success: boolean; direction: string }>(`${API_BASE}/robot/move`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ direction, speed })
    }),

  // Actuators & Soil Deployment
  deploySoil: () => fetchJson<{ success: boolean; message: string }>(`${API_BASE}/moisture/deploy`, { method: 'POST' }),
  retractSoil: () => fetchJson<{ success: boolean; message: string }>(`${API_BASE}/moisture/retract`, { method: 'POST' }),
  setServoAngle: (angle: number) =>
    fetchJson<{ success: boolean; angle: number }>(`${API_BASE}/servo/angle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ angle })
    }),
  setPump: (on: boolean, durationMs: number = 4000) =>
    fetchJson<{ success: boolean; active: boolean; error?: string }>(`${API_BASE}/pump/${on ? 'on' : 'off'}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ durationMs })
    }),

  // Automation
  getRules: () => fetchJson<{ success: boolean; rules: AutomationRule[] }>(`${API_BASE}/automation/rules`),
  saveRule: (rule: Partial<AutomationRule>) =>
    fetchJson<{ success: boolean; rule: AutomationRule }>(`${API_BASE}/automation/rules`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(rule)
    }),
  deleteRule: (id: string) => fetchJson<{ success: boolean; id: string }>(`${API_BASE}/automation/rules/${id}`, { method: 'DELETE' }),

  // ML / Predictions
  getMLMetrics: () => fetchJson<{ success: boolean; metrics: { soil: MLMetrics; temperature: MLMetrics; humidity: MLMetrics } }>(`${API_BASE}/ml/metrics`),
  getForecast: (target: string = 'soil_moisture') =>
    fetchJson<{ success: boolean; target: string; forecast: MLPrediction[] }>(`${API_BASE}/ml/forecast?target=${target}`),
  getIrrigationRecommendation: () =>
    fetchJson<{ success: boolean; recommendation: string; confidence: string; details: string; currentSoil: number; forecast24h: number }>(`${API_BASE}/ml/irrigation`),
  retrainModels: () => fetchJson<{ success: boolean; message: string; metrics: any }>(`${API_BASE}/ml/train`, { method: 'POST' }),
  resetModels: () => fetchJson<{ success: boolean; message: string }>(`${API_BASE}/ml/reset`, { method: 'POST' }),

  // Devices & Network
  getDevices: () => fetchJson<{ success: boolean; devices: DeviceStatus[] }>(`${API_BASE}/devices`),
  pingDevice: (id: string) => fetchJson<{ success: boolean; id: string; latencyMs: number }>(`${API_BASE}/devices/ping/${id}`, { method: 'POST' }),

  // Diagnostics & Logs
  getLogs: (limit: number = 100) => fetchJson<{ success: boolean; logs: SystemEvent[] }>(`${API_BASE}/diagnostics/logs?limit=${limit}`),
  clearLogs: () => fetchJson<{ success: boolean; message: string }>(`${API_BASE}/diagnostics/logs`, { method: 'DELETE' }),

  // Network IP Scanner & Pair
  getSubnets: () => fetchJson<{ success: boolean; subnets: string[] }>(`${API_BASE}/network/subnets`),
  scanNetwork: (subnet?: string, maxHosts: number = 254) =>
    fetchJson<{ success: boolean; count: number; discovered: any[] }>(`${API_BASE}/network/scan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subnet, maxHosts })
    }),
  connectNetworkDevice: (target: 'ESP1' | 'ESP2', ip: string) =>
    fetchJson<{ success: boolean; message: string; device?: any }>(`${API_BASE}/network/connect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target, ip })
    }),

  // Database Clean
  clearDatabase: () => fetchJson<{ success: boolean; message: string }>(`${API_BASE}/database/clear`, { method: 'POST' })
};
