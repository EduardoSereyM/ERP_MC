from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field, field_validator

from app.shared.rut import validar_rut_o_error

TipoCliente = Literal[
    "residencial",
    "empresa",
    "constructor",
    "inmobiliaria",
    "contratista",
    "distribuidor",
    "vip",
]


class ClienteBase(BaseModel):
    razon_social: str = Field(..., min_length=2, max_length=300)
    rut: str = Field(..., min_length=3, max_length=20)
    tipo_cliente: TipoCliente | None = None
    email: str | None = None
    telefono: str | None = None
    direccion: str | None = None
    comuna: str | None = None
    ciudad: str | None = None
    region: str | None = None
    contacto_nombre: str | None = None
    contacto_email: str | None = None
    contacto_telefono: str | None = None
    notas: str | None = None

    @field_validator("rut")
    @classmethod
    def validar_rut(cls, v: str) -> str:
        return validar_rut_o_error(v)


class ClienteCreate(ClienteBase):
    pass


class ClienteUpdate(BaseModel):
    razon_social: str | None = Field(None, min_length=2, max_length=300)
    tipo_cliente: TipoCliente | None = None
    email: str | None = None
    telefono: str | None = None
    direccion: str | None = None
    comuna: str | None = None
    ciudad: str | None = None
    region: str | None = None
    contacto_nombre: str | None = None
    contacto_email: str | None = None
    contacto_telefono: str | None = None
    notas: str | None = None
    activo: bool | None = None


class ClienteResponse(ClienteBase):
    id: UUID
    codigo: str
    activo: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ClienteListItem(BaseModel):
    id: UUID
    codigo: str
    razon_social: str
    rut: str
    tipo_cliente: TipoCliente | None
    email: str | None
    telefono: str | None
    direccion: str | None
    comuna: str | None
    ciudad: str | None
    region: str | None
    contacto_nombre: str | None
    contacto_email: str | None
    contacto_telefono: str | None
    activo: bool
    created_at: datetime

    model_config = {"from_attributes": True}
