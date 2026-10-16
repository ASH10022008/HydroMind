const API_BASE = '/api';

export async function fetchLatestTelemetry() {
  const res = await fetch(`${API_BASE}/telemetry/latest`);
  if (!res.ok) throw new Error('Failed to fetch latest telemetry');
  return res.json();
}

export async function fetchTelemetryHistory(limit = 30) {
  const res = await fetch(`${API_BASE}/telemetry/history?limit=${limit}`);
  if (!res.ok) throw new Error('Failed to fetch telemetry history');
  return res.json();
}

export async function fetchCameraUrl() {
  const res = await fetch(`${API_BASE}/camera-url`);
  if (!res.ok) throw new Error('Failed to fetch camera URL');
  return res.json();
}

export async function fetchAlerts() {
  const res = await fetch(`${API_BASE}/alerts`);
  if (!res.ok) throw new Error('Failed to fetch alerts');
  return res.json();
}

export async function acknowledgeAlert(alertId) {
  const res = await fetch(`${API_BASE}/alerts/${alertId}/acknowledge`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error('Failed to acknowledge alert');
  return res.json();
}
