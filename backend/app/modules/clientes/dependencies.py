from uuid import UUID

from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.modules.auth.dependencies import get_current_user, CurrentUser
from app.modules.clientes.models import Cliente
from app.modules.clientes import service as clientes_svc


def get_cliente_or_404(
    cliente_id: UUID,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
) -> Cliente:
    cliente = clientes_svc.obtener_cliente(db, cliente_id)
    if not cliente:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cliente no encontrado")
    return cliente
