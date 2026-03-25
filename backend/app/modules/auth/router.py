from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.middleware import limiter
from app.core.audit import log_audit
from app.modules.auth.dependencies import get_current_user, CurrentUser
from app.modules.auth.service import obtener_usuario_por_id
from app.modules.auth.schemas import UsuarioResponse
from app.shared.responses import RespuestaSimple

router = APIRouter(prefix="/auth", tags=["auth"])


@router.get(
    "/me",
    response_model=RespuestaSimple[UsuarioResponse],
    summary="Obtener perfil del usuario autenticado",
)
@limiter.limit("60/minute")
async def get_me(
    request: Request,
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    usuario = obtener_usuario_por_id(current_user.id, db)
    return RespuestaSimple(data=UsuarioResponse.model_validate(usuario))


@router.post(
    "/logout",
    status_code=204,
    summary="Cerrar sesión (revoca token del lado del cliente)",
)
@limiter.limit("10/minute")
async def logout(
    request: Request,
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    await log_audit(
        db=db,
        action="LOGOUT",
        entity_type="auth",
        user_id=current_user.id,
        request=request,
    )
    return None
