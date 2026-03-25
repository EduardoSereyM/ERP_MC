from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
import jwt

from app.core.config import settings
from app.core.database import get_db

security = HTTPBearer()

ROL_FUNCIONAL_VALUES = [
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

NIVEL_JERARQUICO_VALUES = ["usuario", "supervisor", "jefatura", "gerencia", "director"]

# Cliente JWKS — cacheado, apunta al endpoint público de Supabase (ECC P-256)
_jwks_client: jwt.PyJWKClient | None = None


def _get_jwks_client() -> jwt.PyJWKClient:
    global _jwks_client
    if _jwks_client is None:
        jwks_url = f"{settings.SUPABASE_URL}/auth/v1/.well-known/jwks.json"
        _jwks_client = jwt.PyJWKClient(jwks_url, cache_jwk_set=True, lifespan=3600)
    return _jwks_client


class CurrentUser:
    def __init__(
        self,
        id: str,
        email: str,
        nombre: str,
        rol_funcional: str,
        nivel_jerarquico: str,
    ) -> None:
        self.id = id
        self.email = email
        self.nombre = nombre
        self.rol_funcional = rol_funcional
        self.nivel_jerarquico = nivel_jerarquico


def _decode_jwt(token: str) -> dict:
    """
    Decodifica el JWT intentando primero ECC P-256 via JWKS (clave actual de Supabase)
    y luego HS256 con el legacy secret como fallback.
    """
    # 1. Intentar ECC P-256 via JWKS (tokens nuevos post-rotación)
    try:
        client = _get_jwks_client()
        signing_key = client.get_signing_key_from_jwt(token)
        payload = jwt.decode(
            token,
            signing_key.key,
            algorithms=["ES256", "RS256"],
            audience="authenticated",
        )
        return payload
    except jwt.exceptions.PyJWKClientError:
        pass  # JWKS no disponible o kid no encontrado — intentar legacy
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=401,
            detail={"code": "TOKEN_EXPIRADO", "message": "El token ha expirado"},
        )
    except jwt.InvalidTokenError:
        pass  # Puede ser HS256 legacy — intentar fallback

    # 2. Fallback: HS256 con legacy secret
    try:
        payload = jwt.decode(
            token,
            settings.SUPABASE_JWT_SECRET,
            algorithms=["HS256"],
            audience="authenticated",
        )
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=401,
            detail={"code": "TOKEN_EXPIRADO", "message": "El token ha expirado"},
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=401,
            detail={"code": "TOKEN_INVALIDO", "message": "Token no válido"},
        )


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
) -> CurrentUser:
    payload = _decode_jwt(credentials.credentials)
    user_id = payload.get("sub")

    if not user_id:
        raise HTTPException(
            status_code=401,
            detail={"code": "TOKEN_INVALIDO", "message": "Token no válido"},
        )

    from app.modules.auth.models import Usuario

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
            status_code=401,
            detail={"code": "USUARIO_NO_ENCONTRADO", "message": "Usuario no encontrado"},
        )

    return CurrentUser(
        id=str(usuario.id),
        email=usuario.email,
        nombre=usuario.nombre,
        rol_funcional=usuario.rol_funcional,
        nivel_jerarquico=usuario.nivel_jerarquico,
    )


def require_rol(rol: str | list[str]):
    """Valida JWT + verifica que el usuario tenga el rol funcional requerido."""

    async def check_rol(
        current_user: CurrentUser = Depends(get_current_user),
    ) -> CurrentUser:
        roles = [rol] if isinstance(rol, str) else rol
        if current_user.rol_funcional not in roles:
            raise HTTPException(
                status_code=403,
                detail={"code": "ACCESO_DENEGADO", "message": "No tienes permiso para realizar esta acción"},
            )
        return current_user

    return check_rol


def require_nivel_minimo(nivel: str):
    """Valida JWT + verifica que el nivel jerárquico del usuario sea suficiente."""

    async def check_nivel(
        current_user: CurrentUser = Depends(get_current_user),
    ) -> CurrentUser:
        user_idx = NIVEL_JERARQUICO_VALUES.index(current_user.nivel_jerarquico) if current_user.nivel_jerarquico in NIVEL_JERARQUICO_VALUES else -1
        required_idx = NIVEL_JERARQUICO_VALUES.index(nivel) if nivel in NIVEL_JERARQUICO_VALUES else 0
        if user_idx < required_idx:
            raise HTTPException(
                status_code=403,
                detail={"code": "NIVEL_INSUFICIENTE", "message": "No tienes el nivel jerárquico requerido"},
            )
        return current_user

    return check_nivel
