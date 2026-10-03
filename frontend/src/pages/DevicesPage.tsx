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
  Link as LinkIcon,
  Trash2,
  Camera,
  Thermometer,
  Gamepad2,
  ExternalLink,
  ArrowRight,
  ShieldCheck,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { DeviceStatus } from '../types';
import { api } from '../services/api';

interface DevicesPageProps {
  devices: DeviceStatus[];
  onNavigate?: (tab: any) => void;
}

export const DevicesPage: React.FC<DevicesPageProps> = ({ devices, onNavigate }) => {
  const [pingResults, setPingResults] = useState<{ [key: string]: number }>({});
  const [qrDevice, setQrDevice] = useState<DeviceStatus | null>(null);

  // Network Scanner state
  const [subnets, setSubnets] = useState<string[]>(['192.168.1']);
  const [selectedSubnet, setSelectedSubnet] = useState<string>('192.168.1');
  const [scanning, setScanning] = useState<boolean>(false);
  const [discovered, setDiscovered] = useState<any[]>([]);
  const [scanMessage, setScanMessage] = useState<string>('');
  const [autoPaired, setAutoPaired] = useState<{ esp1?: string; esp2?: string }>({});

  // Manual Direct Connect state
  const [showManual, setShowManual] = useState<boolean>(false);
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

      // Auto-scan connected network on launch if any ESP device is currently offline
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

  const runScan = async (subnetToScan: string, autoPair: boolean = true) => {
    setScanning(true);
    setScanMessage(`Scanning connected network (${subnetToScan}.1 to ${subnetToScan}.254) for ESP32 devices...`);
    setDiscovered([]);
    try {
      const res = await api.scanNetwork(subnetToScan, 254);
      if (res.discovered && res.discovered.length > 0) {
        setDiscovered(res.discovered);
        setScanMessage(`Found ${res.discovered.length} active device(s) on your connected network.`);

        // Auto-Link detected ESP devices without requiring user interaction
        if (autoPair) {
          const esp1Node = res.discovered.find((d: any) => d.type === 'ESP1' || d.port === 81);
          if (esp1Node) {
            await handleConnect('ESP1', esp1Node.ip);
            setAutoPaired(prev => ({ ...prev, esp1: esp1Node.ip }));
          }
          const esp2Node = res.discovered.find((d: any) => d.type === 'ESP2');
          if (esp2Node) {
            await handleConnect('ESP2', esp2Node.ip);
            setAutoPaired(prev => ({ ...prev, esp2: esp2Node.ip }));
          }
        }
      } else if (res.warning) {
        setScanMessage(res.warning);
      } else {
        setScanMessage(`Scan complete. No active ESP32 nodes found on ${subnetToScan}.x.`);
      }
    } catch (e: any) {
      if (e.message?.includes('500') || e.message?.includes('Cannot reach') || e.message?.includes('Failed to fetch')) {
        setScanMessage('Local Hub Offline: To scan your Wi-Fi directly, run "start-app.bat" on your PC or enter your ESP IP below.');
      } else {
        setScanMessage('Notice: ' + e.message);
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

  const detectedEsp1 = discovered.find(d => d.type === 'ESP1' || d.port === 81);
  const detectedEsp2 = discovered.find(d => d.type === 'ESP2');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* 1. Header & One-Touch Connected Network Scanner */}
      <div className="card">
        <div className="card-header" style={{ marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <h2 className="card-title">
              <Wifi size={22} color="var(--accent)" />
              <span>Connected Network Scanner</span>
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
              Scans your connected local network to detect and link your ESP32 hardware
            </p>
          </div>

          <button className="btn btn-secondary btn-sm" onClick={handleClearData} title="Reset database for clean live data">
            <Trash2 size={14} color="var(--danger)" />
            <span>Reset Database</span>
          </button>
        </div>

        {/* Network Status & Selector */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.75rem',
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          padding: '0.75rem 1rem',
          marginBottom: '1rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <span style={{
              display: 'inline-block',
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              backgroundColor: 'var(--success)'
            }} />
            <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>
              Connected Network:
            </span>
            {subnets.length > 1 ? (
              <select
                value={selectedSubnet}
                onChange={e => setSelectedSubnet(e.target.value)}
                style={{ padding: '0.35rem 0.6rem', fontSize: '0.85rem', fontWeight: 600 }}
              >
                {subnets.map(s => (
                  <option key={s} value={s}>{s}.x ({s === '192.168.1' ? 'Local Wi-Fi' : 'Adapter'})</option>
                ))}
              </select>
            ) : (
              <span className="badge badge-secondary" style={{ fontSize: '0.85rem', fontWeight: 700 }}>
                {selectedSubnet}.x (Local Wi-Fi)
              </span>
            )}
          </div>

          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            Auto-discovers IP addresses on your active LAN
          </span>
        </div>

        {/* Big Mobile-First Scan Button */}
        <button
          className="btn btn-primary"
          onClick={handleScan}
          disabled={scanning}
          style={{
            width: '100%',
            minHeight: '48px',
            fontSize: '1rem',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.6rem',
            boxShadow: '0 4px 14px rgba(37, 99, 235, 0.25)'
          }}
        >
          <RefreshCw size={18} className={scanning ? 'spin' : ''} />
          <span>{scanning ? 'Scanning Connected Network...' : 'Scan Connected Network'}</span>
        </button>

        {/* Scanning message / status */}
        {scanMessage && (
          <div style={{
            fontSize: '0.85rem',
            padding: '0.75rem 1rem',
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border)',
            borderRadius: '10px',
            color: 'var(--text-primary)',
            fontWeight: 500,
            marginTop: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            {scanning && <RefreshCw size={14} className="spin" color="var(--accent)" />}
            <span>{scanMessage}</span>
          </div>
        )}

        {clearMessage && (
          <div style={{ background: 'var(--success-light)', color: 'var(--success)', padding: '0.6rem 1rem', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 600, marginTop: '0.75rem' }}>
            ✓ {clearMessage}
          </div>
        )}
      </div>

      {/* 2. Discovered ESP Hardware Spotlight Cards */}
      {(detectedEsp1 || detectedEsp2 || autoPaired.esp1 || autoPaired.esp2) && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
          {/* ESP1 Detected Card */}
          {(detectedEsp1 || autoPaired.esp1) && (
            <div className="card" style={{ border: '2px solid var(--accent)', background: 'linear-gradient(180deg, rgba(2, 132, 199, 0.06) 0%, transparent 100%)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Camera size={20} color="var(--accent)" />
                  <div>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>ESP1 Camera & Robot Car</h3>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>MJPEG Stream + Motor Driver</div>
                  </div>
                </div>
                <span className="badge badge-online">CONNECTED</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '0.75rem 0', fontSize: '0.88rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Assigned IP:</span>
                <span style={{ fontWeight: 700, color: 'var(--accent)' }}>
                  {detectedEsp1?.ip || autoPaired.esp1}
                </span>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', flexWrap: 'wrap' }}>
                {onNavigate && (
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => onNavigate('robot')}
                    style={{ flex: 1, minHeight: '38px', fontWeight: 600 }}
                  >
                    <Gamepad2 size={15} />
                    <span>Open Cockpit</span>
                  </button>
                )}
                {onNavigate && (
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => onNavigate('camera')}
                    style={{ flex: 1, minHeight: '38px', fontWeight: 600 }}
                  >
                    <Camera size={15} />
                    <span>Live Video</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ESP2 Detected Card */}
          {(detectedEsp2 || autoPaired.esp2) && (
            <div className="card" style={{ border: '2px solid var(--success)', background: 'linear-gradient(180deg, rgba(16, 185, 129, 0.06) 0%, transparent 100%)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Thermometer size={20} color="var(--success)" />
                  <div>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>ESP2 Sensors & Pump Hub</h3>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>DHT22, Soil, MQ Gas & Relay</div>
                  </div>
                </div>
                <span className="badge badge-online">CONNECTED</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '0.75rem 0', fontSize: '0.88rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Assigned IP:</span>
                <span style={{ fontWeight: 700, color: 'var(--success)' }}>
                  {detectedEsp2?.ip || autoPaired.esp2}
                </span>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', flexWrap: 'wrap' }}>
                {onNavigate && (
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => onNavigate('sensors')}
                    style={{ flex: 1, minHeight: '38px', fontWeight: 600 }}
                  >
                    <Thermometer size={15} />
                    <span>View Telemetry</span>
                  </button>
                )}
                {onNavigate && (
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => onNavigate('dashboard')}
                    style={{ flex: 1, minHeight: '38px', fontWeight: 600 }}
                  >
                    <ArrowRight size={15} />
                    <span>Dashboard</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 3. Discovered Network Devices List */}
      {discovered.length > 0 && (
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <Radio size={20} color="var(--accent)" />
              <span>Active Network Devices ({discovered.length})</span>
            </div>
          </div>

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
                    padding: '0.9rem',
                    background: 'var(--bg-secondary)',
                    border: isEsp1 || isEsp2 ? '2px solid var(--accent)' : '1px solid var(--border)',
                    borderRadius: '12px',
                    flexWrap: 'wrap',
                    gap: '0.85rem'
                  }}
                >
                  <div style={{ flex: '1 1 240px' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
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

                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', width: '100%', maxWidth: '320px' }}>
                    <button
                      className={`btn ${isEsp1 ? 'btn-primary' : 'btn-secondary'} btn-sm`}
                      onClick={() => handleConnect('ESP1', dev.ip)}
                      disabled={connecting}
                      style={{ flex: 1, minHeight: '38px', fontWeight: 600 }}
                    >
                      Link ESP1
                    </button>
                    <button
                      className={`btn ${isEsp2 ? 'btn-primary' : 'btn-secondary'} btn-sm`}
                      onClick={() => handleConnect('ESP2', dev.ip)}
                      disabled={connecting}
                      style={{ flex: 1, minHeight: '38px', fontWeight: 600 }}
                    >
                      Link ESP2
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 4. Active Connected Hardware Nodes Status */}
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
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 600 }}>{device.name}</h3>
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
                  <span style={{ color: 'var(--text-muted)' }}>Signal Strength:</span>
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
                  <span>Hardware UI ↗</span>
                </a>
              </div>
            </div>
          );
        })}
      </div>

      {/* 5. Direct IP Manual Connect (Clean Collapsible Accordion) */}
      <div className="card">
        <button
          onClick={() => setShowManual(!showManual)}
          style={{
            width: '100%',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'none',
            border: 'none',
            padding: 0,
            cursor: 'pointer'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <LinkIcon size={18} color="var(--accent)" />
            <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>Direct IP Connect (Optional)</span>
          </div>
          {showManual ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>

        {showManual && (
          <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '0.85rem' }}>
              Know the exact IP of your ESP32? Connect directly without scanning.
            </p>

            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <select
                value={manualTarget}
                onChange={e => setManualTarget(e.target.value as any)}
                style={{ flex: '1 1 180px', minHeight: '42px' }}
              >
                <option value="ESP1">ESP1 (Camera + Motors)</option>
                <option value="ESP2">ESP2 (Sensors + Pump)</option>
              </select>

              <input
                type="text"
                placeholder="e.g. 192.168.1.150"
                value={manualIp}
                onChange={e => setManualIp(e.target.value)}
                style={{ flex: '2 1 200px', minHeight: '42px' }}
              />

              <button
                className="btn btn-primary"
                onClick={() => handleConnect(manualTarget, manualIp)}
                disabled={connecting}
                style={{ minHeight: '42px' }}
              >
                <LinkIcon size={16} />
                <span>{connecting ? 'Linking...' : `Connect ${manualTarget}`}</span>
              </button>
            </div>

            {connectResult && (
              <div style={{
                marginTop: '0.75rem',
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
        )}
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
