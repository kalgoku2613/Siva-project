import React from 'react';

interface SensorChartProps {
  data: { timestamp: number; value: number }[];
  color?: string;
  unit?: string;
  height?: number;
  minLabel?: string;
  maxLabel?: string;
}

export const SensorChart: React.FC<SensorChartProps> = ({
  data,
  color = '#2563eb',
  unit = '',
  height = 180
}) => {
  if (!data || data.length < 2) {
    return (
      <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
        Awaiting sufficient telemetry records...
      </div>
    );
  }

  const values = data.map(d => d.value);
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const range = maxVal - minVal === 0 ? 1 : maxVal - minVal;

  const width = 600;
  const paddingX = 20;
  const paddingY = 24;

  const points = data.map((d, index) => {
    const x = paddingX + (index / (data.length - 1)) * (width - 2 * paddingX);
    const normalizedY = (d.value - minVal) / range;
    const y = height - paddingY - (normalizedY * (height - 2 * paddingY));
    return { x, y, val: d.value, time: d.timestamp };
  });

  const pathD = points.reduce((acc, p, i) => {
    if (i === 0) return `M ${p.x} ${p.y}`;
    // Simple smooth curve control
    const prev = points[i - 1];
    const cpX = (prev.x + p.x) / 2;
    return `${acc} C ${cpX} ${prev.y}, ${cpX} ${p.y}, ${p.x} ${p.y}`;
  }, '');

  const areaD = `${pathD} L ${points[points.length - 1].x} ${height - paddingY} L ${points[0].x} ${height - paddingY} Z`;

  const gradientId = `grad-${color.replace('#', '')}`;

  return (
    <div style={{ width: '100%', position: 'relative' }}>
      <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height, overflow: 'visible' }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.25" />
            <stop offset="100%" stopColor={color} stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        <line x1={paddingX} y1={paddingY} x2={width - paddingX} y2={paddingY} stroke="var(--border)" strokeDasharray="3 3" />
        <line x1={paddingX} y1={height / 2} x2={width - paddingX} y2={height / 2} stroke="var(--border)" strokeDasharray="3 3" />
        <line x1={paddingX} y1={height - paddingY} x2={width - paddingX} y2={height - paddingY} stroke="var(--border)" />

        {/* Area fill */}
        <path d={areaD} fill={`url(#${gradientId})`} />

        {/* Line stroke */}
        <path d={pathD} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

        {/* Min & Max value annotations */}
        <text x={paddingX} y={paddingY - 6} fill="var(--text-muted)" fontSize="10" fontWeight="500">
          MAX: {maxVal.toFixed(1)}{unit}
        </text>
        <text x={paddingX} y={height - 6} fill="var(--text-muted)" fontSize="10" fontWeight="500">
          MIN: {minVal.toFixed(1)}{unit}
        </text>
        <text x={width - paddingX} y={height - 6} fill="var(--text-muted)" fontSize="10" textAnchor="end">
          NOW: {values[values.length - 1].toFixed(1)}{unit}
        </text>

        {/* Latest point dot */}
        {points.length > 0 && (
          <circle
            cx={points[points.length - 1].x}
            cy={points[points.length - 1].y}
            r="4.5"
            fill={color}
            stroke="var(--surface)"
            strokeWidth="2"
          />
        )}
      </svg>
    </div>
  );
};
