import http from 'http';
import https from 'https';
import { DeviceManager } from './deviceManager';
import { SensorReading, MotorDirection } from '../types';

export class SupabaseBridge {
  private static url: string = process.env.SUPABASE_URL || '';
  private static key: string = process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY || '';
  private static active: boolean = false;

  public static init(): void {
    if (this.url && this.key) {
      this.active = true;
      console.log('[SUPABASE_BRIDGE] Cloud sync initialized. Bridging local ESPs to Supabase Cloud.');

      // Poll for cloud commands every 1.0 seconds
      setInterval(async () => {
        await this.pollPendingCommands();
      }, 1000);

      // Listen for local telemetry updates to push to cloud
      DeviceManager.onUpdate(async ({ telemetry }) => {
        if (telemetry) {
          await this.pushTelemetry(telemetry);
        }
      });
    }
  }

  public static isActive(): boolean {
    return this.active;
  }

  private static async pushTelemetry(r: SensorReading): Promise<void> {
    if (!this.active) return;

    try {
      const payload = {
        temperature: r.temperature,
        humidity: r.humidity,
        dht_valid: r.dhtValid,
        mq132_raw: r.mq132Raw,
        mq132_index: r.mq132Index,
        mq5_raw: r.mq5Raw,
        mq5_index: r.mq5Index,
        soil_raw: r.soilRaw,
        soil_percent: r.soilPercent,
        soil_state: r.soilState,
        servo_angle: r.servoAngle,
        pump_active: r.pumpActive,
        pump_elapsed_ms: r.pumpElapsedMs,
        is_simulated: r.isSimulated
      };

      await this.httpPost(`${this.url}/rest/v1/telemetry`, payload);
    } catch (err) {
      // Quiet fail if network temporarily drops
    }
  }

  private static async pollPendingCommands(): Promise<void> {
    if (!this.active) return;

    try {
      const endpoint = `${this.url}/rest/v1/commands?executed=eq.false&order=created_at.asc&limit=5`;
      const res = await this.httpGet(endpoint);
      const commands = JSON.parse(res);

      for (const cmd of commands) {
        console.log(`[SUPABASE_BRIDGE] Executing cloud command from mobile: ${cmd.action}`);

        if (cmd.action === 'robot_move' && cmd.payload?.direction) {
          await DeviceManager.sendMotorCommand(cmd.payload.direction as MotorDirection, cmd.payload.speed || 190);
        } else if (cmd.action === 'deploy_soil') {
          await DeviceManager.triggerSoilDeployment();
        } else if (cmd.action === 'retract_soil') {
          await DeviceManager.retractSoilArm();
        } else if (cmd.action === 'pump_on') {
          await DeviceManager.setPump(true, cmd.payload?.durationMs || 4000, 'cloud_mobile');
        } else if (cmd.action === 'pump_off') {
          await DeviceManager.setPump(false, 0, 'cloud_mobile');
        }

        // Mark as executed in Supabase
        await this.httpPatch(`${this.url}/rest/v1/commands?id=eq.${cmd.id}`, {
          executed: true,
          executed_at: new Date().toISOString()
        });
      }
    } catch {}
  }

  // HTTP Helpers
  private static httpPost(url: string, data: any): Promise<string> {
    return this.sendRequest('POST', url, data);
  }

  private static httpPatch(url: string, data: any): Promise<string> {
    return this.sendRequest('PATCH', url, data);
  }

  private static httpGet(url: string): Promise<string> {
    return this.sendRequest('GET', url);
  }

  private static sendRequest(method: string, urlStr: string, body?: any): Promise<string> {
    return new Promise((resolve, reject) => {
      const u = new URL(urlStr);
      const isHttps = u.protocol === 'https:';
      const client = isHttps ? https : http;

      const headers: any = {
        'apikey': this.key,
        'Authorization': `Bearer ${this.key}`,
        'Content-Type': 'application/json'
      };

      if (method === 'POST') {
        headers['Prefer'] = 'return=minimal';
      }

      const req = client.request({
        hostname: u.hostname,
        port: u.port || (isHttps ? 443 : 80),
        path: u.pathname + u.search,
        method,
        headers,
        timeout: 2500
      }, (res) => {
        let raw = '';
        res.on('data', chunk => raw += chunk);
        res.on('end', () => resolve(raw));
      });

      req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
      req.on('error', reject);

      if (body) {
        req.write(JSON.stringify(body));
      }
      req.end();
    });
  }
}
