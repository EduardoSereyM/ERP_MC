from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

from sqlalchemy import Boolean, Date, DateTime, Numeric, String, Text, func
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


EstadoVenta = str  # CONSULTA_ABIERTA | COTIZACION_ENVIADA | VENTA_GENERADA | CERRADA | ANULADA
EstadoCotizacion = str  # BORRADOR | ENVIADA | ACEPTADA | RECHAZADA | VENCIDA
TipoStub = str  # BOD | COB | CTB | GER | INS
EstadoStub = str  # PENDIENTE | EN_REVISION | COMPLETADA | RECHAZADA


class Venta(Base):
    __tablename__ = "ventas"

    id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True)
    codigo: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    cliente_id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), nullable=False)
    vendedor_id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), nullable=False)

    estado: Mapped[str] = mapped_column(String(30), nullable=False, default="CONSULTA_ABIERTA")
    monto_total: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False, default=0)
    descuento_pct: Mapped[Decimal] = mapped_column(Numeric(5, 2), nullable=False, default=0)

    tipo: Mapped[str] = mapped_column(String(30), nullable=False, default="suministro")
    fecha_cierre_esperada: Mapped[date | None] = mapped_column(Date, nullable=True)
    fecha_cierre: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    fecha_anulacion: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    motivo_anulacion: Mapped[str | None] = mapped_column(Text, nullable=True)
    notas: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    created_by: Mapped[UUID | None] = mapped_column(PG_UUID(as_uuid=True), nullable=True)
    updated_by: Mapped[UUID | None] = mapped_column(PG_UUID(as_uuid=True), nullable=True)
    is_deleted: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    deleted_by: Mapped[UUID | None] = mapped_column(PG_UUID(as_uuid=True), nullable=True)


class Cotizacion(Base):
    __tablename__ = "cotizaciones"

    id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True)
    codigo: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    venta_id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), nullable=False)
    cliente_id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), nullable=False)

    estado: Mapped[str] = mapped_column(String(20), nullable=False, default="BORRADOR")
    validez_dias: Mapped[int] = mapped_column(nullable=False, default=30)
    fecha_envio: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    fecha_respuesta: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    fecha_vencimiento: Mapped[date | None] = mapped_column(Date, nullable=True)

    monto_subtotal: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False, default=0)
    monto_iva: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False, default=0)
    monto_total: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False, default=0)
    descuento_global_pct: Mapped[Decimal] = mapped_column(Numeric(5, 2), nullable=False, default=0)
    descuento_motivo: Mapped[str | None] = mapped_column(String(50), nullable=True)
    notas_internas: Mapped[str | None] = mapped_column(Text, nullable=True)
    notas_cliente: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    created_by: Mapped[UUID | None] = mapped_column(PG_UUID(as_uuid=True), nullable=True)
    updated_by: Mapped[UUID | None] = mapped_column(PG_UUID(as_uuid=True), nullable=True)
    is_deleted: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    deleted_by: Mapped[UUID | None] = mapped_column(PG_UUID(as_uuid=True), nullable=True)


class LineaCotizacion(Base):
    __tablename__ = "lineas_cotizacion"

    id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True)
    cotizacion_id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), nullable=False)
    producto_id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), nullable=False)
    descripcion: Mapped[str] = mapped_column(Text, nullable=False)
    es_servicio: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    cantidad: Mapped[Decimal] = mapped_column(Numeric(10, 3), nullable=False, default=1)
    precio_unitario: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False, default=0)
    descuento_pct: Mapped[Decimal] = mapped_column(Numeric(5, 2), nullable=False, default=0)
    subtotal: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False, default=0)
    orden: Mapped[int] = mapped_column(nullable=False, default=0)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    created_by: Mapped[UUID | None] = mapped_column(PG_UUID(as_uuid=True), nullable=True)
    updated_by: Mapped[UUID | None] = mapped_column(PG_UUID(as_uuid=True), nullable=True)
    is_deleted: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    deleted_by: Mapped[UUID | None] = mapped_column(PG_UUID(as_uuid=True), nullable=True)


class SolicitudStub(Base):
    __tablename__ = "solicitudes_stub"

    id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True)
    codigo: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    tipo: Mapped[str] = mapped_column(String(10), nullable=False)
    origen_modulo: Mapped[str] = mapped_column(String(50), nullable=False)
    origen_id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), nullable=False)
    cliente_id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), nullable=False)
    venta_id: Mapped[UUID | None] = mapped_column(PG_UUID(as_uuid=True), nullable=True)

    estado: Mapped[str] = mapped_column(String(20), nullable=False, default="PENDIENTE")
    descripcion: Mapped[str] = mapped_column(Text, nullable=False)
    respuesta: Mapped[str | None] = mapped_column(Text, nullable=True)
    asignado_a: Mapped[UUID | None] = mapped_column(PG_UUID(as_uuid=True), nullable=True)
    fecha_limite: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    created_by: Mapped[UUID | None] = mapped_column(PG_UUID(as_uuid=True), nullable=True)
    updated_by: Mapped[UUID | None] = mapped_column(PG_UUID(as_uuid=True), nullable=True)
    is_deleted: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    deleted_by: Mapped[UUID | None] = mapped_column(PG_UUID(as_uuid=True), nullable=True)
