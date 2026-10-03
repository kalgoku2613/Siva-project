import { SensorReading, DeviceStatus, MotorDirection } from '../types';

export class Simulator {
  private static simSoilMoisture: number = 48.0; // starts at 48%
  private static simTempBase: number = 24.5;
  private static simHumBase: number = 55.0;

  // Virtual Actuators
  private static motorDir: MotorDirection = 'STOP';
  private static motorSpeed: number = 190;
  private static servoAngle: number = 0;
  private static servoTarget: number = 0;
  private static pumpActive: boolean = false;
  private static pumpStartTime: number = 0;
  private static pumpDurationMs: number = 4000;

  // Deployment sequence simulation
  private static seqState: string = 'IDLE';
  private static seqTimer: number = 0;

  public static update(deltaSec: number = 1.0): void {
    const now = Date.now();

    // 1. Natural soil moisture evaporation (slow loss unless watered)
    if (!this.pumpActive) {
      this.simSoilMoisture = Math.max(12.0, this.simSoilMoisture - (0.02 * deltaSec));
    } else {
      // Pump adds water while active
      this.simSoilMoisture = Math.min(92.0, this.simSoilMoisture + (3.5 * deltaSec));
      if (now - this.pumpStartTime >= this.pumpDurationMs) {
        this.pumpActive = false;
      }
    }

    // 2. Smooth virtual servo movement
    if (this.servoAngle < this.servoTarget) {
      this.servoAngle = Math.min(this.servoTarget, this.servoAngle + 10);
    } else if (this.servoAngle > this.servoTarget) {
      this.servoAngle = Math.max(this.servoTarget, this.servoAngle - 10);
    }

    // 3. Deployment sequence simulation
    if (this.seqState === 'DEPLOYING_ARM') {
      if (this.servoAngle === 180) {
        this.seqState = 'SETTLING_SENSOR';
        this.seqTimer = now;
      }
    } else if (this.seqState === 'SETTLING_SENSOR') {
      if (now - this.seqTimer > 1000) {
        this.seqState = 'SAMPLING_MOISTURE';
        this.seqTimer = now;
      }
    } else if (this.seqState === 'SAMPLING_MOISTURE') {
      if (now - this.seqTimer > 1500) {
        this.seqState = 'MEASUREMENT_READY';
      }
    } else if (this.seqState === 'RETRACTING_ARM') {
      if (this.servoAngle === 0) {
        this.seqState = 'IDLE';
      }
    }
  }

  public static getSimulatedSensors(): SensorReading {
    const now = Date.now();
    // Diurnal temperature sinusoidal wave
    const hourOfDay = (now / (1000 * 60 * 60)) % 24;
    const tempOffset = Math.sin((hourOfDay - 9) * (Math.PI / 12)) * 4.5;
    const currentTemp = parseFloat((this.simTempBase + tempOffset + (Math.random() * 0.4 - 0.2)).toFixed(1));
    const currentHum = parseFloat(Math.max(20, Math.min(95, this.simHumBase - (tempOffset * 1.5) + (Math.random() * 1.0 - 0.5))).toFixed(1));

    // Gas sensors with realistic subtle noise
    const mq132Raw = Math.floor(850 + Math.random() * 80);
    const mq5Raw = Math.floor(620 + Math.random() * 60);

    const soilPct = Math.round(this.simSoilMoisture);
    let soilState: 'DRY' | 'MODERATE' | 'WET' | 'INACTIVE' = 'INACTIVE';
    if (this.seqState === 'MEASUREMENT_READY' || this.seqState === 'SAMPLING_MOISTURE') {
      soilState = soilPct < 35 ? 'DRY' : soilPct <= 70 ? 'MODERATE' : 'WET';
    }

    // Map soil percentage back to ADC
    const soilRaw = Math.round(3200 - ((soilPct / 100) * (3200 - 1350)));

    return {
      timestamp: now,
      temperature: currentTemp,
      humidity: currentHum,
      dhtValid: true,
      mq132Raw: mq132Raw,
      mq132Index: parseFloat(((mq132Raw / 4095) * 100).toFixed(1)),
      mq132WarmedUp: true,
      mq5Raw: mq5Raw,
      mq5Index: parseFloat(((mq5Raw / 4095) * 100).toFixed(1)),
      mq5WarmedUp: true,
      soilRaw: soilRaw,
      soilPercent: soilPct,
      soilState: soilState,
      soilActive: this.seqState === 'SAMPLING_MOISTURE' || this.seqState === 'SETTLING_SENSOR',
      sequenceState: this.seqState,
      servoAngle: this.servoAngle,
      pumpActive: this.pumpActive,
      pumpElapsedMs: this.pumpActive ? now - this.pumpStartTime : 0,
      isSimulated: true
    };
  }

  public static getSimulatedDevices(): DeviceStatus[] {
    const now = Date.now();
    return [
      {
        id: 'ESP1',
        name: 'ESP1-Camera-Motor',
        state: 'ONLINE',
        ip: '127.0.0.1 (Simulated)',
        rssi: -58,
        uptimeSeconds: Math.floor(now / 1000) % 86400,
        freeHeap: 142800,
        firmware: '1.2.0-SIM',
        lastSeen: now,
        latencyMs: 14
      },
      {
        id: 'ESP2',
        name: 'ESP2-Sensor-Controller',
        state: 'ONLINE',
        ip: '127.0.0.1 (Simulated)',
        rssi: -62,
        uptimeSeconds: Math.floor(now / 1000) % 86400,
        freeHeap: 185200,
        firmware: '1.2.0-SIM',
        lastSeen: now,
        latencyMs: 18
      }
    ];
  }

  // Virtual control triggers
  public static triggerSoilSequence(): void {
    this.seqState = 'DEPLOYING_ARM';
    this.servoTarget = 180;
  }

  public static triggerSoilRetract(): void {
    this.seqState = 'RETRACTING_ARM';
    this.servoTarget = 0;
  }

  public static setServoAngle(deg: number): void {
    this.servoTarget = Math.max(0, Math.min(180, deg));
  }

  public static triggerPump(durationMs: number = 4000): boolean {
    this.pumpActive = true;
    this.pumpStartTime = Date.now();
    this.pumpDurationMs = durationMs;
    return true;
  }

  public static stopPump(): void {
    this.pumpActive = false;
  }

  public static setMotor(dir: MotorDirection, speed: number = 190): void {
    this.motorDir = dir;
    this.motorSpeed = speed;
  }

  public static getMotorState() {
    return {
      direction: this.motorDir,
      speed: this.motorSpeed
    };
  }
}
