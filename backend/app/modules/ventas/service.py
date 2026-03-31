from datetime import datetime, timedelta, timezone
from decimal import Decimal
from uuid import UUID, uuid4


def _sumar_dias_habiles(base: datetime, dias: int) -> datetime:
    """Suma N días hábiles (lun–vie) a una fecha base."""
    resultado = base
    agregados = 0
    while agregados < dias:
        resultado += timedelta(days=1)
        if resultado.weekday() < 5:  # 0=lunes … 4=viernes
            agregados += 1
    return resultado


# SLA por tipo de stub (días hábiles)
_SLA_DIAS_HABILES: dict[str, int] = {
    "BOD": 6,   # 48 h hábiles ÷ 8 h/día
    "CTB": 6,
    "COB": 3,   # 24 h hábiles ÷ 8 h/día
    "GER": 3,
    "INS": 15,  # 3 semanas hábiles
}

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
    "CONSULTA_ABIERTA":   ["COTIZACION_ENVIADA", "VENTA_GENERADA", "ANULADA"],
    "COTIZACION_ENVIADA": ["VENTA_GENERADA", "CONSULTA_ABIERTA", "ANULADA"],
    "VENTA_GENERADA":     ["CERRADA", "ANULADA"],
    "CERRADA":            [],
    "ANULADA":            [],
}

TRANSICIONES_COTIZACION: dict[str, list[str]] = {
    "BORRADOR":   ["ENVIADA", "ANULADA"],
    "ENVIADA":    ["ACEPTADA", "RECHAZADA", "VENCIDA", "ANULADA"],
    "ACEPTADA":   [],
    "RECHAZADA":  [],
    "VENCIDA":    [],
    "ANULADA":    [],
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
) -> tuple[list[dict], int]:
    from app.modules.clientes.models import Cliente

    q = (
        select(
            Venta,
            Cliente.razon_social.label("cliente_razon_social"),
            Cliente.rut.label("cliente_rut"),
        )
        .join(Cliente, Venta.cliente_id == Cliente.id)
        .where(Venta.is_deleted == False)
    )
    if vendedor_id:
        q = q.where(Venta.vendedor_id == vendedor_id)
    if cliente_id:
        q = q.where(Venta.cliente_id == cliente_id)
    if estado:
        q = q.where(Venta.estado == estado)
    if busqueda:
        ventas_con_cotizacion = select(Cotizacion.venta_id).where(
            Cotizacion.codigo.ilike(f"%{busqueda}%"),
        )
        q = q.where(
            or_(
                Venta.codigo.ilike(f"%{busqueda}%"),
                Cliente.rut.ilike(f"%{busqueda}%"),
                Cliente.razon_social.ilike(f"%{busqueda}%"),
                Venta.id.in_(ventas_con_cotizacion),
            )
        )

    total = db.execute(select(func.count()).select_from(q.subquery())).scalar_one()
    col = getattr(Venta, params.orden, Venta.created_at)
    if params.direccion == "desc":
        col = col.desc()
    q = q.order_by(col).offset(params.offset).limit(params.limit)

    rows = db.execute(q).all()
    result = []
    for row in rows:
        venta = row.Venta
        d = {c.key: getattr(venta, c.key) for c in Venta.__table__.columns}
        d["cliente_razon_social"] = row.cliente_razon_social
        d["cliente_rut"] = row.cliente_rut
        result.append(d)
    return result, total


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


