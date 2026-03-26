from pydantic import BaseModel


class DashboardSummary(BaseModel):
    ventas_activas: int
    cotizaciones_pendientes: int
    stubs_sin_respuesta: int
    clientes_registrados: int
