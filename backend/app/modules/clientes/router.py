from uuid import UUID

from fastapi import APIRouter, Depends, Query, Request, status
from sqlalchemy.orm import Session

from app.core.audit import log_audit
from app.core.database import get_db
from app.core.middleware import limiter
from app.modules.auth.dependencies import CurrentUser, get_current_user, require_rol
from app.modules.clientes import service as svc
from app.modules.clientes.dependencies import get_cliente_or_404
from app.modules.clientes.models import Cliente
from app.modules.clientes.schemas import ClienteCreate, ClienteListItem, ClienteResponse, ClienteUpdate
from app.shared.pagination import PaginacionParams
from app.shared.responses import RespuestaPaginada, RespuestaSimple, make_paginacion_meta

router = APIRouter(prefix="/clientes", tags=["clientes"])


@router.get("", response_model=RespuestaPaginada[ClienteListItem])
@limiter.limit("60/minute")
def listar_clientes(
    request: Request,
    busqueda: str | None = Query(None, max_length=200),
    activo: bool | None = Query(None),
    params: PaginacionParams = Depends(),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    rows, total = svc.listar_clientes(db, params, busqueda=busqueda, activo=activo)
    return RespuestaPaginada(
        data=[ClienteListItem.model_validate(r) for r in rows],
        meta=make_paginacion_meta(total, params),
    )


@router.post("", response_model=RespuestaSimple[ClienteResponse], status_code=status.HTTP_201_CREATED)
@limiter.limit("30/minute")
def crear_cliente(
    request: Request,
    payload: ClienteCreate,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(
        require_rol(["vendedor", "coordinador_instalaciones", "admin", "gerencia"])
    ),
):
    # Verificar RUT duplicado
    from fastapi import HTTPException
    if svc.obtener_cliente_por_rut(db, payload.rut):
        raise HTTPException(status_code=409, detail="Ya existe un cliente con ese RUT")

    cliente = svc.crear_cliente(db, payload, current_user.id)
    db.commit()
    db.refresh(cliente)
    log_audit(db, "CREATE", "clientes", current_user.id, cliente.id, request=request)
    return RespuestaSimple(data=ClienteResponse.model_validate(cliente))


@router.get("/{cliente_id}", response_model=RespuestaSimple[ClienteResponse])
@limiter.limit("60/minute")
def obtener_cliente(
    request: Request,
    cliente: Cliente = Depends(get_cliente_or_404),
):
    return RespuestaSimple(data=ClienteResponse.model_validate(cliente))


@router.patch("/{cliente_id}", response_model=RespuestaSimple[ClienteResponse])
@limiter.limit("30/minute")
def actualizar_cliente(
    request: Request,
    payload: ClienteUpdate,
    cliente: Cliente = Depends(get_cliente_or_404),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(
        require_rol(["vendedor", "coordinador_instalaciones", "admin", "gerencia"])
    ),
):
    cliente = svc.actualizar_cliente(db, cliente, payload, current_user.id)
    db.commit()
    db.refresh(cliente)
    log_audit(db, "UPDATE", "clientes", current_user.id, cliente.id, request=request)
    return RespuestaSimple(data=ClienteResponse.model_validate(cliente))


@router.delete("/{cliente_id}", response_model=RespuestaSimple[ClienteResponse])
@limiter.limit("30/minute")
def eliminar_cliente(
    request: Request,
    cliente: Cliente = Depends(get_cliente_or_404),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_rol(["admin", "gerencia"])),
):
    cliente = svc.eliminar_cliente(db, cliente, current_user.id)
    db.commit()
    log_audit(db, "DELETE", "clientes", current_user.id, cliente.id, request=request)
    return RespuestaSimple(data=ClienteResponse.model_validate(cliente))
