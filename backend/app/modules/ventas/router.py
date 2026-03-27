from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.audit import log_audit
from app.core.database import get_db
from app.core.middleware import limiter
from app.modules.auth.dependencies import CurrentUser, get_current_user, require_rol, require_nivel_minimo
from app.modules.ventas import service as svc
from app.modules.ventas.dependencies import get_cotizacion_or_404, get_linea_or_404, get_stub_or_404, get_venta_or_404
from app.modules.ventas.models import Cotizacion, LineaCotizacion, SolicitudStub, Venta
from app.modules.ventas.schemas import (
    CotizacionCambioEstado,
    CotizacionCreate,
    CotizacionResponse,
    LineaCotizacionCreate,
    LineaCotizacionResponse,
    LineaCotizacionUpdate,
    StubCambioEstado,
    StubCreate,
    StubResponse,
    VentaCambioEstado,
    VentaCreate,
    VentaListItem,
    VentaResponse,
    VentaUpdate,
)
from app.shared.pagination import PaginacionParams
from app.shared.responses import RespuestaPaginada, RespuestaSimple, make_paginacion_meta

router = APIRouter(prefix="/ventas", tags=["ventas"])
stubs_router = APIRouter(prefix="/stubs", tags=["stubs"])

# ─── Ventas ───────────────────────────────────────────────────────────────────

@router.get("", response_model=RespuestaPaginada[VentaListItem])
@limiter.limit("60/minute")
def listar_ventas(
    request: Request,
    vendedor_id: UUID | None = Query(None),
    cliente_id: UUID | None = Query(None),
    estado: str | None = Query(None),
    busqueda: str | None = Query(None),
    params: PaginacionParams = Depends(),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    rows, total = svc.listar_ventas(db, params, vendedor_id=vendedor_id, cliente_id=cliente_id, estado=estado, busqueda=busqueda)
    return RespuestaPaginada(
        data=[VentaListItem.model_validate(r, from_attributes=False) for r in rows],
        meta=make_paginacion_meta(total, params),
    )


@router.post("", response_model=RespuestaSimple[VentaResponse], status_code=status.HTTP_201_CREATED)
@limiter.limit("30/minute")
def crear_venta(
    request: Request,
    payload: VentaCreate,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_rol(["vendedor", "admin", "gerencia"])),
):
    venta = svc.crear_venta(db, payload, current_user.id)
    db.commit()
    db.refresh(venta)
    log_audit(db, "CREATE", "ventas", current_user.id, venta.id, request=request)
    return RespuestaSimple(data=VentaResponse.model_validate(venta))


@router.get("/{venta_id}", response_model=RespuestaSimple[VentaResponse])
@limiter.limit("60/minute")
def obtener_venta(
    request: Request,
    venta: Venta = Depends(get_venta_or_404),
    current_user: CurrentUser = Depends(get_current_user),
):
    return RespuestaSimple(data=VentaResponse.model_validate(venta))


@router.patch("/{venta_id}", response_model=RespuestaSimple[VentaResponse])
@limiter.limit("30/minute")
def actualizar_venta(
    request: Request,
    payload: VentaUpdate,
    venta: Venta = Depends(get_venta_or_404),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_rol(["vendedor", "admin", "gerencia"])),
):
    venta = svc.actualizar_venta(db, venta, payload, current_user.id)
    db.commit()
    db.refresh(venta)
    log_audit(db, "UPDATE", "ventas", current_user.id, venta.id, request=request)
    return RespuestaSimple(data=VentaResponse.model_validate(venta))


@router.post("/{venta_id}/estado", response_model=RespuestaSimple[VentaResponse])
@limiter.limit("30/minute")
def cambiar_estado_venta(
    request: Request,
    payload: VentaCambioEstado,
    venta: Venta = Depends(get_venta_or_404),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_rol(["vendedor", "admin", "gerencia"])),
):
    venta = svc.cambiar_estado_venta(db, venta, payload.estado, current_user.id, payload.motivo_anulacion)
    db.commit()
    db.refresh(venta)
    log_audit(db, "UPDATE", "ventas", current_user.id, venta.id, metadata={"estado": payload.estado}, request=request)
    return RespuestaSimple(data=VentaResponse.model_validate(venta))


# ─── Cotizaciones (sub-recurso de ventas) ─────────────────────────────────────

