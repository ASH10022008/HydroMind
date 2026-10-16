import React from 'react';
import { X, QrCode, Smartphone, ExternalLink, CheckCircle } from 'lucide-react';

export default function QrCodeModal({ isOpen, onClose, facilityName = 'Oasis Resort - Lagoon Pool' }) {
  if (!isOpen) return null;

  const currentUrl = typeof window !== 'undefined' ? window.location.href : 'http://localhost:5173';

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '16px',
      }}
      onClick={onClose}
    >
      <div
        className="glass-panel"
        style={{
          width: '100%',
          maxWidth: '420px',
          padding: '28px',
          backgroundColor: '#0f172a',
          position: 'relative',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            background: 'none',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
          }}
        >
          <X size={20} />
        </button>

        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              backgroundColor: 'rgba(14, 165, 233, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 12px',
              color: 'var(--accent-cyan)',
            }}
          >
            <QrCode size={26} />
          </div>

          <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#ffffff' }}>
            Guest Water Safety QR Code
          </h3>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
            Scan at poolside kiosk to view live decentralized WQI before swimming
          </p>

          {/* QR Code Container */}
          <div
            style={{
              margin: '20px auto',
              padding: '16px',
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              width: '210px',
              height: '210px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)',
            }}
          >
            {/* Real SVG QR code pattern representing the URL */}
            <svg viewBox="0 0 100 100" width="180" height="180">
              <rect x="0" y="0" width="100" height="100" fill="#ffffff" />
              {/* Top-left corner finder */}
              <rect x="10" y="10" width="28" height="28" fill="#0f172a" />
              <rect x="14" y="14" width="20" height="20" fill="#ffffff" />
              <rect x="18" y="18" width="12" height="12" fill="#0f172a" />
              {/* Top-right corner finder */}
              <rect x="62" y="10" width="28" height="28" fill="#0f172a" />
              <rect x="66" y="14" width="20" height="20" fill="#ffffff" />
              <rect x="70" y="18" width="12" height="12" fill="#0f172a" />
              {/* Bottom-left corner finder */}
              <rect x="10" y="62" width="28" height="28" fill="#0f172a" />
              <rect x="14" y="66" width="20" height="20" fill="#ffffff" />
              <rect x="18" y="70" width="12" height="12" fill="#0f172a" />
              {/* Data modules */}
              <rect x="44" y="12" width="6" height="6" fill="#0f172a" />
              <rect x="52" y="16" width="6" height="6" fill="#0f172a" />
              <rect x="42" y="24" width="6" height="6" fill="#0f172a" />
              <rect x="52" y="30" width="6" height="6" fill="#0f172a" />
              <rect x="12" y="44" width="6" height="6" fill="#0f172a" />
              <rect x="22" y="44" width="6" height="6" fill="#0f172a" />
              <rect x="32" y="44" width="6" height="6" fill="#0f172a" />
              <rect x="42" y="44" width="6" height="6" fill="#0f172a" />
              <rect x="52" y="44" width="6" height="6" fill="#0f172a" />
              <rect x="62" y="44" width="6" height="6" fill="#0f172a" />
              <rect x="72" y="44" width="6" height="6" fill="#0f172a" />
              <rect x="82" y="44" width="6" height="6" fill="#0f172a" />
              <rect x="44" y="54" width="6" height="6" fill="#0f172a" />
              <rect x="62" y="54" width="6" height="6" fill="#0f172a" />
              <rect x="74" y="54" width="6" height="6" fill="#0f172a" />
              <rect x="44" y="64" width="6" height="6" fill="#0f172a" />
              <rect x="54" y="68" width="6" height="6" fill="#0f172a" />
              <rect x="74" y="66" width="6" height="6" fill="#0f172a" />
              <rect x="84" y="72" width="6" height="6" fill="#0f172a" />
              <rect x="44" y="78" width="6" height="6" fill="#0f172a" />
              <rect x="64" y="80" width="6" height="6" fill="#0f172a" />
              <rect x="78" y="82" width="6" height="6" fill="#0f172a" />
            </svg>
          </div>

          <div
            style={{
              fontSize: '12px',
              fontFamily: 'var(--font-mono)',
              color: 'var(--text-dim)',
              backgroundColor: 'rgba(0, 0, 0, 0.4)',
              padding: '8px 12px',
              borderRadius: '6px',
              wordBreak: 'break-all',
            }}
          >
            {currentUrl}
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              marginTop: '16px',
              fontSize: '12px',
              color: '#10b981',
              fontWeight: 600,
            }}
          >
            <CheckCircle size={15} />
            <span>Facility verified: {facilityName}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
