from __future__ import annotations
import time
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import PROJECT_NAME, VERSION, CORS_ORIGINS
from app.api.telemetry import router as telemetry_router
from app.api.alerts import router as alerts_router
from app.services.websocket_manager import ws_manager
from app.services.telemetry_store import telemetry_store
from app.services.ml_service import ml_service

start_time = time.time()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize baseline telemetry
    print(f"[{PROJECT_NAME}] Starting up...")
    base_pred = ml_service.predict(24.5, 2.85, 195.0, "Cyan")
    now_iso = datetime.now(timezone.utc).isoformat()
    telemetry_store.add_telemetry({
        "temperature": 24.5,
        "temperature_c": 24.5,
        "turbidity_voltage": 2.85,
        "turbidityVoltage": 2.85,
        "hue_angle": 195.0,
        "hueAngle": 195.0,
        "color": "Cyan",
        "cameraUrl": None,
        "wqi": base_pred["wqi"],
        "category": base_pred["category"],
        "severity": base_pred["severity"],
        "ntu": base_pred["ntu"],
        "dissolved_o2": base_pred["dissolved_o2"],
        "visual_features": base_pred.get("visual_features", {}),
        "timestamp": now_iso,
        "updatedAt": now_iso,
    })
    print(f"[{PROJECT_NAME}] Initialized baseline telemetry (WQI: {base_pred['wqi']}, Category: {base_pred['category']})")
    yield
    print(f"[{PROJECT_NAME}] Shutting down...")

app = FastAPI(
    title=PROJECT_NAME,
    version=VERSION,
    description="Real-Time IoT Water Quality Index (WQI) Platform for Leisure Sites",
    lifespan=lifespan,
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(telemetry_router, prefix="/api")
app.include_router(alerts_router, prefix="/api")

@app.get("/api/health", tags=["Health"])
def health_check():
    """Health check endpoint for container orchestrators and dashboards."""
    return {
        "ok": True,
        "uptime": round(time.time() - start_time, 2),
        "service": PROJECT_NAME,
        "version": VERSION,
        "model_loaded": ml_service._model_instance is not None,
    }

@app.websocket("/ws")
@app.websocket("/api/ws")
async def websocket_endpoint(websocket: WebSocket):
    """
    WebSocket endpoint streaming live telemetry updates, WQI calculations,
    and threshold alerts directly to connected frontend clients.
    """
    await ws_manager.connect(websocket)
    # Send immediate current state upon connection
    latest = telemetry_store.get_latest()
    if latest:
        await websocket.send_json({
            "type": "INITIAL_STATE",
            "data": latest,
        })
    try:
        while True:
            # Keep connection alive & handle incoming pings
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
    except Exception as e:
        print(f"[WebSocket] Connection closed with error: {e}")
        ws_manager.disconnect(websocket)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=3000, reload=True)
