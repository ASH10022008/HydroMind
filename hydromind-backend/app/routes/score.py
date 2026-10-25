from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import SensorReading
from app.schemas import SensorReadingResponse

router = APIRouter()


@router.get("/score", response_model=SensorReadingResponse)
def get_latest_score(db: Session = Depends(get_db)):
    reading = (
        db.query(SensorReading)
        .order_by(SensorReading.id.desc())
        .first()
    )

    if reading is None:
        raise HTTPException(
            status_code=404,
            detail="No sensor readings available yet",
        )

    return reading
