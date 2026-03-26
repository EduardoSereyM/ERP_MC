from uuid import UUID, uuid4

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.modules.clientes.models import Cliente
from app.modules.clientes.schemas import ClienteCreate, ClienteUpdate
from app.shared.pagination import PaginacionParams


def _siguiente_codigo_cliente(db: Session) -> str:
    from app.shared.secuencias import siguiente_codigo
    return siguiente_codigo(db, "cliente")


def listar_clientes(
    db: Session,
    params: PaginacionParams,
    busqueda: str | None = None,
    activo: bool | None = None,
) -> tuple[list[Cliente], int]:
    q = select(Cliente).where(Cliente.is_deleted == False)

    if activo is not None:
        q = q.where(Cliente.activo == activo)

    if busqueda:
        term = f"%{busqueda}%"
        q = q.where(
            or_(
                Cliente.razon_social.ilike(term),
                Cliente.rut.ilike(term),
                Cliente.email.ilike(term),
            )
        )

    total_q = select(func.count()).select_from(q.subquery())
    total = db.execute(total_q).scalar_one()

    col = getattr(Cliente, params.orden, Cliente.created_at)
    if params.direccion == "desc":
        col = col.desc()
    q = q.order_by(col).offset(params.offset).limit(params.limit)

    rows = db.execute(q).scalars().all()
    return list(rows), total


def obtener_cliente(db: Session, cliente_id: UUID) -> Cliente | None:
    return db.execute(
        select(Cliente).where(Cliente.id == cliente_id, Cliente.is_deleted == False)
    ).scalar_one_or_none()


def obtener_cliente_por_rut(db: Session, rut: str) -> Cliente | None:
    return db.execute(
        select(Cliente).where(Cliente.rut == rut, Cliente.is_deleted == False)
    ).scalar_one_or_none()


def crear_cliente(db: Session, data: ClienteCreate, user_id: UUID) -> Cliente:
    from fastapi import HTTPException
    if obtener_cliente_por_rut(db, data.rut):
        raise HTTPException(status_code=409, detail="Ya existe un cliente con ese RUT")
    codigo = _siguiente_codigo_cliente(db)
    cliente = Cliente(
        id=uuid4(),
        codigo=codigo,
        created_by=user_id,
        updated_by=user_id,
        **data.model_dump(),
    )
    db.add(cliente)
    db.flush()
    return cliente


def actualizar_cliente(
    db: Session, cliente: Cliente, data: ClienteUpdate, user_id: UUID
) -> Cliente:
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(cliente, field, value)
    cliente.updated_by = user_id
    db.flush()
    return cliente


def eliminar_cliente(db: Session, cliente: Cliente, user_id: UUID) -> Cliente:
    from datetime import datetime, timezone
    cliente.is_deleted = True
    cliente.deleted_at = datetime.now(timezone.utc)
    cliente.deleted_by = user_id
    db.flush()
    return cliente
