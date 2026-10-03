import React, { useState } from 'react';
import {
  Thermometer,
  Droplets,
  Wind,
  Flame,
  Camera,
  Play,
  Square,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Maximize2,
  RefreshCw,
  WifiOff
} from 'lucide-react';
import { SensorReading, DeviceStatus, MotorDirection } from '../types';
import { api } from '../services/api';

interface DashboardProps {
  telemetry: SensorReading | null;
  devices: DeviceStatus[];
  onNavigate: (tab: any) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ telemetry, devices, onNavigate }) => {
  const [motorSpeed, setMotorSpeed] = useState<number>(190);
  const [acting, setActing] = useState<boolean>(false);
  const [actionMsg, setActionMsg] = useState<string>('');

  const esp1 = devices.find(d => d.id === 'ESP1');
  const esp2 = devices.find(d => d.id === 'ESP2');

  const handleMotor = async (dir: MotorDirection) => {
    try {
      await api.moveRobot(dir, motorSpeed);
    } catch (e: any) {
      console.error(e);
    }
  };

  const handleDeploySoil = async () => {
    setActing(true);
    setActionMsg('Deploying sensor arm...');
    try {
      await api.deploySoil();
    } finally {
      setTimeout(() => setActing(false), 2000);
    }
  };

  const handleRetractSoil = async () => {
    setActing(true);
    setActionMsg('Retracting arm...');
    try {
      await api.retractSoil();
    } finally {
      setTimeout(() => setActing(false), 1500);
    }
  };

  const handlePumpToggle = async () => {
    const isRunning = telemetry?.pumpActive;
    try {
      await api.setPump(!isRunning, 4000);
    } catch (e: any) {
      alert(e.message);
    }
  };

  const streamSrc = esp1?.state === 'ONLINE' && !esp1?.ip.includes('127.0.0.1')
    ? `http://${esp1.ip}:81/stream`
    : '/favicon.svg';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* 1. System Status Ribbon */}
      <div className="card" style={{ padding: '1rem 1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span className={`status-dot ${esp1?.state === 'ONLINE' ? 'dot-green' : 'dot-red'}`} />
              <span style={{ fontSize: '0.88rem', fontWeight: 600 }}>ESP1 Camera: {esp1?.state || 'OFFLINE'}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span className={`status-dot ${esp2?.state === 'ONLINE' ? 'dot-green' : 'dot-red'}`} />
              <span style={{ fontSize: '0.88rem', fontWeight: 600 }}>ESP2 Sensors: {esp2?.state || 'OFFLINE'}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span className="status-dot dot-green" />
              <span style={{ fontSize: '0.88rem', fontWeight: 600 }}>Wi-Fi LAN: CONNECTED</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span className="status-dot dot-green" />
              <span style={{ fontSize: '0.88rem', fontWeight: 600 }}>Database: READY</span>
            </div>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={() => onNavigate('diagnostics')}>
            View System Logs
          </button>
        </div>
      </div>

      {/* Offline Hardware Notification Banner */}
      {(!esp1 || esp1.state === 'OFFLINE') && (!esp2 || esp2.state === 'OFFLINE') && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.08)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: '14px',
          padding: '1rem 1.25rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <div style={{ background: 'rgba(239, 68, 68, 0.15)', padding: '0.6rem', borderRadius: '10px' }}>
              <WifiOff size={22} color="var(--danger)" />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--danger)' }}>
                No ESP32 Hardware Connected
              </div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                Sensors are in standby mode showing '--'. Connect to your Wi-Fi or scan your local network to link your ESP32.
              </div>
            </div>
          </div>
          <button className="btn btn-primary btn-sm" onClick={() => onNavigate('devices')}>
            Scan Wi-Fi Subnet
          </button>
        </div>
      )}

      {/* 2. Top Metric Cards */}
      <div className="grid-4">
        {/* Temperature */}
        <div className="card" onClick={() => onNavigate('sensors')} style={{ cursor: 'pointer' }}>
          <div className="card-header">
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>TEMPERATURE</span>
            <div style={{ padding: '0.4rem', borderRadius: '10px', background: 'var(--warning-light)', color: 'var(--warning)' }}>
              <Thermometer size={18} />
            </div>
          </div>
          <div className="stat-value">
            {esp2?.state === 'ONLINE' && telemetry?.dhtValid ? telemetry.temperature.toFixed(1) : '--'}
            <span className="stat-unit">°C</span>
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>
            {esp2?.state === 'ONLINE' ? 'DHT22 Precision Ambient Air' : 'ESP2 Offline / Waiting for Hardware'}
          </div>
        </div>

        {/* Humidity */}
        <div className="card" onClick={() => onNavigate('sensors')} style={{ cursor: 'pointer' }}>
          <div className="card-header">
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>RELATIVE HUMIDITY</span>
            <div style={{ padding: '0.4rem', borderRadius: '10px', background: 'var(--accent-light)', color: 'var(--accent)' }}>
              <Droplets size={18} />
            </div>
          </div>
          <div className="stat-value">
            {esp2?.state === 'ONLINE' && telemetry?.dhtValid ? telemetry.humidity.toFixed(1) : '--'}
            <span className="stat-unit">%</span>
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>
            {esp2?.state === 'ONLINE' ? (telemetry && telemetry.humidity < 40 ? 'Dry Air' : telemetry && telemetry.humidity > 70 ? 'High Humidity' : 'Optimal Comfort') : 'ESP2 Offline'}
          </div>
        </div>

        {/* Soil Moisture */}
        <div className="card" onClick={() => onNavigate('moisture')} style={{ cursor: 'pointer' }}>
          <div className="card-header">
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>SOIL MOISTURE</span>
            <span className={`badge ${
              esp2?.state === 'ONLINE' && telemetry?.soilState === 'WET' ? 'badge-online' :
              esp2?.state === 'ONLINE' && telemetry?.soilState === 'MODERATE' ? 'badge-online' :
              esp2?.state === 'ONLINE' && telemetry?.soilState === 'DRY' ? 'badge-offline' : 'badge-warning'
            }`}>
              {esp2?.state === 'ONLINE' ? (telemetry?.soilState || 'INACTIVE') : 'OFFLINE'}
            </span>
          </div>
          <div className="stat-value">
            {esp2?.state === 'ONLINE' && telemetry ? telemetry.soilPercent : '--'}
            <span className="stat-unit">%</span>
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>
            {esp2?.state === 'ONLINE' ? 'Capacitive Corrosion-Free Sensor' : 'ESP2 Offline'}
          </div>
        </div>

        {/* Air Quality */}
        <div className="card" onClick={() => onNavigate('sensors')} style={{ cursor: 'pointer' }}>
          <div className="card-header">
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>AIR QUALITY (MQ-132)</span>
            <div style={{ padding: '0.4rem', borderRadius: '10px', background: 'var(--success-light)', color: 'var(--success)' }}>
              <Wind size={18} />
            </div>
          </div>
          <div className="stat-value">
            {esp2?.state === 'ONLINE' && telemetry ? telemetry.mq132Index.toFixed(0) : '--'}
            <span className="stat-unit">/100</span>
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>
            {esp2?.state === 'ONLINE' ? `Hazardous Gas Index (Raw: ${telemetry?.mq132Raw || '--'})` : 'ESP2 Offline'}
          </div>
        </div>
      </div>

      {/* 3. Main Grid: Camera & Robot Driving */}
      <div className="grid-2">
        {/* Camera Preview */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <Camera size={20} color="var(--accent)" />
              <span>Live ESP1 Camera Stream</span>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={() => onNavigate('camera')}>
              <Maximize2 size={14} />
              <span>Fullscreen</span>
            </button>
          </div>

          <div className="camera-box">
            {esp1?.state === 'ONLINE' && !esp1.ip.includes('127.0.0.1') ? (
              <img src={streamSrc} alt="Live Camera" />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', color: '#94a3b8' }}>
                <Camera size={48} />
                <div style={{ fontSize: '0.9rem', fontWeight: 500 }}>
                  {esp1?.state === 'ONLINE' ? 'Virtual Simulation Camera Feed Active' : 'ESP1-CAM Offline'}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>LAN Stream: http://{esp1?.ip || 'esp1.local'}:81/stream</div>
              </div>
            )}
            <div className="camera-hud">
              <div className="hud-pill">
                <span className={`status-dot ${esp1?.state === 'ONLINE' ? 'dot-green' : 'dot-red'}`} />
                <span>{esp1?.state === 'ONLINE' ? 'LIVE (15 FPS)' : 'STANDBY'}</span>
              </div>
              <div className="hud-pill">SVGA 800×600</div>
            </div>
          </div>
        </div>

        {/* Robot Directional Controls */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <span>Robot Directional Driving</span>
            </div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>W/A/S/D Keyboard Enabled</span>
          </div>

          <div className="dpad-container">
            <div></div>
            <button className="dpad-btn" onClick={() => handleMotor('FORWARD')} title="Drive Forward (W)">
              <ArrowUp size={24} />
            </button>
            <div></div>

            <button className="dpad-btn" onClick={() => handleMotor('LEFT')} title="Steer Left (A)">
              <ArrowLeft size={24} />
            </button>
            <button className="dpad-btn dpad-stop" onClick={() => handleMotor('STOP')} title="Halt (Space)">
              <Square size={20} />
            </button>
            <button className="dpad-btn" onClick={() => handleMotor('RIGHT')} title="Steer Right (D)">
              <ArrowRight size={24} />
            </button>

            <div></div>
            <button className="dpad-btn" onClick={() => handleMotor('BACKWARD')} title="Reverse (S)">
              <ArrowDown size={24} />
            </button>
            <div></div>
          </div>

          <div style={{ marginTop: '1rem', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.4rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>PWM Speed Level</span>
              <span style={{ fontWeight: 600 }}>{motorSpeed} / 255</span>
            </div>
            <input
              type="range"
              min="100"
              max="255"
              value={motorSpeed}
              onChange={(e) => setMotorSpeed(Number(e.target.value))}
              style={{ width: '100%' }}
            />
          </div>
        </div>
      </div>

      {/* 4. Actuators: Soil Deployment & Irrigation Pump */}
      <div className="grid-2">
        {/* Soil Moisture Deployment Control */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <Droplets size={20} color="var(--accent)" />
              <span>Soil Sensor Mechanical Deployment</span>
            </div>
            <span className="badge badge-warning">
              Servo: {telemetry?.servoAngle || 0}°
            </span>
          </div>

          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
            The capacitive probe rests at 0° (Home) to prevent galvanic degradation. Triggering deployment moves the servo arm into the soil, powers the sensor for sampling, and returns calibrated moisture percentage.
          </p>

          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button className="btn btn-primary" onClick={handleDeploySoil} disabled={acting}>
              <Play size={16} />
              <span>Deploy Arm & Measure</span>
            </button>
            <button className="btn btn-secondary" onClick={handleRetractSoil} disabled={acting}>
              <RefreshCw size={16} />
              <span>Retract Arm to 0°</span>
            </button>
          </div>
          {acting && (
            <div style={{ marginTop: '0.75rem', fontSize: '0.8rem', color: 'var(--accent)', fontWeight: 600 }}>
              {actionMsg}
            </div>
          )}
        </div>

        {/* Water Pump Controls */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <span>Precision Water Irrigation Pump</span>
            </div>
            <span className={`badge ${telemetry?.pumpActive ? 'badge-online' : 'badge-offline'}`}>
              {telemetry?.pumpActive ? 'PUMP RUNNING' : 'PUMP OFF'}
            </span>
          </div>

          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
            Controlled via MOSFET/Relay driver on ESP2 with hardware flyback protection. Hard-limited to 10s maximum runtime with mandatory 30s cooldown watchdog.
          </p>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
            <button
              className={`btn ${telemetry?.pumpActive ? 'btn-danger' : 'btn-primary'}`}
              onClick={handlePumpToggle}
            >
              {telemetry?.pumpActive ? <Square size={16} /> : <Play size={16} />}
              <span>{telemetry?.pumpActive ? 'Stop Pump Immediately' : 'Start Watering Pulse (4s)'}</span>
            </button>

            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              {telemetry?.pumpActive ? `Active: ${(telemetry.pumpElapsedMs / 1000).toFixed(1)}s` : 'Status: Ready'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
