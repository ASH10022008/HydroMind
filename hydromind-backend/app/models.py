from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import DateTime, Float, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class SensorReading(Base):
    __tablename__ = "sensor_readings"

    id: Mapped[int] = mapped_column(
        Integer, primary_key=True, index=True
    )

    temperature: Mapped[float] = mapped_column(
        Float, nullable=False
    )

    turbidity_voltage: Mapped[float] = mapped_column(
        Float, nullable=False
    )

    pollution_score: Mapped[Optional[float]] = mapped_column(
        Float, nullable=True
    )

    analysis_status: Mapped[str] = mapped_column(
        String(30), default="pending", nullable=False
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
