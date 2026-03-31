from datetime import date, datetime, timezone
from uuid import UUID, uuid4

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.modules.sac.models import (
    ChecklistPlantilla,
    ChecklistPregunta,
    ChecklistRespuesta,
    ContactoObra,
    OrdenTrabajo,
    SAC,
)
from app.modules.sac.schemas import (
    ChecklistRespuestaUpsert,
    ContactoObraCreate,
    OTCambioEstado,
    OTCreate,
    OTUpdate,
    SACCambioEstado,
    SACCreate,
    SACUpdate,
)
from app.shared.pagination import PaginacionParams
from app.shared.secuencias import siguiente_codigo


# ─── Transiciones válidas ─────────────────────────────────────────────────────

TRANSICIONES_SAC: dict[str, list[str]] = {
    "CREADO":               ["REVISION_INFO", "CERRADO_SIN_EJECUTAR"],
    "REVISION_INFO":        ["EN_GESTION_VTA", "EN_COORDINACION", "CERRADO_SIN_EJECUTAR"],
    "EN_GESTION_VTA":       ["REVISION_INFO", "CERRADO_SIN_EJECUTAR"],
    "EN_COORDINACION":      ["PROGRAMADO", "CERRADO_SIN_EJECUTAR"],
    "PROGRAMADO":           ["REPROGRAMADO", "EN_EJECUCION", "CERRADO_SIN_EJECUTAR"],
    "REPROGRAMADO":         ["PROGRAMADO", "CERRADO_SIN_EJECUTAR"],
    "EN_EJECUCION":         ["COMPLETADO", "CERRADO_SIN_TERMINAR"],
    "COMPLETADO":           ["GESTION_COBRO"],
    "GESTION_COBRO":        ["CERRADO"],
    "CERRADO":              [],
    "CERRADO_SIN_EJECUTAR": [],
    "CERRADO_SIN_TERMINAR": [],
}

TRANSICIONES_OT: dict[str, list[str]] = {
    "PENDIENTE":         ["EN_EJECUCION", "CERRADA_SIN_EJECUTAR"],
    "EN_EJECUCION":      ["PAUSADA", "ENTREGA_PARCIAL", "COMPLETADA", "CERRADA_SIN_TERMINAR"],
    "PAUSADA":           ["EN_EJECUCION", "CERRADA_SIN_TERMINAR"],
    "ENTREGA_PARCIAL":   ["EN_EJECUCION", "COMPLETADA", "CERRADA_SIN_TERMINAR"],
    "COMPLETADA":        ["CERRADA_ADMIN"],
    "CERRADA_ADMIN":     [],
    "CERRADA_SIN_EJECUTAR": [],
    "CERRADA_SIN_TERMINAR": [],
}

_ESTADOS_FINALES_OT = {"COMPLETADA", "CERRADA_ADMIN", "CERRADA_SIN_EJECUTAR", "CERRADA_SIN_TERMINAR"}


def _validar_transicion(actual: str, nuevo: str, transiciones: dict, entidad: str) -> None:
    permitidos = transiciones.get(actual, [])
    if nuevo not in permitidos:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Transición inválida de {entidad}: {actual} → {nuevo}. Permitidos: {permitidos}",
        )


# ─── SAC ─────────────────────────────────────────────────────────────────────

def listar_sac(
    db: Session,
    params: PaginacionParams,
    estado: str | None = None,
    cliente_id: UUID | None = None,
    venta_id: UUID | None = None,
    coordinador_id: UUID | None = None,
) -> tuple[list[dict], int]:
    from app.modules.clientes.models import Cliente
    q = (
        select(SAC, Cliente.razon_social.label("cliente_razon_social"))
        .join(Cliente, SAC.cliente_id == Cliente.id)
        .where(SAC.is_deleted == False)
    )
    if estado:
        q = q.where(SAC.estado == estado)
    if cliente_id:
        q = q.where(SAC.cliente_id == cliente_id)
    if venta_id:
        q = q.where(SAC.venta_id == venta_id)
    if coordinador_id:
        q = q.where(SAC.coordinador_id == coordinador_id)

    total = db.execute(select(func.count()).select_from(q.subquery())).scalar_one()
    col = getattr(SAC, params.orden, SAC.created_at)
    if params.direccion == "desc":
        col = col.desc()
    q = q.order_by(col).offset(params.offset).limit(params.limit)

    rows = db.execute(q).all()
    result = []
    for row in rows:
        sac = row.SAC
        d = {c.key: getattr(sac, c.key) for c in SAC.__table__.columns}
        d["cliente_razon_social"] = row.cliente_razon_social
        result.append(d)
    return result, total


