from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.middleware import limiter
from app.modules.auth.dependencies import CurrentUser, get_current_user
from app.modules.dashboard import service as svc
from app.modules.dashboard.schemas import DashboardSummary
from app.shared.responses import RespuestaSimple

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/summary", response_model=RespuestaSimple[DashboardSummary])
@limiter.limit("60/minute")
def obtener_resumen(
    request: Request,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    data = svc.obtener_resumen(db)
    return RespuestaSimple(data=DashboardSummary(**data))
