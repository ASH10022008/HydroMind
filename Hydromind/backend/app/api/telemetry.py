from __future__ import annotations
from datetime import datetime, timezone
from typing import Dict, Any, Optional, List
from fastapi import APIRouter, HTTPException, Query, BackgroundTasks

from app.models.telemetry import ESPTelemetryPayload, WQIResult
from app.services.ml_service import ml_service
from app.services.telemetry_store import telemetry_store
from app.services.alert_service import alert_service
from app.services.websocket_manager import ws_manager

router = APIRouter(tags=["Telemetry"])

# In-memory baseline if no ESP has connected yet
_baseline_state = {
    "temperature": 24.5,
    "turbidity_voltage": 2.85,
    "hue_angle": 195.0,
    "color": "Cyan",
    "cameraUrl": None,
    "updatedAt": datetime.now(timezone.utc).isoformat(),
    "wqi": 18.2,
    "category": "Optimal",
    "severity": "good",
    "ntu": 60.0,
    "dissolved_o2": 8.6,
}

@router.post("/esp")
async def ingest_esp_telemetry(payload: ESPTelemetryPayload, background_tasks: BackgroundTasks):
    """
    Primary ingestion endpoint for the ESP32 / ESP32-CAM edge firmware.
    Accepts raw physical & optical telemetry, runs RandomForestRegressor WQI inference,
    evaluates safety alerts, and broadcasts to live web dashboards.
    """
    # Normalize voltage
    turbidity_volts = payload.turbidity_voltage
    if turbidity_volts is None and payload.turbidity is not None:
        # Fallback if sensor voltage was normalized or mapped
        turbidity_volts = payload.turbidity if payload.turbidity <= 5.0 else (3.3 - (payload.turbidity / 1000.0) * 2.5)

    # ML Inference
    prediction = ml_service.predict(
        temperature_c=payload.temperature,
        turbidity_voltage=turbidity_volts,
        hue_angle=payload.hue_angle,
        color=payload.color,
    )

    now_iso = datetime.now(timezone.utc).isoformat()

    record: Dict[str, Any] = {
        "temperature": payload.temperature,
        "temperature_c": prediction["temperature_c"],
        "turbidity_voltage": turbidity_volts,
        "turbidityVoltage": turbidity_volts,
        "hue_angle": payload.hue_angle,
        "hueAngle": payload.hue_angle,
        "color": payload.color or "Unknown",
        "cameraUrl": payload.cameraUrl,
        "wqi": prediction["wqi"],
        "category": prediction["category"],
        "severity": prediction["severity"],
        "ntu": prediction["ntu"],
        "dissolved_o2": prediction["dissolved_o2"],
        "visual_features": prediction.get("visual_features", {}),
        "timestamp": now_iso,
        "updatedAt": now_iso,
    }

    # Store telemetry in ring buffer
    telemetry_store.add_telemetry(record)

    # Evaluate safety alert
    alert = alert_service.evaluate_telemetry(record)

    # Broadcast via WebSocket
    background_tasks.add_task(
        ws_manager.broadcast,
        {
            "type": "TELEMETRY_UPDATE",
            "data": record,
            "alert": alert,
        }
    )

    return {
        "ok": True,
        "received": record,
        "wqi": prediction["wqi"],
        "category": prediction["category"],
        "severity": prediction["severity"],
    }

@router.get("/data")
def get_legacy_data():
    """
    Backward-compatible endpoint matching the existing emb/frontend contract.
    Returns current telemetry, optical color, camera stream URL, and predicted WQI.
    """
    latest = telemetry_store.get_latest() or _baseline_state
    return {
        "temperature": latest.get("temperature", latest.get("temperature_c")),
        "turbidityVoltage": latest.get("turbidity_voltage", latest.get("turbidityVoltage")),
        "hueAngle": latest.get("hue_angle", latest.get("hueAngle")),
        "color": latest.get("color", "Unknown"),
        "cameraUrl": latest.get("cameraUrl"),
        "wqi": latest.get("wqi", 18.2),
        "category": latest.get("category", "Optimal"),
        "severity": latest.get("severity", "good"),
        "ntu": latest.get("ntu", 60.0),
        "dissolved_o2": latest.get("dissolved_o2", 8.6),
        "updatedAt": latest.get("updatedAt", datetime.now(timezone.utc).isoformat()),
    }

@router.get("/camera-url")
def get_camera_url():
    """Returns the live ESP32-CAM stream URL for dashboard viewers."""
    latest = telemetry_store.get_latest() or _baseline_state
    return {"cameraUrl": latest.get("cameraUrl")}

@router.get("/telemetry/latest")
def get_latest_telemetry():
    """Returns the full rich telemetry payload including ML features."""
    latest = telemetry_store.get_latest()
    if not latest:
        # Generate initial prediction on baseline
        pred = ml_service.predict(24.5, 2.85, 195.0, "Cyan")
        now_str = datetime.now(timezone.utc).isoformat()
        return {
            **_baseline_state,
            **pred,
            "timestamp": now_str,
            "updatedAt": now_str,
        }
    return latest

@router.get("/telemetry/history")
def get_telemetry_history(limit: int = Query(50, ge=1, le=200)):
    """Returns historical time-series telemetry records for trend charts."""
    history = telemetry_store.get_history(limit=limit)
    if not history:
        # Prepopulate synthetic baseline ramp for charts so initial dashboard is not empty
        dummy_history = []
        now = datetime.now(timezone.utc).timestamp()
        for i in range(15):
            t = now - (15 - i) * 10
            dummy_history.append({
                "temperature": round(24.2 + (i % 3) * 0.2, 1),
                "turbidity_voltage": round(2.80 + (i % 4) * 0.02, 3),
                "wqi": round(17.5 + (i % 5) * 0.8, 1),
                "category": "Optimal",
                "severity": "good",
                "ntu": round(55.0 + (i % 4) * 5.0, 1),
                "timestamp": datetime.fromtimestamp(t, timezone.utc).isoformat(),
            })
        return {"count": len(dummy_history), "history": dummy_history}
    return {"count": len(history), "history": history}