def obtener_sac(db: Session, sac_id: UUID) -> SAC | None:
    return db.execute(
        select(SAC).where(SAC.id == sac_id, SAC.is_deleted == False)
    ).scalar_one_or_none()


def crear_sac(db: Session, data: SACCreate, user_id: UUID) -> SAC:
    codigo = siguiente_codigo(db, "ins")
    sac = SAC(
        id=uuid4(),
        codigo=codigo,
        created_by=user_id,
        updated_by=user_id,
        **data.model_dump(),
    )
    db.add(sac)
    db.flush()
    return sac


def crear_sac_desde_venta(db: Session, venta_id: UUID, cliente_id: UUID, tipo: str, user_id: UUID) -> SAC:
    """Crea un SAC automáticamente al confirmar una Venta."""
    codigo = siguiente_codigo(db, "ins")
    sac = SAC(
        id=uuid4(),
        codigo=codigo,
        venta_id=venta_id,
        cliente_id=cliente_id,
        tipo=tipo,
        estado="CREADO",
        created_by=user_id,
        updated_by=user_id,
    )
    db.add(sac)
    db.flush()
    return sac


def actualizar_sac(db: Session, sac: SAC, data: SACUpdate, user_id: UUID) -> SAC:
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(sac, field, value)
    sac.updated_by = user_id
    db.flush()
    return sac


def cambiar_estado_sac(db: Session, sac: SAC, payload: SACCambioEstado, user_id: UUID) -> SAC:
    nuevo = payload.estado
    _validar_transicion(sac.estado, nuevo, TRANSICIONES_SAC, "sac")

    if nuevo == "EN_GESTION_VTA" and not payload.motivo_devolucion:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Se requiere motivo_devolucion para devolver a Ventas.",
        )
    if nuevo in ("CERRADO_SIN_EJECUTAR", "CERRADO_SIN_TERMINAR") and not payload.motivo_cierre:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Se requiere motivo_cierre para cierre forzado.",
        )

    sac.estado = nuevo
    sac.updated_by = user_id

    if nuevo == "EN_GESTION_VTA":
        sac.motivo_devolucion = payload.motivo_devolucion
    elif nuevo == "REVISION_INFO" and payload.respuesta_devolucion:
        sac.respuesta_devolucion = payload.respuesta_devolucion
    elif nuevo in ("CERRADO", "CERRADO_SIN_EJECUTAR", "CERRADO_SIN_TERMINAR"):
        sac.fecha_cierre = datetime.now(timezone.utc)
        if payload.motivo_cierre:
            sac.motivo_cierre = payload.motivo_cierre
    elif nuevo == "EN_EJECUCION":
        sac.fecha_ejecucion = date.today()
    elif nuevo == "REPROGRAMADO":
        sac.fecha_programada = None

    db.flush()

    # Notificaciones
    _notificar_estado_sac(db, sac, nuevo, user_id)

    return sac


def _notificar_estado_sac(db: Session, sac: SAC, nuevo_estado: str, user_id: UUID) -> None:
    from app.modules.notificaciones.service import crear_notificacion, notificar_usuarios_por_rol
    from app.modules.auth.models import Usuario

    if nuevo_estado == "CREADO":
        # Notificar a todos los coordinadores
        notificar_usuarios_por_rol(
            db, "coordinador_instalaciones", "asignacion",
            f"Nuevo SAC {sac.codigo} creado",
            f"Nueva instalación asignada a coordinación.",
            entity_type="sac", entity_id=sac.id,
        )
    elif nuevo_estado == "EN_GESTION_VTA" and sac.venta_id:
        # Notificar al vendedor de la venta
        from app.modules.ventas.models import Venta
        venta = db.execute(select(Venta).where(Venta.id == sac.venta_id)).scalar_one_or_none()
        if venta:
            crear_notificacion(
                db, venta.vendedor_id, "devolucion",
                f"{sac.codigo} devuelto a Ventas",
                sac.motivo_devolucion,
                entity_type="sac", entity_id=sac.id,
            )
    elif nuevo_estado == "PROGRAMADO":
        # Notificar al supervisor si está asignado
        ots = list(db.execute(
            select(OrdenTrabajo).where(OrdenTrabajo.sac_id == sac.id, OrdenTrabajo.is_deleted == False)
        ).scalars().all())
        for ot in ots:
            if ot.supervisor_id and ot.supervisor_id != user_id:
                crear_notificacion(
                    db, ot.supervisor_id, "asignacion",
                    f"OT {ot.codigo} programada",
                    f"SAC {sac.codigo} programado — fecha: {sac.fecha_programada}",
                    entity_type="sac", entity_id=sac.id,
                )
    elif nuevo_estado == "COMPLETADO" and sac.venta_id:
        # Notificar al vendedor
        from app.modules.ventas.models import Venta
        venta = db.execute(select(Venta).where(Venta.id == sac.venta_id)).scalar_one_or_none()
        if venta:
            crear_notificacion(
                db, venta.vendedor_id, "cambio_estado",
                f"{sac.codigo} completado",
                "La instalación fue completada.",
                entity_type="sac", entity_id=sac.id,
            )


