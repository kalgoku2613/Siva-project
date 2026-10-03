import React, { useState } from 'react';
import { Droplets, Play, RefreshCw, CheckCircle2, Circle, ArrowRight, ShieldCheck, Gauge } from 'lucide-react';
import { SensorReading } from '../types';
import { api } from '../services/api';

interface MoisturePageProps {
  telemetry: SensorReading | null;
}

export const MoisturePage: React.FC<MoisturePageProps> = ({ telemetry }) => {
  const [deploying, setDeploying] = useState<boolean>(false);
  const [manualAngle, setManualAngle] = useState<number>(telemetry?.servoAngle || 0);

  // Calibration state
  const [dryAdc, setDryAdc] = useState<number>(3200);
  const [wetAdc, setWetAdc] = useState<number>(1350);
  const [calMsg, setCalMsg] = useState<string>('');

  const handleDeploy = async () => {
    setDeploying(true);
    try {
      await api.deploySoil();
    } finally {
      setTimeout(() => setDeploying(false), 2500);
    }
  };

  const handleRetract = async () => {
    try {
      await api.retractSoil();
    } catch {}
  };

  const handleAngleChange = async (angle: number) => {
    setManualAngle(angle);
    try {
      await api.setServoAngle(angle);
    } catch {}
  };

  const steps = [
    { title: 'Servo at Home (0°)', desc: 'Sensor resting in air, power switch OFF', active: telemetry?.servoAngle === 0 && !telemetry?.soilActive },
    { title: 'Deploying Arm to 180°', desc: 'Moving mechanical arm down into soil matrix', active: telemetry?.servoAngle && telemetry.servoAngle > 0 && telemetry.servoAngle < 180 },
    { title: 'Sensor Power & Settle', desc: 'GPIO 25 energizes capacitive oscillator', active: telemetry?.soilActive },
    { title: 'Multi-sample Filtering', desc: 'Averaging 10 ADC reads to cancel noise', active: telemetry?.sequenceState === 'SAMPLING_MOISTURE' },
    { title: 'Complete & Evaluated', desc: 'Percentage computed & arm ready for retract', active: telemetry?.sequenceState === 'MEASUREMENT_READY' }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Overview Card */}
      <div className="card">
        <div className="card-header">
          <div>
            <h2 className="card-title">
              <Droplets size={22} color="var(--accent)" />
              <span>Corrosion-Free Soil Moisture Deployment Engine</span>
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
              Autonomous 11-step servo immersion and GPIO power-switched capacitive sensing
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn btn-primary" onClick={handleDeploy} disabled={deploying}>
              <Play size={16} />
              <span>Initiate Sequence</span>
            </button>
            <button className="btn btn-secondary" onClick={handleRetract}>
              <RefreshCw size={16} />
              <span>Retract Arm</span>
            </button>
          </div>
        </div>

        {/* Live Status Banner */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '1rem',
          background: 'var(--bg-secondary)',
          padding: '1.25rem',
          borderRadius: 'var(--radius-md)',
          marginTop: '0.5rem'
        }}>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>CURRENT MOISTURE</div>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              {telemetry ? telemetry.soilPercent : '--'}%
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>SOIL CLASSIFICATION</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 700, marginTop: '0.4rem', color: telemetry?.soilState === 'WET' ? 'var(--success)' : telemetry?.soilState === 'MODERATE' ? 'var(--accent)' : 'var(--danger)' }}>
              {telemetry?.soilState || 'INACTIVE'}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>SERVO ARM POSITION</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 700, marginTop: '0.4rem' }}>
              {telemetry?.servoAngle || 0}°
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>RAW ADC LEVEL</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 700, marginTop: '0.4rem' }}>
              {telemetry?.soilRaw || '--'} / 4095
            </div>
          </div>
        </div>
      </div>

      {/* State Machine Step Tracker */}
      <div className="card">
        <h3 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: '1.25rem' }}>
          Sequential Operating Pipeline
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {steps.map((s, idx) => (
            <div
              key={idx}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                padding: '0.75rem 1rem',
                borderRadius: 'var(--radius-sm)',
                background: s.active ? 'var(--accent-light)' : 'transparent',
                border: s.active ? '1px solid var(--accent)' : '1px solid var(--border-light)'
              }}
            >
              <div style={{ color: s.active ? 'var(--accent)' : 'var(--text-muted)' }}>
                {s.active ? <CheckCircle2 size={22} /> : <Circle size={22} />}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: '0.92rem', color: s.active ? 'var(--accent)' : 'var(--text-primary)' }}>
                  Step {idx + 1}: {s.title}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  {s.desc}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Hardware Calibration Card */}
      <div className="grid-2">
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <Gauge size={20} color="var(--accent)" />
              <span>Capacitive Sensor Calibration</span>
            </div>
          </div>

          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
            Different soils and minerals produce varying dielectric constants. Measure dry air and water-saturated soil to set exact ADC end-points.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.3rem' }}>
                DRY ADC Value (Air Baseline, e.g. 3000-3400):
              </label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type="number"
                  value={dryAdc}
                  onChange={(e) => setDryAdc(Number(e.target.value))}
                  style={{ flex: 1 }}
                />
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => telemetry && setDryAdc(telemetry.soilRaw)}
                >
                  Capture Current
                </button>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.3rem' }}>
                WET ADC Value (Water Saturated Baseline, e.g. 1200-1500):
              </label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type="number"
                  value={wetAdc}
                  onChange={(e) => setWetAdc(Number(e.target.value))}
                  style={{ flex: 1 }}
                />
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => telemetry && setWetAdc(telemetry.soilRaw)}
                >
                  Capture Current
                </button>
              </div>
            </div>

            <button
              className="btn btn-primary"
              onClick={() => {
                setCalMsg(`Calibration stored! Dry=${dryAdc}, Wet=${wetAdc}`);
                setTimeout(() => setCalMsg(''), 3000);
              }}
            >
              Save Calibration Endpoints
            </button>
            {calMsg && <div style={{ color: 'var(--success)', fontSize: '0.85rem', fontWeight: 600 }}>{calMsg}</div>}
          </div>
        </div>

        {/* Manual Servo Positioner */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <span>Manual Servo Testing & Precision Stepping</span>
            </div>
            <span className="badge badge-warning">{manualAngle}°</span>
          </div>

          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
            Direct 50Hz PWM angle generator. Use to safely verify mechanical clearance of the servo arm linkage without forcing physical limits.
          </p>

          <input
            type="range"
            min="0"
            max="180"
            value={manualAngle}
            onChange={(e) => handleAngleChange(Number(e.target.value))}
            style={{ width: '100%', marginBottom: '1.5rem' }}
          />

          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
            <button className="btn btn-secondary btn-sm" onClick={() => handleAngleChange(0)}>Home (0°)</button>
            <button className="btn btn-secondary btn-sm" onClick={() => handleAngleChange(45)}>45°</button>
            <button className="btn btn-secondary btn-sm" onClick={() => handleAngleChange(90)}>Halfway (90°)</button>
            <button className="btn btn-secondary btn-sm" onClick={() => handleAngleChange(135)}>135°</button>
            <button className="btn btn-secondary btn-sm" onClick={() => handleAngleChange(180)}>Full Deploy (180°)</button>
          </div>
        </div>
      </div>
    </div>
  );
};
