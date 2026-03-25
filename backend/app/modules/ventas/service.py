from datetime import datetime, timezone
from decimal import Decimal
from uuid import UUID, uuid4

from fastapi import HTTPException, status
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.modules.ventas.models import Cotizacion, LineaCotizacion, SolicitudStub, Venta
from app.modules.ventas.schemas import (
    CotizacionCreate,
    CotizacionUpdate,
    LineaCotizacionCreate,
    LineaCotizacionUpdate,
    StubCreate,
    StubUpdate,
    VentaCreate,
    VentaUpdate,
)
from app.shared.pagination import PaginacionParams
from app.shared.secuencias import siguiente_codigo

# ─── Transiciones válidas de estado ───────────────────────────────────────────

TRANSICIONES_VENTA: dict[str, list[str]] = {
    "CONSULTA_ABIERTA":   ["COTIZACION_ENVIADA", "ANULADA"],
    "COTIZACION_ENVIADA": ["VENTA_GENERADA", "CONSULTA_ABIERTA", "ANULADA"],
    "VENTA_GENERADA":     ["EN_PROCESO", "ANULADA"],
    "EN_PROCESO":         ["CERRADA", "ANULADA"],
    "CERRADA":            [],
    "ANULADA":            [],
}

TRANSICIONES_COTIZACION: dict[str, list[str]] = {
    "BORRADOR":   ["ENVIADA"],
    "ENVIADA":    ["ACEPTADA", "RECHAZADA", "VENCIDA"],
    "ACEPTADA":   [],
    "RECHAZADA":  [],
    "VENCIDA":    [],
}

TRANSICIONES_STUB: dict[str, list[str]] = {
    "PENDIENTE":   ["EN_REVISION", "COMPLETADA", "RECHAZADA"],
    "EN_REVISION": ["COMPLETADA", "RECHAZADA"],
    "COMPLETADA":  [],
    "RECHAZADA":   [],
}


def _validar_transicion(actual: str, nuevo: str, transiciones: dict[str, list[str]], entidad: str) -> None:
    permitidos = transiciones.get(actual, [])
    if nuevo not in permitidos:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Transición inválida de {entidad}: {actual} → {nuevo}. Permitidos: {permitidos}",
        )


# ─── Ventas ───────────────────────────────────────────────────────────────────

def listar_ventas(
    db: Session,
    params: PaginacionParams,
    vendedor_id: UUID | None = None,
    cliente_id: UUID | None = None,
    estado: str | None = None,
    busqueda: str | None = None,
) -> tuple[list[Venta], int]:
    q = select(Venta).where(Venta.is_deleted == False)
    if vendedor_id:
        q = q.where(Venta.vendedor_id == vendedor_id)
    if cliente_id:
        q = q.where(Venta.cliente_id == cliente_id)
    if estado:
        q = q.where(Venta.estado == estado)
    if busqueda:
        from app.modules.clientes.models import Cliente
        clientes_rut = select(Cliente.id).where(
            Cliente.rut.ilike(f"%{busqueda}%"),
            Cliente.is_deleted == False,
        )
        ventas_con_cotizacion = select(Cotizacion.venta_id).where(
            Cotizacion.codigo.ilike(f"%{busqueda}%"),
        )
        q = q.where(
            or_(
                Venta.codigo.ilike(f"%{busqueda}%"),
                Venta.cliente_id.in_(clientes_rut),
                Venta.id.in_(ventas_con_cotizacion),
            )
        )

    total = db.execute(select(func.count()).select_from(q.subquery())).scalar_one()
    col = getattr(Venta, params.orden, Venta.created_at)
    if params.direccion == "desc":
        col = col.desc()
    q = q.order_by(col).offset(params.offset).limit(params.limit)
    return list(db.execute(q).scalars().all()), total


def obtener_venta(db: Session, venta_id: UUID) -> Venta | None:
    return db.execute(
        select(Venta).where(Venta.id == venta_id, Venta.is_deleted == False)
    ).scalar_one_or_none()


