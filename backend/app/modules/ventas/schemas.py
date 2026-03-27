from datetime import date, datetime
from decimal import Decimal
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field


EstadoVenta = Literal[
    "CONSULTA_ABIERTA", "COTIZACION_ENVIADA", "VENTA_GENERADA", "CERRADA", "ANULADA"
]
EstadoCotizacion = Literal["BORRADOR", "ENVIADA", "ACEPTADA", "RECHAZADA", "VENCIDA"]
TipoStub = Literal["BOD", "COB", "CTB", "GER", "INS"]
EstadoStub = Literal["PENDIENTE", "EN_REVISION", "COMPLETADA", "RECHAZADA"]
OrigenModulo = Literal["ventas", "sac", "servicios_tecnicos", "postventa"]
TipoVenta = Literal["suministro", "suministro_instalacion", "solo_instalacion"]

# ─── Ventas ───────────────────────────────────────────────────────────────────

class VentaCreate(BaseModel):
    cliente_id: UUID
    tipo: TipoVenta = "suministro"
    fecha_cierre_esperada: date | None = None
    descuento_pct: Decimal = Field(default=Decimal("0"), ge=0, le=100)
    notas: str | None = None


class VentaUpdate(BaseModel):
    tipo: TipoVenta | None = None
    fecha_cierre_esperada: date | None = None
    descuento_pct: Decimal | None = Field(None, ge=0, le=100)
    notas: str | None = None


class VentaCambioEstado(BaseModel):
    estado: EstadoVenta
    motivo_anulacion: str | None = None


class VentaListItem(BaseModel):
    id: UUID
    codigo: str
    cliente_id: UUID
    cliente_razon_social: str
    cliente_rut: str
    vendedor_id: UUID
    estado: str
    tipo: str
    monto_total: Decimal
    descuento_pct: Decimal
    fecha_cierre_esperada: date | None
    created_at: datetime

    model_config = {"from_attributes": True}


class VentaResponse(BaseModel):
    id: UUID
    codigo: str
    cliente_id: UUID
    vendedor_id: UUID
    estado: str
    tipo: str
    monto_total: Decimal
    descuento_pct: Decimal
    fecha_cierre_esperada: date | None
    fecha_cierre: datetime | None
    fecha_anulacion: datetime | None
    motivo_anulacion: str | None
    notas: str | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ─── Cotizaciones ─────────────────────────────────────────────────────────────

class LineaCotizacionCreate(BaseModel):
    producto_id: UUID
    descripcion: str = Field(..., min_length=1, max_length=500)
    cantidad: Decimal = Field(default=Decimal("1"), gt=0)
    precio_unitario: Decimal = Field(default=Decimal("0"), ge=0)
    descuento_pct: Decimal = Field(default=Decimal("0"), ge=0, le=100)
    orden: int = 0


class LineaCotizacionUpdate(BaseModel):
    cantidad: Decimal | None = Field(None, gt=0)
    precio_unitario: Decimal | None = Field(None, ge=0)
    descuento_pct: Decimal | None = Field(None, ge=0, le=100)
    orden: int | None = None


class LineaCotizacionResponse(BaseModel):
    id: UUID
    cotizacion_id: UUID
    producto_id: UUID
    descripcion: str
    es_servicio: bool
    cantidad: Decimal
    precio_unitario: Decimal
    descuento_pct: Decimal
    subtotal: Decimal
    orden: int

    model_config = {"from_attributes": True}


MOTIVOS_DESCUENTO = Literal[
    "cliente_vip", "ciberday", "black_friday",
    "promocion_temporada", "ajuste_comercial", "fidelidad", "otro"
]

class CotizacionCreate(BaseModel):
    validez_dias: int = Field(default=30, ge=1, le=365)
    notas_internas: str | None = None
    notas_cliente: str | None = None
    lineas: list[LineaCotizacionCreate] = []
    descuento_global_pct: Decimal = Field(default=Decimal("0"), ge=0, le=100)
    descuento_motivo: str | None = None


class CotizacionUpdate(BaseModel):
    validez_dias: int | None = Field(None, ge=1, le=365)
    notas_internas: str | None = None
    notas_cliente: str | None = None
    descuento_global_pct: Decimal | None = Field(None, ge=0, le=100)
    descuento_motivo: str | None = None


class CotizacionCambioEstado(BaseModel):
    estado: EstadoCotizacion


class CotizacionResponse(BaseModel):
    id: UUID
    codigo: str
    venta_id: UUID
    cliente_id: UUID
    estado: str
    validez_dias: int
    fecha_envio: datetime | None
    fecha_respuesta: datetime | None
    fecha_vencimiento: date | None
    monto_subtotal: Decimal
    monto_iva: Decimal
    monto_total: Decimal
    notas_internas: str | None
    notas_cliente: str | None
    descuento_global_pct: Decimal = Decimal("0")
    descuento_motivo: str | None
    lineas: list[LineaCotizacionResponse] = []
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ─── Stubs ────────────────────────────────────────────────────────────────────

class StubCreate(BaseModel):
    tipo: TipoStub
    origen_modulo: OrigenModulo
    origen_id: UUID
    cliente_id: UUID
    venta_id: UUID | None = None
    descripcion: str = Field(..., min_length=5, max_length=1000)
    fecha_limite: datetime | None = None


class StubUpdate(BaseModel):
    respuesta: str | None = None
    asignado_a: UUID | None = None
    fecha_limite: datetime | None = None


class StubCambioEstado(BaseModel):
    estado: EstadoStub
    respuesta: str | None = None


class StubResponse(BaseModel):
    id: UUID
    codigo: str
    tipo: str
    origen_modulo: str
    origen_id: UUID
    cliente_id: UUID
    venta_id: UUID | None
    estado: str
    descripcion: str
    respuesta: str | None
    asignado_a: UUID | None
    fecha_limite: datetime | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
