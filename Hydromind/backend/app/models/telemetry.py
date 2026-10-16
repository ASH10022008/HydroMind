from __future__ import annotations
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field

class ESPTelemetryPayload(BaseModel):
    """Payload received from the ESP32 / ESP32-CAM firmware."""
    temperature: Optional[float] = Field(None, description="Water temperature in Celsius")
    turbidity_voltage: Optional[float] = Field(None, description="Turbidity analog voltage (0.5 - 3.0V)")
    turbidity: Optional[float] = Field(None, description="Legacy fallback field for turbidity")
    hue_angle: Optional[float] = Field(None, description="Optical hue angle (0 - 360 deg)")
    color: Optional[str] = Field("Unknown", description="Classified optical water color")
    cameraUrl: Optional[str] = Field(None, description="ESP32-CAM MJPEG stream URL")

class WQIResult(BaseModel):
    """Processed Water Quality Index response."""
    wqi: float = Field(..., description="Calculated WQI index (0 - 100, lower is safer)")
    category: str = Field(..., description="Optimal, Caution, or Closed")
    severity: str = Field(..., description="good, moderate, or critical")
    ntu: float = Field(..., description="Nephelometric Turbidity Units")
    temperature_c: float = Field(..., description="Temperature in Celsius")
    dissolved_o2: float = Field(..., description="Estimated dissolved oxygen in mg/L")
    turbidity_voltage: float = Field(..., description="Raw sensor voltage")
    hue_angle: Optional[float] = Field(None, description="Hue angle")
    color: str = Field("Unknown", description="Classified water color")
    cameraUrl: Optional[str] = Field(None, description="ESP32-CAM stream URL")
    visual_features: Dict[str, float] = Field(default_factory=dict)
    timestamp: str = Field(..., description="ISO 8601 timestamp")

class AlertItem(BaseModel):
    id: str
    severity: str = Field(..., description="info, warning, or critical")
    title: str
    message: str
    timestamp: str
    acknowledged: bool = False

class TelemetryHistoryResponse(BaseModel):
    count: int
    history: List[WQIResult]
