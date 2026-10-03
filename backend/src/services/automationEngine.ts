import { SensorReading, AutomationRule } from '../types';
import { Repository } from '../database/repository';
import { DeviceManager } from './deviceManager';
import { SafetyWatchdog } from './safetyWatchdog';

export class AutomationEngine {
  private static defaultRules: AutomationRule[] = [
    {
      id: 'rule-auto-water',
      name: 'Auto Irrigation on Dry Soil',
      enabled: true,
      conditionType: 'soil_moisture_below',
      threshold: 30, // 30% moisture
      actionType: 'deploy_and_water',
      durationSeconds: 4,
      cooldownSeconds: 300, // 5 min cooldown
      createdAt: Date.now()
    },
    {
      id: 'rule-high-temp',
      name: 'Extreme Temperature Warning',
      enabled: true,
      conditionType: 'temp_above',
      threshold: 35.0, // 35 deg C
      actionType: 'trigger_alert',
      durationSeconds: 0,
      cooldownSeconds: 600,
      createdAt: Date.now()
    },
    {
      id: 'rule-air-warning',
      name: 'Hazardous Air Quality Warning',
      enabled: true,
      conditionType: 'mq132_above',
      threshold: 50.0, // index above 50
      actionType: 'trigger_alert',
      durationSeconds: 0,
      cooldownSeconds: 300,
      createdAt: Date.now()
    }
  ];

  public static async init(): Promise<void> {
    const existing = Repository.getAutomationRules();
    if (existing.length === 0) {
      for (const rule of this.defaultRules) {
        Repository.saveAutomationRule(rule);
      }
      console.log('[AUTOMATION] Seeded default safety automation rules');
    }
  }

  public static async evaluate(telemetry: SensorReading): Promise<void> {
    const rules = Repository.getAutomationRules().filter(r => r.enabled);
    const now = Date.now();

    for (const rule of rules) {
      // Check cooldown
      const cooldownMs = rule.cooldownSeconds * 1000;
      if (rule.lastTriggered && (now - rule.lastTriggered) < cooldownMs) {
        continue;
      }

      let conditionMet = false;
      let reason = '';

      switch (rule.conditionType) {
        case 'soil_moisture_below':
          if (telemetry.soilPercent > 0 && telemetry.soilPercent < rule.threshold) {
            conditionMet = true;
            reason = `Soil moisture (${telemetry.soilPercent}%) dropped below threshold (${rule.threshold}%)`;
          }
          break;

        case 'temp_above':
          if (telemetry.dhtValid && telemetry.temperature > rule.threshold) {
            conditionMet = true;
            reason = `Temperature (${telemetry.temperature}°C) exceeded threshold (${rule.threshold}°C)`;
          }
          break;

        case 'humidity_below':
          if (telemetry.dhtValid && telemetry.humidity < rule.threshold) {
            conditionMet = true;
            reason = `Humidity (${telemetry.humidity}%) dropped below threshold (${rule.threshold}%)`;
          }
          break;

        case 'mq132_above':
          if (telemetry.mq132Index > rule.threshold) {
            conditionMet = true;
            reason = `Air quality index (${telemetry.mq132Index}) exceeded threshold (${rule.threshold})`;
          }
          break;

        case 'mq5_above':
          if (telemetry.mq5Index > rule.threshold) {
            conditionMet = true;
            reason = `Combustible gas index (${telemetry.mq5Index}) exceeded threshold (${rule.threshold})`;
          }
          break;
      }

      if (conditionMet) {
        await this.executeAction(rule, reason);
      }
    }
  }

  private static async executeAction(rule: AutomationRule, reason: string): Promise<void> {
    const now = Date.now();
    rule.lastTriggered = now;
    Repository.saveAutomationRule(rule);

    Repository.insertEvent({
      timestamp: now,
      device: 'AUTOMATION',
      severity: rule.actionType === 'trigger_alert' ? 'warning' : 'info',
      message: `Rule "${rule.name}" triggered: ${reason}`
    });

    if (rule.actionType === 'deploy_and_water') {
      // Safe check through SafetyWatchdog
      const safetyCheck = SafetyWatchdog.canActivatePump();
      if (!safetyCheck.allowed) {
        Repository.insertEvent({
          timestamp: now,
          device: 'AUTOMATION',
          severity: 'warning',
          message: `Auto-watering skipped for "${rule.name}": ${safetyCheck.reason}`
        });
        return;
      }

      // 1. Deploy sensor & measure
      await DeviceManager.triggerSoilDeployment();

      // 2. Pulse pump with safety duration
      setTimeout(async () => {
        await DeviceManager.setPump(true, rule.durationSeconds * 1000, 'automation');
      }, 2500);
    } else if (rule.actionType === 'retract_soil') {
      await DeviceManager.retractSoilArm();
    }
  }
}
