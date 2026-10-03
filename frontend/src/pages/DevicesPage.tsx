import React, { useState, useEffect } from 'react';
import {
  Radio,
  Wifi,
  RefreshCw,
  QrCode,
  Power,
  Cpu,
  Search,
  CheckCircle2,
  AlertCircle,
  Link,
  Trash2
} from 'lucide-react';
import { DeviceStatus } from '../types';
import { api } from '../services/api';

interface DevicesPageProps {
  devices: DeviceStatus[];
}

export const DevicesPage: React.FC<DevicesPageProps> = ({ devices }) => {
  const [pingResults, setPingResults] = useState<{ [key: string]: number }>({});
  const [qrDevice, setQrDevice] = useState<DeviceStatus | null>(null);

  // Network Scanner state
  const [subnets, setSubnets] = useState<string[]>(['192.168.1']);
  const [selectedSubnet, setSelectedSubnet] = useState<string>('192.168.1');
  const [scanning, setScanning] = useState<boolean>(false);
  const [discovered, setDiscovered] = useState<any[]>([]);
  const [scanMessage, setScanMessage] = useState<string>('');

  // Manual Connect state
  const [manualTarget, setManualTarget] = useState<'ESP1' | 'ESP2'>('ESP1');
  const [manualIp, setManualIp] = useState<string>('192.168.1.150');
  const [connecting, setConnecting] = useState<boolean>(false);
  const [connectResult, setConnectResult] = useState<{ success: boolean; message: string } | null>(null);

  // Database clean state
  const [clearMessage, setClearMessage] = useState<string>('');

  useEffect(() => {
    let isMounted = true;
    const initScanner = async () => {
      let activeSubnet = '192.168.1';
      try {
        const res = await api.getSubnets();
        if (isMounted && res.subnets && res.subnets.length > 0) {
          setSubnets(res.subnets);
          setSelectedSubnet(res.subnets[0]);
          activeSubnet = res.subnets[0];
        }
      } catch {}

      // Auto-scan on launch if any ESP device is currently offline
      const esp1Online = devices.some(d => d.id === 'ESP1' && d.state === 'ONLINE');
      const esp2Online = devices.some(d => d.id === 'ESP2' && d.state === 'ONLINE');
      if (!esp1Online || !esp2Online) {
        runScan(activeSubnet, true);
      }
    };

    initScanner();
    return () => { isMounted = false; };
  }, []);

  const handlePing = async (id: string) => {
    try {
      const res = await api.pingDevice(id);
      setPingResults(prev => ({ ...prev, [id]: res.latencyMs }));
    } catch {
      setPingResults(prev => ({ ...prev, [id]: -1 }));
    }
  };

  const runScan = async (subnetToScan: string, autoPair: boolean = false) => {
    setScanning(true);
    setScanMessage(`Scanning connected network (${subnetToScan}.1 - ${subnetToScan}.254) for ESP32 devices...`);
    setDiscovered([]);
    try {
      const res = await api.scanNetwork(subnetToScan, 254);
      if (res.discovered && res.discovered.length > 0) {
        setDiscovered(res.discovered);
        setScanMessage(`Detected ${res.discovered.length} active device(s) on your Wi-Fi network.`);

        // Auto-Pair detected ESP devices without requiring user to type or click
        if (autoPair) {
          const esp1Node = res.discovered.find((d: any) => d.type === 'ESP1');
          if (esp1Node) {
            await handleConnect('ESP1', esp1Node.ip);
          }
          const esp2Node = res.discovered.find((d: any) => d.type === 'ESP2');
          if (esp2Node) {
            await handleConnect('ESP2', esp2Node.ip);
          }
        }
      } else if (res.warning) {
        setScanMessage(res.warning);
      } else {
        setScanMessage(`Subnet scan complete. No active nodes found on ${subnetToScan}.0/24.`);
      }
    } catch (e: any) {
      if (e.message?.includes('500') || e.message?.includes('Cannot reach') || e.message?.includes('Failed to fetch')) {
        setScanMessage('Local Hub Offline: Start "start-app.bat" on your Windows PC, or enter your ESP IP below.');
      } else {
        setScanMessage('Scan notice: ' + e.message);
      }
    } finally {
      setScanning(false);
    }
  };

  const handleScan = () => {
    runScan(selectedSubnet, true);
  };

  const handleConnect = async (target: 'ESP1' | 'ESP2', ip: string) => {
    setConnecting(true);
    setConnectResult(null);
    try {
      const res = await api.connectNetworkDevice(target, ip);
      setConnectResult({ success: true, message: `Connected & Linked ${target} (${ip})!` });
      localStorage.setItem(`${target.toLowerCase()}_ip`, ip);
      setTimeout(() => setConnectResult(null), 4000);
    } catch (e: any) {
      setConnectResult({ success: false, message: e.message || 'Connection failed' });
    } finally {
      setConnecting(false);
    }
  };

  const handleClearData = async () => {
    if (confirm('Clear all historical database records? This resets telemetry to clean state.')) {
      try {
        const res = await api.clearDatabase();
        setClearMessage(res.message);
        setTimeout(() => setClearMessage(''), 3000);
      } catch (e: any) {
        setClearMessage('Failed: ' + e.message);
      }
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* 1. Header Card with Zero-Config Guidance */}
      <div className="card">
        <div className="card-header" style={{ marginBottom: '0.75rem' }}>
          <div>
            <h2 className="card-title">
              <Radio size={22} color="var(--accent)" />
              <span>Wi-Fi Network Scanner & Auto-Discovery</span>
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
              Zero configuration required — automatically detects ESP32 IPs on your connected network
            </p>
          </div>

          <button className="btn btn-secondary btn-sm" onClick={handleClearData} title="Reset database for clean live data">
            <Trash2 size={14} color="var(--danger)" />
            <span>Reset Database</span>
          </button>
        </div>

        <div style={{
          background: 'var(--accent-light)',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          padding: '0.75rem 1rem',
          fontSize: '0.82rem',
          color: 'var(--text-primary)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.6rem'
        }}>
          <Wifi size={18} color="var(--accent)" style={{ flexShrink: 0 }} />
          <span>
            <strong>No SSID or password required.</strong> Power on your ESP32 devices and connect to your Wi-Fi. The scanner automatically finds their IP addresses on your local subnet.
          </span>
        </div>

        {clearMessage && (
          <div style={{ background: 'var(--success-light)', color: 'var(--success)', padding: '0.6rem 1rem', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 600, marginTop: '0.75rem' }}>
            ✓ {clearMessage}
          </div>
        )}
      </div>

      {/* 2. Network Scanner Tool (Optimized for Mobile) */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">
            <Search size={20} color="var(--accent)" />
            <span>Automatic Wi-Fi Device Discovery</span>
          </div>

          <button
            className="btn btn-primary btn-sm"
            onClick={handleScan}
            disabled={scanning}
            style={{ minHeight: '38px', padding: '0.5rem 1rem' }}
          >
            <RefreshCw size={14} className={scanning ? 'spin' : ''} />
            <span>{scanning ? 'Detecting...' : 'Scan & Auto-Connect'}</span>
          </button>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center', marginBottom: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%', maxWidth: '320px' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, whiteSpace: 'nowrap' }}>Subnet:</span>
            <input
              type="text"
              value={selectedSubnet}
              onChange={e => setSelectedSubnet(e.target.value)}
              placeholder="e.g. 192.168.1"
              style={{ flex: 1, minHeight: '40px' }}
            />
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>.1-.254</span>
          </div>
        </div>

        {scanMessage && (
          <div style={{
            fontSize: '0.85rem',
            padding: '0.75rem 1rem',
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border)',
            borderRadius: '10px',
            color: 'var(--text-primary)',
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            {scanning && <RefreshCw size={14} className="spin" color="var(--accent)" />}
            <span>{scanMessage}</span>
          </div>
        )}

        {/* Discovered Devices List */}
        {discovered.length > 0 && (
          <div style={{ marginTop: '1.25rem' }}>
            <h4 style={{ fontSize: '0.92rem', fontWeight: 600, marginBottom: '0.75rem', color: 'var(--text-secondary)' }}>
              Discovered Network Nodes ({discovered.length}):
            </h4>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {discovered.map((dev, i) => {
                const isEsp1 = dev.type === 'ESP1' || dev.port === 81;
                const isEsp2 = dev.type === 'ESP2';

                return (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '1rem',
                      background: 'var(--bg-secondary)',
                      border: isEsp1 || isEsp2 ? '2px solid var(--accent)' : '1px solid var(--border)',
                      borderRadius: '12px',
                      flexWrap: 'wrap',
                      gap: '0.85rem'
                    }}
                  >
                    <div style={{ flex: '1 1 260px' }}>
                      <div style={{ fontWeight: 700, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <span>{dev.name}</span>
                        <span className="badge badge-online" style={{ fontSize: '0.82rem', padding: '0.2rem 0.55rem' }}>{dev.ip}</span>
                        {isEsp1 && <span className="badge" style={{ background: '#38bdf8', color: '#000', fontWeight: 700 }}>ESP1 CAM</span>}
                        {isEsp2 && <span className="badge" style={{ background: '#34d399', color: '#000', fontWeight: 700 }}>ESP2 SENSORS</span>}
                        {dev.port > 0 && <span className="badge badge-secondary" style={{ fontSize: '0.72rem' }}>Port {dev.port}</span>}
                      </div>

                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.3rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                        {dev.mac && <span>MAC: <code style={{ color: 'var(--accent)' }}>{dev.mac}</code></span>}
                        <span>Latency: {dev.latencyMs}ms</span>
                        {dev.details && <span>• {dev.details}</span>}
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', width: '100%', maxWidth: '360px' }}>
                      <button
                        className={`btn ${isEsp1 ? 'btn-primary' : 'btn-secondary'} btn-sm`}
                        onClick={() => handleConnect('ESP1', dev.ip)}
                        disabled={connecting}
                        style={{ flex: 1, minHeight: '42px', fontWeight: 600 }}
                      >
                        Link ESP1 (Cam)
                      </button>
                      <button
                        className={`btn ${isEsp2 ? 'btn-primary' : 'btn-secondary'} btn-sm`}
                        onClick={() => handleConnect('ESP2', dev.ip)}
                        disabled={connecting}
                        style={{ flex: 1, minHeight: '42px', fontWeight: 600 }}
                      >
                        Link ESP2 (Sensors)
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* 3. Manual IP Connect Form */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">
            <Link size={20} color="var(--accent)" />
            <span>Direct IP Manual Connect</span>
          </div>
        </div>

        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
          Know the IP address of your ESP32? Enter it directly to establish an immediate link.
        </p>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <select
            value={manualTarget}
            onChange={e => setManualTarget(e.target.value as any)}
            style={{ width: '220px' }}
          >
            <option value="ESP1">ESP1 (Camera + Motors)</option>
            <option value="ESP2">ESP2 (Sensors + Pump)</option>
          </select>

          <input
            type="text"
            placeholder="e.g. 192.168.1.150"
            value={manualIp}
            onChange={e => setManualIp(e.target.value)}
            style={{ width: '200px' }}
          />

          <button
            className="btn btn-primary"
            onClick={() => handleConnect(manualTarget, manualIp)}
            disabled={connecting}
          >
            <Link size={16} />
            <span>{connecting ? 'Connecting...' : `Connect ${manualTarget}`}</span>
          </button>
        </div>

        {connectResult && (
          <div style={{
            marginTop: '1rem',
            padding: '0.75rem',
            borderRadius: '8px',
            fontSize: '0.85rem',
            fontWeight: 600,
            background: connectResult.success ? 'var(--success-light)' : 'var(--danger-light)',
            color: connectResult.success ? 'var(--success)' : 'var(--danger)'
          }}>
            {connectResult.success ? '✓ ' : '✕ '} {connectResult.message}
          </div>
        )}
      </div>

      {/* 4. Active Connected Devices Grid */}
      <div className="grid-2">
        {devices.map(device => {
          const isOnline = device.state === 'ONLINE';
          const ping = pingResults[device.id];

          return (
            <div key={device.id} className="card">
              <div className="card-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <Cpu size={22} color="var(--accent)" />
                  <div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>{device.name}</h3>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Identifier: {device.id}</div>
                  </div>
                </div>

                <span className={`badge ${isOnline ? 'badge-online' : 'badge-offline'}`}>
                  {device.state}
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', margin: '1rem 0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>IP Address:</span>
                  <span style={{ fontWeight: 600 }}>
                    <a href={`http://${device.ip}/`} target="_blank" rel="noreferrer" style={{ color: 'var(--accent)', textDecoration: 'none' }}>
                      {device.ip} ↗
                    </a>
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Wi-Fi RSSI Signal:</span>
                  <span style={{ fontWeight: 600 }}>{device.rssi} dBm</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Firmware:</span>
                  <span style={{ fontWeight: 600 }}>v{device.firmware}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Node Uptime:</span>
                  <span style={{ fontWeight: 600 }}>{Math.floor(device.uptimeSeconds / 60)} mins</span>
                </div>

                {ping !== undefined && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: ping >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                    <span>Ping Response:</span>
                    <span style={{ fontWeight: 700 }}>{ping >= 0 ? `${ping} ms` : 'Host Unreachable'}</span>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', borderTop: '1px solid var(--border)', paddingTop: '1rem', flexWrap: 'wrap' }}>
                <button className="btn btn-secondary btn-sm" onClick={() => handlePing(device.id)}>
                  <RefreshCw size={14} />
                  <span>Ping</span>
                </button>

                <button className="btn btn-secondary btn-sm" onClick={() => setQrDevice(device)}>
                  <QrCode size={14} />
                  <span>QR Pair</span>
                </button>

                <a href={`http://${device.ip}/`} target="_blank" rel="noreferrer" className="btn btn-primary btn-sm">
                  <span>Hardware Debug UI ↗</span>
                </a>
              </div>
            </div>
          );
        })}
      </div>

      {/* QR Pairing Modal */}
      {qrDevice && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.55)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100
        }}>
          <div className="card" style={{ maxWidth: '420px', width: '90%', textAlign: 'center' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '0.5rem' }}>
              QR Device Pairing: {qrDevice.name}
            </h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
              Scan with your mobile phone camera to open this device directly in mobile Safari or Chrome.
            </p>

            <div style={{ background: '#ffffff', padding: '1.5rem', borderRadius: '12px', display: 'inline-block', border: '1px solid var(--border)' }}>
              <svg width="180" height="180" viewBox="0 0 100 100">
                <rect width="100" height="100" fill="#ffffff" />
                <path d="M10,10 h30 v30 h-30 z M15,15 v20 h20 v-20 z M20,20 h10 v10 h-10 z" fill="#000000" />
                <path d="M60,10 h30 v30 h-30 z M65,15 v20 h20 v-20 z M70,20 h10 v10 h-10 z" fill="#000000" />
                <path d="M10,60 h30 v30 h-30 z M15,65 v20 h20 v-20 z M20,70 h10 v10 h-10 z" fill="#000000" />
                <path d="M50,15 h5 v10 h-5 z M45,35 h15 v5 h-15 z M50,50 h10 v10 h-10 z M65,55 h10 v10 h-10 z M80,60 h10 v15 h-10 z M45,75 h20 v5 h-20 z M75,80 h15 v10 h-15 z" fill="#000000" />
              </svg>
            </div>

            <div style={{ marginTop: '1rem', fontSize: '0.85rem', fontWeight: 600 }}>
              URL: http://{qrDevice.ip}/
            </div>

            <div style={{ marginTop: '1.5rem' }}>
              <button className="btn btn-secondary" onClick={() => setQrDevice(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
