# HydroMind Backend

FastAPI backend for water-quality sensor telemetry, reading history, and live updates.

## Features

- REST API for submitting sensor readings
- SQLite persistence using SQLAlchemy
- Latest-reading and history endpoints
- WebSocket broadcasts for live sensor updates
- Request validation with Pydantic
- Automated API and WebSocket tests

## Requirements

- Python 3.9+
- pip

## Setup

From this directory, create and activate a virtual environment:

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
```

## Run the server

```bash
uvicorn app.main:app --reload
```

API documentation: http://127.0.0.1:8000/docs

Health check: http://127.0.0.1:8000/health

## API Endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/health` | Check service health |
| POST | `/api/analyze` | Save a sensor reading |
| GET | `/api/score` | Retrieve the latest reading |
| GET | `/api/history` | Retrieve reading history |
| WebSocket | `/ws/telemetry` | Receive live reading updates |

### Submit a reading

Send a POST request to `/api/analyze` with:

```json
{
  "temperature": 30.0,
  "turbidity_voltage": 2.5
}
```

The reading is stored with its analysis status set to `pending`. A real pollution-scoring algorithm has not yet been implemented.

## Run tests

```bash
pytest -v
```

Tests use an isolated in-memory SQLite database.

## Current limitations

- Pollution scoring is not implemented yet.
- SQLite is intended for this prototype; deployment requirements may call for another database.
- CORS is permissive for development and should be restricted to trusted frontend origins before deployment.
