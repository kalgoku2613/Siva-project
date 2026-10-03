import http from 'http';
import { CONFIG } from '../config';
import { DeviceStatus, SensorReading, MotorDirection } from '../types';
import { Repository } from '../database/repository';
import { Simulator } from './simulator';
import { SafetyWatchdog } from './safetyWatchdog';

export class DeviceManager {
  private static esp1Status: DeviceStatus = {
    id: 'ESP1',
    name: 'ESP1-Camera-Motor',
    state: 'OFFLINE',
    ip: CONFIG.ESP1_IP,
    rssi: 0,
    uptimeSeconds: 0,
    freeHeap: 0,
    firmware: '1.2.0',
    lastSeen: 0,
    latencyMs: 0
  };

  private static esp2Status: DeviceStatus = {
    id: 'ESP2',
    name: 'ESP2-Sensor-Controller',
    state: 'OFFLINE',
    ip: CONFIG.ESP2_IP,
    rssi: 0,
    uptimeSeconds: 0,
    freeHeap: 0,
    firmware: '1.2.0',
    lastSeen: 0,
    latencyMs: 0
  };

  private static latestReading: SensorReading | null = null;
  private static listeners: ((data: { telemetry: SensorReading | null; devices: DeviceStatus[] }) => void)[] = [];

  public static onUpdate(cb: (data: { telemetry: SensorReading | null; devices: DeviceStatus[] }) => void): void {
    this.listeners.push(cb);
  }

  private static broadcast(telemetry: SensorReading | null, devices: DeviceStatus[]): void {
    for (const listener of this.listeners) {
      try {
        listener({ telemetry, devices });
      } catch (err) {
        console.error('[DEVICE_MGR] Broadcast listener error:', err);
      }
    }
  }

  public static async init(): Promise<void> {
    // Run device polling loop every 1.5 seconds
    setInterval(async () => {
      await this.pollCycle();
    }, 1500);

    // Initial database registration
    Repository.upsertDevice(this.esp1Status);
    Repository.upsertDevice(this.esp2Status);
  }

  private static async pollCycle(): Promise<void> {
    const now = Date.now();

    // Check simulation mode
    if (CONFIG.SIMULATION_MODE) {
      Simulator.update(1.5);
      const simReading = Simulator.getSimulatedSensors();
      const simDevices = Simulator.getSimulatedDevices();

      this.esp1Status = simDevices[0];
      this.esp2Status = simDevices[1];
      this.latestReading = simReading;

      // Persist to database
      Repository.insertSensorReading(simReading);
      Repository.upsertDevice(this.esp1Status);
      Repository.upsertDevice(this.esp2Status);

      this.broadcast(simReading, [this.esp1Status, this.esp2Status]);
      return;
    }

    // Physical Hardware Polling:
    // 1. Poll ESP1
    await this.pollESP1();

    // 2. Poll ESP2
    await this.pollESP2();

    // Only record reading in database if ESP2 is actually connected and ONLINE
    if (this.esp2Status.state === 'ONLINE' && this.latestReading) {
      Repository.insertSensorReading(this.latestReading);
    }

    Repository.upsertDevice(this.esp1Status);
    Repository.upsertDevice(this.esp2Status);

    // Broadcast current reading (or null if ESP2 is offline) and device statuses
    this.broadcast(this.latestReading, [this.esp1Status, this.esp2Status]);
  }

  private static async pollESP1(): Promise<void> {
    const start = Date.now();
    try {
      const data = await this.httpGetJson(`http://${this.esp1Status.ip}/api/status`, 1200);
      const latency = Date.now() - start;

      const wasOffline = this.esp1Status.state !== 'ONLINE';
      this.esp1Status = {
        ...this.esp1Status,
        state: 'ONLINE',
        rssi: data.rssi || -55,
        uptimeSeconds: data.uptime_seconds || 0,
        freeHeap: data.free_heap || 0,
        firmware: data.firmware || '1.2.0',
        lastSeen: Date.now(),
        latencyMs: latency
      };

      if (wasOffline) {
        Repository.insertEvent({
          timestamp: Date.now(),
          device: 'ESP1',
          severity: 'info',
          message: 'ESP1 Camera & Motor Controller connected (ONLINE)'
        });
      }
    } catch {
      const wasOnline = this.esp1Status.state === 'ONLINE';
      this.esp1Status.state = 'OFFLINE';
      this.esp1Status.latencyMs = 0;

      if (wasOnline) {
        Repository.insertEvent({
          timestamp: Date.now(),
          device: 'ESP1',
          severity: 'warning',
          message: 'ESP1 disconnected (OFFLINE)'
        });
      }
    }
  }

