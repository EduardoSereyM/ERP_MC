from uuid import UUID

from fastapi import APIRouter, Depends, Query, Request, status
from sqlalchemy.orm import Session

from app.core.audit import log_audit
from app.core.database import get_db
from app.core.middleware import limiter
from app.modules.auth.dependencies import CurrentUser, get_current_user, require_rol, require_nivel_minimo
from app.modules.sac import service as svc
from app.modules.sac.dependencies import get_contacto_or_404, get_ot_or_404, get_sac_or_404
from app.modules.sac.models import ContactoObra, OrdenTrabajo, SAC
from app.modules.sac.schemas import (
    ChecklistRespuestaResponse,
    ChecklistRespuestaUpsert,
    ContactoObraCreate,
    ContactoObraResponse,
    OTCambioEstado,
    OTCreate,
    OTResponse,
    OTUpdate,
    SACCambioEstado,
    SACCreate,
    SACListItem,
    SACResponse,
    SACUpdate,
)
from app.shared.pagination import PaginacionParams
from app.shared.responses import RespuestaPaginada, RespuestaSimple, make_paginacion_meta

router = APIRouter(prefix="/sac", tags=["sac"])
ot_router = APIRouter(prefix="/ot", tags=["ordenes_trabajo"])


# ─── SAC ─────────────────────────────────────────────────────────────────────

@router.get("", response_model=RespuestaPaginada[SACListItem])
@limiter.limit("60/minute")
def listar_sac(
    request: Request,
    estado: str | None = Query(None),
    cliente_id: UUID | None = Query(None),
    venta_id: UUID | None = Query(None),
    coordinador_id: UUID | None = Query(None),
    params: PaginacionParams = Depends(),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    rows, total = svc.listar_sac(db, params, estado=estado, cliente_id=cliente_id, venta_id=venta_id, coordinador_id=coordinador_id)
    return RespuestaPaginada(
        data=[SACListItem.model_validate(r, from_attributes=False) for r in rows],
        meta=make_paginacion_meta(total, params),
    )


@router.post("", response_model=RespuestaSimple[SACResponse], status_code=status.HTTP_201_CREATED)
@limiter.limit("30/minute")
def crear_sac(
    request: Request,
    payload: SACCreate,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_rol(["coordinador_instalaciones", "admin", "gerencia"])),
):
    sac = svc.crear_sac(db, payload, current_user.id)
    db.commit()
    db.refresh(sac)
    log_audit(db, "CREATE", "sac", current_user.id, sac.id, request=request)
    return RespuestaSimple(data=SACResponse.model_validate(sac))


@router.get("/{sac_id}", response_model=RespuestaSimple[SACResponse])
@limiter.limit("60/minute")
def obtener_sac(
    request: Request,
    sac: SAC = Depends(get_sac_or_404),
    current_user: CurrentUser = Depends(get_current_user),
):
    return RespuestaSimple(data=SACResponse.model_validate(sac))


@router.patch("/{sac_id}", response_model=RespuestaSimple[SACResponse])
@limiter.limit("30/minute")
def actualizar_sac(
    request: Request,
    payload: SACUpdate,
    sac: SAC = Depends(get_sac_or_404),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_rol(["coordinador_instalaciones", "admin", "gerencia"])),
):
    sac = svc.actualizar_sac(db, sac, payload, current_user.id)
    db.commit()
    db.refresh(sac)
    log_audit(db, "UPDATE", "sac", current_user.id, sac.id, request=request)
    return RespuestaSimple(data=SACResponse.model_validate(sac))


@router.post("/{sac_id}/estado", response_model=RespuestaSimple[SACResponse])
@limiter.limit("30/minute")
def cambiar_estado_sac(
    request: Request,
    payload: SACCambioEstado,
    sac: SAC = Depends(get_sac_or_404),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_rol(["coordinador_instalaciones", "supervisor_instalaciones", "admin", "gerencia"])),
):
    sac = svc.cambiar_estado_sac(db, sac, payload, current_user.id)
    db.commit()
    db.refresh(sac)
    log_audit(db, "UPDATE", "sac", current_user.id, sac.id, metadata={"estado": payload.estado}, request=request)
    return RespuestaSimple(data=SACResponse.model_validate(sac))


# ─── Contactos de obra ────────────────────────────────────────────────────────

@router.get("/{sac_id}/contactos", response_model=RespuestaSimple[list[ContactoObraResponse]])
@limiter.limit("60/minute")
def listar_contactos(
    request: Request,
    sac: SAC = Depends(get_sac_or_404),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    contactos = svc.listar_contactos(db, sac.id)
    return RespuestaSimple(data=[ContactoObraResponse.model_validate(c) for c in contactos])


@router.post("/{sac_id}/contactos", response_model=RespuestaSimple[ContactoObraResponse], status_code=status.HTTP_201_CREATED)
@limiter.limit("30/minute")
def crear_contacto(
    request: Request,
    payload: ContactoObraCreate,
    sac: SAC = Depends(get_sac_or_404),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_rol(["coordinador_instalaciones", "admin", "gerencia"])),
):
    contacto = svc.crear_contacto(db, sac, payload, current_user.id)
    db.commit()
    db.refresh(contacto)
    return RespuestaSimple(data=ContactoObraResponse.model_validate(contacto))


