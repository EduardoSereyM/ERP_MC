from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.middleware import limiter
from app.core.audit import log_audit
from app.modules.auth.dependencies import get_current_user, require_rol, CurrentUser
from app.modules.auth.service import crear_usuario, eliminar_usuario, login_con_password, obtener_usuario_por_id, refresh_session
from app.modules.auth.schemas import LoginRequest, RefreshRequest, TokenResponse, UsuarioCreate, UsuarioResponse
from app.shared.responses import RespuestaSimple

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post(
    "/usuarios",
    response_model=RespuestaSimple[UsuarioResponse],
    status_code=201,
    summary="Crear usuario (solo admin)",
)
@limiter.limit("10/minute")
def crear_usuario_endpoint(
    request: Request,
    payload: UsuarioCreate,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_rol(["admin"])),
):
    from app.core.audit import log_audit
    usuario = crear_usuario(
        email=payload.email,
        password=payload.password.get_secret_value(),
        nombre=payload.nombre,
        rol_funcional=payload.rol_funcional,
        nivel_jerarquico=payload.nivel_jerarquico,
        db=db,
    )
    db.commit()
    db.refresh(usuario)
    log_audit(db, "CREATE", "usuarios", current_user.id, usuario.id, request=request)
    return RespuestaSimple(data=UsuarioResponse.model_validate(usuario))


@router.delete(
    "/usuarios/{usuario_id}",
    status_code=204,
    summary="Eliminar usuario (solo admin)",
)
@limiter.limit("10/minute")
def eliminar_usuario_endpoint(
    request: Request,
    usuario_id: str,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_rol(["admin"])),
):
    from app.core.audit import log_audit
    eliminar_usuario(usuario_id, db)
    db.commit()
    log_audit(db, "DELETE", "usuarios", current_user.id, request=request)


@router.post(
    "/login",
    response_model=RespuestaSimple[TokenResponse],
    summary="Iniciar sesión con email y contraseña",
)
@limiter.limit("10/minute")
def auth_login(
    request: Request,
    payload: LoginRequest,
    db: Session = Depends(get_db),
):
    tokens = login_con_password(
        payload.email,
        payload.password.get_secret_value(),
        db,
    )
    log_audit(db, "LOGIN", "auth", request=request)
    return RespuestaSimple(data=TokenResponse(**tokens))


@router.post(
    "/refresh",
    response_model=RespuestaSimple[TokenResponse],
    summary="Refrescar sesión con refresh token",
)
@limiter.limit("30/minute")
def auth_refresh(
    request: Request,
    payload: RefreshRequest,
    db: Session = Depends(get_db),
):
    tokens = refresh_session(payload.refresh_token, db)
    return RespuestaSimple(data=TokenResponse(**tokens))


@router.get(
    "/me",
    response_model=RespuestaSimple[UsuarioResponse],
    summary="Obtener perfil del usuario autenticado",
)
@limiter.limit("60/minute")
def get_me(
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
def logout(
    request: Request,
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    log_audit(db, "LOGOUT", "auth", user_id=current_user.id, request=request)
    return None
