"""
Tests unitarios para las transiciones de estado de ventas y cotizaciones.
Valida la máquina de estados definida en ventas/service.py.
"""
import pytest
from fastapi import HTTPException

from app.modules.ventas.service import (
    TRANSICIONES_COTIZACION,
    TRANSICIONES_STUB,
    TRANSICIONES_VENTA,
    _validar_transicion,
)


# ─── Ventas: transiciones válidas ─────────────────────────────────────────────

TRANSICIONES_VENTA_VALIDAS = [
    ("CONSULTA_ABIERTA", "COTIZACION_ENVIADA"),
    ("CONSULTA_ABIERTA", "VENTA_GENERADA"),
    ("CONSULTA_ABIERTA", "ANULADA"),
    ("COTIZACION_ENVIADA", "VENTA_GENERADA"),
    ("COTIZACION_ENVIADA", "CONSULTA_ABIERTA"),
    ("COTIZACION_ENVIADA", "ANULADA"),
    ("VENTA_GENERADA", "CERRADA"),
    ("VENTA_GENERADA", "ANULADA"),
]

TRANSICIONES_VENTA_INVALIDAS = [
    ("CONSULTA_ABIERTA", "CERRADA"),
    ("CERRADA", "CONSULTA_ABIERTA"),
    ("CERRADA", "ANULADA"),
    ("CERRADA", "VENTA_GENERADA"),
    ("ANULADA", "CONSULTA_ABIERTA"),
    ("ANULADA", "CERRADA"),
    ("ANULADA", "VENTA_GENERADA"),
    ("VENTA_GENERADA", "COTIZACION_ENVIADA"),
    ("VENTA_GENERADA", "CONSULTA_ABIERTA"),
    ("COTIZACION_ENVIADA", "CERRADA"),
]


@pytest.mark.parametrize("actual, nuevo", TRANSICIONES_VENTA_VALIDAS)
def test_venta_transicion_valida(actual: str, nuevo: str):
    # No debe lanzar excepción
    _validar_transicion(actual, nuevo, TRANSICIONES_VENTA, "venta")


@pytest.mark.parametrize("actual, nuevo", TRANSICIONES_VENTA_INVALIDAS)
def test_venta_transicion_invalida(actual: str, nuevo: str):
    with pytest.raises(HTTPException) as exc_info:
        _validar_transicion(actual, nuevo, TRANSICIONES_VENTA, "venta")
    assert exc_info.value.status_code == 422


def test_venta_estados_terminales_sin_salida():
    """CERRADA y ANULADA no tienen transiciones permitidas."""
    assert TRANSICIONES_VENTA["CERRADA"] == []
    assert TRANSICIONES_VENTA["ANULADA"] == []


def test_venta_todos_los_estados_definidos():
    """Cada estado del enum tiene una entrada en la tabla de transiciones."""
    estados_esperados = {"CONSULTA_ABIERTA", "COTIZACION_ENVIADA", "VENTA_GENERADA", "CERRADA", "ANULADA"}
    assert set(TRANSICIONES_VENTA.keys()) == estados_esperados


def test_venta_consulta_abierta_puede_ir_a_venta_generada():
    """CONSULTA_ABIERTA puede saltar directamente a VENTA_GENERADA (sin pasar por COTIZACION_ENVIADA)."""
    assert "VENTA_GENERADA" in TRANSICIONES_VENTA["CONSULTA_ABIERTA"]


# ─── Cotizaciones: transiciones válidas ───────────────────────────────────────

TRANSICIONES_COTI_VALIDAS = [
    ("BORRADOR", "ENVIADA"),
    ("ENVIADA", "ACEPTADA"),
    ("ENVIADA", "RECHAZADA"),
    ("ENVIADA", "VENCIDA"),
]

TRANSICIONES_COTI_INVALIDAS = [
    ("BORRADOR", "ACEPTADA"),
    ("BORRADOR", "RECHAZADA"),
    ("BORRADOR", "VENCIDA"),
    ("ENVIADA", "BORRADOR"),
    ("ACEPTADA", "ENVIADA"),
    ("ACEPTADA", "RECHAZADA"),
    ("RECHAZADA", "BORRADOR"),
    ("RECHAZADA", "ENVIADA"),
    ("VENCIDA", "ENVIADA"),
]


@pytest.mark.parametrize("actual, nuevo", TRANSICIONES_COTI_VALIDAS)
def test_cotizacion_transicion_valida(actual: str, nuevo: str):
    _validar_transicion(actual, nuevo, TRANSICIONES_COTIZACION, "cotizacion")


@pytest.mark.parametrize("actual, nuevo", TRANSICIONES_COTI_INVALIDAS)
def test_cotizacion_transicion_invalida(actual: str, nuevo: str):
    with pytest.raises(HTTPException) as exc_info:
        _validar_transicion(actual, nuevo, TRANSICIONES_COTIZACION, "cotizacion")
    assert exc_info.value.status_code == 422


def test_cotizacion_estados_terminales_sin_salida():
    """ACEPTADA, RECHAZADA y VENCIDA no tienen transiciones permitidas."""
    assert TRANSICIONES_COTIZACION["ACEPTADA"] == []
    assert TRANSICIONES_COTIZACION["RECHAZADA"] == []
    assert TRANSICIONES_COTIZACION["VENCIDA"] == []


def test_cotizacion_todos_los_estados_definidos():
    estados_esperados = {"BORRADOR", "ENVIADA", "ACEPTADA", "RECHAZADA", "VENCIDA"}
    assert set(TRANSICIONES_COTIZACION.keys()) == estados_esperados


# ─── Stubs: transiciones válidas ─────────────────────────────────────────────

TRANSICIONES_STUB_VALIDAS = [
    ("PENDIENTE", "EN_REVISION"),
    ("PENDIENTE", "COMPLETADA"),
    ("PENDIENTE", "RECHAZADA"),
    ("EN_REVISION", "COMPLETADA"),
    ("EN_REVISION", "RECHAZADA"),
]

TRANSICIONES_STUB_INVALIDAS = [
    ("COMPLETADA", "PENDIENTE"),
    ("COMPLETADA", "EN_REVISION"),
    ("RECHAZADA", "PENDIENTE"),
    ("RECHAZADA", "EN_REVISION"),
    ("EN_REVISION", "PENDIENTE"),
]


@pytest.mark.parametrize("actual, nuevo", TRANSICIONES_STUB_VALIDAS)
def test_stub_transicion_valida(actual: str, nuevo: str):
    _validar_transicion(actual, nuevo, TRANSICIONES_STUB, "stub")


@pytest.mark.parametrize("actual, nuevo", TRANSICIONES_STUB_INVALIDAS)
def test_stub_transicion_invalida(actual: str, nuevo: str):
    with pytest.raises(HTTPException) as exc_info:
        _validar_transicion(actual, nuevo, TRANSICIONES_STUB, "stub")
    assert exc_info.value.status_code == 422


def test_stub_estados_terminales_sin_salida():
    assert TRANSICIONES_STUB["COMPLETADA"] == []
    assert TRANSICIONES_STUB["RECHAZADA"] == []
