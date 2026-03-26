from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.modules.clientes.models import Cliente
from app.modules.ventas.models import Cotizacion, SolicitudStub, Venta


def obtener_resumen(db: Session) -> dict:
    ventas_activas = db.execute(
        select(func.count()).select_from(Venta).where(
            Venta.is_deleted == False,
            Venta.estado.notin_(["CERRADA", "ANULADA"]),
        )
    ).scalar_one()

    cotizaciones_pendientes = db.execute(
        select(func.count()).select_from(Cotizacion).where(
            Cotizacion.is_deleted == False,
            Cotizacion.estado.in_(["BORRADOR", "ENVIADA"]),
        )
    ).scalar_one()

    stubs_sin_respuesta = db.execute(
        select(func.count()).select_from(SolicitudStub).where(
            SolicitudStub.is_deleted == False,
            SolicitudStub.estado.in_(["PENDIENTE", "EN_REVISION"]),
        )
    ).scalar_one()

    clientes_registrados = db.execute(
        select(func.count()).select_from(Cliente).where(
            Cliente.is_deleted == False,
        )
    ).scalar_one()

    return {
        "ventas_activas": ventas_activas,
        "cotizaciones_pendientes": cotizaciones_pendientes,
        "stubs_sin_respuesta": stubs_sin_respuesta,
        "clientes_registrados": clientes_registrados,
    }
