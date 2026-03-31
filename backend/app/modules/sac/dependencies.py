from uuid import UUID

from fastapi import Depends, HTTPException, Path, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.modules.sac.models import ContactoObra, OrdenTrabajo, SAC
from app.modules.sac.service import obtener_ot, obtener_sac


def get_sac_or_404(
    sac_id: UUID = Path(...),
    db: Session = Depends(get_db),
) -> SAC:
    sac = obtener_sac(db, sac_id)
    if not sac:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="SAC no encontrado")
    return sac


def get_ot_or_404(
    ot_id: UUID = Path(...),
    db: Session = Depends(get_db),
) -> OrdenTrabajo:
    ot = obtener_ot(db, ot_id)
    if not ot:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Orden de trabajo no encontrada")
    return ot


def get_contacto_or_404(
    contacto_id: UUID = Path(...),
    db: Session = Depends(get_db),
) -> ContactoObra:
    from sqlalchemy import select
    contacto = db.execute(
        select(ContactoObra).where(ContactoObra.id == contacto_id, ContactoObra.is_deleted == False)
    ).scalar_one_or_none()
    if not contacto:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contacto no encontrado")
    return contacto
