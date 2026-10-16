import React, { useState } from 'react';
import {
  Droplets,
  Radio,
  QrCode,
  Layers,
  Sliders,
  CheckCircle,
  HelpCircle,
  Shield,
  Clock,
  Cpu,
  Wifi,
} from 'lucide-react';
import WqiGauge from '../components/WqiGauge';
import MetricCards from '../components/MetricCards';
import CameraStream from '../components/CameraStream';
import TrendCharts from '../components/TrendCharts';
import AlertBanner from '../components/AlertBanner';
import QrCodeModal from '../components/QrCodeModal';

export default function DashboardView({
  telemetry,
  history,
  alerts,
  isConnected,
  lastUpdated,
  onRefresh,
}) {
  const [viewMode, setViewMode] = useState('operator'); // 'guest' | 'operator'
  const [facility, setFacility] = useState('Resort Main Lagoon Pool');
  const [isQrOpen, setIsQrOpen] = useState(false);

  const wqi = telemetry?.wqi ?? 18.2;
  const category = telemetry?.category ?? 'Optimal';
  const severity = telemetry?.severity ?? 'good';
  const cameraUrl = telemetry?.cameraUrl;

  return (
    <div style={{ maxWidth: '1360px', margin: '0 auto', padding: '24px 20px 60px' }}>
      {/* =========================================================================
          Top Header Bar
      ========================================================================= */}
      <header
        className="glass-panel"
        style={{
          padding: '16px 24px',
          marginBottom: '24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        {/* Brand & Location */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #0ea5e9, #3b82f6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 20px rgba(14, 165, 233, 0.4)',
            }}
          >
            <Droplets size={24} color="#ffffff" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1 style={{ fontSize: '20px', fontWeight: 800, letterSpacing: '-0.02em', color: '#ffffff' }}>
                Hydromind
              </h1>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: '12px',
                  backgroundColor: 'rgba(14, 165, 233, 0.15)',
                  color: 'var(--accent-cyan)',
                  border: '1px solid rgba(14, 165, 233, 0.3)',
                }}
              >
                EDGE AI WQI
              </span>
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>Site:</span>
              <select
                value={facility}
                onChange={(e) => setFacility(e.target.value)}
                style={{
                  backgroundColor: 'transparent',
                  border: 'none',
                  color: '#38bdf8',
                  fontWeight: 600,
                  fontSize: '13px',
                  cursor: 'pointer',
                  outline: 'none',
                }}
              >
                <option value="Resort Main Lagoon Pool" style={{ backgroundColor: '#0f172a' }}>
                  Resort Main Lagoon Pool
                </option>
                <option value="Waterpark Wavepool Intake" style={{ backgroundColor: '#0f172a' }}>
                  Waterpark Wavepool Intake
                </option>
                <option value="Kids Splash Zone" style={{ backgroundColor: '#0f172a' }}>
                  Kids Splash Zone
                </option>
              </select>
            </div>
          </div>
        </div>

        {/* Action Controls & Live Status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          {/* Live Connection Pill */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '20px',
              backgroundColor: isConnected ? 'rgba(16, 185, 129, 0.12)' : 'rgba(245, 158, 11, 0.12)',
              border: `1px solid ${isConnected ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
            }}
          >
            <span
              className={isConnected ? 'live-pulse' : ''}
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: isConnected ? '#10b981' : '#f59e0b',
              }}
            />
            <span
              style={{
                fontSize: '12px',
                fontWeight: 600,
                color: isConnected ? '#10b981' : '#f59e0b',
                fontFamily: 'var(--font-mono)',
              }}
            >
              {isConnected ? 'WS LIVE' : 'HTTP SYNC'}
            </span>
          </div>

          {/* QR Code Button */}
          <button
            onClick={() => setIsQrOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: '8px',
              color: '#ffffff',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'background 0.2s',
            }}
          >
            <QrCode size={16} color="var(--accent-cyan)" />
            <span>Poolside QR</span>
          </button>

          {/* View Mode Toggle */}
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
              onClick={() => setViewMode('guest')}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: viewMode === 'guest' ? 'var(--accent-cyan)' : 'transparent',
                color: viewMode === 'guest' ? '#0f172a' : 'var(--text-muted)',
                fontWeight: 700,
                fontSize: '12px',
                cursor: 'pointer',
              }}
            >
              Guest View
            </button>
            <button
              onClick={() => setViewMode('operator')}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: viewMode === 'operator' ? 'var(--accent-blue)' : 'transparent',
                color: viewMode === 'operator' ? '#ffffff' : 'var(--text-muted)',
                fontWeight: 700,
                fontSize: '12px',
                cursor: 'pointer',
              }}
            >
              Operator View
            </button>
          </div>
        </div>
      </header>

      {/* =========================================================================
          Active Alert Notification Banner
      ========================================================================= */}
      <AlertBanner alerts={alerts} wqi={wqi} category={category} />

      {/* =========================================================================
          Primary Metrics Grid
      ========================================================================= */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(320px, 380px) 1fr',
          gap: '20px',
          alignItems: 'start',
          marginBottom: '20px',
        }}
      >
        {/* Left: Unified Water Quality Index Gauge */}
        <WqiGauge wqi={wqi} category={category} severity={severity} />

        {/* Right: Multi-modal Physical & Optical Telemetry */}
        <MetricCards telemetry={telemetry} />
      </div>

      {/* =========================================================================
          Visual Stream & Time-Series Analytics
      ========================================================================= */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: viewMode === 'guest' ? '1fr' : 'minmax(320px, 440px) 1fr',
          gap: '20px',
          alignItems: 'start',
          marginBottom: '24px',
        }}
      >
        {/* ESP32-CAM Live Feed */}
        <CameraStream cameraUrl={cameraUrl} />

        {/* Historical Trend Charts */}
        <TrendCharts history={history} />
      </div>

      {/* =========================================================================
          Operator Diagnostics & Decentralized Architecture Panel
      ========================================================================= */}
      {viewMode === 'operator' && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '20px',
          }}
        >
          {/* Edge Architecture Details */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <Cpu size={18} color="var(--accent-cyan)" />
              <h3 style={{ fontSize: '14px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                Edge Hardware Telemetry Stack
              </h3>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255, 255, 255, 0.05)', paddingBottom: '6px' }}>
                <span style={{ color: 'var(--text-dim)' }}>Microcontroller:</span>
                <span className="font-mono">ESP32-CAM (AI-Thinker Xtensa LX6)</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255, 255, 255, 0.05)', paddingBottom: '6px' }}>
                <span style={{ color: 'var(--text-dim)' }}>Digital Temperature Bus:</span>
                <span className="font-mono">DS18B20 OneWire (GPIO 13)</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255, 255, 255, 0.05)', paddingBottom: '6px' }}>
                <span style={{ color: 'var(--text-dim)' }}>Precision ADC Module:</span>
                <span className="font-mono">ADS1115 16-Bit I2C (SDA 14, SCL 15)</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255, 255, 255, 0.05)', paddingBottom: '6px' }}>
                <span style={{ color: 'var(--text-dim)' }}>Analog Turbidity Probe:</span>
                <span className="font-mono">R-0913 Suspended Solids Transducer</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-dim)' }}>ML Regressor Pipeline:</span>
                <span className="font-mono" style={{ color: '#10b981' }}>RandomForestRegressor (7-D Vector)</span>
              </div>
            </div>
          </div>

          {/* Why WQI is Different from AQI Educational Card */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <Shield size={18} color="var(--accent-blue)" />
              <h3 style={{ fontSize: '14px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                Decentralized WQI vs. Centralized AQI
              </h3>
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.6 }}>
              Unlike AQI (Air Quality Index), which monitors ambient regional air across city stations,
              <strong> Hydromind delivers decentralized, location-specific Water Quality Index (WQI)</strong> directly
              at each resort pool or waterpark attraction. Guests verify water safety before stepping in, without
              relying on slow municipal lab reports or opaque maintenance logs.
            </div>
            <div style={{ marginTop: '14px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '4px', backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
                0-30: Optimal (Safe)
              </span>
              <span style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '4px', backgroundColor: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' }}>
                31-60: Caution (Moderate)
              </span>
              <span style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '4px', backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' }}>
                61-100: Closed (Hazardous)
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Guest QR Code Modal */}
      <QrCodeModal isOpen={isQrOpen} onClose={() => setIsQrOpen(false)} facilityName={facility} />
    </div>
  );
}