def crear_venta(db: Session, data: VentaCreate, user_id: UUID) -> Venta:
    codigo = siguiente_codigo(db, "venta")
    venta = Venta(
        id=uuid4(),
        codigo=codigo,
        vendedor_id=user_id,
        estado="CONSULTA_ABIERTA",
        created_by=user_id,
        updated_by=user_id,
        **data.model_dump(),
    )
    db.add(venta)
    db.flush()
    return venta


def actualizar_venta(db: Session, venta: Venta, data: VentaUpdate, user_id: UUID) -> Venta:
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(venta, field, value)
    venta.updated_by = user_id
    db.flush()
    return venta


def cambiar_estado_venta(db: Session, venta: Venta, nuevo_estado: str, user_id: UUID, motivo: str | None = None) -> Venta:
    _validar_transicion(venta.estado, nuevo_estado, TRANSICIONES_VENTA, "venta")
    venta.estado = nuevo_estado
    venta.updated_by = user_id
    if nuevo_estado == "ANULADA":
        venta.fecha_anulacion = datetime.now(timezone.utc)
        venta.motivo_anulacion = motivo
    db.flush()
    return venta


# ─── Cotizaciones ─────────────────────────────────────────────────────────────

def listar_cotizaciones(db: Session, venta_id: UUID) -> list[Cotizacion]:
    return list(
        db.execute(
            select(Cotizacion).where(Cotizacion.venta_id == venta_id, Cotizacion.is_deleted == False)
            .order_by(Cotizacion.created_at.desc())
        ).scalars().all()
    )


def obtener_cotizacion(db: Session, cotizacion_id: UUID) -> Cotizacion | None:
    return db.execute(
        select(Cotizacion).where(Cotizacion.id == cotizacion_id, Cotizacion.is_deleted == False)
    ).scalar_one_or_none()


def crear_cotizacion(db: Session, venta: Venta, data: CotizacionCreate, user_id: UUID) -> Cotizacion:
    from datetime import date, timedelta
    codigo = siguiente_codigo(db, "cotizacion")
    cotizacion = Cotizacion(
        id=uuid4(),
        codigo=codigo,
        venta_id=venta.id,
        cliente_id=venta.cliente_id,
        estado="BORRADOR",
        fecha_vencimiento=date.today() + timedelta(days=data.validez_dias),
        created_by=user_id,
        updated_by=user_id,
        **{k: v for k, v in data.model_dump().items() if k != "lineas"},
    )
    db.add(cotizacion)
    db.flush()

    for i, linea_data in enumerate(data.lineas):
        _crear_linea(db, cotizacion.id, linea_data, user_id, orden=i)

    _recalcular_totales_cotizacion(db, cotizacion.id)
    return cotizacion


def _crear_linea(db: Session, cotizacion_id: UUID, data: LineaCotizacionCreate, user_id: UUID, orden: int = 0) -> LineaCotizacion:
    subtotal = round(data.cantidad * data.precio_unitario * (1 - data.descuento_pct / 100), 2)
    linea = LineaCotizacion(
        id=uuid4(),
        cotizacion_id=cotizacion_id,
        subtotal=subtotal,
        created_by=user_id,
        updated_by=user_id,
        **{k: v for k, v in data.model_dump().items()},
    )
    db.add(linea)
    db.flush()
    return linea


def _recalcular_totales_cotizacion(db: Session, cotizacion_id: UUID) -> None:
    subtotal = db.execute(
        select(func.coalesce(func.sum(LineaCotizacion.subtotal), 0)).where(
            LineaCotizacion.cotizacion_id == cotizacion_id,
            LineaCotizacion.is_deleted == False,
        )
    ).scalar_one()
    iva = round(Decimal(str(subtotal)) * Decimal("0.19"), 2)
    db.execute(
        Cotizacion.__table__.update()
        .where(Cotizacion.id == cotizacion_id)
        .values(monto_subtotal=subtotal, monto_iva=iva, monto_total=Decimal(str(subtotal)) + iva)
    )


def obtener_linea(db: Session, linea_id: UUID) -> LineaCotizacion | None:
    return db.execute(
        select(LineaCotizacion).where(LineaCotizacion.id == linea_id, LineaCotizacion.is_deleted == False)
    ).scalar_one_or_none()


