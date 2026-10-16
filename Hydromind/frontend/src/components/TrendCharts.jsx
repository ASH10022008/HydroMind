import React, { useState } from 'react';
import { Activity, TrendingUp, Thermometer, Droplets } from 'lucide-react';

export default function TrendCharts({ history = [] }) {
  const [activeTab, setActiveTab] = useState('wqi'); // 'wqi' | 'temp' | 'turbidity'

  const points = history.length > 0 ? history : [
    { wqi: 18, temperature: 24.5, turbidity_voltage: 2.85, ntu: 50 },
    { wqi: 19, temperature: 24.6, turbidity_voltage: 2.82, ntu: 55 },
    { wqi: 17, temperature: 24.4, turbidity_voltage: 2.88, ntu: 45 },
  ];

  // SVG dimensions
  const width = 640;
  const height = 180;
  const padding = { top: 20, right: 20, bottom: 30, left: 45 };
  const graphWidth = width - padding.left - padding.right;
  const graphHeight = height - padding.top - padding.bottom;

  let values = [];
  let color = '#10b981';
  let unit = '';
  let minBound = 0;
  let maxBound = 100;
  let thresholdSafe = null;
  let thresholdCaution = null;

  if (activeTab === 'wqi') {
    values = points.map((p) => Number(p.wqi || 0));
    color = '#06b6d4';
    unit = 'WQI';
    minBound = 0;
    maxBound = 100;
    thresholdSafe = 30.0;
    thresholdCaution = 60.0;
  } else if (activeTab === 'temp') {
    values = points.map((p) => Number(p.temperature || p.temperature_c || 25));
    color = '#3b82f6';
    unit = '°C';
    const minVal = Math.min(...values, 20);
    const maxVal = Math.max(...values, 35);
    minBound = Math.floor(minVal - 1);
    maxBound = Math.ceil(maxVal + 1);
  } else {
    values = points.map((p) => Number(p.ntu || (p.turbidity_voltage ? ((3.0 - p.turbidity_voltage) / 2.5) * 1000 : 50)));
    color = '#f59e0b';
    unit = 'NTU';
    const maxVal = Math.max(...values, 100);
    minBound = 0;
    maxBound = Math.ceil(maxVal * 1.2);
  }

  const range = maxBound - minBound || 1;

  // Build SVG polyline points
  const coords = values.map((val, idx) => {
    const x = padding.left + (idx / Math.max(1, values.length - 1)) * graphWidth;
    const normalizedY = (val - minBound) / range;
    const y = padding.top + (1 - Math.max(0, Math.min(1, normalizedY))) * graphHeight;
    return { x, y, val };
  });

  const pathData = coords.reduce((acc, curr, idx) => {
    return idx === 0 ? `M ${curr.x} ${curr.y}` : `${acc} L ${curr.x} ${curr.y}`;
  }, '');

  // Fill area under path
  const areaData = coords.length > 0
    ? `${pathData} L ${coords[coords.length - 1].x} ${height - padding.bottom} L ${coords[0].x} ${height - padding.bottom} Z`
    : '';

  const safeY = thresholdSafe !== null ? padding.top + (1 - (thresholdSafe - minBound) / range) * graphHeight : null;
  const cautionY = thresholdCaution !== null ? padding.top + (1 - (thresholdCaution - minBound) / range) * graphHeight : null;

  return (
    <div className="glass-panel" style={{ padding: '24px', width: '100%' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          marginBottom: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <TrendingUp size={18} color="var(--accent-blue)" />
          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Historical Telemetry & Prediction Trends
          </span>
        </div>

        {/* Tab switcher */}
        <div
          style={{
            display: 'flex',
            backgroundColor: 'rgba(255, 255, 255, 0.04)',
            borderRadius: '8px',
            padding: '3px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
          }}
        >
          <button
            onClick={() => setActiveTab('wqi')}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: activeTab === 'wqi' ? 'var(--accent-cyan)' : 'transparent',
              color: activeTab === 'wqi' ? '#0f172a' : 'var(--text-muted)',
              fontWeight: 700,
              fontSize: '12px',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            WQI Index
          </button>
          <button
            onClick={() => setActiveTab('temp')}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: activeTab === 'temp' ? 'var(--accent-blue)' : 'transparent',
              color: activeTab === 'temp' ? '#ffffff' : 'var(--text-muted)',
              fontWeight: 700,
              fontSize: '12px',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            Temperature
          </button>
          <button
            onClick={() => setActiveTab('turbidity')}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: activeTab === 'turbidity' ? 'var(--caution-amber)' : 'transparent',
              color: activeTab === 'turbidity' ? '#0f172a' : 'var(--text-muted)',
              fontWeight: 700,
              fontSize: '12px',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            Turbidity
          </button>
        </div>
      </div>

      {/* SVG Chart */}
      <div style={{ width: '100%', overflowX: 'auto' }}>
        <svg
          viewBox={`0 0 ${width} ${height}`}
          style={{ width: '100%', height: 'auto', display: 'block', minWidth: '480px' }}
        >
          <defs>
            <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.3" />
              <stop offset="100%" stopColor={color} stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          <line
            x1={padding.left}
            y1={height - padding.bottom}
            x2={width - padding.right}
            y2={height - padding.bottom}
            stroke="#1e293b"
            strokeWidth="1"
          />
          <line
            x1={padding.left}
            y1={padding.top}
            x2={width - padding.right}
            y2={padding.top}
            stroke="#1e293b"
            strokeWidth="1"
            strokeDasharray="3 3"
          />

          {/* WQI Threshold guidelines */}
          {safeY !== null && (
            <g>
              <line
                x1={padding.left}
                y1={safeY}
                x2={width - padding.right}
                y2={safeY}
                stroke="#10b981"
                strokeWidth="1"
                strokeDasharray="4 4"
                opacity="0.6"
              />
              <text x={width - padding.right} y={safeY - 4} fill="#10b981" fontSize="10" textAnchor="end">
                Safe Threshold (30)
              </text>
            </g>
          )}

          {cautionY !== null && (
            <g>
              <line
                x1={padding.left}
                y1={cautionY}
                x2={width - padding.right}
                y2={cautionY}
                stroke="#ef4444"
                strokeWidth="1"
                strokeDasharray="4 4"
                opacity="0.6"
              />
              <text x={width - padding.right} y={cautionY - 4} fill="#ef4444" fontSize="10" textAnchor="end">
                Hazardous Cutoff (60)
              </text>
            </g>
          )}

          {/* Area under curve */}
          {areaData && <path d={areaData} fill="url(#chartGradient)" />}

          {/* Main Line */}
          {pathData && (
            <path
              d={pathData}
              fill="none"
              stroke={color}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Data points */}
          {coords.map((pt, i) => (
            <circle
              key={i}
              cx={pt.x}
              cy={pt.y}
              r="3.5"
              fill={color}
              stroke="#0a0f1d"
              strokeWidth="1.5"
            />
          ))}

          {/* Y Axis Labels */}
          <text x={padding.left - 8} y={padding.top + 4} fill="#64748b" fontSize="10" textAnchor="end" fontFamily="var(--font-mono)">
            {maxBound} {unit}
          </text>
          <text x={padding.left - 8} y={height - padding.bottom} fill="#64748b" fontSize="10" textAnchor="end" fontFamily="var(--font-mono)">
            {minBound} {unit}
          </text>
        </svg>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px', fontSize: '11px', color: 'var(--text-dim)' }}>
        <span>← Earlier Readings</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: color }} />
          Latest: {values.length > 0 ? values[values.length - 1].toFixed(1) : '--'} {unit}
        </span>
      </div>
    </div>
  );
}
