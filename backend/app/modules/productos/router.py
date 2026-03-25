from uuid import UUID

from fastapi import APIRouter, Depends, Query, Request, status
from sqlalchemy.orm import Session

from app.core.audit import log_audit
from app.core.database import get_db
from app.core.middleware import limiter
from app.modules.auth.dependencies import CurrentUser, get_current_user, require_rol
from app.modules.productos import service as svc
from app.modules.productos.dependencies import get_producto_or_404
from app.modules.productos.models import Producto
from app.modules.productos.schemas import (
    CategoriaResponse,
    ProductoCreate,
    ProductoListItem,
    ProductoResponse,
    ProductoUpdate,
    ServicioAsociadoResponse,
)
from app.shared.pagination import PaginacionParams
from app.shared.responses import RespuestaPaginada, RespuestaSimple, make_paginacion_meta

router = APIRouter(prefix="/productos", tags=["productos"])


@router.get("/categorias", response_model=RespuestaSimple[list[CategoriaResponse]])
@limiter.limit("60/minute")
def listar_categorias(
    request: Request,
    modulo: str = Query(..., max_length=100),
    tipo: str | None = Query(None),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    cats = svc.listar_categorias(db, modulo, tipo)
    return RespuestaSimple(data=[CategoriaResponse.model_validate(c) for c in cats])


@router.get("", response_model=RespuestaPaginada[ProductoListItem])
@limiter.limit("60/minute")
def listar_productos(
    request: Request,
    busqueda: str | None = Query(None, max_length=200),
    activo: bool | None = Query(None),
    categoria_id: UUID | None = Query(None),
    params: PaginacionParams = Depends(),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    rows, total = svc.listar_productos(db, params, busqueda=busqueda, activo=activo, categoria_id=categoria_id)
    return RespuestaPaginada(
        data=[ProductoListItem.model_validate(r) for r in rows],
        meta=make_paginacion_meta(total, params),
    )


@router.post("", response_model=RespuestaSimple[ProductoResponse], status_code=status.HTTP_201_CREATED)
@limiter.limit("30/minute")
def crear_producto(
    request: Request,
    payload: ProductoCreate,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_rol(["admin", "gerencia"])),
):
    producto = svc.crear_producto(db, payload, current_user.id)
    db.commit()
    db.refresh(producto)
    log_audit(db, "CREATE", "productos", current_user.id, producto.id, request=request)
    return RespuestaSimple(data=ProductoResponse.model_validate(producto))


@router.get("/{producto_id}", response_model=RespuestaSimple[ProductoResponse])
@limiter.limit("60/minute")
def obtener_producto(
    request: Request,
    producto: Producto = Depends(get_producto_or_404),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    servicios = svc.listar_servicios_asociados(db, producto.id)
    data = ProductoResponse.model_validate(producto)
    data.servicios = [ServicioAsociadoResponse.model_validate(s) for s in servicios]
    return RespuestaSimple(data=data)


@router.patch("/{producto_id}", response_model=RespuestaSimple[ProductoResponse])
@limiter.limit("30/minute")
def actualizar_producto(
    request: Request,
    payload: ProductoUpdate,
    producto: Producto = Depends(get_producto_or_404),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_rol(["admin", "gerencia"])),
):
    producto = svc.actualizar_producto(db, producto, payload, current_user.id)
    db.commit()
    db.refresh(producto)
    log_audit(db, "UPDATE", "productos", current_user.id, producto.id, request=request)
    return RespuestaSimple(data=ProductoResponse.model_validate(producto))


@router.delete("/{producto_id}", response_model=RespuestaSimple[ProductoResponse])
@limiter.limit("30/minute")
def eliminar_producto(
    request: Request,
    producto: Producto = Depends(get_producto_or_404),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_rol(["admin"])),
):
    producto = svc.eliminar_producto(db, producto, current_user.id)
    db.commit()
    log_audit(db, "DELETE", "productos", current_user.id, producto.id, request=request)
    return RespuestaSimple(data=ProductoResponse.model_validate(producto))