def agregar_linea(db: Session, cotizacion: Cotizacion, data: LineaCotizacionCreate, user_id: UUID) -> LineaCotizacion:
    orden = db.execute(
        select(func.count()).where(
            LineaCotizacion.cotizacion_id == cotizacion.id,
            LineaCotizacion.is_deleted == False,
        )
    ).scalar_one()
    linea = _crear_linea(db, cotizacion.id, data, user_id, orden=orden)
    _recalcular_totales_cotizacion(db, cotizacion.id)
    return linea


def actualizar_linea(db: Session, linea: LineaCotizacion, data: LineaCotizacionUpdate, user_id: UUID) -> LineaCotizacion:
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(linea, field, value)
    linea.subtotal = round(
        Decimal(str(linea.cantidad)) * Decimal(str(linea.precio_unitario))
        * (1 - Decimal(str(linea.descuento_pct)) / 100),
        2,
    )
    linea.updated_by = user_id
    db.flush()
    _recalcular_totales_cotizacion(db, linea.cotizacion_id)
    return linea


def eliminar_linea(db: Session, linea: LineaCotizacion, user_id: UUID) -> None:
    cotizacion_id = linea.cotizacion_id
    linea.is_deleted = True
    linea.deleted_at = datetime.now(timezone.utc)
    linea.deleted_by = user_id
    db.flush()
    _recalcular_totales_cotizacion(db, cotizacion_id)


def cambiar_estado_cotizacion(db: Session, cotizacion: Cotizacion, nuevo_estado: str, user_id: UUID) -> Cotizacion:
    _validar_transicion(cotizacion.estado, nuevo_estado, TRANSICIONES_COTIZACION, "cotizacion")
    cotizacion.estado = nuevo_estado
    cotizacion.updated_by = user_id
    if nuevo_estado == "ENVIADA":
        cotizacion.fecha_envio = datetime.now(timezone.utc)
    elif nuevo_estado in ("ACEPTADA", "RECHAZADA", "VENCIDA"):
        cotizacion.fecha_respuesta = datetime.now(timezone.utc)
    db.flush()
    return cotizacion


# ─── Stubs ────────────────────────────────────────────────────────────────────

def listar_stubs(
    db: Session,
    params: PaginacionParams,
    tipo: str | None = None,
    estado: str | None = None,
    cliente_id: UUID | None = None,
) -> tuple[list[SolicitudStub], int]:
    q = select(SolicitudStub).where(SolicitudStub.is_deleted == False)
    if tipo:
        q = q.where(SolicitudStub.tipo == tipo)
    if estado:
        q = q.where(SolicitudStub.estado == estado)
    if cliente_id:
        q = q.where(SolicitudStub.cliente_id == cliente_id)

    total = db.execute(select(func.count()).select_from(q.subquery())).scalar_one()
    col = getattr(SolicitudStub, params.orden, SolicitudStub.created_at)
    if params.direccion == "desc":
        col = col.desc()
    q = q.order_by(col).offset(params.offset).limit(params.limit)
    return list(db.execute(q).scalars().all()), total


def crear_stub(db: Session, data: StubCreate, user_id: UUID) -> SolicitudStub:
    tipo_map = {"BOD": "bod", "COB": "cob", "CTB": "ctb", "GER": "ger"}
    codigo = siguiente_codigo(db, tipo_map[data.tipo])
    stub = SolicitudStub(
        id=uuid4(),
        codigo=codigo,
        estado="PENDIENTE",
        created_by=user_id,
        updated_by=user_id,
        **data.model_dump(),
    )
    db.add(stub)
    db.flush()
    return stub


def cambiar_estado_stub(db: Session, stub: SolicitudStub, nuevo_estado: str, user_id: UUID, respuesta: str | None = None) -> SolicitudStub:
    _validar_transicion(stub.estado, nuevo_estado, TRANSICIONES_STUB, "stub")
    stub.estado = nuevo_estado
    stub.updated_by = user_id
    if respuesta:
        stub.respuesta = respuesta
    db.flush()
    return stub