def _crear_stubs_confirmacion(db: Session, venta: Venta, cotizacion: Cotizacion, user_id: UUID) -> None:
    """Crea los stubs necesarios al confirmar una venta según su tipo:
    - BOD: si el tipo incluye suministro Y hay productos físicos
    - COB: siempre
    - INS: si el tipo incluye instalación
    """
    from app.modules.productos.models import Producto

    ahora = datetime.now(timezone.utc)
    monto_fmt = f"${int(cotizacion.monto_total):,}".replace(",", ".")
    desc_base = f"{venta.codigo} / {cotizacion.codigo} – {monto_fmt}"

    incluye_suministro  = venta.tipo in ("suministro", "suministro_instalacion")
    incluye_instalacion = venta.tipo in ("suministro_instalacion", "solo_instalacion")

    # BOD: solo si incluye suministro y hay al menos un producto físico
    if incluye_suministro:
        hay_producto_fisico = db.execute(
            select(LineaCotizacion.id)
            .join(Producto, LineaCotizacion.producto_id == Producto.id)
            .where(
                LineaCotizacion.cotizacion_id == cotizacion.id,
                LineaCotizacion.is_deleted == False,
                Producto.tipo_producto == "PRODUCTO_FISICO",
            )
            .limit(1)
        ).scalar_one_or_none()

        if hay_producto_fisico:
            db.add(SolicitudStub(
                id=uuid4(),
                codigo=siguiente_codigo(db, "bod"),
                tipo="BOD",
                origen_modulo="ventas",
                origen_id=venta.id,
                cliente_id=venta.cliente_id,
                venta_id=venta.id,
                estado="PENDIENTE",
                descripcion=f"Despacho {desc_base}",
                fecha_limite=_sumar_dias_habiles(ahora, _SLA_DIAS_HABILES["BOD"]),
                created_by=user_id,
                updated_by=user_id,
            ))
            db.flush()

    # COB: siempre
    db.add(SolicitudStub(
        id=uuid4(),
        codigo=siguiente_codigo(db, "cob"),
        tipo="COB",
        origen_modulo="ventas",
        origen_id=venta.id,
        cliente_id=venta.cliente_id,
        venta_id=venta.id,
        estado="PENDIENTE",
        descripcion=f"Cobranza {desc_base}",
        fecha_limite=_sumar_dias_habiles(ahora, _SLA_DIAS_HABILES["COB"]),
        created_by=user_id,
        updated_by=user_id,
    ))
    db.flush()

    # INS: si incluye instalación
    if incluye_instalacion:
        db.add(SolicitudStub(
            id=uuid4(),
            codigo=siguiente_codigo(db, "ins"),
            tipo="INS",
            origen_modulo="ventas",
            origen_id=venta.id,
            cliente_id=venta.cliente_id,
            venta_id=venta.id,
            estado="PENDIENTE",
            descripcion=f"Instalación {desc_base}",
            fecha_limite=_sumar_dias_habiles(ahora, _SLA_DIAS_HABILES["INS"]),
            created_by=user_id,
            updated_by=user_id,
        ))
        db.flush()

    # Notificar a las áreas correspondientes
    _notificar_stubs_creados(db, venta)


def _notificar_stubs_creados(db: Session, venta: Venta) -> None:
    """Notifica a cada área cuando se crean sus stubs al confirmar una venta."""
    from app.modules.notificaciones.service import notificar_usuarios_por_rol, ROL_POR_TIPO_STUB

    stubs_nuevos = list(db.execute(
        select(SolicitudStub).where(
            SolicitudStub.venta_id == venta.id,
            SolicitudStub.is_deleted == False,
            SolicitudStub.estado == "PENDIENTE",
        )
    ).scalars().all())

    for stub in stubs_nuevos:
        rol = ROL_POR_TIPO_STUB.get(stub.tipo)
        if rol:
            notificar_usuarios_por_rol(
                db,
                rol_funcional=rol,
                tipo="stub_creado",
                titulo=f"Nueva solicitud {stub.codigo}",
                mensaje=stub.descripcion,
                entity_type="stubs",
                entity_id=stub.id,
            )


def _auto_cerrar_venta(db: Session, venta_id: UUID, user_id: UUID) -> None:
    """Si todos los stubs de la venta están COMPLETADA, cierra la venta automáticamente."""
    venta = db.execute(
        select(Venta).where(Venta.id == venta_id, Venta.is_deleted == False)
    ).scalar_one_or_none()

    if not venta or venta.estado != "VENTA_GENERADA":
        return

    stubs = list(db.execute(
        select(SolicitudStub).where(
            SolicitudStub.venta_id == venta_id,
            SolicitudStub.is_deleted == False,
        )
    ).scalars().all())

    if not stubs:
        return

    if all(s.estado == "COMPLETADA" for s in stubs):
        venta.estado = "CERRADA"
        venta.fecha_cierre = datetime.now(timezone.utc)
        venta.updated_by = user_id
        db.flush()


def cambiar_estado_venta(db: Session, venta: Venta, nuevo_estado: str, user_id: UUID, motivo: str | None = None) -> Venta:
    _validar_transicion(venta.estado, nuevo_estado, TRANSICIONES_VENTA, "venta")

    if nuevo_estado == "VENTA_GENERADA":
        cotizacion_aceptada = db.execute(
            select(Cotizacion).where(
                Cotizacion.venta_id == venta.id,
                Cotizacion.estado == "ACEPTADA",
                Cotizacion.is_deleted == False,
            )
        ).scalar_one_or_none()
        if not cotizacion_aceptada:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="No existe una cotización aceptada. Acepta una cotización antes de confirmar la venta.",
            )
        venta.monto_total = cotizacion_aceptada.monto_total
        _crear_stubs_confirmacion(db, venta, cotizacion_aceptada, user_id)

    venta.estado = nuevo_estado
    venta.updated_by = user_id
    if nuevo_estado == "CERRADA":
        venta.fecha_cierre = datetime.now(timezone.utc)
    elif nuevo_estado == "ANULADA":
        venta.fecha_anulacion = datetime.now(timezone.utc)
        venta.motivo_anulacion = motivo
    db.flush()
    return venta


