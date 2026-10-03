import React, { useState, useEffect } from 'react';
import { BarChart3, Download, Calendar, RefreshCw } from 'lucide-react';
import { SensorReading } from '../types';
import { api } from '../services/api';
import { SensorChart } from '../components/SensorChart';

export const HistoryPage: React.FC = () => {
  const [range, setRange] = useState<string>('24h');
  const [readings, setReadings] = useState<SensorReading[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await api.getHistory(range);
      setReadings(res.readings);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [range]);

  const handleExport = (format: 'csv' | 'json') => {
    window.open(`/api/sensors/export?format=${format}`, '_blank');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="card">
        <div className="card-header">
          <div>
            <h2 className="card-title">
              <BarChart3 size={22} color="var(--accent)" />
              <span>Historical Sensor Time-Series & Data Export</span>
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
              Full historical telemetry database with SQLite indexing and data archiving
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: '0.3rem' }}>
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

            <button className="btn btn-secondary btn-sm" onClick={() => handleExport('csv')}>
              <Download size={14} />
              <span>Export CSV</span>
            </button>

            <button className="btn btn-secondary btn-sm" onClick={() => handleExport('json')}>
              <Download size={14} />
              <span>Export JSON</span>
            </button>
          </div>
        </div>

        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          Showing <b>{readings.length}</b> historical telemetry samples over selected window.
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid-2">
        <div className="card">
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>Soil Moisture Trend (%)</h3>
          <SensorChart
            data={readings.map(r => ({ timestamp: r.timestamp, value: r.soilPercent }))}
            color="#10b981"
            unit="%"
            height={200}
          />
        </div>

        <div className="card">
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>Ambient Temperature (°C)</h3>
          <SensorChart
            data={readings.map(r => ({ timestamp: r.timestamp, value: r.temperature }))}
            color="#f59e0b"
            unit="°C"
            height={200}
          />
        </div>

        <div className="card">
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>Relative Humidity (%)</h3>
          <SensorChart
            data={readings.map(r => ({ timestamp: r.timestamp, value: r.humidity }))}
            color="#0284c7"
            unit="%"
            height={200}
          />
        </div>

        <div className="card">
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>Hazardous & Combustible Gases (ADC Scale)</h3>
          <SensorChart
            data={readings.map(r => ({ timestamp: r.timestamp, value: r.mq132Index }))}
            color="#8b5cf6"
            unit=""
            height={200}
          />
        </div>
      </div>
    </div>
  );
};
