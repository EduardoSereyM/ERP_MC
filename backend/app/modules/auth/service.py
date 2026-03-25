from fastapi import HTTPException
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
