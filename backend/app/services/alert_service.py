from __future__ import annotations
import uuid
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional

from app.models.telemetry import AlertItem
from app.core.config import (
    WQI_OPTIMAL_THRESHOLD,
    WQI_CAUTION_THRESHOLD,
    TEMP_MIN_COMFORT_C,
    TEMP_MAX_COMFORT_C,
)

class AlertService:
    def __init__(self, max_history: int = 50):
        self._alerts: List[Dict[str, Any]] = []
        self._max_history = max_history

    def evaluate_telemetry(self, telemetry: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        wqi = telemetry.get("wqi", 0.0)
        temp = telemetry.get("temperature_c", 25.0)
        ntu = telemetry.get("ntu", 0.0)
        now_str = datetime.now(timezone.utc).isoformat()

        new_alert = None

        if wqi >= WQI_CAUTION_THRESHOLD:
            new_alert = {
                "id": str(uuid.uuid4())[:8],
                "severity": "critical",
                "title": "Hazardous Water Quality Alert",
                "message": f"Critical contamination detected! WQI is {wqi:.1f} (Category: Closed). Suspend swimming access immediately.",
                "timestamp": now_str,
                "acknowledged": False,
            }
        elif wqi >= WQI_OPTIMAL_THRESHOLD:
            new_alert = {
                "id": str(uuid.uuid4())[:8],
                "severity": "warning",
                "title": "Water Quality Caution",
                "message": f"Elevated turbidity or thermal imbalance detected (WQI {wqi:.1f}). Inspect filtration and chlorination.",
                "timestamp": now_str,
                "acknowledged": False,
            }
        elif temp > TEMP_MAX_COMFORT_C:
            new_alert = {
                "id": str(uuid.uuid4())[:8],
                "severity": "info",
                "title": "Elevated Water Temperature",
                "message": f"Water temperature is {temp:.1f}°C, above optimal comfort threshold.",
                "timestamp": now_str,
                "acknowledged": False,
            }

        if new_alert:
            # Check if recent alert of same severity already exists to avoid spamming
            if not self._alerts or self._alerts[-1].get("title") != new_alert["title"]:
                self._alerts.append(new_alert)
                if len(self._alerts) > self._max_history:
                    self._alerts.pop(0)
            return new_alert

        return None

    def get_alerts(self, limit: int = 20) -> List[Dict[str, Any]]:
        return self._alerts[-limit:] if limit else self._alerts

    def acknowledge_alert(self, alert_id: str) -> bool:
        for alert in self._alerts:
            if alert["id"] == alert_id:
                alert["acknowledged"] = True
                return True
        return False

alert_service = AlertService()
