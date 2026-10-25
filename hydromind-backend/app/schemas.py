from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class SensorReadingCreate(BaseModel):
    temperature: float = Field(
        ge=-50, le=100, allow_inf_nan=False
    )
    turbidity_voltage: float = Field(
        ge=0, le=5, allow_inf_nan=False
    )


class SensorReadingResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    temperature: float
    turbidity_voltage: float
    pollution_score: Optional[float]
    analysis_status: str
    created_at: datetime
