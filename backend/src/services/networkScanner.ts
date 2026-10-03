import http from 'http';
import net from 'net';
import os from 'os';
import { execSync } from 'child_process';
import { DeviceManager } from './deviceManager';
import { Repository } from '../database/repository';
import { CONFIG } from '../config';

export interface DiscoveredDevice {
  ip: string;
  name: string;
  type: 'ESP1' | 'ESP2' | 'UNKNOWN';
  port: number;
  latencyMs: number;
  firmware?: string;
  details?: string;
  mac?: string;
}

export class NetworkScanner {
  /**
   * Get all active IPv4 local subnets, prioritizing physical Wi-Fi and Ethernet adapters
   */
  public static getLocalSubnets(): string[] {
    const interfaces = os.networkInterfaces();
    const primarySubnets: string[] = [];
    const virtualSubnets: string[] = [];

    for (const name of Object.keys(interfaces)) {
      const lower = name.toLowerCase();
      const isVirtual = lower.includes('vethernet') || lower.includes('virtual') || lower.includes('loopback') || lower.includes('wsl');

      for (const iface of interfaces[name] || []) {
        if (iface.family === 'IPv4' && !iface.internal) {
          const parts = iface.address.split('.');
          if (parts.length === 4) {
            const subnet = `${parts[0]}.${parts[1]}.${parts[2]}`;
            if (!isVirtual) {
              primarySubnets.push(subnet);
            } else {
              virtualSubnets.push(subnet);
            }
          }
        }
      }
    }

    // Combine primary physical adapters first, then virtual adapters
    const all = [...primarySubnets, ...virtualSubnets];
    return Array.from(new Set(all));
  }

