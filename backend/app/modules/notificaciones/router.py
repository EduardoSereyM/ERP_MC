from uuid import UUID

from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.middleware import limiter
from app.modules.auth.dependencies import CurrentUser, get_current_user
from app.modules.notificaciones import service as svc
from app.modules.notificaciones.schemas import ContadorResponse, NotificacionResponse
from app.shared.responses import RespuestaSimple

router = APIRouter(prefix="/notificaciones", tags=["notificaciones"])


@router.get("", response_model=RespuestaSimple[list[NotificacionResponse]])
@limiter.limit("60/minute")
def listar_notificaciones(
    request: Request,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    items = svc.listar_notificaciones(db, current_user.id)
    return RespuestaSimple(data=[NotificacionResponse.model_validate(n) for n in items])


@router.get("/contador", response_model=RespuestaSimple[ContadorResponse])
@limiter.limit("60/minute")
def contar_no_leidas(
    request: Request,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    total = svc.contar_no_leidas(db, current_user.id)
    return RespuestaSimple(data=ContadorResponse(no_leidas=total))


@router.post("/{notif_id}/leer", response_model=RespuestaSimple[NotificacionResponse])
@limiter.limit("60/minute")
def marcar_leida(
    request: Request,
    notif_id: UUID,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    notif = svc.marcar_leida(db, notif_id, current_user.id)
    db.commit()
    return RespuestaSimple(data=NotificacionResponse.model_validate(notif))


@router.post("/leer-todas", response_model=RespuestaSimple[dict])
@limiter.limit("30/minute")
def marcar_todas_leidas(
    request: Request,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    count = svc.marcar_todas_leidas(db, current_user.id)
    db.commit()
    return RespuestaSimple(data={"marcadas": count})