# ─── ContactoObra ─────────────────────────────────────────────────────────────

def listar_contactos(db: Session, sac_id: UUID) -> list[ContactoObra]:
    return list(db.execute(
        select(ContactoObra)
        .where(ContactoObra.sac_id == sac_id, ContactoObra.is_deleted == False)
        .order_by(ContactoObra.es_principal.desc(), ContactoObra.created_at)
    ).scalars().all())


def crear_contacto(db: Session, sac: SAC, data: ContactoObraCreate, user_id: UUID) -> ContactoObra:
    contacto = ContactoObra(
        id=uuid4(),
        sac_id=sac.id,
        created_by=user_id,
        updated_by=user_id,
        **data.model_dump(),
    )
    db.add(contacto)
    db.flush()
    return contacto


def eliminar_contacto(db: Session, contacto: ContactoObra, user_id: UUID) -> None:
    contacto.is_deleted = True
    contacto.deleted_at = datetime.now(timezone.utc)
    contacto.deleted_by = user_id
    db.flush()


# ─── OrdenTrabajo ─────────────────────────────────────────────────────────────

def listar_ots(db: Session, sac_id: UUID) -> list[OrdenTrabajo]:
    return list(db.execute(
        select(OrdenTrabajo)
        .where(OrdenTrabajo.sac_id == sac_id, OrdenTrabajo.is_deleted == False)
        .order_by(OrdenTrabajo.created_at)
    ).scalars().all())


def obtener_ot(db: Session, ot_id: UUID) -> OrdenTrabajo | None:
    return db.execute(
        select(OrdenTrabajo).where(OrdenTrabajo.id == ot_id, OrdenTrabajo.is_deleted == False)
    ).scalar_one_or_none()


def crear_ot(db: Session, sac: SAC, data: OTCreate, user_id: UUID) -> OrdenTrabajo:
    codigo = siguiente_codigo(db, "ot")
    ot = OrdenTrabajo(
        id=uuid4(),
        codigo=codigo,
        sac_id=sac.id,
        estado="PENDIENTE",
        created_by=user_id,
        updated_by=user_id,
        **data.model_dump(),
    )
    db.add(ot)
    db.flush()
    return ot


def actualizar_ot(db: Session, ot: OrdenTrabajo, data: OTUpdate, user_id: UUID) -> OrdenTrabajo:
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(ot, field, value)
    ot.updated_by = user_id
    db.flush()
    return ot


def cambiar_estado_ot(db: Session, ot: OrdenTrabajo, payload: OTCambioEstado, user_id: UUID) -> OrdenTrabajo:
    nuevo = payload.estado
    _validar_transicion(ot.estado, nuevo, TRANSICIONES_OT, "ot")

    if nuevo in ("CERRADA_SIN_EJECUTAR", "CERRADA_SIN_TERMINAR") and not payload.motivo_cierre:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Se requiere motivo_cierre para cierre forzado.",
        )

    ot.estado = nuevo
    ot.updated_by = user_id

    if nuevo == "EN_EJECUCION" and not ot.fecha_inicio:
        ot.fecha_inicio = date.today()
    elif nuevo == "PAUSADA":
        ot.motivo_pausa = payload.motivo_pausa
    elif nuevo == "COMPLETADA":
        ot.fecha_fin_real = date.today()
        if payload.duracion_total_minutos:
            ot.duracion_total_minutos = payload.duracion_total_minutos
    elif nuevo in ("CERRADA_SIN_EJECUTAR", "CERRADA_SIN_TERMINAR"):
        ot.motivo_cierre = payload.motivo_cierre

    db.flush()

    # Si SAC en EN_EJECUCION y todas sus OTs están en estado final → auto-completar SAC
    if nuevo in _ESTADOS_FINALES_OT:
        _auto_completar_sac(db, ot.sac_id, user_id)

    return ot


def _auto_completar_sac(db: Session, sac_id: UUID, user_id: UUID) -> None:
    """Si todas las OTs del SAC están en estado final, avanza SAC a COMPLETADO."""
    sac = db.execute(
        select(SAC).where(SAC.id == sac_id, SAC.is_deleted == False)
    ).scalar_one_or_none()
    if not sac or sac.estado != "EN_EJECUCION":
        return

    ots = list(db.execute(
        select(OrdenTrabajo).where(
            OrdenTrabajo.sac_id == sac_id,
            OrdenTrabajo.is_deleted == False,
        )
    ).scalars().all())

    if not ots:
        return

    if all(o.estado in _ESTADOS_FINALES_OT for o in ots):
        sac.estado = "COMPLETADO"
        sac.updated_by = user_id
        db.flush()
        _notificar_estado_sac(db, sac, "COMPLETADO", user_id)


