from __future__ import annotations
from typing import TYPE_CHECKING, TypeVar, Generic
from pydantic import BaseModel

if TYPE_CHECKING:
    from app.shared.pagination import PaginacionParams

T = TypeVar("T")


class MetaPaginacion(BaseModel):
    page: int
    limit: int
    total: int
    total_pages: int
    has_next: bool
    has_prev: bool


class RespuestaSimple(BaseModel, Generic[T]):
    data: T


class RespuestaPaginada(BaseModel, Generic[T]):
    data: list[T]
    meta: MetaPaginacion


class ErrorDetalle(BaseModel):
    field: str
    message: str


class RespuestaError(BaseModel):
    code: str
    message: str
    details: list[ErrorDetalle] | None = None


def make_paginacion_meta(total: int, params: "PaginacionParams") -> MetaPaginacion:
    limit = params.limit
    page = params.page
    total_pages = max(1, -(-total // limit))  # ceil division
    return MetaPaginacion(
        page=page,
        limit=limit,
        total=total,
        total_pages=total_pages,
        has_next=page < total_pages,
        has_prev=page > 1,
    )