@router.delete("/{sac_id}/contactos/{contacto_id}", status_code=status.HTTP_204_NO_CONTENT)
@limiter.limit("30/minute")
def eliminar_contacto(
    request: Request,
    sac: SAC = Depends(get_sac_or_404),
    contacto: ContactoObra = Depends(get_contacto_or_404),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_rol(["coordinador_instalaciones", "admin", "gerencia"])),
):
    svc.eliminar_contacto(db, contacto, current_user.id)
    db.commit()


# ─── OTs (sub-recurso de SAC) ─────────────────────────────────────────────────

@router.get("/{sac_id}/ots", response_model=RespuestaSimple[list[OTResponse]])
@limiter.limit("60/minute")
def listar_ots(
    request: Request,
    sac: SAC = Depends(get_sac_or_404),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    ots = svc.listar_ots(db, sac.id)
    return RespuestaSimple(data=[OTResponse.model_validate(o) for o in ots])


@router.post("/{sac_id}/ots", response_model=RespuestaSimple[OTResponse], status_code=status.HTTP_201_CREATED)
@limiter.limit("30/minute")
def crear_ot(
    request: Request,
    payload: OTCreate,
    sac: SAC = Depends(get_sac_or_404),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_rol(["coordinador_instalaciones", "admin", "gerencia"])),
):
    ot = svc.crear_ot(db, sac, payload, current_user.id)
    db.commit()
    db.refresh(ot)
    log_audit(db, "CREATE", "ordenes_trabajo", current_user.id, ot.id, request=request)
    return RespuestaSimple(data=OTResponse.model_validate(ot))


# ─── OT standalone ───────────────────────────────────────────────────────────

@ot_router.get("/{ot_id}", response_model=RespuestaSimple[OTResponse])
@limiter.limit("60/minute")
def obtener_ot(
    request: Request,
    ot: OrdenTrabajo = Depends(get_ot_or_404),
    current_user: CurrentUser = Depends(get_current_user),
):
    return RespuestaSimple(data=OTResponse.model_validate(ot))


@ot_router.patch("/{ot_id}", response_model=RespuestaSimple[OTResponse])
@limiter.limit("30/minute")
def actualizar_ot(
    request: Request,
    payload: OTUpdate,
    ot: OrdenTrabajo = Depends(get_ot_or_404),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_rol(["coordinador_instalaciones", "supervisor_instalaciones", "admin", "gerencia"])),
):
    ot = svc.actualizar_ot(db, ot, payload, current_user.id)
    db.commit()
    db.refresh(ot)
    return RespuestaSimple(data=OTResponse.model_validate(ot))


@ot_router.post("/{ot_id}/estado", response_model=RespuestaSimple[OTResponse])
@limiter.limit("30/minute")
def cambiar_estado_ot(
    request: Request,
    payload: OTCambioEstado,
    ot: OrdenTrabajo = Depends(get_ot_or_404),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_rol(["coordinador_instalaciones", "supervisor_instalaciones", "instalador", "admin", "gerencia"])),
):
    ot = svc.cambiar_estado_ot(db, ot, payload, current_user.id)
    db.commit()
    db.refresh(ot)
    log_audit(db, "UPDATE", "ordenes_trabajo", current_user.id, ot.id, metadata={"estado": payload.estado}, request=request)
    return RespuestaSimple(data=OTResponse.model_validate(ot))


@ot_router.get("/{ot_id}/checklist", response_model=RespuestaSimple[list[dict]])
@limiter.limit("60/minute")
def obtener_checklist(
    request: Request,
    ot: OrdenTrabajo = Depends(get_ot_or_404),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    items = svc.obtener_checklist_ot(db, ot.id)
    # Serializar manualmente
    result = []
    for item in items:
        p = item["pregunta"]
        r = item["respuesta"]
        result.append({
            "pregunta": {
                "id": str(p.id),
                "orden": p.orden,
                "texto": p.texto,
                "tipo_respuesta": p.tipo_respuesta,
                "obligatorio": p.obligatorio,
                "permite_foto": p.permite_foto,
            },
            "respuesta": {
                "id": str(r.id),
                "respuesta_texto": r.respuesta_texto,
                "respuesta_boolean": r.respuesta_boolean,
                "foto_url": r.foto_url,
                "respondido_at": r.respondido_at.isoformat(),
            } if r else None,
        })
    return RespuestaSimple(data=result)


@ot_router.post("/{ot_id}/checklist", response_model=RespuestaSimple[ChecklistRespuestaResponse])
@limiter.limit("60/minute")
def guardar_respuesta(
    request: Request,
    payload: ChecklistRespuestaUpsert,
    ot: OrdenTrabajo = Depends(get_ot_or_404),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_rol(["coordinador_instalaciones", "supervisor_instalaciones", "instalador", "admin", "gerencia"])),
):
    respuesta = svc.guardar_respuesta_checklist(db, ot, payload, current_user.id)
    db.commit()
    db.refresh(respuesta)
    return RespuestaSimple(data=ChecklistRespuestaResponse.model_validate(respuesta))
