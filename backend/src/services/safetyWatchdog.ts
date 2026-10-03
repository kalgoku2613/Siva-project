import { CONFIG } from '../config';
import { Repository } from '../database/repository';

export class SafetyWatchdog {
  private static motorLastCommandTime: number = 0;
  private static motorActive: boolean = false;

  private static pumpActive: boolean = false;
  private static pumpStartTime: number = 0;
  private static pumpDurationMs: number = 0;
  private static pumpLastTurnOffTime: number = 0;

  // Motor Watchdog
  public static pingMotor(): void {
    this.motorLastCommandTime = Date.now();
    this.motorActive = true;
  }

  public static stopMotor(): void {
    this.motorActive = false;
  }

  public static isMotorTimedOut(): boolean {
    if (!this.motorActive) return false;
    return Date.now() - this.motorLastCommandTime > CONFIG.MOTOR_TIMEOUT_MS;
  }

  // Pump Watchdog
  public static canActivatePump(): { allowed: boolean; reason?: string } {
    const now = Date.now();
    if (this.pumpActive) {
      return { allowed: false, reason: 'Pump is already running' };
    }
    const cooldownMs = CONFIG.PUMP_COOLDOWN_SECONDS * 1000;
    const elapsedSinceLast = now - this.pumpLastTurnOffTime;
    if (this.pumpLastTurnOffTime > 0 && elapsedSinceLast < cooldownMs) {
      const remainingSec = Math.ceil((cooldownMs - elapsedSinceLast) / 1000);
      return { allowed: false, reason: `Pump cooldown active. Please wait ${remainingSec}s` };
    }
    return { allowed: true };
  }

  public static registerPumpOn(durationMs: number, source: string = 'manual'): void {
    const maxMs = CONFIG.MAX_PUMP_RUNTIME_SECONDS * 1000;
    this.pumpDurationMs = Math.min(durationMs, maxMs);
    this.pumpStartTime = Date.now();
    this.pumpActive = true;

    Repository.logPumpEvent('ON', this.pumpDurationMs, source);
    Repository.insertEvent({
      timestamp: Date.now(),
      device: 'ESP2',
      severity: 'info',
      message: `Pump activated for ${this.pumpDurationMs / 1000}s (Source: ${source})`
    });
  }

  public static registerPumpOff(reason: 'MANUAL' | 'AUTO_CUTOFF' | 'EMERGENCY_STOP' = 'MANUAL'): void {
    if (this.pumpActive) {
      const elapsed = Date.now() - this.pumpStartTime;
      this.pumpActive = false;
      this.pumpLastTurnOffTime = Date.now();

      Repository.logPumpEvent(reason, elapsed, reason);
      Repository.insertEvent({
        timestamp: Date.now(),
        device: 'ESP2',
        severity: reason === 'EMERGENCY_STOP' ? 'critical' : 'info',
        message: `Pump turned OFF (${reason}) after ${Math.round(elapsed / 1000)}s`
      });
    }
  }

  public static isPumpOvertime(): boolean {
    if (!this.pumpActive) return false;
    const elapsed = Date.now() - this.pumpStartTime;
    const maxMs = CONFIG.MAX_PUMP_RUNTIME_SECONDS * 1000;
    return elapsed >= this.pumpDurationMs || elapsed >= maxMs;
  }

  public static getPumpStatus() {
    const now = Date.now();
    const cooldownMs = CONFIG.PUMP_COOLDOWN_SECONDS * 1000;
    const elapsedSinceOff = now - this.pumpLastTurnOffTime;
    const cooldownRemaining = this.pumpLastTurnOffTime > 0 && elapsedSinceOff < cooldownMs
      ? Math.max(0, cooldownMs - elapsedSinceOff)
      : 0;

    return {
      active: this.pumpActive,
      elapsedMs: this.pumpActive ? now - this.pumpStartTime : 0,
      cooldownRemainingMs: cooldownRemaining
    };
  }

  public static emergencyStopAll(): void {
    this.stopMotor();
    this.registerPumpOff('EMERGENCY_STOP');
    Repository.insertEvent({
      timestamp: Date.now(),
      device: 'SYSTEM',
      severity: 'critical',
      message: 'EMERGENCY STOP TRIGGERED: All actuators halted'
    });
  }
}
