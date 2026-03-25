from uuid import UUID

from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session

from sqlalchemy import select

from app.core.database import get_db
from app.modules.auth.dependencies import get_current_user, CurrentUser
from app.modules.ventas.models import Cotizacion, LineaCotizacion, SolicitudStub, Venta
from app.modules.ventas import service as ventas_svc


def get_venta_or_404(
    venta_id: UUID,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
) -> Venta:
    venta = ventas_svc.obtener_venta(db, venta_id)
    if not venta:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Venta no encontrada")
    return venta


def get_cotizacion_or_404(
    cotizacion_id: UUID,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
) -> Cotizacion:
    cotizacion = ventas_svc.obtener_cotizacion(db, cotizacion_id)
    if not cotizacion:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cotización no encontrada")
    return cotizacion


def get_linea_or_404(
    linea_id: UUID,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
) -> LineaCotizacion:
    linea = ventas_svc.obtener_linea(db, linea_id)
    if not linea:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Línea no encontrada")
    return linea
