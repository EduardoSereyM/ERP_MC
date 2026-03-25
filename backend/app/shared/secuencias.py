"""
Helper para generar códigos correlativos usando la tabla public.secuencias.
Usa SELECT FOR UPDATE para garantizar unicidad bajo concurrencia.
"""
from sqlalchemy import text
from sqlalchemy.orm import Session


_PREFIJO_MAP: dict[str, str] = {
    "venta":      "VTA",
    "cotizacion": "VTA",   # comparten prefijo VTA para consistencia
    "cliente":    "CLI",   # extensión futura
    "producto":   "PRD",   # extensión futura
    "bod":        "BOD",
    "cob":        "COB",
    "ctb":        "CTB",
    "ger":        "GER",
    "ins":        "INS",
    "ot":         "OT",
    "st":         "ST",
    "pvr":        "PVR",
    "pvc":        "PVC",
    "inc":        "INC",
}


def siguiente_codigo(db: Session, tipo: str) -> str:
    """
    Genera el siguiente código correlativo para el tipo dado.
    Llama a la función SQL siguiente_codigo(tipo) definida en la migración 0002.
    """
    result = db.execute(
        text("SELECT public.siguiente_codigo(:tipo)"),
        {"tipo": tipo},
    ).scalar_one()
    return result
