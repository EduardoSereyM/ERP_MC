from datetime import datetime, timezone
from typing import Any
from sqlalchemy.orm import Session
from fastapi import Request

from app.core.logger import logger


def log_audit(
    db: Session,
    action: str,
    entity_type: str,
    user_id: str | None = None,
    entity_id: str | None = None,
    metadata: dict[str, Any] | None = None,
    request: Request | None = None,
) -> None:
    """
    Registra un evento de auditoría en la tabla audit_logs.

    action: CREATE | UPDATE | DELETE | LOGIN | LOGOUT | ACCESS_DENIED | ROLE_CHANGED
    entity_type: nombre del módulo (auth, usuarios, ventas, etc.)
    """
    try:
        # Importar aquí para evitar importación circular
        from app.modules.auth.models import AuditLog

        ip_address = None
        user_agent = None
        if request:
            ip_address = request.client.host if request.client else None
            user_agent = request.headers.get("user-agent")

        log = AuditLog(
            user_id=user_id,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            event_data=metadata,
            ip_address=ip_address,
            user_agent=user_agent,
            created_at=datetime.now(timezone.utc),
        )
        db.add(log)
        db.commit()
    except Exception as e:
        logger.error("Error al registrar auditoría: %s", e, exc_info=True)
        # No propagar — el log de auditoría no debe romper el flujo de negocio
