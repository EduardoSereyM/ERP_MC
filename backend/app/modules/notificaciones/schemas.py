from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, field_serializer


class NotificacionResponse(BaseModel):
    id: UUID
    user_id: UUID
    tipo: str
    titulo: str
    mensaje: str | None
    leida: bool
    entity_type: str | None
    entity_id: UUID | None
    created_at: datetime

    @field_serializer("id", "user_id", "entity_id")
    def serializar_uuid(self, v):
        return str(v) if v is not None else None

    model_config = {"from_attributes": True}


class ContadorResponse(BaseModel):
    no_leidas: int