# ─── Checklist ───────────────────────────────────────────────────────────────

def listar_plantillas(db: Session) -> list[ChecklistPlantilla]:
    return list(db.execute(
        select(ChecklistPlantilla).where(ChecklistPlantilla.activo == True)
    ).scalars().all())


def obtener_plantilla_con_preguntas(db: Session, plantilla_id: UUID) -> dict | None:
    plantilla = db.execute(
        select(ChecklistPlantilla).where(
            ChecklistPlantilla.id == plantilla_id,
            ChecklistPlantilla.activo == True,
        )
    ).scalar_one_or_none()
    if not plantilla:
        return None
    preguntas = list(db.execute(
        select(ChecklistPregunta).where(
            ChecklistPregunta.plantilla_id == plantilla_id,
            ChecklistPregunta.activo == True,
        ).order_by(ChecklistPregunta.orden)
    ).scalars().all())
    return {"plantilla": plantilla, "preguntas": preguntas}


def obtener_checklist_ot(db: Session, ot_id: UUID) -> list[dict]:
    """Retorna preguntas de la plantilla base + respuestas de la OT."""
    plantilla_id = "00000000-0000-0000-0001-000000000001"
    preguntas = list(db.execute(
        select(ChecklistPregunta).where(
            ChecklistPregunta.plantilla_id == plantilla_id,
            ChecklistPregunta.activo == True,
        ).order_by(ChecklistPregunta.orden)
    ).scalars().all())

    respuestas = {
        str(r.pregunta_id): r
        for r in db.execute(
            select(ChecklistRespuesta).where(
                ChecklistRespuesta.entidad_tipo == "ot",
                ChecklistRespuesta.entidad_id == ot_id,
            )
        ).scalars().all()
    }

    return [
        {
            "pregunta": p,
            "respuesta": respuestas.get(str(p.id)),
        }
        for p in preguntas
    ]


def guardar_respuesta_checklist(
    db: Session,
    ot: OrdenTrabajo,
    data: ChecklistRespuestaUpsert,
    user_id: UUID,
) -> ChecklistRespuesta:
    from datetime import datetime, timezone

    existente = db.execute(
        select(ChecklistRespuesta).where(
            ChecklistRespuesta.entidad_tipo == "ot",
            ChecklistRespuesta.entidad_id == ot.id,
            ChecklistRespuesta.pregunta_id == data.pregunta_id,
        )
    ).scalar_one_or_none()

    if existente:
        existente.respuesta_texto = data.respuesta_texto
        existente.respuesta_boolean = data.respuesta_boolean
        existente.foto_url = data.foto_url
        existente.respondido_por = user_id
        existente.respondido_at = datetime.now(timezone.utc)
        db.flush()
        return existente

    nueva = ChecklistRespuesta(
        id=uuid4(),
        entidad_tipo="ot",
        entidad_id=ot.id,
        pregunta_id=data.pregunta_id,
        respondido_por=user_id,
        respuesta_texto=data.respuesta_texto,
        respuesta_boolean=data.respuesta_boolean,
        foto_url=data.foto_url,
    )
    db.add(nueva)
    db.flush()

    # Actualizar flag checklist_completado en OT
    _actualizar_checklist_flag(db, ot)
    return nueva


def _actualizar_checklist_flag(db: Session, ot: OrdenTrabajo) -> None:
    """Marca checklist_completado=True si todas las preguntas obligatorias tienen respuesta."""
    plantilla_id = "00000000-0000-0000-0001-000000000001"
    obligatorias = db.execute(
        select(func.count()).where(
            ChecklistPregunta.plantilla_id == plantilla_id,
            ChecklistPregunta.obligatorio == True,
            ChecklistPregunta.activo == True,
        )
    ).scalar_one()

    respondidas = db.execute(
        select(func.count()).where(
            ChecklistRespuesta.entidad_tipo == "ot",
            ChecklistRespuesta.entidad_id == ot.id,
            ChecklistRespuesta.pregunta_id.in_(
                select(ChecklistPregunta.id).where(
                    ChecklistPregunta.plantilla_id == plantilla_id,
                    ChecklistPregunta.obligatorio == True,
                    ChecklistPregunta.activo == True,
                )
            ),
        )
    ).scalar_one()

    ot.checklist_completado = respondidas >= obligatorias
    db.flush()
