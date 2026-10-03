import { dbManager } from './db';
import {
  SensorReading,
  DeviceStatus,
  SystemEvent,
  AutomationRule,
  MLPrediction
} from '../types';

export class Repository {
  // Sensor Readings
  public static insertSensorReading(r: SensorReading): void {
    const sql = `
      INSERT INTO sensor_readings (
        timestamp, temperature, humidity, dht_valid,
        mq132_raw, mq132_index, mq132_warmed_up,
        mq5_raw, mq5_index, mq5_warmed_up,
        soil_raw, soil_percent, soil_state, soil_active,
        sequence_state, servo_angle, pump_active, pump_elapsed_ms, is_simulated
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    dbManager.run(sql, [
      r.timestamp,
      r.temperature,
      r.humidity,
      r.dhtValid ? 1 : 0,
      r.mq132Raw,
      r.mq132Index,
      r.mq132WarmedUp ? 1 : 0,
      r.mq5Raw,
      r.mq5Index,
      r.mq5WarmedUp ? 1 : 0,
      r.soilRaw,
      r.soilPercent,
      r.soilState,
      r.soilActive ? 1 : 0,
      r.sequenceState,
      r.servoAngle,
      r.pumpActive ? 1 : 0,
      r.pumpElapsedMs,
      r.isSimulated ? 1 : 0
    ]);
  }

  public static getRecentReadings(limit: number = 60): SensorReading[] {
    const sql = `
      SELECT
        id, timestamp, temperature, humidity,
        dht_valid AS dhtValid,
        mq132_raw AS mq132Raw, mq132_index AS mq132Index, mq132_warmed_up AS mq132WarmedUp,
        mq5_raw AS mq5Raw, mq5_index AS mq5Index, mq5_warmed_up AS mq5WarmedUp,
        soil_raw AS soilRaw, soil_percent AS soilPercent, soil_state AS soilState, soil_active AS soilActive,
        sequence_state AS sequenceState, servo_angle AS servoAngle,
        pump_active AS pumpActive, pump_elapsed_ms AS pumpElapsedMs,
        is_simulated AS isSimulated
      FROM sensor_readings
      ORDER BY timestamp DESC
      LIMIT ?
    `;
    const rows = dbManager.query(sql, [limit]);
    return rows.reverse().map(r => ({
      ...r,
      dhtValid: Boolean(r.dhtValid),
      mq132WarmedUp: Boolean(r.mq132WarmedUp),
      mq5WarmedUp: Boolean(r.mq5WarmedUp),
      soilActive: Boolean(r.soilActive),
      pumpActive: Boolean(r.pumpActive),
      isSimulated: Boolean(r.isSimulated)
    }));
  }

  public static getReadingsInRange(startTime: number, endTime: number): SensorReading[] {
    const sql = `
      SELECT
        id, timestamp, temperature, humidity,
        dht_valid AS dhtValid,
        mq132_raw AS mq132Raw, mq132_index AS mq132Index, mq132_warmed_up AS mq132WarmedUp,
        mq5_raw AS mq5Raw, mq5_index AS mq5Index, mq5_warmed_up AS mq5WarmedUp,
        soil_raw AS soilRaw, soil_percent AS soilPercent, soil_state AS soilState, soil_active AS soilActive,
        sequence_state AS sequenceState, servo_angle AS servoAngle,
        pump_active AS pumpActive, pump_elapsed_ms AS pumpElapsedMs,
        is_simulated AS isSimulated
      FROM sensor_readings
      WHERE timestamp BETWEEN ? AND ?
      ORDER BY timestamp ASC
    `;
    const rows = dbManager.query(sql, [startTime, endTime]);
    return rows.map(r => ({
      ...r,
      dhtValid: Boolean(r.dhtValid),
      mq132WarmedUp: Boolean(r.mq132WarmedUp),
      mq5WarmedUp: Boolean(r.mq5WarmedUp),
      soilActive: Boolean(r.soilActive),
      pumpActive: Boolean(r.pumpActive),
      isSimulated: Boolean(r.isSimulated)
    }));
  }

  public static getTotalReadingsCount(): number {
    const row = dbManager.queryOne<{ count: number }>('SELECT COUNT(*) as count FROM sensor_readings');
    return row ? row.count : 0;
  }

  // Devices
  public static upsertDevice(d: DeviceStatus): void {
    const sql = `
      INSERT INTO devices (id, name, state, ip, rssi, uptime_seconds, free_heap, firmware, last_seen, latency_ms)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        state = excluded.state,
        ip = excluded.ip,
        rssi = excluded.rssi,
        uptime_seconds = excluded.uptime_seconds,
        free_heap = excluded.free_heap,
        firmware = excluded.firmware,
        last_seen = excluded.last_seen,
        latency_ms = excluded.latency_ms
    `;
    dbManager.run(sql, [
      d.id, d.name, d.state, d.ip, d.rssi, d.uptimeSeconds, d.freeHeap, d.firmware, d.lastSeen, d.latencyMs
    ]);
  }

  public static getDevices(): DeviceStatus[] {
    const sql = `SELECT id, name, state, ip, rssi, uptime_seconds as uptimeSeconds, free_heap as freeHeap, firmware, last_seen as lastSeen, latency_ms as latencyMs FROM devices`;
    return dbManager.query<DeviceStatus>(sql);
  }

  // System Events
  public static insertEvent(e: Omit<SystemEvent, 'id'>): void {
    const sql = `INSERT INTO system_events (timestamp, device, severity, message, metadata) VALUES (?, ?, ?, ?, ?)`;
    dbManager.run(sql, [e.timestamp, e.device, e.severity, e.message, e.metadata || '']);
  }

  public static getEvents(limit: number = 100): SystemEvent[] {
    const sql = `SELECT id, timestamp, device, severity, message, metadata FROM system_events ORDER BY timestamp DESC LIMIT ?`;
    return dbManager.query<SystemEvent>(sql, [limit]);
  }

  public static clearEvents(): void {
    dbManager.run('DELETE FROM system_events');
  }

  // Actuator Events
  public static logPumpEvent(action: string, durationMs: number, source: string = 'manual'): void {
    const sql = `INSERT INTO pump_events (timestamp, action, duration_ms, source) VALUES (?, ?, ?, ?)`;
    dbManager.run(sql, [Date.now(), action, durationMs, source]);
  }

  public static logMotorEvent(direction: string, speed: number, source: string = 'web'): void {
    const sql = `INSERT INTO motor_events (timestamp, direction, speed, source) VALUES (?, ?, ?, ?)`;
    dbManager.run(sql, [Date.now(), direction, speed, source]);
  }

  // Automation Rules
  public static getAutomationRules(): AutomationRule[] {
    const sql = `
      SELECT
        id, name, enabled, condition_type as conditionType, threshold,
        action_type as actionType, duration_seconds as durationSeconds,
        cooldown_seconds as cooldownSeconds, last_triggered as lastTriggered,
        created_at as createdAt
      FROM automation_rules
    `;
    const rows = dbManager.query(sql);
    return rows.map(r => ({
      ...r,
      enabled: Boolean(r.enabled)
    }));
  }

  public static saveAutomationRule(rule: AutomationRule): void {
    const sql = `
      INSERT INTO automation_rules (id, name, enabled, condition_type, threshold, action_type, duration_seconds, cooldown_seconds, last_triggered, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        enabled = excluded.enabled,
        condition_type = excluded.condition_type,
        threshold = excluded.threshold,
        action_type = excluded.action_type,
        duration_seconds = excluded.duration_seconds,
        cooldown_seconds = excluded.cooldown_seconds,
        last_triggered = excluded.last_triggered
    `;
    dbManager.run(sql, [
      rule.id, rule.name, rule.enabled ? 1 : 0, rule.conditionType, rule.threshold,
      rule.actionType, rule.durationSeconds, rule.cooldownSeconds, rule.lastTriggered || null, rule.createdAt
    ]);
  }

  public static deleteAutomationRule(id: string): void {
    dbManager.run('DELETE FROM automation_rules WHERE id = ?', [id]);
  }

  // ML Predictions
  public static insertPrediction(p: MLPrediction): void {
    const sql = `
      INSERT INTO ml_predictions (timestamp, target, horizon_minutes, predicted_value, confidence_lower, confidence_upper, confidence_level)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    dbManager.run(sql, [
      p.timestamp, p.target, p.horizonMinutes, p.predictedValue, p.confidenceLower, p.confidenceUpper, p.confidenceLevel
    ]);
  }

  public static getRecentPredictions(target: string, limit: number = 20): MLPrediction[] {
    const sql = `
      SELECT id, timestamp, target, horizon_minutes as horizonMinutes, predicted_value as predictedValue,
             confidence_lower as confidenceLower, confidence_upper as confidenceUpper, confidence_level as confidenceLevel
      FROM ml_predictions
      WHERE target = ?
      ORDER BY timestamp DESC
      LIMIT ?
    `;
    return dbManager.query<MLPrediction>(sql, [target, limit]);
  }

  public static clearAllSensorData(): void {
    dbManager.run('DELETE FROM sensor_readings');
    dbManager.run('DELETE FROM ml_predictions');
    dbManager.run('DELETE FROM motor_events');
    dbManager.run('DELETE FROM pump_events');
    dbManager.run('DELETE FROM servo_events');
    dbManager.run('DELETE FROM moisture_events');
    dbManager.persist();
  }
}
