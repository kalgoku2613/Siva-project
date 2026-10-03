import React, { useState, useEffect } from 'react';
import { TrendingUp, RefreshCw, Cpu, AlertCircle, CheckCircle2, ShieldAlert } from 'lucide-react';
import { MLPrediction, MLMetrics } from '../types';
import { api } from '../services/api';

export const PredictionsPage: React.FC = () => {
  const [target, setTarget] = useState<'soil_moisture' | 'temperature' | 'humidity'>('soil_moisture');
  const [forecast, setForecast] = useState<MLPrediction[]>([]);
  const [metrics, setMetrics] = useState<{ soil: MLMetrics; temperature: MLMetrics; humidity: MLMetrics } | null>(null);
  const [irrigation, setIrrigation] = useState<any>(null);
  const [training, setTraining] = useState<boolean>(false);

  const loadData = async () => {
    try {
      const [fRes, mRes, iRes] = await Promise.all([
        api.getForecast(target),
        api.getMLMetrics(),
        api.getIrrigationRecommendation()
      ]);
      setForecast(fRes.forecast);
      setMetrics(mRes.metrics);
      setIrrigation(iRes);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadData();
  }, [target]);

  const handleRetrain = async () => {
    setTraining(true);
    try {
      await api.retrainModels();
      await loadData();
    } finally {
      setTraining(false);
    }
  };

  const currentMetric = metrics ? (target === 'soil_moisture' ? metrics.soil : target === 'temperature' ? metrics.temperature : metrics.humidity) : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header and Model Status */}
      <div className="card">
        <div className="card-header">
          <div>
            <h2 className="card-title">
              <TrendingUp size={22} color="var(--accent)" />
              <span>Machine Learning & Predictive Forecasting Engine</span>
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
              Sequential autoregressive time-series inference with explicit uncertainty bounds
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <span className={`badge ${
              currentMetric?.status === 'Ready' ? 'badge-online' :
              currentMetric?.status === 'Training' ? 'badge-warning' : 'badge-offline'
            }`}>
              Dataset: {currentMetric?.status || 'Loading...'}
            </span>

            <button className="btn btn-secondary btn-sm" onClick={handleRetrain} disabled={training}>
              <RefreshCw size={14} className={training ? 'spin' : ''} />
              <span>{training ? 'Training...' : 'Retrain Models'}</span>
            </button>
          </div>
        </div>

        {/* Irrigation Recommendation Banner */}
        {irrigation && (
          <div style={{
            background: irrigation.recommendation === 'Likely Irrigation Required' ? 'var(--warning-light)' : 'var(--success-light)',
            color: irrigation.recommendation === 'Likely Irrigation Required' ? 'var(--warning)' : 'var(--success)',
            border: '1px solid currentColor',
            borderRadius: 'var(--radius-sm)',
            padding: '1rem',
            marginTop: '0.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.75rem'
          }}>
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>
                AI Irrigation Advisory ({irrigation.confidence} Confidence)
              </div>
              <div style={{ fontSize: '1.15rem', fontWeight: 700, marginTop: '0.1rem' }}>
                {irrigation.recommendation}
              </div>
              <div style={{ fontSize: '0.82rem', marginTop: '0.2rem' }}>
                {irrigation.details}
              </div>
            </div>

            <div style={{ fontSize: '0.85rem', fontWeight: 600, textAlign: 'right' }}>
              <div>Current Soil: {irrigation.currentSoil}%</div>
              <div>24h Projected: {irrigation.forecast24h}%</div>
            </div>
          </div>
        )}
      </div>

      {/* Target Selector */}
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        {[
          { id: 'soil_moisture', label: 'Soil Moisture Forecast (%)' },
          { id: 'temperature', label: 'Temperature Forecast (°C)' },
          { id: 'humidity', label: 'Humidity Forecast (%)' }
        ].map(t => (
          <button
            key={t.id}
            className={`btn btn-sm ${target === t.id ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setTarget(t.id as any)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Forecast Horizons Grid */}
      <div className="grid-3">
        {forecast.map((f, i) => (
          <div key={i} className="card">
            <div className="card-header">
              <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                +{f.horizonMinutes >= 60 ? `${f.horizonMinutes / 60} HOUR${f.horizonMinutes > 60 ? 'S' : ''}` : `${f.horizonMinutes} MINS`} HORIZON
              </span>
              <span className={`badge ${f.confidenceLevel === 'High' ? 'badge-online' : f.confidenceLevel === 'Medium' ? 'badge-warning' : 'badge-offline'}`}>
                {f.confidenceLevel} Conf.
              </span>
            </div>

            <div className="stat-value">
              {f.predictedValue}
              <span className="stat-unit">{target === 'temperature' ? '°C' : '%'}</span>
            </div>

            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>
              Confidence Interval: <b>{f.confidenceLower}</b> – <b>{f.confidenceUpper}</b>
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
              {i > 2 ? '⚠️ Recursive uncertainty accumulation factored' : 'Low variance direct projection'}
            </div>
          </div>
        ))}
      </div>

      {/* Model Verification Metrics */}
      <div className="card">
        <h3 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: '1rem' }}>
          Statistical Model Evaluation & Validation
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          <div style={{ padding: '0.85rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>MEAN ABSOLUTE ERROR (MAE)</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, marginTop: '0.2rem' }}>
              {currentMetric?.mae || '--'}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Average point deviation</div>
          </div>

          <div style={{ padding: '0.85rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>ROOT MEAN SQUARED ERROR (RMSE)</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, marginTop: '0.2rem' }}>
              {currentMetric?.rmse || '--'}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Standard deviation of residuals</div>
          </div>

          <div style={{ padding: '0.85rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>COEFFICIENT OF DETERMINATION (R²)</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, marginTop: '0.2rem' }}>
              {currentMetric?.r2 || '--'}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Variance explained by model</div>
          </div>

          <div style={{ padding: '0.85rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>TRAINING SAMPLES IN DATABASE</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, marginTop: '0.2rem' }}>
              {currentMetric?.sampleCount || 0}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Correlated historical points</div>
          </div>
        </div>
      </div>
    </div>
  );
};
