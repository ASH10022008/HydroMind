import React from 'react';
import { useHydromindData } from './services/useWebSocket';
import DashboardView from './views/DashboardView';

export default function App() {
  const { telemetry, history, alerts, isConnected, lastUpdated, refresh } = useHydromindData();

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <DashboardView
        telemetry={telemetry}
        history={history}
        alerts={alerts}
        isConnected={isConnected}
        lastUpdated={lastUpdated}
        onRefresh={refresh}
      />
    </div>
  );
}
