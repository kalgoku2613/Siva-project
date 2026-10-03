import React, { useState, useEffect, useRef } from 'react';
import {
  Gamepad2,
  Camera,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Square,
  ShieldAlert,
  Maximize2,
  RefreshCw,
  Zap,
  Gauge
} from 'lucide-react';
import { DeviceStatus, MotorDirection } from '../types';
import { api } from '../services/api';

interface RobotPageProps {
  esp1: DeviceStatus | undefined;
}

export const RobotPage: React.FC<RobotPageProps> = ({ esp1 }) => {
  const [direction, setDirection] = useState<MotorDirection>('STOP');
  const [speed, setSpeed] = useState<number>(190);
  const [recentLog, setRecentLog] = useState<{ dir: string; time: string }[]>([]);
  const [streamKey, setStreamKey] = useState<number>(Date.now());
  const [snapshots, setSnapshots] = useState<string[]>([]);
  const cockpitRef = useRef<HTMLDivElement>(null);

  const isRealDevice = esp1?.state === 'ONLINE' && !esp1?.ip.includes('127.0.0.1');
  const streamUrl = isRealDevice ? `http://${esp1.ip}:81/stream?t=${streamKey}` : '/favicon.svg';

  const handleCommand = async (dir: MotorDirection) => {
    setDirection(dir);
    setRecentLog(prev => [{ dir, time: new Date().toLocaleTimeString() }, ...prev.slice(0, 7)]);
    try {
      await api.moveRobot(dir, speed);
    } catch (e: any) {
      console.error('Motor command error:', e);
    }
  };

  const handleSnapshot = () => {
    const snapUrl = isRealDevice ? `http://${esp1.ip}/snapshot?t=${Date.now()}` : '/favicon.svg';
    setSnapshots(prev => [snapUrl, ...prev.slice(0, 3)]);
  };

  const toggleFullscreen = () => {
    if (cockpitRef.current) {
      if (!document.fullscreenElement) {
        cockpitRef.current.requestFullscreen().catch(() => {});
      } else {
        document.exitFullscreen();
      }
    }
  };

  // Keyboard navigation hotkeys (W, A, S, D, Space)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName)) return;
      if (e.repeat) return;

      if (e.key === 'w' || e.key === 'ArrowUp') handleCommand('FORWARD');
      else if (e.key === 's' || e.key === 'ArrowDown') handleCommand('BACKWARD');
      else if (e.key === 'a' || e.key === 'ArrowLeft') handleCommand('LEFT');
      else if (e.key === 'd' || e.key === 'ArrowRight') handleCommand('RIGHT');
      else if (e.key === ' ' || e.key === 'Escape') handleCommand('STOP');
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [speed]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Cockpit Shell: Camera Stream + Overlay Controls */}
      <div ref={cockpitRef} className="card" style={{ padding: '1rem', background: '#090d16', color: '#f8fafc', border: '1px solid #1e293b' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Gamepad2 size={22} color="var(--accent)" />
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, letterSpacing: '-0.02em', color: '#ffffff' }}>
              Teleoperation Cockpit: Live FPV Video & Robot Drive
            </h2>
          </div>

          <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
            <button className="btn btn-secondary btn-sm" onClick={() => setStreamKey(Date.now())} title="Refresh Stream" style={{ color: '#ffffff', borderColor: '#334155' }}>
              <RefreshCw size={13} />
              <span>Refresh Video</span>
            </button>
            <button className="btn btn-primary btn-sm" onClick={handleSnapshot} title="Capture Snapshot while driving">
              <Camera size={13} />
              <span>Snap Photo</span>
            </button>
            <button className="btn btn-secondary btn-sm" onClick={toggleFullscreen} title="Fullscreen Driving Mode" style={{ color: '#ffffff', borderColor: '#334155' }}>
              <Maximize2 size={13} />
              <span>Fullscreen Cockpit</span>
            </button>
            <button className="btn btn-danger btn-sm" onClick={() => handleCommand('STOP')} title="Emergency Stop">
              <ShieldAlert size={14} />
              <span>E-STOP</span>
            </button>
          </div>
        </div>

        {/* Video Canvas & Driving HUD */}
        <div style={{
          position: 'relative',
          width: '100%',
          backgroundColor: '#000000',
          borderRadius: '16px',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '340px',
          maxHeight: '520px',
          aspectRatio: '16 / 9'
        }}>
          {isRealDevice ? (
            <img
              src={streamUrl}
              alt="ESP32-CAM Stream"
              key={streamKey}
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            />
          ) : (
            <div style={{ textAlign: 'center', color: '#64748b', padding: '2rem' }}>
              <Camera size={52} style={{ marginBottom: '0.75rem', opacity: 0.5 }} />
              <div style={{ fontSize: '1.1rem', fontWeight: 600, color: '#94a3b8' }}>
                {esp1?.state === 'ONLINE' ? 'Virtual Simulation Camera Feed Active' : 'ESP32-CAM Offline'}
              </div>
              <div style={{ fontSize: '0.8rem', marginTop: '0.25rem' }}>
                Use "Devices & Ping" tab to scan Wi-Fi and connect ESP1 IP (e.g. 192.168.1.150)
              </div>
            </div>
          )}

          {/* Cockpit HUD Overlay (Top) */}
          <div style={{
            position: 'absolute',
            top: '12px',
            left: '12px',
            right: '12px',
            display: 'flex',
            justifyContent: 'space-between',
            pointerEvents: 'none'
          }}>
            <div style={{
              background: 'rgba(0, 0, 0, 0.7)',
              backdropFilter: 'blur(8px)',
              padding: '0.35rem 0.8rem',
              borderRadius: '9999px',
              fontSize: '0.8rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              color: '#ffffff'
            }}>
              <span className={`status-dot ${esp1?.state === 'ONLINE' ? 'dot-green' : 'dot-red'}`} />
              <span>{esp1?.state === 'ONLINE' ? `ESP1 LIVE (${esp1.latencyMs || 12}ms)` : 'STANDBY'}</span>
            </div>

            <div style={{
              background: 'rgba(0, 0, 0, 0.7)',
              backdropFilter: 'blur(8px)',
              padding: '0.35rem 0.8rem',
              borderRadius: '9999px',
              fontSize: '0.8rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              color: '#38bdf8'
            }}>
              <Gauge size={14} />
              <span>THROTTLE: {speed} / 255</span>
            </div>
          </div>

          {/* Cockpit HUD Overlay (Bottom Status) */}
          <div style={{
            position: 'absolute',
            bottom: '12px',
            left: '12px',
            right: '12px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            pointerEvents: 'none'
          }}>
            <div style={{
              background: 'rgba(0, 0, 0, 0.75)',
              backdropFilter: 'blur(8px)',
              padding: '0.4rem 1rem',
              borderRadius: '9999px',
              fontSize: '0.85rem',
              fontWeight: 700,
              color: direction === 'STOP' ? '#94a3b8' : '#4ade80'
            }}>
              STATUS: {direction}
            </div>

            <div style={{
              background: 'rgba(0, 0, 0, 0.75)',
              backdropFilter: 'blur(8px)',
              padding: '0.35rem 0.8rem',
              borderRadius: '9999px',
              fontSize: '0.75rem',
              color: '#cbd5e1'
            }}>
              Hotkeys: [W] FWD | [S] REV | [A] LEFT | [D] RIGHT | [SPACE] HALT
            </div>
          </div>
        </div>

        {/* Driving Controls Console */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '1.25rem',
          marginTop: '1.25rem',
          alignItems: 'center'
        }}>
          {/* Touch-Friendly D-Pad */}
          <div>
            <div className="dpad-container" style={{ margin: '0 auto' }}>
              <div></div>
              <button
                className={`dpad-btn ${direction === 'FORWARD' ? 'active' : ''}`}
                onClick={() => handleCommand('FORWARD')}
                title="Drive Forward (W)"
              >
                <ArrowUp size={30} />
              </button>
              <div></div>

              <button
                className={`dpad-btn ${direction === 'LEFT' ? 'active' : ''}`}
                onClick={() => handleCommand('LEFT')}
                title="Turn Left (A)"
              >
                <ArrowLeft size={30} />
              </button>
              <button
                className="dpad-btn dpad-stop"
                onClick={() => handleCommand('STOP')}
                title="Emergency Stop (Space)"
              >
                <Square size={22} />
              </button>
              <button
                className={`dpad-btn ${direction === 'RIGHT' ? 'active' : ''}`}
                onClick={() => handleCommand('RIGHT')}
                title="Turn Right (D)"
              >
                <ArrowRight size={30} />
              </button>

              <div></div>
              <button
                className={`dpad-btn ${direction === 'BACKWARD' ? 'active' : ''}`}
                onClick={() => handleCommand('BACKWARD')}
                title="Drive Reverse (S)"
              >
                <ArrowDown size={30} />
              </button>
              <div></div>
            </div>
          </div>

          {/* Speed Throttle & Quick Action Rail */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', background: '#131b2e', padding: '1.25rem', borderRadius: '14px', border: '1px solid #1e293b' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem', fontSize: '0.88rem' }}>
                <span style={{ color: '#94a3b8', fontWeight: 600 }}>Motor Speed Throttle (PWM)</span>
                <span style={{ fontWeight: 700, color: '#38bdf8' }}>{speed} / 255</span>
              </div>
              <input
                type="range"
                min="100"
                max="255"
                value={speed}
                onChange={e => setSpeed(Number(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--accent)' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#64748b', marginTop: '0.2rem' }}>
                <span>Slow (100)</span>
                <span>Cruising (190)</span>
                <span>Turbo (255)</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="btn btn-secondary btn-sm" onClick={() => setSpeed(140)} style={{ flex: 1, color: '#ffffff', borderColor: '#334155' }}>
                Low Gear
              </button>
              <button className="btn btn-secondary btn-sm" onClick={() => setSpeed(190)} style={{ flex: 1, color: '#ffffff', borderColor: '#334155' }}>
                Normal
              </button>
              <button className="btn btn-primary btn-sm" onClick={() => setSpeed(255)} style={{ flex: 1 }}>
                Full Power
              </button>
            </div>

            {/* Quick Snapshots Preview */}
            {snapshots.length > 0 && (
              <div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.3rem', fontWeight: 600 }}>
                  Recent Captures:
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {snapshots.map((url, i) => (
                    <img
                      key={i}
                      src={url}
                      alt="Capture"
                      style={{ width: '48px', height: '36px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #334155' }}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