@router.get("/{venta_id}/cotizaciones", response_model=RespuestaSimple[list[CotizacionResponse]])
@limiter.limit("60/minute")
def listar_cotizaciones(
    request: Request,
    venta: Venta = Depends(get_venta_or_404),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    cotizaciones = svc.listar_cotizaciones(db, venta.id)
    return RespuestaSimple(data=[svc.cotizacion_to_response(db, c) for c in cotizaciones])


@router.post("/{venta_id}/cotizaciones", response_model=RespuestaSimple[CotizacionResponse], status_code=status.HTTP_201_CREATED)
@limiter.limit("30/minute")
def crear_cotizacion(
    request: Request,
    payload: CotizacionCreate,
    venta: Venta = Depends(get_venta_or_404),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_rol(["vendedor", "admin", "gerencia"])),
):
    cotizacion = svc.crear_cotizacion(db, venta, payload, current_user.id)
    db.commit()
    db.refresh(cotizacion)
    log_audit(db, "CREATE", "cotizaciones", current_user.id, cotizacion.id, request=request)
    return RespuestaSimple(data=svc.cotizacion_to_response(db, cotizacion))


@router.post("/cotizaciones/{cotizacion_id}/estado", response_model=RespuestaSimple[CotizacionResponse])
@limiter.limit("30/minute")
def cambiar_estado_cotizacion(
    request: Request,
    payload: CotizacionCambioEstado,
    cotizacion: Cotizacion = Depends(get_cotizacion_or_404),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_rol(["vendedor", "admin", "gerencia"])),
):
    cotizacion = svc.cambiar_estado_cotizacion(db, cotizacion, payload.estado, current_user.id)
    db.commit()
    db.refresh(cotizacion)
    log_audit(db, "UPDATE", "cotizaciones", current_user.id, cotizacion.id, metadata={"estado": payload.estado}, request=request)
    return RespuestaSimple(data=svc.cotizacion_to_response(db, cotizacion))


# ─── Helpers compartidos ──────────────────────────────────────────────────────

_MOTIVO_LABEL = {
    "cliente_vip": "Cliente VIP", "ciberday": "Ciberday",
    "black_friday": "Black Friday", "promocion_temporada": "Promoción de temporada",
    "ajuste_comercial": "Ajuste comercial", "fidelidad": "Descuento por fidelidad", "otro": "Otro",
}


def _build_cotizacion_data(cotizacion: Cotizacion, db) -> dict:
    """Construye el dict de datos de cotización para email y PDF."""
    from app.modules.clientes.models import Cliente
    from sqlalchemy import select as sa_select
    from datetime import datetime

    cliente = db.execute(
        sa_select(Cliente).where(Cliente.id == cotizacion.cliente_id)
    ).scalar_one_or_none()

    resp = svc.cotizacion_to_response(db, cotizacion)
    return {
        "codigo": cotizacion.codigo,
        "estado": cotizacion.estado,
        "cliente_razon_social": cliente.razon_social if cliente else "—",
        "cliente_rut": cliente.rut if cliente else None,
        "fecha_vencimiento": cotizacion.fecha_vencimiento.strftime("%d/%m/%Y") if cotizacion.fecha_vencimiento else "—",
        "fecha_envio": datetime.now().strftime("%d/%m/%Y %H:%M"),
        "monto_subtotal": cotizacion.monto_subtotal,
        "monto_iva": cotizacion.monto_iva,
        "monto_total": cotizacion.monto_total,
        "descuento_global_pct": float(getattr(cotizacion, "descuento_global_pct", 0) or 0),
        "descuento_motivo": getattr(cotizacion, "descuento_motivo", None),
        "descuento_motivo_label": _MOTIVO_LABEL.get(getattr(cotizacion, "descuento_motivo", "") or "", ""),
        "notas_cliente": cotizacion.notas_cliente,
        "lineas": [
            {
                "descripcion": l.descripcion,
                "cantidad": float(l.cantidad),
                "precio_unitario": float(l.precio_unitario),
                "descuento_pct": float(l.descuento_pct),
                "subtotal": float(l.subtotal),
            }
            for l in resp.lineas
        ],
    }


# ─── Envío de cotización por email ───────────────────────────────────────────

class EnviarCotizacionPayload(BaseModel):
    email_destinatario: str

@router.post("/cotizaciones/{cotizacion_id}/enviar-email", status_code=status.HTTP_200_OK)
@limiter.limit("10/minute")
def enviar_cotizacion_email(
    request: Request,
    payload: EnviarCotizacionPayload,
    cotizacion: Cotizacion = Depends(get_cotizacion_or_404),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_rol(["vendedor", "admin", "gerencia"])),
):
    from app.shared.email import enviar_cotizacion

    data = _build_cotizacion_data(cotizacion, db)

    try:
        enviar_cotizacion(payload.email_destinatario, data)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Error al enviar el correo: {exc}",
        )

    log_audit(db, "UPDATE", "cotizaciones", current_user.id, cotizacion.id,
              metadata={"accion": "email_enviado", "destinatario": payload.email_destinatario}, request=request)
    db.commit()
    return {"ok": True, "mensaje": f"Cotización enviada a {payload.email_destinatario}"}


# ─── Descarga de cotización en PDF ────────────────────────────────────────────

