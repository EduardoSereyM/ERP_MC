from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, Field
from typing import Literal


UnidadMedida = Literal["m2", "ml", "unidad", "kg", "hora", "otro"]
TipoProducto = Literal["PRODUCTO_FISICO", "SERVICIO_INSTALACION", "SERVICIO_TECNICO", "SERVICIO_OTRO"]


class CategoriaResponse(BaseModel):
    id: UUID
    modulo: str
    tipo: str
    nombre: str
    orden: int
    activo: bool

    model_config = {"from_attributes": True}


class ProductoBase(BaseModel):
    nombre: str = Field(..., min_length=2, max_length=300)
    descripcion: str | None = None
    categoria_id: UUID | None = None
    precio_base: Decimal = Field(default=Decimal("0"), ge=0)
    unidad_medida: UnidadMedida = "m2"
    tipo_producto: TipoProducto = "PRODUCTO_FISICO"
    requiere_instalacion: bool = False


class ProductoCreate(ProductoBase):
    pass


class ProductoUpdate(BaseModel):
    nombre: str | None = Field(None, min_length=2, max_length=300)
    descripcion: str | None = None
    categoria_id: UUID | None = None
    precio_base: Decimal | None = Field(None, ge=0)
    unidad_medida: UnidadMedida | None = None
    tipo_producto: TipoProducto | None = None
    requiere_instalacion: bool | None = None
    activo: bool | None = None


class ServicioAsociadoResponse(BaseModel):
    id: UUID
    servicio_nombre: str
    precio_servicio: Decimal
    activo: bool

    model_config = {"from_attributes": True}


class ProductoResponse(ProductoBase):
    id: UUID
    codigo: str
    activo: bool
    created_at: datetime
    updated_at: datetime
    servicios: list[ServicioAsociadoResponse] = []

    model_config = {"from_attributes": True}


class ProductoListItem(BaseModel):
    id: UUID
    codigo: str
    nombre: str
    precio_base: Decimal
    unidad_medida: str
    tipo_producto: str
    requiere_instalacion: bool
    activo: bool

    model_config = {"from_attributes": True}
