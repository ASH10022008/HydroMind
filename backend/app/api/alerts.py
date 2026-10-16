from __future__ import annotations
from typing import List, Dict, Any
from fastapi import APIRouter, HTTPException, Query

from app.services.alert_service import alert_service

router = APIRouter(prefix="/alerts", tags=["Alerts"])

@router.get("")
def list_alerts(limit: int = Query(20, ge=1, le=100)) -> List[Dict[str, Any]]:
    """List recent safety alerts and water contamination warnings."""
    return alert_service.get_alerts(limit=limit)

@router.post("/{alert_id}/acknowledge")
def acknowledge_alert(alert_id: str):
    """Mark an operational alert as acknowledged by resort/pool staff."""
    success = alert_service.acknowledge_alert(alert_id)
    if not success:
        raise HTTPException(status_code=404, detail="Alert not found")
    return {"ok": True, "alert_id": alert_id, "acknowledged": True}
