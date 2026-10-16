import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

import pytest
from fastapi.testclient import TestClient
from app.main import app

@pytest.fixture
def client():
    with TestClient(app) as test_client:
        yield test_client

def test_health_endpoint(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["ok"] is True
    assert data["model_loaded"] is True

def test_esp_ingestion_and_wqi_prediction(client):
    payload = {
        "temperature": 25.5,
        "turbidity_voltage": 2.75,
        "hue_angle": 180.0,
        "color": "Cyan",
        "cameraUrl": "http://192.168.1.100/stream"
    }
    response = client.post("/api/esp", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["ok"] is True
    assert "wqi" in data
    assert 0.0 <= data["wqi"] <= 100.0
    assert data["category"] in ["Optimal", "Caution", "Closed"]

def test_legacy_data_endpoint(client):
    response = client.get("/api/data")
    assert response.status_code == 200
    data = response.json()
    assert "temperature" in data
    assert "turbidityVoltage" in data
    assert "color" in data
    assert "wqi" in data

def test_camera_url_endpoint(client):
    response = client.get("/api/camera-url")
    assert response.status_code == 200
    data = response.json()
    assert "cameraUrl" in data

def test_telemetry_history(client):
    response = client.get("/api/telemetry/history?limit=10")
    assert response.status_code == 200
    data = response.json()
    assert "history" in data
    assert isinstance(data["history"], list)

def test_alerts_endpoint(client):
    response = client.get("/api/alerts")
    assert response.status_code == 200
    assert isinstance(response.json(), list)
