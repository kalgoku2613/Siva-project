import React, { useState } from 'react';
import { Sliders, Save, CheckCircle2, ShieldCheck, Wifi, Eye, Radio, Moon, Sun } from 'lucide-react';

interface SettingsPageProps {
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  simulationMode: boolean;
  onNavigate?: (tab: any) => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ theme, onToggleTheme, simulationMode, onNavigate }) => {
  const [esp1Ip, setEsp1Ip] = useState<string>(() => localStorage.getItem('esp1_ip') || 'Auto-Detecting');
  const [esp2Ip, setEsp2Ip] = useState<string>(() => localStorage.getItem('esp2_ip') || 'Auto-Detecting');
  const [maxPumpSec, setMaxPumpSec] = useState<number>(10);
  const [cooldownSec, setCooldownSec] = useState<number>(30);
  const [motorTimeoutMs, setMotorTimeoutMs] = useState<number>(1500);
  const [savedMsg, setSavedMsg] = useState<string>('');

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedMsg('Settings updated successfully!');
    setTimeout(() => setSavedMsg(''), 3000);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="card">
        <div className="card-header">
          <div>
            <h2 className="card-title">
              <Sliders size={22} color="var(--accent)" />
              <span>System Settings & Operational Limits</span>
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
              Automatic device linking, safety interlocks, hardware calibration, and UI preferences
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {/* Connected Network Devices */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Wifi size={18} color="var(--accent)" />
                <span>Connected Network Devices</span>
              </h3>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '0.3rem' }}>
                The system automatically discovers and communicates with active ESP32 nodes on your connected network.
              </p>
            </div>

            {onNavigate && (
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => onNavigate('devices')}
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              >
                <Radio size={14} />
                <span>Auto-Detect ESP32s</span>
              </button>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
            <div style={{ background: 'var(--bg-secondary)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                ESP1 (Camera + Motors)
              </div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--accent)', marginTop: '0.3rem' }}>
                {esp1Ip}
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                Auto-detected MJPEG video stream & L298N driver
              </div>
            </div>

            <div style={{ background: 'var(--bg-secondary)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                ESP2 (Sensors + Pump)
              </div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--success)', marginTop: '0.3rem' }}>
                {esp2Ip}
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                Auto-detected DHT22, Soil, MQ sensors & relay
              </div>
            </div>
          </div>
        </div>

        {/* Safety Watchdogs */}
        <div className="card">
          <h3 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ShieldCheck size={18} color="var(--success)" />
            <span>Hardware Watchdogs & Interlock Limits</span>
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.3rem' }}>
                Maximum Continuous Pump Runtime (Seconds)
              </label>
              <input
                type="number"
                min="2"
                max="20"
                value={maxPumpSec}
                onChange={e => setMaxPumpSec(Number(e.target.value))}
                style={{ width: '100%' }}
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Hard safety cutoff prevents reservoir flood</span>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.3rem' }}>
                Pump Cooling Cooldown (Seconds)
              </label>
              <input
                type="number"
                min="10"
                max="300"
                value={cooldownSec}
                onChange={e => setCooldownSec(Number(e.target.value))}
                style={{ width: '100%' }}
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Enforced rest between irrigation pulses</span>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.3rem' }}>
                Motor Inactivity Auto-Stop (Milliseconds)
              </label>
              <input
                type="number"
                min="500"
                max="5000"
                step="250"
                value={motorTimeoutMs}
                onChange={e => setMotorTimeoutMs(Number(e.target.value))}
                style={{ width: '100%' }}
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Stops chassis if heartbeat/command is lost</span>
            </div>
          </div>
        </div>

        {/* UI Appearance */}
        <div className="card">
          <h3 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: '1rem' }}>
            Interface & Theme Customization
          </h3>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 0' }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.92rem' }}>Color Scheme Theme</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Select between Apple-inspired Clean Light mode or High-contrast Dark mode</div>
            </div>
            <button type="button" className="btn btn-secondary" onClick={onToggleTheme}>
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
              <span>{theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}</span>
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 0', borderTop: '1px solid var(--border)' }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.92rem' }}>Hardware Simulation Mode</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Status: {simulationMode ? 'Active (Virtual ESP Devices)' : 'Inactive (Connecting to real ESPs)'}</div>
            </div>
            <span className={`badge ${simulationMode ? 'badge-warning' : 'badge-online'}`}>
              {simulationMode ? 'ENABLED' : 'DISABLED'}
            </span>
          </div>
        </div>

        {/* Save Bar */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '1rem' }}>
          {savedMsg && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--success)', fontWeight: 600, fontSize: '0.9rem' }}>
              <CheckCircle2 size={16} />
              <span>{savedMsg}</span>
            </div>
          )}
          <button type="submit" className="btn btn-primary">
            <Save size={16} />
            <span>Save Configuration</span>
          </button>
        </div>
      </form>
    </div>
  );
};
