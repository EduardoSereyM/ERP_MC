from uuid import UUID, uuid4

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.modules.productos.models import CategoriasConfigurables, Producto, ProductoServicioAsociado
from app.modules.productos.schemas import ProductoCreate, ProductoUpdate
from app.shared.pagination import PaginacionParams


def listar_categorias(db: Session, modulo: str, tipo: str | None = None) -> list[CategoriasConfigurables]:
    q = select(CategoriasConfigurables).where(
        CategoriasConfigurables.modulo == modulo,
        CategoriasConfigurables.activo == True,
        CategoriasConfigurables.is_deleted == False,
    )
    if tipo:
        q = q.where(CategoriasConfigurables.tipo == tipo)
    q = q.order_by(CategoriasConfigurables.orden)
    return list(db.execute(q).scalars().all())


def listar_productos(
    db: Session,
    params: PaginacionParams,
    busqueda: str | None = None,
    activo: bool | None = None,
    categoria_id: UUID | None = None,
) -> tuple[list[Producto], int]:
    q = select(Producto).where(Producto.is_deleted == False)

    if activo is not None:
        q = q.where(Producto.activo == activo)
    if categoria_id:
        q = q.where(Producto.categoria_id == categoria_id)
    if busqueda:
        term = f"%{busqueda}%"
        q = q.where(Producto.nombre.ilike(term))

    total = db.execute(select(func.count()).select_from(q.subquery())).scalar_one()

    col = getattr(Producto, params.orden, Producto.created_at)
    if params.direccion == "desc":
        col = col.desc()
    q = q.order_by(col).offset(params.offset).limit(params.limit)

    return list(db.execute(q).scalars().all()), total


def obtener_producto(db: Session, producto_id: UUID) -> Producto | None:
    return db.execute(
        select(Producto).where(Producto.id == producto_id, Producto.is_deleted == False)
    ).scalar_one_or_none()


def crear_producto(db: Session, data: ProductoCreate, user_id: UUID) -> Producto:
    from app.shared.secuencias import siguiente_codigo
    codigo = siguiente_codigo(db, "producto")
    producto = Producto(
        id=uuid4(),
        codigo=codigo,
        created_by=user_id,
        updated_by=user_id,
        **data.model_dump(),
    )
    db.add(producto)
    db.flush()
    return producto


def actualizar_producto(db: Session, producto: Producto, data: ProductoUpdate, user_id: UUID) -> Producto:
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(producto, field, value)
    producto.updated_by = user_id
    db.flush()
    return producto


def eliminar_producto(db: Session, producto: Producto, user_id: UUID) -> Producto:
    from datetime import datetime, timezone
    producto.is_deleted = True
    producto.deleted_at = datetime.now(timezone.utc)
    producto.deleted_by = user_id
    db.flush()
    return producto


def listar_servicios_asociados(db: Session, producto_id: UUID) -> list[ProductoServicioAsociado]:
    return list(
        db.execute(
            select(ProductoServicioAsociado).where(
                ProductoServicioAsociado.producto_id == producto_id,
                ProductoServicioAsociado.is_deleted == False,
            )
        ).scalars().all()
    )
