from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import SensorReading
from app.schemas import SensorReadingCreate, SensorReadingResponse
from app.websocket import manager

router = APIRouter()


@router.post(
    "/analyze",
    response_model=SensorReadingResponse,
    status_code=status.HTTP_201_CREATED,
)
async def analyze_sensor_data(
    payload: SensorReadingCreate,
    db: Session = Depends(get_db),
):
    reading = SensorReading(
        temperature=payload.temperature,
        turbidity_voltage=payload.turbidity_voltage,
        pollution_score=None,
        analysis_status="pending",
    )

    db.add(reading)
    db.commit()
    db.refresh(reading)

    response = SensorReadingResponse.model_validate(reading)

    await manager.broadcast({
        "event": "sensor_reading",
        "data": response.model_dump(mode="json"),
    })

    return reading
