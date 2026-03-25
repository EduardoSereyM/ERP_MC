"""
Validación de RUT chileno — Algoritmo Módulo 11.

Formatos aceptados:
  - "12345678-9"
  - "12.345.678-9"
  - "12345678-K"  (dígito verificador K)
  - "12345678K"   (sin guión)

Uso:
    from app.shared.rut import validar_rut, normalizar_rut, RutInvalidoError

    normalizar_rut("12.345.678-9")  → "12345678-9"
    validar_rut("12345678-9")       → True / False
"""

import re


class RutInvalidoError(ValueError):
    """RUT con formato inválido o dígito verificador incorrecto."""


_CLEAN_RE = re.compile(r"[.\-\s]")


def _limpiar(rut: str) -> str:
    """Elimina puntos, guiones y espacios; devuelve en mayúsculas."""
    return _CLEAN_RE.sub("", rut.strip()).upper()


def _calcular_dv(cuerpo: str) -> str:
    """
    Calcula el dígito verificador para el cuerpo numérico del RUT.
    Retorna '0'-'9' o 'K'.
    """
    suma = 0
    multiplo = 2
    for digito in reversed(cuerpo):
        suma += int(digito) * multiplo
        multiplo = 2 if multiplo == 7 else multiplo + 1

    resto = 11 - (suma % 11)
    if resto == 11:
        return "0"
    if resto == 10:
        return "K"
    return str(resto)


def normalizar_rut(rut: str) -> str:
    """
    Normaliza un RUT al formato estándar: "12345678-9".
    Lanza RutInvalidoError si el formato es incorrecto.
    """
    limpio = _limpiar(rut)

    # Debe tener entre 8 y 9 caracteres: 7-8 dígitos + DV (0-9 o K)
    if not re.fullmatch(r"\d{7,8}[0-9K]", limpio):
        raise RutInvalidoError(f"Formato de RUT inválido: '{rut}'")

    cuerpo = limpio[:-1]
    dv = limpio[-1]
    return f"{cuerpo}-{dv}"


def validar_rut(rut: str) -> bool:
    """
    Valida un RUT chileno usando el algoritmo Módulo 11.
    Retorna True si es válido, False en caso contrario.
    No lanza excepción — seguro para usar en condiciones booleanas.
    """
    try:
        limpio = _limpiar(rut)
        if not re.fullmatch(r"\d{7,8}[0-9K]", limpio):
            return False
        cuerpo = limpio[:-1]
        dv = limpio[-1]
        return _calcular_dv(cuerpo) == dv
    except Exception:
        return False


def validar_rut_o_error(rut: str) -> str:
    """
    Valida y normaliza un RUT.
    Lanza RutInvalidoError si el RUT es inválido.
    Retorna el RUT normalizado ("12345678-9") si es válido.
    Usado como validador en Pydantic: Field(validator=...).
    """
    if not validar_rut(rut):
        raise RutInvalidoError(f"RUT inválido: '{rut}'")
    return normalizar_rut(rut)
