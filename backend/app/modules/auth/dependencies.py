# Re-exporta las dependencias de autenticación desde core/security.py
# El resto de módulos importa desde aquí — nunca directamente desde core/security.py

from app.core.security import (  # noqa: F401
    get_current_user,
    require_rol,
    require_nivel_minimo,
    CurrentUser,
)