# ─── Cotizaciones ─────────────────────────────────────────────────────────────

def _auto_vencer_cotizaciones(db: Session, cotizaciones: list[Cotizacion]) -> None:
    """Marca VENCIDA cualquier cotización ENVIADA cuya fecha_vencimiento ya pasó."""
    from datetime import date
    hoy = date.today()
    vencidas = [
        c for c in cotizaciones
        if c.estado == "ENVIADA" and c.fecha_vencimiento and c.fecha_vencimiento < hoy
    ]
    if not vencidas:
        return
    db.execute(
        Cotizacion.__table__.update()
        .where(Cotizacion.id.in_([c.id for c in vencidas]))
        .values(estado="VENCIDA", updated_at=func.now())
    )
    db.flush()
    for c in vencidas:
        c.estado = "VENCIDA"


def listar_cotizaciones(db: Session, venta_id: UUID) -> list[Cotizacion]:
    cotizaciones = list(
        db.execute(
            select(Cotizacion).where(Cotizacion.venta_id == venta_id, Cotizacion.is_deleted == False)
            .order_by(Cotizacion.created_at.desc())
        ).scalars().all()
    )
    _auto_vencer_cotizaciones(db, cotizaciones)
    return cotizaciones


def obtener_cotizacion(db: Session, cotizacion_id: UUID) -> Cotizacion | None:
    cotizacion = db.execute(
        select(Cotizacion).where(Cotizacion.id == cotizacion_id, Cotizacion.is_deleted == False)
    ).scalar_one_or_none()
    if cotizacion:
        _auto_vencer_cotizaciones(db, [cotizacion])
    return cotizacion


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
    from app.modules.productos.models import Producto as ProductoModel
    subtotal = round(data.cantidad * data.precio_unitario * (1 - data.descuento_pct / 100), 2)

    # Derivar es_servicio desde el catálogo
    producto = db.execute(
        select(ProductoModel).where(ProductoModel.id == data.producto_id, ProductoModel.is_deleted == False)
    ).scalar_one_or_none()
    es_servicio = producto.tipo_producto != "PRODUCTO_FISICO" if producto else False

    linea = LineaCotizacion(
        id=uuid4(),
        cotizacion_id=cotizacion_id,
        subtotal=subtotal,
        es_servicio=es_servicio,
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


def cotizacion_to_response(db: Session, cotizacion: Cotizacion):
    """Serializa una Cotizacion incluyendo sus líneas activas."""
    from app.modules.ventas.schemas import CotizacionResponse, LineaCotizacionResponse
    lineas = list(
        db.execute(
            select(LineaCotizacion)
            .where(
                LineaCotizacion.cotizacion_id == cotizacion.id,
                LineaCotizacion.is_deleted == False,
            )
            .order_by(LineaCotizacion.orden)
        ).scalars().all()
    )
    resp = CotizacionResponse.model_validate(cotizacion)
    resp.lineas = [LineaCotizacionResponse.model_validate(l) for l in lineas]
    return resp


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


def cambiar_estado_cotizacion(db: Session, cotizacion: Cotizacion, nuevo_estado: str, user_id: UUID, motivo_anulacion: str | None = None) -> Cotizacion:
    _validar_transicion(cotizacion.estado, nuevo_estado, TRANSICIONES_COTIZACION, "cotizacion")
    # Solo puede haber una cotización ACEPTADA por venta
    if nuevo_estado == "ACEPTADA":
        ya_aceptada = db.execute(
            select(Cotizacion).where(
                Cotizacion.venta_id == cotizacion.venta_id,
                Cotizacion.estado == "ACEPTADA",
                Cotizacion.is_deleted == False,
                Cotizacion.id != cotizacion.id,
            )
        ).scalar_one_or_none()
        if ya_aceptada:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Ya existe una cotización aceptada ({ya_aceptada.codigo}). Solo puede haber una por venta.",
            )
    if nuevo_estado == "ANULADA" and not motivo_anulacion:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Se requiere un motivo para anular la cotización.",
        )
    cotizacion.estado = nuevo_estado
    cotizacion.updated_by = user_id
    if nuevo_estado == "ENVIADA":
        cotizacion.fecha_envio = datetime.now(timezone.utc)
    elif nuevo_estado in ("ACEPTADA", "RECHAZADA", "VENCIDA"):
        cotizacion.fecha_respuesta = datetime.now(timezone.utc)
    elif nuevo_estado == "ANULADA":
        cotizacion.motivo_anulacion = motivo_anulacion
        cotizacion.fecha_anulacion = datetime.now(timezone.utc)
    db.flush()
    return cotizacion