  private static async pollESP2(): Promise<void> {
    const start = Date.now();
    try {
      const data = await this.httpGetJson(`http://${this.esp2Status.ip}/api/sensors`, 1200);
      const latency = Date.now() - start;

      const wasOffline = this.esp2Status.state !== 'ONLINE';
      this.esp2Status = {
        ...this.esp2Status,
        state: 'ONLINE',
        rssi: data.rssi || -60,
        uptimeSeconds: data.uptime_seconds || 0,
        freeHeap: data.free_heap || 0,
        firmware: data.firmware || '1.2.0',
        lastSeen: Date.now(),
        latencyMs: latency
      };

      if (wasOffline) {
        Repository.insertEvent({
          timestamp: Date.now(),
          device: 'ESP2',
          severity: 'info',
          message: 'ESP2 Sensor Controller connected (ONLINE)'
        });
      }

      this.latestReading = {
        timestamp: Date.now(),
        temperature: data.temperature || 0,
        humidity: data.humidity || 0,
        dhtValid: Boolean(data.dht_valid),
        mq132Raw: data.mq132_raw || 0,
        mq132Index: data.mq132_index || 0,
        mq132WarmedUp: Boolean(data.mq132_warmed_up),
        mq5Raw: data.mq5_raw || 0,
        mq5Index: data.mq5_index || 0,
        mq5WarmedUp: Boolean(data.mq5_warmed_up),
        soilRaw: data.soil_raw || 0,
        soilPercent: data.soil_percent || 0,
        soilState: data.soil_state || 'INACTIVE',
        soilActive: Boolean(data.soil_active),
        sequenceState: data.sequence_state || 'IDLE',
        servoAngle: data.servo_angle || 0,
        pumpActive: Boolean(data.pump_active),
        pumpElapsedMs: data.pump_elapsed_ms || 0,
        isSimulated: false
      };
    } catch {
      const wasOnline = this.esp2Status.state === 'ONLINE';
      this.esp2Status.state = 'OFFLINE';
      this.esp2Status.latencyMs = 0;
      this.latestReading = null; // No ESP2 connected -> Clear reading so dashboard displays '--'

      if (wasOnline) {
        Repository.insertEvent({
          timestamp: Date.now(),
          device: 'ESP2',
          severity: 'warning',
          message: 'ESP2 Sensor Controller disconnected (OFFLINE)'
        });
      }
    }
  }

  // Actuator Commands
  public static async sendMotorCommand(direction: MotorDirection, speed?: number): Promise<{ success: boolean; direction: string }> {
    SafetyWatchdog.pingMotor();
    Repository.logMotorEvent(direction, speed || 190, 'web');

    if (CONFIG.SIMULATION_MODE) {
      Simulator.setMotor(direction, speed);
      return { success: true, direction };
    }

    try {
      const endpoint = `http://${this.esp1Status.ip}/api/motor/${direction.toLowerCase()}`;
      await this.httpPostJson(endpoint);
      if (speed !== undefined) {
        await this.httpPostJson(`http://${this.esp1Status.ip}/api/motor/speed?val=${speed}`);
      }
      return { success: true, direction };
    } catch (err: any) {
      return { success: false, direction: 'STOP' };
    }
  }

  public static async triggerSoilDeployment(): Promise<{ success: boolean; message: string }> {
    if (CONFIG.SIMULATION_MODE) {
      Simulator.triggerSoilSequence();
      return { success: true, message: 'Simulated Soil Deployment Started' };
    }

    try {
      const endpoint = `http://${this.esp2Status.ip}/api/moisture/deploy-and-read`;
      await this.httpPostJson(endpoint);
      return { success: true, message: 'Deployment command sent to ESP2' };
    } catch (err: any) {
      return { success: false, message: 'Failed to contact ESP2: ' + err.message };
    }
  }

