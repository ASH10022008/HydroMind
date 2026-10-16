import { useState, useEffect, useRef } from 'react';
import { fetchLatestTelemetry, fetchTelemetryHistory, fetchAlerts } from './api';

export function useHydromindData() {
  const [telemetry, setTelemetry] = useState(null);
  const [history, setHistory] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const wsRef = useRef(null);
  const pollIntervalRef = useRef(null);

  // Initial load via REST
  const loadInitialData = async () => {
    try {
      const [latestData, histData, alertData] = await Promise.all([
        fetchLatestTelemetry().catch(() => null),
        fetchTelemetryHistory(30).catch(() => ({ history: [] })),
        fetchAlerts().catch(() => []),
      ]);

      if (latestData) {
        setTelemetry(latestData);
        setLastUpdated(new Date());
      }
      if (histData && Array.isArray(histData.history)) {
        setHistory(histData.history);
      }
      if (Array.isArray(alertData)) {
        setAlerts(alertData);
      }
    } catch (err) {
      console.error('Failed to load initial data:', err);
    }
  };

  useEffect(() => {
    loadInitialData();

    // Setup WebSocket
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/ws`;

    let isUnmounted = false;

    function connectWs() {
      try {
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          if (isUnmounted) return;
          setIsConnected(true);
          console.log('[WebSocket] Connected to Hydromind backend');
        };

        ws.onmessage = (event) => {
          if (isUnmounted) return;
          try {
            const message = JSON.parse(event.data);
            if (message.type === 'INITIAL_STATE' || message.type === 'TELEMETRY_UPDATE') {
              const data = message.data;
              setTelemetry(data);
              setLastUpdated(new Date());

              // Append to history
              setHistory((prev) => {
                const next = [...prev, data];
                return next.slice(-40);
              });

              // Add alert if any
              if (message.alert) {
                setAlerts((prev) => [message.alert, ...prev.filter((a) => a.id !== message.alert.id)]);
              }
            }
          } catch (e) {
            console.error('Error parsing WebSocket message:', e);
          }
        };

        ws.onclose = () => {
          if (isUnmounted) return;
          setIsConnected(false);
          console.log('[WebSocket] Disconnected. Reconnecting in 3s...');
          setTimeout(connectWs, 3000);
        };

        ws.onerror = () => {
          ws.close();
        };
      } catch (err) {
        console.warn('[WebSocket] Init failed, using fallback polling:', err);
      }
    }

    connectWs();

    // Fallback polling every 2.5s to ensure continuous freshness
    pollIntervalRef.current = setInterval(async () => {
      try {
        const latest = await fetchLatestTelemetry();
        if (latest) {
          setTelemetry((curr) => {
            if (!curr || curr.updatedAt !== latest.updatedAt) {
              setLastUpdated(new Date());
              return latest;
            }
            return curr;
          });
        }
      } catch (e) {
        // quiet error on poll
      }
    }, 2500);

    return () => {
      isUnmounted = true;
      if (wsRef.current) wsRef.current.close();
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, []);

  return {
    telemetry,
    history,
    alerts,
    isConnected,
    lastUpdated,
    refresh: loadInitialData,
  };
}
