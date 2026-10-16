import React from 'react';
import { AlertTriangle, AlertOctagon, CheckCircle2 } from 'lucide-react';
import { acknowledgeAlert } from '../services/api';

export default function AlertBanner({ alerts = [], wqi = 15.0, category = 'Optimal', onAlertDismiss }) {
  const activeAlerts = alerts.filter((a) => !a.acknowledged);

  const isClosed = wqi > 60 || category?.toLowerCase() === 'closed';
  const isCaution = !isClosed && (wqi > 30 || category?.toLowerCase() === 'caution');

  if (!isClosed && !isCaution && activeAlerts.length === 0) {
    return null;
  }

  const primaryAlert = activeAlerts[0];
  const severity = isClosed ? 'critical' : 'warning';
  const bgColor = isClosed ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)';
  const borderColor = isClosed ? 'rgba(239, 68, 68, 0.4)' : 'rgba(245, 158, 11, 0.4)';
  const textColor = isClosed ? '#fca5a5' : '#fcd34d';
  const Icon = isClosed ? AlertOctagon : AlertTriangle;

  const handleDismiss = async (id) => {
    try {
      if (id) await acknowledgeAlert(id);
      if (onAlertDismiss) onAlertDismiss(id);
    } catch (e) {
      console.error('Failed to dismiss alert:', e);
    }
  };

  return (
    <div
      style={{
        width: '100%',
        backgroundColor: bgColor,
        border: `1px solid ${borderColor}`,
        borderRadius: '12px',
        padding: '16px 20px',
        marginBottom: '20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <div style={{ color: isClosed ? '#ef4444' : '#f59e0b', flexShrink: 0 }}>
          <Icon size={24} />
        </div>
        <div>
          <div style={{ fontSize: '14px', fontWeight: 700, color: '#ffffff' }}>
            {primaryAlert?.title || (isClosed ? 'CRITICAL WATER HAZARD ALERT' : 'WATER QUALITY CAUTION')}
          </div>
          <div style={{ fontSize: '13px', color: textColor, marginTop: '2px' }}>
            {primaryAlert?.message ||
              (isClosed
                ? `WQI is ${wqi.toFixed(1)}: Water clarity or pathogen risk requires immediate facility closure and pump cycle.`
                : `WQI is ${wqi.toFixed(1)}: Elevated turbidity or thermal drift detected. Swimmer caution advised.`)}
          </div>
        </div>
      </div>

      {primaryAlert && (
        <button
          onClick={() => handleDismiss(primaryAlert.id)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '6px',
            padding: '6px 12px',
            color: '#ffffff',
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          <CheckCircle2 size={14} />
          Acknowledge
        </button>
      )}
    </div>
  );
}
