import React from 'react';
import { ShieldCheck, AlertTriangle, XCircle, Info } from 'lucide-react';

export default function WqiGauge({ wqi = 15.0, category = 'Optimal', severity = 'good' }) {
  const clampedWqi = Math.max(0, Math.min(100, Number(wqi) || 0));

  // Determine styling & icon based on category/severity
  let statusColor = '#10b981'; // Green (Safe)
  let glowColor = 'rgba(16, 185, 129, 0.25)';
  let StatusIcon = ShieldCheck;
  let statusHeadline = 'Water Safe & Optimal';
  let statusSummary = 'Water meets international recreational safety standards. Micro-clarity and chemistry are balanced.';

  if (clampedWqi > 60 || category?.toLowerCase() === 'closed') {
    statusColor = '#ef4444'; // Red (Closed)
    glowColor = 'rgba(239, 68, 68, 0.35)';
    StatusIcon = XCircle;
    statusHeadline = 'Closed / Hazardous';
    statusSummary = 'Critical contamination or severe turbidity detected. Swimming and water immersion suspended.';
  } else if (clampedWqi > 30 || category?.toLowerCase() === 'caution') {
    statusColor = '#f59e0b'; // Amber (Caution)
    glowColor = 'rgba(245, 158, 11, 0.3)';
    StatusIcon = AlertTriangle;
    statusHeadline = 'Caution: Moderate Risk';
    statusSummary = 'Water parameters show slight turbidity or temperature imbalance. Safe with heightened monitoring.';
  }

  // Semi-circle gauge SVG calculations
  const radius = 95;
  const strokeWidth = 14;
  const circumference = Math.PI * radius;
  // Progress along the arc (0 - 100)
  const offset = circumference - (clampedWqi / 100) * circumference;

  return (
    <div
      className="glass-panel"
      style={{
        padding: '28px 24px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Background glow radial */}
      <div
        style={{
          position: 'absolute',
          top: '-40px',
          width: '240px',
          height: '240px',
          background: glowColor,
          filter: 'blur(50px)',
          borderRadius: '50%',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      <div style={{ zIndex: 1, width: '100%', textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Water Quality Index (WQI)
          </span>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 10px',
              borderRadius: '20px',
              fontSize: '12px',
              fontWeight: 700,
              backgroundColor: `${statusColor}20`,
              color: statusColor,
              border: `1px solid ${statusColor}40`,
            }}
          >
            <StatusIcon size={14} />
            {category?.toUpperCase() || 'OPTIMAL'}
          </span>
        </div>

        {/* Semi-circle SVG Gauge */}
        <div style={{ position: 'relative', width: '220px', height: '125px', margin: '14px auto 0' }}>
          <svg width="220" height="125" viewBox="0 0 220 125" style={{ overflow: 'visible' }}>
            <defs>
              <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#10b981" />
                <stop offset="45%" stopColor="#f59e0b" />
                <stop offset="85%" stopColor="#ef4444" />
              </linearGradient>
            </defs>
            {/* Background Arc */}
            <path
              d="M 15 110 A 95 95 0 0 1 205 110"
              fill="none"
              stroke="#1e293b"
              strokeWidth={strokeWidth}
              strokeLinecap="round"
            />
            {/* Active Colored Arc */}
            <path
              d="M 15 110 A 95 95 0 0 1 205 110"
              fill="none"
              stroke="url(#gaugeGradient)"
              strokeWidth={strokeWidth}
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              strokeLinecap="round"
              style={{ transition: 'stroke-dashoffset 0.8s ease' }}
            />
          </svg>

          {/* Central numeric display */}
          <div
            style={{
              position: 'absolute',
              bottom: '0',
              left: '50%',
              transform: 'translateX(-50%)',
              textAlign: 'center',
            }}
          >
            <span
              className="font-mono"
              style={{
                fontSize: '44px',
                fontWeight: 800,
                color: 'var(--text-main)',
                lineHeight: 1,
              }}
            >
              {clampedWqi.toFixed(1)}
            </span>
            <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '2px' }}>
              SCALE 0 (CLEAN) - 100 (HAZARDOUS)
            </div>
          </div>
        </div>

        {/* Status explanation */}
        <div
          style={{
            marginTop: '18px',
            padding: '12px 16px',
            backgroundColor: 'rgba(255, 255, 255, 0.03)',
            borderRadius: '10px',
            border: '1px solid rgba(255, 255, 255, 0.05)',
          }}
        >
          <div style={{ fontSize: '14px', fontWeight: 600, color: statusColor, marginBottom: '4px' }}>
            {statusHeadline}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
            {statusSummary}
          </div>
        </div>
      </div>
    </div>
  );
}
