from __future__ import annotations
from collections import deque
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from app.models.telemetry import WQIResult

class TelemetryStore:
    def __init__(self, max_history: int = 120):
        self._history: deque[Dict[str, Any]] = deque(maxlen=max_history)
        self._latest: Optional[Dict[str, Any]] = None

    def add_telemetry(self, item: Dict[str, Any]) -> None:
        self._latest = item
        self._history.append(item)

    def get_latest(self) -> Optional[Dict[str, Any]]:
        return self._latest

    def get_history(self, limit: int = 50) -> List[Dict[str, Any]]:
        items = list(self._history)
        if limit and limit < len(items):
            return items[-limit:]
        return items

# Singleton store instance
telemetry_store = TelemetryStore()
