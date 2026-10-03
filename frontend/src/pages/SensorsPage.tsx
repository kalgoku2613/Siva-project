import React, { useState, useEffect } from 'react';
import { Thermometer, Droplets, Wind, Flame } from 'lucide-react';
import { SensorReading } from '../types';
import { api } from '../services/api';
import { SensorChart } from '../components/SensorChart';

interface SensorsPageProps {
  currentTelemetry: SensorReading | null;
}

export const SensorsPage: React.FC<SensorsPageProps> = ({ currentTelemetry }) => {
  const [range, setRange] = useState<string>('24h');
  const [history, setHistory] = useState<SensorReading[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      try {
        setLoading(true);
        const res = await api.getHistory(range);
        if (isMounted) setHistory(res.readings);
      } catch (err) {
        console.error('History load error:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    loadData();
    const interval = setInterval(loadData, 15000); // refresh every 15s
    return () => { isMounted = false; clearInterval(interval); };
  }, [range]);

  const computeStats = (dataKey: keyof SensorReading) => {
    if (!history || history.length === 0) return { min: 0, max: 0, avg: 0 };
    const vals = history.map(h => Number(h[dataKey]) || 0);
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
    return { min, max, avg };
  };

  const tempStats = computeStats('temperature');
  const humStats = computeStats('humidity');
  const soilStats = computeStats('soilPercent');
  const mq132Stats = computeStats('mq132Index');
  const mq5Stats = computeStats('mq5Index');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header with Range Picker */}
      <div className="card" style={{ padding: '1rem 1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Environmental & Atmospheric Analytics</h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Calibrated multi-sensor telemetry with min/max/average historical metrics
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.4rem' }}>
            {['1h', '6h', '24h', '7d'].map((r) => (
              <button
                key={r}
                className={`btn btn-sm ${range === r ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setRange(r)}
              >
                {r.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Grid of Sensor Cards */}
      <div className="grid-2">
        {/* Temperature Card */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <Thermometer size={20} color="var(--warning)" />
              <span>Ambient Temperature (°C)</span>
            </div>
            <div className="stat-value" style={{ fontSize: '1.8rem' }}>
              {currentTelemetry?.temperature.toFixed(1) || '--'}
              <span className="stat-unit">°C</span>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '1rem', background: 'var(--bg-secondary)', padding: '0.5rem 0.75rem', borderRadius: '8px' }}>
            <span>MIN: <b>{tempStats.min.toFixed(1)}°C</b></span>
            <span>AVG: <b>{tempStats.avg.toFixed(1)}°C</b></span>
            <span>MAX: <b>{tempStats.max.toFixed(1)}°C</b></span>
          </div>

          <SensorChart
            data={history.map(h => ({ timestamp: h.timestamp, value: h.temperature }))}
            color="#f59e0b"
            unit="°C"
          />
        </div>

        {/* Humidity Card */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <Droplets size={20} color="var(--accent)" />
              <span>Relative Humidity (%)</span>
            </div>
            <div className="stat-value" style={{ fontSize: '1.8rem' }}>
              {currentTelemetry?.humidity.toFixed(1) || '--'}
              <span className="stat-unit">%</span>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '1rem', background: 'var(--bg-secondary)', padding: '0.5rem 0.75rem', borderRadius: '8px' }}>
            <span>MIN: <b>{humStats.min.toFixed(1)}%</b></span>
            <span>AVG: <b>{humStats.avg.toFixed(1)}%</b></span>
            <span>MAX: <b>{humStats.max.toFixed(1)}%</b></span>
          </div>

          <SensorChart
            data={history.map(h => ({ timestamp: h.timestamp, value: h.humidity }))}
            color="#0284c7"
            unit="%"
          />
        </div>

        {/* Capacitive Soil Moisture Card */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <Droplets size={20} color="var(--success)" />
              <span>Soil Moisture ({currentTelemetry?.soilState || 'IDLE'})</span>
            </div>
            <div className="stat-value" style={{ fontSize: '1.8rem' }}>
              {currentTelemetry?.soilPercent || '--'}
              <span className="stat-unit">%</span>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '1rem', background: 'var(--bg-secondary)', padding: '0.5rem 0.75rem', borderRadius: '8px' }}>
            <span>Raw ADC: <b>{currentTelemetry?.soilRaw || '--'}</b></span>
            <span>AVG: <b>{soilStats.avg.toFixed(1)}%</b></span>
            <span>STATE: <b>{currentTelemetry?.soilState || 'INACTIVE'}</b></span>
          </div>

          <SensorChart
            data={history.map(h => ({ timestamp: h.timestamp, value: h.soilPercent }))}
            color="#10b981"
            unit="%"
          />
        </div>

        {/* MQ-132 Air Quality Card */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <Wind size={20} color="#8b5cf6" />
              <span>Air Quality Index (MQ-132)</span>
            </div>
            <div className="stat-value" style={{ fontSize: '1.8rem' }}>
              {currentTelemetry?.mq132Index.toFixed(0) || '--'}
              <span className="stat-unit">/100</span>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '1rem', background: 'var(--bg-secondary)', padding: '0.5rem 0.75rem', borderRadius: '8px' }}>
            <span>Raw ADC: <b>{currentTelemetry?.mq132Raw || '--'}</b></span>
            <span>Status: <b>{currentTelemetry?.mq132WarmedUp ? 'Calibrated' : 'Warming up'}</b></span>
            <span>MAX: <b>{mq132Stats.max.toFixed(0)}</b></span>
          </div>

          <SensorChart
            data={history.map(h => ({ timestamp: h.timestamp, value: h.mq132Index }))}
            color="#8b5cf6"
            unit=""
          />
        </div>
      </div>
    </div>
  );
};
