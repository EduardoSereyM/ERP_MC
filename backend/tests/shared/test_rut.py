"""
Tests unitarios para el validador de RUT chileno (Módulo 11).
"""
import pytest

from app.shared.rut import RutInvalidoError, normalizar_rut, validar_rut, validar_rut_o_error


# ─── Casos válidos ─────────────────────────────────────────────────────────────

VALIDOS = [
    ("12345678-9", "12345678-9"),
    ("12.345.678-9", "12345678-9"),
    ("12345678 9", "12345678-9"),
    ("76354771-K", "76354771-K"),
    ("76354771k", "76354771-K"),   # k minúscula
    ("5126663-3", "5126663-3"),    # RUT de 7 dígitos
]

# ─── Casos inválidos ───────────────────────────────────────────────────────────

INVALIDOS = [
    "12345678-0",  # DV incorrecto
    "00000000-0",  # cero no válido
    "abc-def-g",   # no numérico
    "",            # vacío
    "1234",        # demasiado corto
    "12345678-11", # DV de dos dígitos
]


@pytest.mark.parametrize("rut, esperado", VALIDOS)
def test_valida_ruts_correctos(rut: str, esperado: str):
    assert validar_rut(rut) is True


@pytest.mark.parametrize("rut", INVALIDOS)
def test_rechaza_ruts_incorrectos(rut: str):
    assert validar_rut(rut) is False


@pytest.mark.parametrize("rut, esperado", VALIDOS)
def test_normaliza_rut(rut: str, esperado: str):
    assert validar_rut_o_error(rut) == esperado


def test_lanza_error_en_rut_invalido():
    with pytest.raises(RutInvalidoError):
        validar_rut_o_error("12345678-0")


def test_lanza_error_en_formato_invalido():
    with pytest.raises(RutInvalidoError):
        validar_rut_o_error("no-es-rut")
