import React, { useState, useRef } from 'react';
import { Camera, Maximize, RefreshCw, Download, Image as ImageIcon } from 'lucide-react';
import { DeviceStatus } from '../types';

interface CameraPageProps {
  esp1: DeviceStatus | undefined;
}

export const CameraPage: React.FC<CameraPageProps> = ({ esp1 }) => {
  const [snapshots, setSnapshots] = useState<{ id: string; url: string; time: string }[]>([]);
  const [resolution, setResolution] = useState<string>('SVGA (800x600)');
  const [streamKey, setStreamKey] = useState<number>(Date.now());
  const cameraRef = useRef<HTMLDivElement>(null);

  const isRealDevice = esp1?.state === 'ONLINE' && !esp1?.ip.includes('127.0.0.1');
  const streamUrl = isRealDevice ? `http://${esp1.ip}:81/stream?t=${streamKey}` : '/favicon.svg';

  const handleSnapshot = () => {
    const timestamp = new Date().toLocaleTimeString();
    const snapUrl = isRealDevice ? `http://${esp1.ip}/snapshot?t=${Date.now()}` : '/favicon.svg';
    setSnapshots(prev => [{ id: 'snap-' + Date.now(), url: snapUrl, time: timestamp }, ...prev]);
  };

  const handleFullscreen = () => {
    if (cameraRef.current) {
      if (!document.fullscreenElement) {
        cameraRef.current.requestFullscreen().catch(() => {});
      } else {
        document.exitFullscreen();
      }
    }
  };

  const handleReconnect = () => {
    setStreamKey(Date.now());
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="card">
        <div className="card-header">
          <div>
            <h2 className="card-title">
              <Camera size={22} color="var(--accent)" />
              <span>ESP32-CAM High-Performance Live Stream</span>
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
              Direct MJPEG HTTP Stream with low latency hardware acceleration
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button className="btn btn-secondary btn-sm" onClick={handleReconnect}>
              <RefreshCw size={14} />
              <span>Reconnect</span>
            </button>
            <button className="btn btn-primary btn-sm" onClick={handleSnapshot}>
              <Camera size={14} />
              <span>Capture Snapshot</span>
            </button>
            <button className="btn btn-secondary btn-sm" onClick={handleFullscreen}>
              <Maximize size={14} />
              <span>Fullscreen</span>
            </button>
          </div>
        </div>

        {/* Video Player */}
        <div ref={cameraRef} className="camera-box" style={{ maxHeight: '580px', width: '100%', margin: '0 auto' }}>
          {isRealDevice ? (
            <img src={streamUrl} alt="ESP32-CAM Stream" key={streamKey} />
          ) : (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#94a3b8' }}>
              <Camera size={56} style={{ marginBottom: '1rem', opacity: 0.6 }} />
              <div style={{ fontSize: '1.1rem', fontWeight: 600 }}>Simulated Video Canvas</div>
              <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '0.3rem' }}>
                Connect real ESP32-CAM hardware or visit http://{esp1?.ip || 'esp1.local'}/ for embedded preview.
              </div>
            </div>
          )}

          <div className="camera-hud">
            <div className="hud-pill">
              <span className={`status-dot ${esp1?.state === 'ONLINE' ? 'dot-green' : 'dot-red'}`} />
              <span>{esp1?.state === 'ONLINE' ? 'ONLINE (15 FPS)' : 'STANDBY'}</span>
            </div>
            <div className="hud-pill">{resolution}</div>
          </div>
        </div>

        {/* Stream Settings Footer */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', flexWrap: 'wrap', gap: '0.75rem', fontSize: '0.85rem' }}>
          <div style={{ display: 'flex', gap: '1rem', color: 'var(--text-muted)' }}>
            <span>Encoding: JPEG</span>
            <span>Target Bitrate: Adaptive</span>
            <span>Local LAN Stream Port: 81</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ color: 'var(--text-muted)' }}>Resolution:</span>
            <select
              value={resolution}
              onChange={(e) => setResolution(e.target.value)}
              style={{ padding: '0.3rem 0.6rem', fontSize: '0.85rem' }}
            >
              <option value="VGA (640x480)">VGA (640×480) - Fast</option>
              <option value="SVGA (800x600)">SVGA (800×600) - Balanced</option>
              <option value="XGA (1024x768)">XGA (1024×768) - High Quality</option>
            </select>
          </div>
        </div>
      </div>

      {/* Snapshot Gallery */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">
            <ImageIcon size={20} color="var(--accent)" />
            <span>Captured Snapshot Gallery ({snapshots.length})</span>
          </div>
        </div>

        {snapshots.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            No snapshots captured in this session. Click "Capture Snapshot" above to take a still image.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
            {snapshots.map(s => (
              <div key={s.id} style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', overflow: 'hidden', border: '1px solid var(--border)' }}>
                <img src={s.url} alt="Snapshot" style={{ width: '100%', height: '140px', objectFit: 'cover' }} />
                <div style={{ padding: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>{s.time}</span>
                  <a href={s.url} download={`esp_snapshot_${Date.now()}.jpg`} className="btn btn-secondary btn-sm" style={{ padding: '0.2rem 0.5rem' }}>
                    <Download size={12} />
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
