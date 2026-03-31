from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel, field_serializer


# ─── SAC ─────────────────────────────────────────────────────────────────────

class SACCreate(BaseModel):
    cliente_id: UUID
    venta_id: UUID | None = None
    tipo: str = "suministro_instalacion"
    coordinador_id: UUID | None = None
    direccion_obra: str | None = None
    comuna_obra: str | None = None
    ciudad_obra: str | None = None
    fecha_programada: date | None = None
    notas: str | None = None


class SACUpdate(BaseModel):
    coordinador_id: UUID | None = None
    direccion_obra: str | None = None
    comuna_obra: str | None = None
    ciudad_obra: str | None = None
    fecha_programada: date | None = None
    notas: str | None = None


class SACCambioEstado(BaseModel):
    estado: str
    motivo_devolucion: str | None = None
    respuesta_devolucion: str | None = None
    motivo_cierre: str | None = None


class SACResponse(BaseModel):
    id: UUID
    codigo: str
    venta_id: UUID | None
    cliente_id: UUID
    coordinador_id: UUID | None
    estado: str
    tipo: str
    direccion_obra: str | None
    comuna_obra: str | None
    ciudad_obra: str | None
    fecha_programada: date | None
    fecha_ejecucion: date | None
    fecha_cierre: datetime | None
    motivo_devolucion: str | None
    respuesta_devolucion: str | None
    motivo_cierre: str | None
    notas: str | None
    created_at: datetime
    updated_at: datetime
    created_by: UUID | None
    updated_by: UUID | None

    @field_serializer("id", "venta_id", "cliente_id", "coordinador_id", "created_by", "updated_by")
    def ser_uuid(self, v): return str(v) if v else None

    model_config = {"from_attributes": True}


class SACListItem(BaseModel):
    id: UUID
    codigo: str
    venta_id: UUID | None
    cliente_id: UUID
    coordinador_id: UUID | None
    estado: str
    tipo: str
    direccion_obra: str | None
    comuna_obra: str | None
    fecha_programada: date | None
    cliente_razon_social: str | None = None
    created_at: datetime

    @field_serializer("id", "venta_id", "cliente_id", "coordinador_id")
    def ser_uuid(self, v): return str(v) if v else None

    model_config = {"from_attributes": True}


# ─── ContactoObra ─────────────────────────────────────────────────────────────

class ContactoObraCreate(BaseModel):
    nombre: str
    cargo: str = "otro"
    telefono: str | None = None
    email: str | None = None
    es_principal: bool = False
    notas: str | None = None


class ContactoObraResponse(BaseModel):
    id: UUID
    sac_id: UUID
    nombre: str
    cargo: str
    telefono: str | None
    email: str | None
    es_principal: bool
    notas: str | None
    created_at: datetime

    @field_serializer("id", "sac_id")
    def ser_uuid(self, v): return str(v) if v else None

    model_config = {"from_attributes": True}


# ─── OrdenTrabajo ─────────────────────────────────────────────────────────────

class OTCreate(BaseModel):
    supervisor_id: UUID | None = None
    contratista_id: UUID | None = None
    fecha_inicio: date | None = None
    notas: str | None = None


class OTUpdate(BaseModel):
    supervisor_id: UUID | None = None
    contratista_id: UUID | None = None
    fecha_inicio: date | None = None
    notas: str | None = None


class OTCambioEstado(BaseModel):
    estado: str
    motivo_pausa: str | None = None
    motivo_cierre: str | None = None
    duracion_total_minutos: int | None = None


class OTResponse(BaseModel):
    id: UUID
    codigo: str
    sac_id: UUID
    supervisor_id: UUID | None
    contratista_id: UUID | None
    estado: str
    fecha_inicio: date | None
    fecha_fin_real: date | None
    checklist_completado: bool
    duracion_total_minutos: int | None
    motivo_pausa: str | None
    motivo_cierre: str | None
    notas: str | None
    created_at: datetime
    updated_at: datetime

    @field_serializer("id", "sac_id", "supervisor_id", "contratista_id")
    def ser_uuid(self, v): return str(v) if v else None

    model_config = {"from_attributes": True}


# ─── Checklist ───────────────────────────────────────────────────────────────

class ChecklistPreguntaResponse(BaseModel):
    id: UUID
    plantilla_id: UUID
    orden: int
    texto: str
    tipo_respuesta: str
    obligatorio: bool
    permite_foto: bool

    @field_serializer("id", "plantilla_id")
    def ser_uuid(self, v): return str(v) if v else None

    model_config = {"from_attributes": True}


class ChecklistPlantillaResponse(BaseModel):
    id: UUID
    nombre: str
    tipo_trabajo: str
    preguntas: list[ChecklistPreguntaResponse] = []

    @field_serializer("id")
    def ser_uuid(self, v): return str(v) if v else None

    model_config = {"from_attributes": True}


class ChecklistRespuestaUpsert(BaseModel):
    pregunta_id: UUID
    respuesta_texto: str | None = None
    respuesta_boolean: bool | None = None
    foto_url: str | None = None


class ChecklistRespuestaResponse(BaseModel):
    id: UUID
    entidad_tipo: str
    entidad_id: UUID
    pregunta_id: UUID
    respondido_por: UUID
    respuesta_texto: str | None
    respuesta_boolean: bool | None
    foto_url: str | None
    respondido_at: datetime

    @field_serializer("id", "entidad_id", "pregunta_id", "respondido_por")
    def ser_uuid(self, v): return str(v) if v else None

    model_config = {"from_attributes": True}
