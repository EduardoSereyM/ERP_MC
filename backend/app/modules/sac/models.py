from datetime import date, datetime
from uuid import UUID

from sqlalchemy import Boolean, Date, DateTime, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class SAC(Base):
    __tablename__ = "sac"

    id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True)
    codigo: Mapped[str] = mapped_column(String(20), unique=True, nullable=False)
    venta_id: Mapped[UUID | None] = mapped_column(PG_UUID(as_uuid=True), nullable=True)
    cliente_id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), nullable=False)
    coordinador_id: Mapped[UUID | None] = mapped_column(PG_UUID(as_uuid=True), nullable=True)

    estado: Mapped[str] = mapped_column(String(30), nullable=False, default="CREADO")
    tipo: Mapped[str] = mapped_column(String(30), nullable=False, default="suministro_instalacion")
    direccion_obra: Mapped[str | None] = mapped_column(Text, nullable=True)
    comuna_obra: Mapped[str | None] = mapped_column(String(100), nullable=True)
    ciudad_obra: Mapped[str | None] = mapped_column(String(100), nullable=True)
    fecha_programada: Mapped[date | None] = mapped_column(Date, nullable=True)
    fecha_ejecucion: Mapped[date | None] = mapped_column(Date, nullable=True)
    fecha_cierre: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    motivo_devolucion: Mapped[str | None] = mapped_column(Text, nullable=True)
    respuesta_devolucion: Mapped[str | None] = mapped_column(Text, nullable=True)
    motivo_cierre: Mapped[str | None] = mapped_column(Text, nullable=True)
    notas: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    created_by: Mapped[UUID | None] = mapped_column(PG_UUID(as_uuid=True), nullable=True)
    updated_by: Mapped[UUID | None] = mapped_column(PG_UUID(as_uuid=True), nullable=True)
    is_deleted: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    deleted_by: Mapped[UUID | None] = mapped_column(PG_UUID(as_uuid=True), nullable=True)


class ContactoObra(Base):
    __tablename__ = "contacto_obra"

    id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True)
    sac_id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), nullable=False)
    nombre: Mapped[str] = mapped_column(String(200), nullable=False)
    cargo: Mapped[str] = mapped_column(String(50), nullable=False, default="otro")
    telefono: Mapped[str | None] = mapped_column(String(30), nullable=True)
    email: Mapped[str | None] = mapped_column(String(200), nullable=True)
    es_principal: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    notas: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    created_by: Mapped[UUID | None] = mapped_column(PG_UUID(as_uuid=True), nullable=True)
    updated_by: Mapped[UUID | None] = mapped_column(PG_UUID(as_uuid=True), nullable=True)
    is_deleted: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    deleted_by: Mapped[UUID | None] = mapped_column(PG_UUID(as_uuid=True), nullable=True)


class OrdenTrabajo(Base):
    __tablename__ = "ordenes_trabajo"

    id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True)
    codigo: Mapped[str] = mapped_column(String(20), unique=True, nullable=False)
    sac_id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), nullable=False)
    supervisor_id: Mapped[UUID | None] = mapped_column(PG_UUID(as_uuid=True), nullable=True)
    contratista_id: Mapped[UUID | None] = mapped_column(PG_UUID(as_uuid=True), nullable=True)

    estado: Mapped[str] = mapped_column(String(30), nullable=False, default="PENDIENTE")
    fecha_inicio: Mapped[date | None] = mapped_column(Date, nullable=True)
    fecha_fin_real: Mapped[date | None] = mapped_column(Date, nullable=True)
    checklist_completado: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    duracion_total_minutos: Mapped[int | None] = mapped_column(Integer, nullable=True)
    motivo_pausa: Mapped[str | None] = mapped_column(Text, nullable=True)
    motivo_cierre: Mapped[str | None] = mapped_column(Text, nullable=True)
    notas: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    created_by: Mapped[UUID | None] = mapped_column(PG_UUID(as_uuid=True), nullable=True)
    updated_by: Mapped[UUID | None] = mapped_column(PG_UUID(as_uuid=True), nullable=True)
    is_deleted: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    deleted_by: Mapped[UUID | None] = mapped_column(PG_UUID(as_uuid=True), nullable=True)


class ChecklistPlantilla(Base):
    __tablename__ = "checklist_plantillas"

    id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True)
    nombre: Mapped[str] = mapped_column(String(200), nullable=False)
    tipo_trabajo: Mapped[str] = mapped_column(String(50), nullable=False, default="instalacion")
    activo: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    created_by: Mapped[UUID | None] = mapped_column(PG_UUID(as_uuid=True), nullable=True)
    updated_by: Mapped[UUID | None] = mapped_column(PG_UUID(as_uuid=True), nullable=True)


class ChecklistPregunta(Base):
    __tablename__ = "checklist_preguntas"

    id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True)
    plantilla_id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), nullable=False)
    orden: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    texto: Mapped[str] = mapped_column(Text, nullable=False)
    tipo_respuesta: Mapped[str] = mapped_column(String(20), nullable=False, default="si_no")
    obligatorio: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    permite_foto: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    activo: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class ChecklistRespuesta(Base):
    __tablename__ = "checklist_respuestas"

    id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True)
    entidad_tipo: Mapped[str] = mapped_column(String(20), nullable=False)
    entidad_id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), nullable=False)
    pregunta_id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), nullable=False)
    respondido_por: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), nullable=False)
    respuesta_texto: Mapped[str | None] = mapped_column(Text, nullable=True)
    respuesta_boolean: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    foto_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    respondido_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
