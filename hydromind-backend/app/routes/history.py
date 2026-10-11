from typing import List

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import SensorReading
from app.schemas import SensorReadingResponse

router = APIRouter()


@router.get("/history", response_model=List[SensorReadingResponse])
def get_history(
    limit: int = Query(default=50, ge=1, le=500),
    db: Session = Depends(get_db),
):
    readings = (
        db.query(SensorReading)
        .order_by(SensorReading.id.desc())
        .limit(limit)
        .all()
    )

    return readings
