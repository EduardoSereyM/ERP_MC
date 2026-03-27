"""
Tests unitarios para validación de schemas Pydantic de ventas y cotizaciones.
"""
from decimal import Decimal
from uuid import uuid4

import pytest
from pydantic import ValidationError

from app.modules.ventas.schemas import (
    CotizacionCambioEstado,
    CotizacionCreate,
    LineaCotizacionCreate,
    LineaCotizacionUpdate,
    StubCambioEstado,
    StubCreate,
    VentaCambioEstado,
    VentaCreate,
    VentaUpdate,
)


# ─── VentaCreate ──────────────────────────────────────────────────────────────

class TestVentaCreate:
    def test_minima_valida(self):
        v = VentaCreate(cliente_id=uuid4())
        assert v.descuento_pct == Decimal("0")
        assert v.notas is None

    def test_completa(self):
        v = VentaCreate(
            cliente_id=uuid4(),
            fecha_cierre_esperada="2026-12-31",
            descuento_pct=Decimal("15.5"),
            notas="Test",
        )
        assert v.descuento_pct == Decimal("15.5")

    def test_descuento_negativo_rechazado(self):
        with pytest.raises(ValidationError):
            VentaCreate(cliente_id=uuid4(), descuento_pct=Decimal("-1"))

    def test_descuento_mayor_100_rechazado(self):
        with pytest.raises(ValidationError):
            VentaCreate(cliente_id=uuid4(), descuento_pct=Decimal("101"))

    def test_sin_cliente_id_falla(self):
        with pytest.raises(ValidationError):
            VentaCreate()


# ─── VentaUpdate ──────────────────────────────────────────────────────────────

class TestVentaUpdate:
    def test_parcial_valida(self):
        u = VentaUpdate(notas="nueva nota")
        assert u.notas == "nueva nota"
        assert u.descuento_pct is None

    def test_vacia_valida(self):
        u = VentaUpdate()
        assert u.notas is None


# ─── VentaCambioEstado ────────────────────────────────────────────────────────

class TestVentaCambioEstado:
    def test_estado_valido(self):
        c = VentaCambioEstado(estado="COTIZACION_ENVIADA")
        assert c.estado == "COTIZACION_ENVIADA"

    def test_estado_invalido(self):
        with pytest.raises(ValidationError):
            VentaCambioEstado(estado="ESTADO_INEXISTENTE")

    def test_anulada_con_motivo(self):
        c = VentaCambioEstado(estado="ANULADA", motivo_anulacion="Cliente desistió")
        assert c.motivo_anulacion == "Cliente desistió"


# ─── LineaCotizacionCreate ────────────────────────────────────────────────────

class TestLineaCotizacionCreate:
    def test_minima_valida(self):
        l = LineaCotizacionCreate(producto_id=uuid4(), descripcion="Servicio A")
        assert l.cantidad == Decimal("1")
        assert l.precio_unitario == Decimal("0")
        assert l.descuento_pct == Decimal("0")

    def test_completa(self):
        l = LineaCotizacionCreate(
            producto_id=uuid4(),
            descripcion="Producto X",
            cantidad=Decimal("3"),
            precio_unitario=Decimal("50000"),
            descuento_pct=Decimal("10"),
        )
        assert l.cantidad == Decimal("3")

    def test_descripcion_vacia_rechazada(self):
        with pytest.raises(ValidationError):
            LineaCotizacionCreate(producto_id=uuid4(), descripcion="")

    def test_cantidad_cero_rechazada(self):
        with pytest.raises(ValidationError):
            LineaCotizacionCreate(producto_id=uuid4(), descripcion="X", cantidad=Decimal("0"))

    def test_cantidad_negativa_rechazada(self):
        with pytest.raises(ValidationError):
            LineaCotizacionCreate(producto_id=uuid4(), descripcion="X", cantidad=Decimal("-1"))

    def test_descuento_mayor_100_rechazado(self):
        with pytest.raises(ValidationError):
            LineaCotizacionCreate(producto_id=uuid4(), descripcion="X", descuento_pct=Decimal("101"))

    def test_precio_negativo_rechazado(self):
        with pytest.raises(ValidationError):
            LineaCotizacionCreate(producto_id=uuid4(), descripcion="X", precio_unitario=Decimal("-100"))


