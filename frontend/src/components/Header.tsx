import React, { useState, useEffect } from 'react';
import { ShieldAlert, Activity, Moon, Sun, Download, RefreshCw } from 'lucide-react';
import { DeviceStatus } from '../types';

interface HeaderProps {
  devices: DeviceStatus[];
  simulationMode: boolean;
  onEmergencyStop: () => void;
  onRunHealthCheck: () => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  devices,
  simulationMode,
  onEmergencyStop,
  onRunHealthCheck,
  theme,
  onToggleTheme
}) => {
  const [installPrompt, setInstallPrompt] = useState<any>(null);

  useEffect(() => {
    const handleBeforeInstall = (e: any) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  const handleInstallClick = () => {
    if (installPrompt) {
      installPrompt.prompt();
      setInstallPrompt(null);
    }
  };

  const esp1 = devices.find(d => d.id === 'ESP1');
  const esp2 = devices.find(d => d.id === 'ESP2');

  return (
    <header style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingBottom: '1.5rem',
      marginBottom: '1.5rem',
      borderBottom: '1px solid var(--border)',
      flexWrap: 'wrap',
      gap: '1rem'
    }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 700, letterSpacing: '-0.02em' }}>
            ESP Smart Control
          </h1>
          {simulationMode && (
            <span className="badge badge-warning" style={{ fontSize: '0.75rem' }}>
              Simulation Mode
            </span>
          )}
        </div>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.2rem' }}>
          Dual-ESP32 Autonomous Sensing, Robotic Navigation & Predictive Irrigation Hub
        </p>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
        {/* Device Status Chips */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-full)',
          padding: '0.35rem 0.85rem',
          fontSize: '0.8rem',
          fontWeight: 600
        }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span className={`status-dot ${esp1?.state === 'ONLINE' ? 'dot-green' : 'dot-red'}`} />
            ESP1 Camera
          </span>
          <span style={{ color: 'var(--border)' }}>|</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span className={`status-dot ${esp2?.state === 'ONLINE' ? 'dot-green' : 'dot-red'}`} />
            ESP2 Sensors
          </span>
        </div>

        {/* Health Check Button */}
        <button
          className="btn btn-secondary btn-sm"
          onClick={onRunHealthCheck}
          title="Run complete diagnostics on all hardware & services"
        >
          <Activity size={15} color="var(--accent)" />
          <span>Health Check</span>
        </button>

        {/* Emergency Stop Button */}
        <button
          className="btn btn-danger btn-sm"
          onClick={onEmergencyStop}
          title="Emergency Stop: Halt all motors and cut off water pump immediately"
        >
          <ShieldAlert size={16} />
          <span>E-STOP</span>
        </button>

        {/* PWA Install Button */}
        {installPrompt && (
          <button className="btn btn-primary btn-sm" onClick={handleInstallClick}>
            <Download size={15} />
            <span>Install App</span>
          </button>
        )}

        {/* Theme Toggle */}
        <button
          className="btn btn-secondary btn-sm"
          onClick={onToggleTheme}
          style={{ width: '36px', height: '36px', padding: 0 }}
          title="Toggle Dark / Light Mode"
        >
          {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
        </button>
      </div>
    </header>
  );
};
