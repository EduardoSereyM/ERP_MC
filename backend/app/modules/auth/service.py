from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from supabase import create_client

from app.core.config import settings
from app.core.logger import logger
from app.modules.auth.models import Usuario


def obtener_usuario_por_id(user_id: str, db: Session) -> Usuario:
    """Obtiene un usuario activo por su ID. Lanza 404 si no existe."""
    usuario = (
        db.query(Usuario)
        .filter(
            Usuario.id == user_id,
            Usuario.activo == True,  # noqa: E712
            Usuario.is_deleted == False,  # noqa: E712
        )
        .first()
    )
    if not usuario:
        raise HTTPException(
            status_code=404,
            detail={"code": "USUARIO_NO_ENCONTRADO", "message": "Usuario no encontrado"},
        )
    return usuario


def crear_cliente_supabase_admin():
    """Crea cliente Supabase con service role key para operaciones admin."""
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)


def login_con_password(email: str, password: str, db: Session) -> dict:
    """
    Login vía Supabase Auth + verificación de usuario activo en BD local.
    Retorna tokens si todo OK, lanza HTTPException si no.
    """
    supabase = crear_cliente_supabase_admin()

    try:
        resp = supabase.auth.sign_in_with_password({"email": email, "password": password})
    except Exception as exc:
        logger.warning("Login fallido para %s: %s", email, exc)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "CREDENCIALES_INVALIDAS", "message": "Email o contraseña incorrectos"},
        )

    if not resp.session:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "CREDENCIALES_INVALIDAS", "message": "Email o contraseña incorrectos"},
        )

    # Verificar que el usuario esté activo y no eliminado en la BD local
    user_id = resp.user.id
    usuario = (
        db.query(Usuario)
        .filter(Usuario.id == user_id)
        .first()
    )

    if not usuario:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": "USUARIO_NO_REGISTRADO", "message": "Usuario no registrado en el sistema"},
        )

    if usuario.is_deleted or not usuario.activo:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": "USUARIO_DESACTIVADO", "message": "Tu cuenta ha sido desactivada. Contacta al administrador."},
        )

    return {
        "access_token": resp.session.access_token,
        "refresh_token": resp.session.refresh_token,
        "expires_in": resp.session.expires_in,
    }


def refresh_session(refresh_token: str, db: Session) -> dict:
    """
    Refresca la sesión vía Supabase Auth.
    Verifica que el usuario siga activo antes de devolver tokens nuevos.
    """
    supabase = crear_cliente_supabase_admin()

    try:
        resp = supabase.auth.refresh_session(refresh_token)
    except Exception as exc:
        logger.warning("Refresh fallido: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "REFRESH_INVALIDO", "message": "No se pudo refrescar la sesión"},
        )

    if not resp.session:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "REFRESH_INVALIDO", "message": "No se pudo refrescar la sesión"},
        )

    # Verificar que el usuario siga activo
    user_id = resp.user.id
    usuario = (
        db.query(Usuario)
        .filter(Usuario.id == user_id)
        .first()
    )

    if not usuario or usuario.is_deleted or not usuario.activo:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": "USUARIO_DESACTIVADO", "message": "Tu cuenta ha sido desactivada"},
        )

    return {
        "access_token": resp.session.access_token,
        "refresh_token": resp.session.refresh_token,
        "expires_in": resp.session.expires_in,
    }
