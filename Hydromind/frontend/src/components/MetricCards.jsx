import React from 'react';
import { Thermometer, Eye, Activity, Wind, Droplets } from 'lucide-react';

export default function MetricCards({ telemetry }) {
  const tempC = telemetry?.temperature ?? telemetry?.temperature_c ?? 24.5;
  const tempF = (tempC * 9) / 5 + 32;

  const turbV = telemetry?.turbidity_voltage ?? telemetry?.turbidityVoltage ?? 2.85;
  const ntu = telemetry?.ntu ?? Math.max(0, ((3.0 - Math.min(3.0, turbV)) / 2.5) * 1000);

  const doMgL = telemetry?.dissolved_o2 ?? 8.6;
  const hue = telemetry?.hue_angle ?? telemetry?.hueAngle ?? 195.0;
  const color = telemetry?.color || 'Cyan';

  // Clarity status based on NTU
  let turbidityStatus = { label: 'Crystal Clear', color: '#10b981' };
  if (ntu > 250) {
    turbidityStatus = { label: 'High Turbidity', color: '#ef4444' };
  } else if (ntu > 80) {
    turbidityStatus = { label: 'Slightly Clouded', color: '#f59e0b' };
  }

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
        gap: '16px',
        width: '100%',
      }}
    >
      {/* 1. Temperature Card */}
      <div className="glass-panel" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Water Temperature
          </span>
          <div
            style={{
              padding: '6px',
              borderRadius: '8px',
              backgroundColor: 'rgba(59, 130, 246, 0.15)',
              color: '#60a5fa',
            }}
          >
            <Thermometer size={18} />
          </div>
        </div>
        <div style={{ marginTop: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
            <span className="font-mono" style={{ fontSize: '32px', fontWeight: 800 }}>
              {Number(tempC).toFixed(1)}
            </span>
            <span style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-muted)' }}>°C</span>
            <span style={{ fontSize: '14px', color: 'var(--text-dim)', marginLeft: '6px' }}>
              ({Number(tempF).toFixed(1)}°F)
            </span>
          </div>
          <div style={{ fontSize: '11px', color: '#93c5fd', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span>DS18B20 OneWire Sensor</span>
            <span>•</span>
            <span>Optimal Range (22-30°C)</span>
          </div>
        </div>
      </div>

      {/* 2. Turbidity Sensor Card */}
      <div className="glass-panel" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Turbidity / Clarity
          </span>
          <div
            style={{
              padding: '6px',
              borderRadius: '8px',
              backgroundColor: 'rgba(6, 182, 212, 0.15)',
              color: '#22d3ee',
            }}
          >
            <Droplets size={18} />
          </div>
        </div>
        <div style={{ marginTop: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
            <span className="font-mono" style={{ fontSize: '32px', fontWeight: 800 }}>
              {Number(turbV).toFixed(3)}
            </span>
            <span style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-muted)' }}>V</span>
            <span className="font-mono" style={{ fontSize: '15px', color: '#38bdf8', marginLeft: '6px' }}>
              ({Math.round(ntu)} NTU)
            </span>
          </div>
          <div style={{ fontSize: '11px', color: turbidityStatus.color, marginTop: '6px', fontWeight: 600 }}>
            {turbidityStatus.label} • ADS1115 16-Bit
          </div>
        </div>
      </div>

      {/* 3. Dissolved Oxygen Card */}
      <div className="glass-panel" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Dissolved Oxygen (DO)
          </span>
          <div
            style={{
              padding: '6px',
              borderRadius: '8px',
              backgroundColor: 'rgba(16, 185, 129, 0.15)',
              color: '#34d399',
            }}
          >
            <Wind size={18} />
          </div>
        </div>
        <div style={{ marginTop: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
            <span className="font-mono" style={{ fontSize: '32px', fontWeight: 800 }}>
              {Number(doMgL).toFixed(2)}
            </span>
            <span style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-muted)' }}>mg/L</span>
          </div>
          <div style={{ fontSize: '11px', color: '#6ee7b7', marginTop: '6px' }}>
            Healthy Aeration & Organic Balance
          </div>
        </div>
      </div>

      {/* 4. Optical Color & Hue Card */}
      <div className="glass-panel" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Optical Color Profile
          </span>
          <div
            style={{
              padding: '6px',
              borderRadius: '8px',
              backgroundColor: 'rgba(168, 85, 247, 0.15)',
              color: '#c084fc',
            }}
          >
            <Eye size={18} />
          </div>
        </div>
        <div style={{ marginTop: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '26px',
                height: '26px',
                borderRadius: '50%',
                backgroundColor: `hsl(${hue}, 70%, 50%)`,
                boxShadow: `0 0 10px hsl(${hue}, 70%, 50%)`,
                border: '2px solid rgba(255, 255, 255, 0.2)',
              }}
            />
            <span style={{ fontSize: '24px', fontWeight: 700 }}>
              {color}
            </span>
            <span className="font-mono" style={{ fontSize: '14px', color: 'var(--text-dim)' }}>
              ({Number(hue).toFixed(0)}°)
            </span>
          </div>
          <div style={{ fontSize: '11px', color: '#d8b4fe', marginTop: '8px' }}>
            ESP32-CAM Edge Frame Hue Classifier
          </div>
        </div>
      </div>
    </div>
  );
}
