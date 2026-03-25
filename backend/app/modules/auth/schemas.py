from typing import Literal
from uuid import UUID
from pydantic import BaseModel, EmailStr, SecretStr, Field, field_serializer

RolFuncional = Literal[
    "vendedor",
    "coordinador_instalaciones",
    "supervisor_instalaciones",
    "instalador",
    "postventa",
    "bodega",
    "contabilidad",
    "cobranza",
    "gerencia",
    "admin",
]

NivelJerarquico = Literal["director", "gerencia", "jefatura", "supervisor", "usuario"]


class LoginRequest(BaseModel):
    email: EmailStr
    password: SecretStr = Field(min_length=6)


class UsuarioResponse(BaseModel):
    id: UUID
    email: str
    nombre: str
    rol_funcional: RolFuncional
    nivel_jerarquico: NivelJerarquico
    activo: bool

    model_config = {"from_attributes": True}

    @field_serializer("id")
    def serialize_id(self, v: UUID) -> str:
        return str(v)
