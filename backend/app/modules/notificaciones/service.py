from datetime import datetime, timezone
from uuid import UUID, uuid4

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.modules.notificaciones.models import Notificacion

# Mapping tipo de stub → rol_funcional que debe recibir la notificación
ROL_POR_TIPO_STUB: dict[str, str] = {
    "BOD": "bodega",
    "COB": "cobranza",
    "CTB": "contabilidad",
    "GER": "gerencia",
    "INS": "coordinador_instalaciones",
}


def crear_notificacion(
    db: Session,
    user_id: UUID,
    tipo: str,
    titulo: str,
    mensaje: str | None = None,
    entity_type: str | None = None,
    entity_id: UUID | None = None,
) -> Notificacion:
    notif = Notificacion(
        id=uuid4(),
        user_id=user_id,
        tipo=tipo,
        titulo=titulo,
        mensaje=mensaje,
        leida=False,
        entity_type=entity_type,
        entity_id=entity_id,
    )
    db.add(notif)
    db.flush()
    return notif


def notificar_usuarios_por_rol(
    db: Session,
    rol_funcional: str,
    tipo: str,
    titulo: str,
    mensaje: str | None = None,
    entity_type: str | None = None,
    entity_id: UUID | None = None,
) -> None:
    """Crea una notificación para todos los usuarios activos con el rol dado."""
    from app.modules.auth.models import Usuario
    usuarios = list(db.execute(
        select(Usuario.id).where(
            Usuario.rol_funcional == rol_funcional,
            Usuario.activo == True,
            Usuario.is_deleted == False,
        )
    ).scalars().all())
    for uid in usuarios:
        crear_notificacion(db, uid, tipo, titulo, mensaje, entity_type, entity_id)


def listar_notificaciones(db: Session, user_id: UUID, limit: int = 20) -> list[Notificacion]:
    return list(db.execute(
        select(Notificacion)
        .where(Notificacion.user_id == user_id)
        .order_by(Notificacion.created_at.desc())
        .limit(limit)
    ).scalars().all())


def contar_no_leidas(db: Session, user_id: UUID) -> int:
    return db.execute(
        select(func.count()).where(
            Notificacion.user_id == user_id,
            Notificacion.leida == False,
        )
    ).scalar_one()


def marcar_leida(db: Session, notif_id: UUID, user_id: UUID) -> Notificacion | None:
    notif = db.execute(
        select(Notificacion).where(
            Notificacion.id == notif_id,
            Notificacion.user_id == user_id,
        )
    ).scalar_one_or_none()
    if notif:
        notif.leida = True
        db.flush()
    return notif


def marcar_todas_leidas(db: Session, user_id: UUID) -> int:
    result = db.execute(
        Notificacion.__table__.update()
        .where(Notificacion.user_id == user_id, Notificacion.leida == False)
        .values(leida=True)
    )
    db.flush()
    return result.rowcount