@router.get("/cotizaciones/{cotizacion_id}/pdf")
def descargar_cotizacion_pdf(
    cotizacion: Cotizacion = Depends(get_cotizacion_or_404),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_rol(["vendedor", "admin", "gerencia"])),
):
    from app.shared.pdf import generar_cotizacion_pdf
    from fastapi.responses import Response

    data = _build_cotizacion_data(cotizacion, db)
    pdf_bytes = generar_cotizacion_pdf(data)

    filename = f"{cotizacion.codigo}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


# ─── Líneas de cotización ─────────────────────────────────────────────────────

@router.post("/cotizaciones/{cotizacion_id}/lineas", response_model=RespuestaSimple[CotizacionResponse], status_code=status.HTTP_201_CREATED)
@limiter.limit("60/minute")
def agregar_linea(
    request: Request,
    payload: LineaCotizacionCreate,
    cotizacion: Cotizacion = Depends(get_cotizacion_or_404),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_rol(["vendedor", "admin", "gerencia"])),
):
    linea = svc.agregar_linea(db, cotizacion, payload, current_user.id)
    db.commit()
    log_audit(db, "CREATE", "lineas_cotizacion", current_user.id, linea.id, request=request)
    db.refresh(cotizacion)
    return RespuestaSimple(data=svc.cotizacion_to_response(db, cotizacion))


@router.patch("/cotizaciones/{cotizacion_id}/lineas/{linea_id}", response_model=RespuestaSimple[CotizacionResponse])
@limiter.limit("60/minute")
def actualizar_linea(
    request: Request,
    payload: LineaCotizacionUpdate,
    cotizacion: Cotizacion = Depends(get_cotizacion_or_404),
    linea: LineaCotizacion = Depends(get_linea_or_404),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_rol(["vendedor", "admin", "gerencia"])),
):
    svc.actualizar_linea(db, linea, payload, current_user.id)
    db.commit()
    log_audit(db, "UPDATE", "lineas_cotizacion", current_user.id, linea.id, request=request)
    db.refresh(cotizacion)
    return RespuestaSimple(data=svc.cotizacion_to_response(db, cotizacion))


@router.delete("/cotizaciones/{cotizacion_id}/lineas/{linea_id}", status_code=status.HTTP_204_NO_CONTENT)
@limiter.limit("60/minute")
def eliminar_linea(
    request: Request,
    cotizacion: Cotizacion = Depends(get_cotizacion_or_404),
    linea: LineaCotizacion = Depends(get_linea_or_404),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_rol(["vendedor", "admin", "gerencia"])),
):
    linea_id = linea.id
    svc.eliminar_linea(db, linea, current_user.id)
    db.commit()
    log_audit(db, "DELETE", "lineas_cotizacion", current_user.id, linea_id, request=request)


# ─── Actividad (timeline) ─────────────────────────────────────────────────────

@router.get("/{venta_id}/actividad", response_model=RespuestaSimple[list[dict]])
@limiter.limit("60/minute")
def listar_actividad_venta(
    request: Request,
    venta: Venta = Depends(get_venta_or_404),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    items = svc.listar_actividad_venta(db, venta.id, limit=limit)
    return RespuestaSimple(data=items)


# ─── Stubs ────────────────────────────────────────────────────────────────────

@stubs_router.get("", response_model=RespuestaPaginada[StubResponse])
@limiter.limit("60/minute")
def listar_stubs(
    request: Request,
    tipo: str | None = Query(None),
    estado: str | None = Query(None),
    cliente_id: UUID | None = Query(None),
    venta_id: UUID | None = Query(None),
    params: PaginacionParams = Depends(),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    rows, total = svc.listar_stubs(db, params, tipo=tipo, estado=estado, cliente_id=cliente_id, venta_id=venta_id)
    return RespuestaPaginada(
        data=[StubResponse.model_validate(r) for r in rows],
        meta=make_paginacion_meta(total, params),
    )


@stubs_router.post("", response_model=RespuestaSimple[StubResponse], status_code=status.HTTP_201_CREATED)
@limiter.limit("30/minute")
def crear_stub(
    request: Request,
    payload: StubCreate,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    stub = svc.crear_stub(db, payload, current_user.id)
    db.commit()
    db.refresh(stub)
    log_audit(db, "CREATE", "stubs", current_user.id, stub.id, request=request)
    return RespuestaSimple(data=StubResponse.model_validate(stub))


@stubs_router.post("/{stub_id}/estado", response_model=RespuestaSimple[StubResponse])
@limiter.limit("30/minute")
def cambiar_estado_stub(
    request: Request,
    payload: StubCambioEstado,
    stub: SolicitudStub = Depends(get_stub_or_404),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    stub = svc.cambiar_estado_stub(db, stub, payload.estado, current_user.id, payload.respuesta)
    db.commit()
    db.refresh(stub)
    log_audit(db, "UPDATE", "stubs", current_user.id, stub.id, metadata={"estado": payload.estado}, request=request)
    return RespuestaSimple(data=StubResponse.model_validate(stub))
