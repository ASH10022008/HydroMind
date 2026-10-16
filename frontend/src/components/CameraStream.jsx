import React, { useState } from 'react';
import { Camera, Radio, RefreshCw, AlertCircle } from 'lucide-react';

export default function CameraStream({ cameraUrl }) {
  const [streamError, setStreamError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  const handleRetry = () => {
    setStreamError(false);
    setRetryKey((prev) => prev + 1);
  };

  const hasStreamUrl = Boolean(cameraUrl && cameraUrl.startsWith('http'));

  return (
    <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Camera size={18} color="var(--accent-cyan)" />
          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            ESP32-CAM Visual Telemetry Feed
          </span>
        </div>

        {hasStreamUrl && !streamError ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span
              className="live-pulse"
              style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10b981' }}
            />
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#10b981' }}>LIVE STREAM</span>
          </div>
        ) : (
          <span style={{ fontSize: '12px', color: 'var(--text-dim)' }}>
            {hasStreamUrl ? 'CONNECTING...' : 'STANDBY'}
          </span>
        )}
      </div>

      {/* Video stream container */}
      <div
        style={{
          width: '100%',
          aspectRatio: '4 / 3',
          backgroundColor: '#050811',
          borderRadius: '12px',
          overflow: 'hidden',
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '1px solid rgba(255, 255, 255, 0.05)',
        }}
      >
        {hasStreamUrl && !streamError ? (
          <img
            key={retryKey}
            src={cameraUrl}
            alt="ESP32-CAM Live Feed"
            onError={() => setStreamError(true)}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
        ) : (
          <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-dim)' }}>
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                backgroundColor: 'rgba(255, 255, 255, 0.03)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 12px',
                border: '1px dashed rgba(255, 255, 255, 0.1)',
              }}
            >
              <Radio size={24} color="#64748b" />
            </div>
            <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>
              {hasStreamUrl ? 'Camera Stream Unreachable' : 'Awaiting ESP32-CAM Stream'}
            </div>
            <div style={{ fontSize: '12px', maxWidth: '280px', margin: '0 auto 12px' }}>
              {hasStreamUrl
                ? `Ensure device at ${cameraUrl} is on the same local Wi-Fi subnet.`
                : 'Microcontroller streams optical telemetry in lightweight mode. Real-time hue classification active.'}
            </div>
            {hasStreamUrl && (
              <button
                onClick={handleRetry}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 14px',
                  backgroundColor: 'rgba(14, 165, 233, 0.15)',
                  border: '1px solid rgba(14, 165, 233, 0.3)',
                  borderRadius: '6px',
                  color: '#38bdf8',
                  fontSize: '12px',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                <RefreshCw size={13} />
                Retry Feed
              </button>
            )}
          </div>
        )}

        {/* Live overlay watermark */}
        <div
          style={{
            position: 'absolute',
            bottom: '10px',
            left: '12px',
            padding: '4px 8px',
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            borderRadius: '4px',
            fontSize: '11px',
            fontFamily: 'var(--font-mono)',
            color: 'rgba(255, 255, 255, 0.8)',
            pointerEvents: 'none',
          }}
        >
          AI-THINKER OV2640 • 20MHz XCLK
        </div>
      </div>
    </div>
  );
}