  public static async retractSoilArm(): Promise<{ success: boolean; message: string }> {
    if (CONFIG.SIMULATION_MODE) {
      Simulator.triggerSoilRetract();
      return { success: true, message: 'Simulated Arm Retracted' };
    }

    try {
      await this.httpPostJson(`http://${this.esp2Status.ip}/api/servo/retract`);
      return { success: true, message: 'Retract command sent to ESP2' };
    } catch (err: any) {
      return { success: false, message: 'Failed to contact ESP2: ' + err.message };
    }
  }

  public static async setServoAngle(deg: number): Promise<{ success: boolean; angle: number }> {
    if (CONFIG.SIMULATION_MODE) {
      Simulator.setServoAngle(deg);
      return { success: true, angle: deg };
    }

    try {
      await this.httpPostJson(`http://${this.esp2Status.ip}/api/servo/angle?val=${deg}`);
      return { success: true, angle: deg };
    } catch {
      return { success: false, angle: 0 };
    }
  }

  public static async setPump(on: boolean, durationMs: number = 4000, source: string = 'manual'): Promise<{ success: boolean; active: boolean; error?: string }> {
    if (on) {
      const check = SafetyWatchdog.canActivatePump();
      if (!check.allowed) {
        return { success: false, active: false, error: check.reason };
      }
      SafetyWatchdog.registerPumpOn(durationMs, source);

      if (CONFIG.SIMULATION_MODE) {
        Simulator.triggerPump(durationMs);
        return { success: true, active: true };
      }

      try {
        await this.httpPostJson(`http://${this.esp2Status.ip}/api/pump/on?duration=${durationMs}`);
        return { success: true, active: true };
      } catch (err: any) {
        SafetyWatchdog.registerPumpOff('MANUAL');
        return { success: false, active: false, error: 'ESP2 unreachable: ' + err.message };
      }
    } else {
      SafetyWatchdog.registerPumpOff('MANUAL');
      if (CONFIG.SIMULATION_MODE) {
        Simulator.stopPump();
        return { success: true, active: false };
      }
      try {
        await this.httpPostJson(`http://${this.esp2Status.ip}/api/pump/off`);
        return { success: true, active: false };
      } catch {
        return { success: false, active: false, error: 'ESP2 unreachable' };
      }
    }
  }

  public static getDevices(): DeviceStatus[] {
    return [this.esp1Status, this.esp2Status];
  }

  public static getLatestTelemetry(): SensorReading | null {
    return this.latestReading;
  }

  public static updateEspIp(target: 'ESP1' | 'ESP2', ip: string): void {
    if (target === 'ESP1') {
      this.esp1Status.ip = ip;
      this.esp1Status.state = 'ONLINE';
      this.esp1Status.lastSeen = Date.now();
      Repository.upsertDevice(this.esp1Status);
      this.pollESP1().then(() => {
        this.broadcast(this.latestReading, [this.esp1Status, this.esp2Status]);
      }).catch(() => {});
    } else {
      this.esp2Status.ip = ip;
      this.esp2Status.state = 'ONLINE';
      this.esp2Status.lastSeen = Date.now();
      Repository.upsertDevice(this.esp2Status);
      this.pollESP2().then(() => {
        this.broadcast(this.latestReading, [this.esp1Status, this.esp2Status]);
      }).catch(() => {});
    }
  }

  // HTTP Helpers
  private static httpGetJson(url: string, timeoutMs: number = 1000): Promise<any> {
    return new Promise((resolve, reject) => {
      const req = http.get(url, { timeout: timeoutMs }, (res) => {
        let raw = '';
        res.on('data', chunk => raw += chunk);
        res.on('end', () => {
          try {
            resolve(JSON.parse(raw));
          } catch {
            reject(new Error('Invalid JSON'));
          }
        });
      });
      req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
      req.on('error', reject);
    });
  }

  private static httpPostJson(url: string, timeoutMs: number = 1000): Promise<any> {
    return new Promise((resolve, reject) => {
      const u = new URL(url);
      const req = http.request({
        hostname: u.hostname,
        port: u.port || 80,
        path: u.pathname + u.search,
        method: 'POST',
        timeout: timeoutMs
      }, (res) => {
        let raw = '';
        res.on('data', chunk => raw += chunk);
        res.on('end', () => resolve(raw));
      });
      req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
      req.on('error', reject);
      req.end();
    });
  }
}