  /**
   * Query Windows/OS ARP cache for dynamic active IP addresses on the selected subnet
   */
  public static getArpDevices(subnetBase: string): Map<string, string> {
    const map = new Map<string, string>();
    try {
      const output = execSync('arp -a', { timeout: 2000, stdio: ['pipe', 'pipe', 'ignore'] }).toString();
      const lines = output.split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        const match = trimmed.match(/^([0-9]+\.[0-9]+\.[0-9]+\.[0-9]+)\s+([a-f0-9-]+)\s+dynamic/i);
        if (match) {
          const ip = match[1];
          const mac = match[2];
          if (ip.startsWith(`${subnetBase}.`)) {
            map.set(ip, mac);
          }
        }
      }
    } catch {
      // ARP query optional fallback
    }
    return map;
  }

  /**
   * Fast TCP port check using net.Socket
   */
  public static checkPort(ip: string, port: number, timeoutMs: number = 350): Promise<boolean> {
    return new Promise(resolve => {
      try {
        const socket = new net.Socket();
        socket.setTimeout(timeoutMs);
        socket.once('connect', () => {
          socket.destroy();
          resolve(true);
        });
        socket.once('error', () => {
          socket.destroy();
          resolve(false);
        });
        socket.once('timeout', () => {
          socket.destroy();
          resolve(false);
        });
        socket.connect(port, ip);
      } catch {
        resolve(false);
      }
    });
  }

  /**
   * HTTP probe for ESP identity and active web service discovery
   */
  public static probeHttp(ip: string, port: number = 80, path: string = '/', timeoutMs: number = 800): Promise<{ ok: boolean; status?: number; data?: any; raw?: string; latencyMs: number }> {
    const start = Date.now();
    return new Promise(resolve => {
      try {
        const req = http.get({ hostname: ip, port, path, timeout: timeoutMs }, (res) => {
          let raw = '';
          res.on('data', chunk => raw += chunk);
          res.on('end', () => {
            const latencyMs = Date.now() - start;
            try {
              const data = JSON.parse(raw);
              resolve({ ok: true, status: res.statusCode, data, raw, latencyMs });
            } catch {
              resolve({ ok: true, status: res.statusCode, raw, latencyMs });
            }
          });
          res.on('error', () => resolve({ ok: false, latencyMs: Date.now() - start }));
        });

        req.on('timeout', () => { req.destroy(); resolve({ ok: false, latencyMs: Date.now() - start }); });
        req.on('error', () => { resolve({ ok: false, latencyMs: Date.now() - start }); });
      } catch {
        resolve({ ok: false, latencyMs: Date.now() - start });
      }
    });
  }

  /**
   * Deep probe a single IP to identify ESP hardware, web server, or active Wi-Fi node
   */
  public static async probeIp(ip: string, timeoutMs: number = 900, knownMac?: string): Promise<DiscoveredDevice | null> {
    const hasPort80 = await this.checkPort(ip, 80, Math.min(timeoutMs, 400));
    const hasPort81 = !hasPort80 ? await this.checkPort(ip, 81, Math.min(timeoutMs, 400)) : false;

    // 1. If port 80 is open, check HTTP endpoints
    if (hasPort80) {
      // Check /api/status first
      const statusRes = await this.probeHttp(ip, 80, '/api/status', timeoutMs);
      if (statusRes.ok && statusRes.data) {
        const d = statusRes.data;
        let type: 'ESP1' | 'ESP2' | 'UNKNOWN' = 'UNKNOWN';
        let name = d.device || 'ESP32 Device';

        if (d.device?.includes('ESP1') || d.camera_online !== undefined || d.motor_direction !== undefined) {
          type = 'ESP1';
          name = 'ESP1-Camera-Motor';
        } else if (d.device?.includes('ESP2') || d.soil_raw !== undefined || d.servo_angle !== undefined) {
          type = 'ESP2';
          name = 'ESP2-Sensor-Controller';
        }

        return {
          ip,
          name,
          type,
          port: 80,
          latencyMs: statusRes.latencyMs,
          firmware: d.firmware || '1.2.0',
          mac: knownMac,
          details: `Heap: ${Math.round((d.free_heap || 0) / 1024)}KB, RSSI: ${d.rssi || 0}dBm`
        };
      }

      // Check /api/sensors (ESP2 primary endpoint)
      const sensorsRes = await this.probeHttp(ip, 80, '/api/sensors', timeoutMs);
      if (sensorsRes.ok && sensorsRes.data) {
        const d = sensorsRes.data;
        return {
          ip,
          name: 'ESP2-Sensor-Controller',
          type: 'ESP2',
          port: 80,
          latencyMs: sensorsRes.latencyMs,
          firmware: d.firmware || '1.2.0',
          mac: knownMac,
          details: `DHT22, Soil, MQ Sensors (Heap: ${Math.round((d.free_heap || 0) / 1024)}KB)`
        };
      }

      // Check root / for HTML title
      const rootRes = await this.probeHttp(ip, 80, '/', timeoutMs);
      if (rootRes.ok && rootRes.raw) {
        const raw = rootRes.raw;
        let type: 'ESP1' | 'ESP2' | 'UNKNOWN' = 'UNKNOWN';
        let name = 'Active Web Device';

        if (raw.includes('ESP1') || raw.includes('Camera & Motor')) {
          type = 'ESP1';
          name = 'ESP1-Camera-Motor';
        } else if (raw.includes('ESP2') || raw.includes('Sensor & Actuator')) {
          type = 'ESP2';
          name = 'ESP2-Sensor-Controller';
        } else {
          const titleMatch = raw.match(/<title[^>]*>([^<]+)<\/title>/i);
          name = titleMatch ? titleMatch[1].trim() : (ip === '192.168.1.1' ? 'Wi-Fi Gateway / Router' : 'Web Server (Port 80)');
        }

        return {
          ip,
          name,
          type,
          port: 80,
          latencyMs: rootRes.latencyMs,
          mac: knownMac,
          details: `HTTP Port 80 Open`
        };
      }
    }

    // 2. If port 81 is open (ESP32-CAM MJPEG stream)
    if (hasPort81) {
      return {
        ip,
        name: 'ESP1-Camera-Stream (Port 81)',
        type: 'ESP1',
        port: 81,
        latencyMs: 15,
        mac: knownMac,
        details: 'ESP32-CAM MJPEG Video Stream Port Open'
      };
    }

    // 3. If present in ARP table (active host on Wi-Fi without open HTTP port)
    if (knownMac) {
      return {
        ip,
        name: ip.endsWith('.1') ? 'Wi-Fi Router / Gateway' : `Active Wi-Fi Device (${knownMac.slice(0, 8)})`,
        type: 'UNKNOWN',
        port: 0,
        latencyMs: 5,
        mac: knownMac,
        details: `Active LAN host (MAC: ${knownMac})`
      };
    }

    return null;
  }

  /**
   * Scan entire subnet for all active devices (ESP nodes and all active Wi-Fi hosts)
   */
  public static async scanSubnet(subnetBase?: string, maxHosts: number = 254): Promise<DiscoveredDevice[]> {
    try {
      let base = (subnetBase || '').trim().replace(/\.+$/, '');
      if (!base) {
        const subnets = this.getLocalSubnets();
        base = subnets.length > 0 ? subnets[0] : '192.168.1';
      }

      console.log(`[SCANNER] Scanning subnet ${base}.1 to ${base}.${maxHosts}...`);

      // 1. Get known active dynamic devices from ARP
      const arpDevices = this.getArpDevices(base);

      // 2. Scan all hosts in fast batches
      const batchSize = 35;
      const discovered: DiscoveredDevice[] = [];
      const discoveredIps = new Set<string>();

      for (let i = 1; i <= maxHosts; i += batchSize) {
        const end = Math.min(i + batchSize, maxHosts + 1);
        const promises: Promise<DiscoveredDevice | null>[] = [];

        for (let j = i; j < end; j++) {
          const ip = `${base}.${j}`;
          const mac = arpDevices.get(ip);
          promises.push(this.probeIp(ip, 700, mac));
        }

        const results = await Promise.all(promises);
        for (const dev of results) {
          if (dev && !discoveredIps.has(dev.ip)) {
            discoveredIps.add(dev.ip);
            discovered.push(dev);
            console.log(`[SCANNER] Found: ${dev.name} at ${dev.ip} (${dev.type})`);
          }
        }
      }

      // 3. Add any remaining ARP devices that were not scanned (or outside maxHosts)
      for (const [arpIp, mac] of arpDevices.entries()) {
        if (!discoveredIps.has(arpIp)) {
          discoveredIps.add(arpIp);
          discovered.push({
            ip: arpIp,
            name: arpIp.endsWith('.1') ? 'Wi-Fi Router / Gateway' : `Active Wi-Fi Device (${mac.slice(0, 8)})`,
            type: 'UNKNOWN',
            port: 0,
            latencyMs: 5,
            mac,
            details: `Active LAN host (MAC: ${mac})`
          });
        }
      }

      // Sort: ESP devices first, then port 80/81 devices, then other hosts
      discovered.sort((a, b) => {
        if (a.type !== 'UNKNOWN' && b.type === 'UNKNOWN') return -1;
        if (a.type === 'UNKNOWN' && b.type !== 'UNKNOWN') return 1;
        if (a.port > 0 && b.port === 0) return -1;
        if (a.port === 0 && b.port > 0) return 1;
        return a.ip.localeCompare(b.ip, undefined, { numeric: true });
      });

      return discovered;
    } catch (err: any) {
      console.error('[SCANNER] Fatal scanSubnet error:', err);
      return [];
    }
  }

  /**
   * Connect an identified or selected IP to ESP1 or ESP2
   */
  public static async connectDevice(target: 'ESP1' | 'ESP2', ip: string): Promise<{ success: boolean; message: string; device?: DiscoveredDevice }> {
    console.log(`[SCANNER] Connecting ${target} to IP: ${ip}...`);

    const probe = await this.probeIp(ip, 1200);

    if (target === 'ESP1') {
      CONFIG.ESP1_IP = ip;
      CONFIG.SIMULATION_MODE = false;
      DeviceManager.updateEspIp('ESP1', ip);
    } else {
      CONFIG.ESP2_IP = ip;
      CONFIG.SIMULATION_MODE = false;
      DeviceManager.updateEspIp('ESP2', ip);
    }

    Repository.insertEvent({
      timestamp: Date.now(),
      device: target,
      severity: 'info',
      message: `Connected ${target} to IP ${ip} (${probe?.type === target ? 'Verified ESP' : 'Active IP'})`
    });

    return {
      success: true,
      message: `Successfully connected ${target} to ${ip}`,
      device: probe || { ip, name: target, type: target, port: 80, latencyMs: 0 }
    };
  }
}
