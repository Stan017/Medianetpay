from datetime import datetime
from pydantic import BaseModel, Field


class NotificationOut(BaseModel):
    id: str
    merchant_id: str
    type: str
    title: str
    body: str
    read: bool
    # extra_data en el modelo SQLAlchemy → metadata en la API
    metadata: dict = Field(default={}, validation_alias="extra_data")
    created_at: datetime

    model_config = {"from_attributes": True, "populate_by_name": True}


class NotificationListResponse(BaseModel):
    items: list[NotificationOut]
    unread_count: int


class PushTokenRequest(BaseModel):
    push_token: str
