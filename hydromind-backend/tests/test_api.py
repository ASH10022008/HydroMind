import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
from app.main import app


@pytest.fixture
def client():
    test_engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    TestingSessionLocal = sessionmaker(
        bind=test_engine,
        autoflush=False,
        autocommit=False,
    )

    Base.metadata.create_all(bind=test_engine)

    def override_get_db():
        db = TestingSessionLocal()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db

    with TestClient(app) as test_client:
        yield test_client

    app.dependency_overrides.clear()
    Base.metadata.drop_all(bind=test_engine)
    test_engine.dispose()


def test_health(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_analyze_and_score(client):
    response = client.post(
        "/api/analyze",
        json={"temperature": 30.0, "turbidity_voltage": 2.5},
    )
    assert response.status_code == 201
    assert response.json()["analysis_status"] == "pending"

    score = client.get("/api/score")
    assert score.status_code == 200
    assert score.json()["temperature"] == 30.0


def test_history(client):
    for temperature in [28.0, 29.0]:
        response = client.post(
            "/api/analyze",
            json={"temperature": temperature, "turbidity_voltage": 2.0},
        )
        assert response.status_code == 201

    history = client.get("/api/history")
    assert history.status_code == 200
    assert len(history.json()) == 2
    assert history.json()[0]["temperature"] == 29.0


def test_invalid_sensor_reading(client):
    response = client.post(
        "/api/analyze",
        json={"temperature": 30.0, "turbidity_voltage": 8.0},
    )
    assert response.status_code == 422


def test_websocket_broadcast(client):
    with client.websocket_connect("/ws/telemetry") as websocket:
        response = client.post(
            "/api/analyze",
            json={"temperature": 31.0, "turbidity_voltage": 2.7},
        )
        assert response.status_code == 201

        message = websocket.receive_json()
        assert message["event"] == "sensor_reading"
        assert message["data"]["temperature"] == 31.0
