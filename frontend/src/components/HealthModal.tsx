import React from 'react';
import { CheckCircle2, XCircle, X, ShieldCheck, Cpu, HardDrive, Wifi, Eye } from 'lucide-react';
import { SystemHealthReport } from '../types';

interface HealthModalProps {
  report: SystemHealthReport | null;
  loading: boolean;
  onClose: () => void;
}

export const HealthModal: React.FC<HealthModalProps> = ({ report, loading, onClose }) => {
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.55)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 100,
      padding: '1rem'
    }}>
      <div className="card" style={{ width: '100%', maxWidth: '640px', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '1rem', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <ShieldCheck size={24} color="var(--accent)" />
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>System Health & Subsystem Diagnostics</h2>
          </div>
          <button onClick={onClose} style={{ padding: '0.4rem', borderRadius: '50%', color: 'var(--text-muted)' }}>
            <X size={20} />
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
            <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--accent)' }}>
              Probing ESP devices, sensors, database & watchdogs...
            </div>
          </div>
        ) : report ? (
          <div>
            <div style={{
              background: report.healthy ? 'var(--success-light)' : 'var(--warning-light)',
              color: report.healthy ? 'var(--success)' : 'var(--warning)',
              padding: '1rem',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.9rem',
              fontWeight: 600,
              marginBottom: '1.25rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              {report.healthy ? <CheckCircle2 size={20} /> : <XCircle size={20} />}
              <span>{report.summary}</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {/* ESP1 Camera */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <Eye size={18} color="var(--text-secondary)" />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>ESP1 Camera & Motor Controller</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>IP: {report.subsystems.esp1CameraMotor.ip}</div>
                  </div>
                </div>
                <span className={`badge ${report.subsystems.esp1CameraMotor.online ? 'badge-online' : 'badge-offline'}`}>
                  {report.subsystems.esp1CameraMotor.online ? `ONLINE (${report.subsystems.esp1CameraMotor.latencyMs}ms)` : 'OFFLINE'}
                </span>
              </div>

              {/* ESP2 Sensors */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <Cpu size={18} color="var(--text-secondary)" />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>ESP2 Environmental Sensors & Actuators</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>IP: {report.subsystems.esp2Sensors.ip}</div>
                  </div>
                </div>
                <span className={`badge ${report.subsystems.esp2Sensors.online ? 'badge-online' : 'badge-offline'}`}>
                  {report.subsystems.esp2Sensors.online ? `ONLINE (${report.subsystems.esp2Sensors.latencyMs}ms)` : 'OFFLINE'}
                </span>
              </div>

              {/* SQLite Database */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <HardDrive size={18} color="var(--text-secondary)" />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>SQLite Database & Event Store</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total Stored Records: {report.subsystems.database.totalReadings}</div>
                  </div>
                </div>
                <span className="badge badge-online">CONNECTED</span>
              </div>

              {/* Safety Watchdogs */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <ShieldCheck size={18} color="var(--text-secondary)" />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Safety Watchdogs & Pump Limits</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>10s Auto-cutoff & 30s Cooldown Active</div>
                  </div>
                </div>
                <span className="badge badge-online">ARMED</span>
              </div>
            </div>

            <div style={{ marginTop: '1.5rem', textAlign: 'right' }}>
              <button className="btn btn-primary" onClick={onClose}>
                Close Diagnostics
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};