# ─── Descuento sugerido ───────────────────────────────────────────────────────

# Reglas de descuento por tipo_cliente (configurable vía admin UI en el futuro)
_DESCUENTOS_POR_TIPO: dict[str, dict] = {
    "vip":          {"descuento_pct": 15, "motivo": "cliente_vip",     "mensaje": "Cliente VIP — descuento del 15% aplicable"},
    "distribuidor": {"descuento_pct": 10, "motivo": "fidelidad",        "mensaje": "Distribuidor — descuento del 10% aplicable"},
    "constructor":  {"descuento_pct": 8,  "motivo": "ajuste_comercial", "mensaje": "Constructor — descuento del 8% aplicable"},
    "inmobiliaria": {"descuento_pct": 8,  "motivo": "ajuste_comercial", "mensaje": "Inmobiliaria — descuento del 8% aplicable"},
    "empresa":      {"descuento_pct": 5,  "motivo": "ajuste_comercial", "mensaje": "Empresa — descuento del 5% aplicable"},
    "contratista":  {"descuento_pct": 5,  "motivo": "ajuste_comercial", "mensaje": "Contratista — descuento del 5% aplicable"},
}


def calcular_descuento_sugerido(tipo_cliente: str | None) -> dict:
    """Retorna el descuento sugerido y motivo para un tipo de cliente."""
    if tipo_cliente and tipo_cliente in _DESCUENTOS_POR_TIPO:
        return _DESCUENTOS_POR_TIPO[tipo_cliente]
    return {"descuento_pct": 0, "motivo": None, "mensaje": None}


# ─── Stubs ────────────────────────────────────────────────────────────────────

def listar_stubs(
    db: Session,
    params: PaginacionParams,
    tipo: str | None = None,
    estado: str | None = None,
    cliente_id: UUID | None = None,
    venta_id: UUID | None = None,
) -> tuple[list[SolicitudStub], int]:
    q = select(SolicitudStub).where(SolicitudStub.is_deleted == False)
    if tipo:
        q = q.where(SolicitudStub.tipo == tipo)
    if estado:
        q = q.where(SolicitudStub.estado == estado)
    if cliente_id:
        q = q.where(SolicitudStub.cliente_id == cliente_id)
    if venta_id:
        q = q.where(SolicitudStub.venta_id == venta_id)

    total = db.execute(select(func.count()).select_from(q.subquery())).scalar_one()
    col = getattr(SolicitudStub, params.orden, SolicitudStub.created_at)
    if params.direccion == "desc":
        col = col.desc()
    q = q.order_by(col).offset(params.offset).limit(params.limit)
    return list(db.execute(q).scalars().all()), total


def crear_stub(db: Session, data: StubCreate, user_id: UUID) -> SolicitudStub:
    tipo_map = {"BOD": "bod", "COB": "cob", "CTB": "ctb", "GER": "ger", "INS": "ins"}
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


def obtener_stub(db: Session, stub_id: UUID) -> SolicitudStub | None:
    return db.execute(
        select(SolicitudStub).where(SolicitudStub.id == stub_id, SolicitudStub.is_deleted == False)
    ).scalar_one_or_none()


def cambiar_estado_stub(db: Session, stub: SolicitudStub, nuevo_estado: str, user_id: UUID, respuesta: str | None = None) -> SolicitudStub:
    _validar_transicion(stub.estado, nuevo_estado, TRANSICIONES_STUB, "stub")
    stub.estado = nuevo_estado
    stub.updated_by = user_id
    if respuesta:
        stub.respuesta = respuesta
    db.flush()
    if nuevo_estado in ("COMPLETADA", "RECHAZADA") and stub.venta_id:
        _notificar_cambio_stub(db, stub, nuevo_estado, respuesta)
    if nuevo_estado == "COMPLETADA" and stub.venta_id:
        _auto_cerrar_venta(db, stub.venta_id, user_id)
    return stub