# ─── LineaCotizacionUpdate ────────────────────────────────────────────────────

class TestLineaCotizacionUpdate:
    def test_parcial_valida(self):
        u = LineaCotizacionUpdate(precio_unitario=Decimal("1000"))
        assert u.precio_unitario == Decimal("1000")
        assert u.cantidad is None

    def test_vacia_valida(self):
        u = LineaCotizacionUpdate()
        assert u.cantidad is None
        assert u.precio_unitario is None


# ─── CotizacionCreate ────────────────────────────────────────────────────────

class TestCotizacionCreate:
    def test_minima_valida(self):
        c = CotizacionCreate()
        assert c.validez_dias == 30
        assert c.lineas == []
        assert c.descuento_global_pct == Decimal("0")

    def test_con_lineas(self):
        pid = uuid4()
        c = CotizacionCreate(
            lineas=[
                LineaCotizacionCreate(producto_id=pid, descripcion="Línea 1", cantidad=Decimal("2"), precio_unitario=Decimal("10000")),
                LineaCotizacionCreate(producto_id=pid, descripcion="Línea 2"),
            ]
        )
        assert len(c.lineas) == 2

    def test_validez_cero_rechazada(self):
        with pytest.raises(ValidationError):
            CotizacionCreate(validez_dias=0)

    def test_validez_mayor_365_rechazada(self):
        with pytest.raises(ValidationError):
            CotizacionCreate(validez_dias=400)

    def test_descuento_global_negativo_rechazado(self):
        with pytest.raises(ValidationError):
            CotizacionCreate(descuento_global_pct=Decimal("-1"))


# ─── CotizacionCambioEstado ──────────────────────────────────────────────────

class TestCotizacionCambioEstado:
    def test_estado_valido(self):
        c = CotizacionCambioEstado(estado="ENVIADA")
        assert c.estado == "ENVIADA"

    def test_estado_invalido(self):
        with pytest.raises(ValidationError):
            CotizacionCambioEstado(estado="NO_EXISTE")


# ─── StubCreate ───────────────────────────────────────────────────────────────

class TestStubCreate:
    def test_minimo_valido(self):
        s = StubCreate(
            tipo="BOD",
            origen_modulo="ventas",
            origen_id=uuid4(),
            cliente_id=uuid4(),
            descripcion="Solicitud de bodega para despacho",
        )
        assert s.tipo == "BOD"
        assert s.descripcion == "Solicitud de bodega para despacho"

    def test_tipo_invalido(self):
        with pytest.raises(ValidationError):
            StubCreate(
                tipo="XXX",
                origen_modulo="ventas",
                origen_id=uuid4(),
                cliente_id=uuid4(),
                descripcion="Test",
            )

    def test_descripcion_corta_rechazada(self):
        with pytest.raises(ValidationError):
            StubCreate(
                tipo="BOD",
                origen_modulo="ventas",
                origen_id=uuid4(),
                cliente_id=uuid4(),
                descripcion="abc",  # min_length=5
            )

    def test_origen_modulo_invalido(self):
        with pytest.raises(ValidationError):
            StubCreate(
                tipo="BOD",
                origen_modulo="modulo_inexistente",
                origen_id=uuid4(),
                cliente_id=uuid4(),
                descripcion="Solicitud test",
            )


# ─── StubCambioEstado ─────────────────────────────────────────────────────────

class TestStubCambioEstado:
    def test_valido(self):
        s = StubCambioEstado(estado="EN_REVISION")
        assert s.estado == "EN_REVISION"

    def test_con_respuesta(self):
        s = StubCambioEstado(estado="COMPLETADA", respuesta="Despachado OK")
        assert s.respuesta == "Despachado OK"

    def test_estado_invalido(self):
        with pytest.raises(ValidationError):
            StubCambioEstado(estado="NO_EXISTE")