def _notificar_cambio_stub(db: Session, stub: SolicitudStub, nuevo_estado: str, respuesta: str | None) -> None:
    """Notifica al vendedor de la venta cuando un stub se completa o rechaza."""
    from app.modules.notificaciones.service import crear_notificacion

    venta = db.execute(
        select(Venta).where(Venta.id == stub.venta_id, Venta.is_deleted == False)
    ).scalar_one_or_none()
    if not venta:
        return

    if nuevo_estado == "COMPLETADA":
        titulo = f"{stub.codigo} completado"
        mensaje = f"La solicitud {stub.codigo} ha sido completada."
    else:
        titulo = f"{stub.codigo} rechazado"
        mensaje = f"La solicitud {stub.codigo} fue rechazada. {respuesta or ''}".strip()

    crear_notificacion(
        db,
        user_id=venta.vendedor_id,
        tipo=f"stub_{nuevo_estado.lower()}",
        titulo=titulo,
        mensaje=mensaje,
        entity_type="stubs",
        entity_id=stub.id,
    )


# ─── Actividad (timeline) ─────────────────────────────────────────────────────

def listar_actividad_venta(db: Session, venta_id: UUID, limit: int = 50) -> list[dict]:
    """
    Retorna los eventos de auditoría asociados a una venta y sus entidades
    relacionadas (cotizaciones, stubs), ordenados del más reciente al más antiguo.
    """
    from app.modules.auth.models import AuditLog

    # IDs de cotizaciones de esta venta
    cotizacion_ids = list(db.execute(
        select(Cotizacion.id).where(
            Cotizacion.venta_id == venta_id,
            Cotizacion.is_deleted == False,
        )
    ).scalars().all())

    # IDs de stubs de esta venta
    stub_ids = list(db.execute(
        select(SolicitudStub.id).where(
            SolicitudStub.venta_id == venta_id,
            SolicitudStub.is_deleted == False,
        )
    ).scalars().all())

    # Construcción dinámica del filtro
    from sqlalchemy import or_
    conditions = [
        (AuditLog.entity_type == "ventas") & (AuditLog.entity_id == venta_id),
    ]
    if cotizacion_ids:
        conditions.append(
            (AuditLog.entity_type.in_(["cotizaciones", "lineas_cotizacion"]))
            & (AuditLog.entity_id.in_(cotizacion_ids))
        )
    if stub_ids:
        conditions.append(
            (AuditLog.entity_type == "stubs") & (AuditLog.entity_id.in_(stub_ids))
        )

    from app.modules.auth.models import Usuario
    rows = db.execute(
        select(AuditLog, Usuario.nombre.label("user_nombre"))
        .outerjoin(Usuario, AuditLog.user_id == Usuario.id)
        .where(or_(*conditions))
        .order_by(AuditLog.created_at.desc())
        .limit(limit)
    ).all()

    # Construir códigos para display (código legible de cada entidad)
    cot_codigos: dict[UUID, str] = {}
    if cotizacion_ids:
        rows_cot = db.execute(
            select(Cotizacion.id, Cotizacion.codigo).where(Cotizacion.id.in_(cotizacion_ids))
        ).all()
        cot_codigos = {r.id: r.codigo for r in rows_cot}

    stub_codigos: dict[UUID, str] = {}
    if stub_ids:
        rows_stub = db.execute(
            select(SolicitudStub.id, SolicitudStub.codigo).where(SolicitudStub.id.in_(stub_ids))
        ).all()
        stub_codigos = {r.id: r.codigo for r in rows_stub}

    result = []
    for log, user_nombre in rows:
        entity_codigo: str | None = None
        if log.entity_type == "ventas":
            entity_codigo = None  # el código de la venta ya lo tiene el frontend
        elif log.entity_type in ("cotizaciones", "lineas_cotizacion") and log.entity_id in cot_codigos:
            entity_codigo = cot_codigos[log.entity_id]
        elif log.entity_type == "stubs" and log.entity_id in stub_codigos:
            entity_codigo = stub_codigos[log.entity_id]

        result.append({
            "id": str(log.id),
            "action": log.action,
            "entity_type": log.entity_type,
            "entity_id": str(log.entity_id) if log.entity_id else None,
            "entity_codigo": entity_codigo,
            "event_data": log.event_data,
            "user_id": str(log.user_id) if log.user_id else None,
            "user_nombre": user_nombre,
            "created_at": log.created_at.isoformat() if log.created_at else None,
        })
    return result
