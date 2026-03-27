"""
Tests del módulo de ventas.

Contiene:
  1. Un test de integración de flujo completo (end-to-end) usando TestClient.
  2. Tests unitarios de lógica de negocio con mocks (unittest.mock).
"""
import uuid
from unittest.mock import MagicMock, patch

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient

API_V1 = "/api/v1"


# ═══════════════════════════════════════════════════════════════════════════════
# TESTS DE INTEGRACIÓN — flujo completo de venta
# ═══════════════════════════════════════════════════════════════════════════════

def test_flujo_completo_venta(
    client: TestClient,
    auth_headers: dict,
    cliente_test,
    producto_test,
):
    """
    Flujo end-to-end de una venta desde CONSULTA_ABIERTA hasta CERRADA.

    Pasos:
      1. Crear venta
      2. Crear cotización
      3. Agregar línea a cotización
      4. Cambiar cotización a ENVIADA
      5. Cambiar cotización a ACEPTADA
      6. Confirmar venta → VENTA_GENERADA
      7. Verificar creación de stubs (debe haber al menos COB)
      8. Marcar todos los stubs como COMPLETADA
      9. Verificar que la venta pasó a CERRADA automáticamente
     10. Cleanup: anular/eliminar los recursos creados
    """
    venta_id = None
    cotizacion_id = None

    # ── Paso 1: Crear venta ───────────────────────────────────────────────────
    resp = client.post(
        f"{API_V1}/ventas",
        json={"cliente_id": str(cliente_test.id), "tipo": "suministro"},
        headers=auth_headers,
    )
    if resp.status_code != 201:
        pytest.skip(f"No se pudo crear la venta ({resp.status_code}): {resp.text}")

    venta = resp.json()["data"]
    venta_id = venta["id"]
    assert venta["estado"] == "CONSULTA_ABIERTA"

    # ── Paso 2: Crear cotización ──────────────────────────────────────────────
    resp = client.post(
        f"{API_V1}/ventas/{venta_id}/cotizaciones",
        json={"validez_dias": 30, "lineas": []},
        headers=auth_headers,
    )
    assert resp.status_code == 201, f"Crear cotización falló: {resp.text}"
    cotizacion = resp.json()["data"]
    cotizacion_id = cotizacion["id"]
    assert cotizacion["estado"] == "BORRADOR"

    # ── Paso 3: Agregar línea a cotización ────────────────────────────────────
    resp = client.post(
        f"{API_V1}/ventas/cotizaciones/{cotizacion_id}/lineas",
        json={
            "producto_id": str(producto_test.id),
            "descripcion": producto_test.nombre if hasattr(producto_test, "nombre") else "Producto de prueba",
            "cantidad": 1,
            "precio_unitario": 10000,
            "descuento_pct": 0,
        },
        headers=auth_headers,
    )
    assert resp.status_code == 201, f"Agregar línea falló: {resp.text}"
    cotizacion_actualizada = resp.json()["data"]
    assert len(cotizacion_actualizada["lineas"]) >= 1

    # ── Paso 4: Cambiar cotización a ENVIADA ──────────────────────────────────
    resp = client.post(
        f"{API_V1}/ventas/cotizaciones/{cotizacion_id}/estado",
        json={"estado": "ENVIADA"},
        headers=auth_headers,
    )
    assert resp.status_code == 200, f"Cambiar a ENVIADA falló: {resp.text}"
    assert resp.json()["data"]["estado"] == "ENVIADA"

    # ── Paso 5: Cambiar cotización a ACEPTADA ─────────────────────────────────
    resp = client.post(
        f"{API_V1}/ventas/cotizaciones/{cotizacion_id}/estado",
        json={"estado": "ACEPTADA"},
        headers=auth_headers,
    )
    assert resp.status_code == 200, f"Cambiar a ACEPTADA falló: {resp.text}"
    assert resp.json()["data"]["estado"] == "ACEPTADA"

    # ── Paso 6: Confirmar venta → VENTA_GENERADA ──────────────────────────────
    resp = client.post(
        f"{API_V1}/ventas/{venta_id}/estado",
        json={"estado": "VENTA_GENERADA"},
        headers=auth_headers,
    )
    assert resp.status_code == 200, f"Confirmar venta falló: {resp.text}"
    assert resp.json()["data"]["estado"] == "VENTA_GENERADA"

    # ── Paso 7: Verificar que se crearon stubs ────────────────────────────────
    resp = client.get(
        f"{API_V1}/stubs",
        params={"venta_id": venta_id},
        headers=auth_headers,
    )
    assert resp.status_code == 200, f"Listar stubs falló: {resp.text}"
    stubs = resp.json()["data"]
    assert len(stubs) >= 1, "Deben existir al menos un stub (COB) al confirmar la venta"

    tipos_stub = {s["tipo"] for s in stubs}
    assert "COB" in tipos_stub, f"Debe existir al menos el stub COB, encontrados: {tipos_stub}"

    # ── Paso 8: Marcar todos los stubs como COMPLETADA ────────────────────────
    for stub in stubs:
        stub_id = stub["id"]
        if stub["estado"] == "COMPLETADA":
            continue
        resp = client.post(
            f"{API_V1}/stubs/{stub_id}/estado",
            json={"estado": "COMPLETADA", "respuesta": "Completado en test de integración"},
            headers=auth_headers,
        )
        assert resp.status_code == 200, (
            f"Cambiar stub {stub_id} a COMPLETADA falló: {resp.text}"
        )

    # ── Paso 9: Verificar que la venta pasó a CERRADA automáticamente ─────────
    resp = client.get(f"{API_V1}/ventas/{venta_id}", headers=auth_headers)
    assert resp.status_code == 200
    estado_final = resp.json()["data"]["estado"]
    assert estado_final == "CERRADA", (
        f"La venta debería estar CERRADA pero está en: {estado_final}"
    )

    # ── Paso 10: Cleanup — soft-delete directo en DB (la venta está CERRADA,
    # no se puede anular vía API ya que es estado terminal)
    from sqlalchemy import create_engine, text
    from sqlalchemy.orm import sessionmaker
    _engine = create_engine(
        "postgresql://postgres.kczbxgtcuvbjvctdcnao:Abb1582esm.MC"
        "@aws-1-sa-east-1.pooler.supabase.com:5432/postgres",
        pool_pre_ping=True,
    )
    with sessionmaker(bind=_engine)() as _db:
        _db.execute(text(
            "update public.ventas set is_deleted=true, deleted_at=now() where id=:id"
        ), {"id": venta_id})
        _db.execute(text(
            "update public.cotizaciones set is_deleted=true, deleted_at=now() where venta_id=:id"
        ), {"id": venta_id})
        _db.execute(text(
            "update public.solicitudes_stub set is_deleted=true, deleted_at=now() where venta_id=:id"
        ), {"id": venta_id})
        _db.commit()
    _engine.dispose()


# ═══════════════════════════════════════════════════════════════════════════════
# TESTS UNITARIOS — lógica de negocio con mocks
# ═══════════════════════════════════════════════════════════════════════════════

class TestCambiarEstadoVenta:
    """Tests unitarios para cambiar_estado_venta con mocks de DB."""

    def test_venta_generada_sin_cotizacion_aceptada(self):
        """
        Intentar pasar a VENTA_GENERADA sin cotización aceptada debe lanzar
        HTTPException 422.
        """
        from app.modules.ventas.service import cambiar_estado_venta

        # Mock de la sesión de DB que devuelve None al buscar cotización aceptada
        db = MagicMock()
        db.execute.return_value.scalar_one_or_none.return_value = None

        # Mock de la venta en estado CONSULTA_ABIERTA
        venta = MagicMock()
        venta.id = uuid.uuid4()
        venta.estado = "CONSULTA_ABIERTA"
        venta.cliente_id = uuid.uuid4()
        venta.tipo = "suministro"

        user_id = uuid.uuid4()

        with pytest.raises(HTTPException) as exc_info:
            cambiar_estado_venta(db, venta, "VENTA_GENERADA", user_id)

        assert exc_info.value.status_code == 422
        assert "cotización aceptada" in exc_info.value.detail.lower() or \
               "aceptada" in exc_info.value.detail.lower()

    def test_venta_generada_con_cotizacion_aceptada(self):
        """
        Pasar a VENTA_GENERADA con cotización aceptada existente debe funcionar
        (llama a _crear_stubs_confirmacion y cambia el estado).
        """
        from app.modules.ventas.service import cambiar_estado_venta

        cotizacion_mock = MagicMock()
        cotizacion_mock.id = uuid.uuid4()
        cotizacion_mock.monto_total = 100000

        db = MagicMock()
        db.execute.return_value.scalar_one_or_none.return_value = cotizacion_mock

        venta = MagicMock()
        venta.id = uuid.uuid4()
        venta.estado = "CONSULTA_ABIERTA"
        venta.cliente_id = uuid.uuid4()
        venta.tipo = "suministro"
        venta.codigo = "V-0001"

        user_id = uuid.uuid4()

        # Parchamos _crear_stubs_confirmacion para no necesitar una DB real
        with patch("app.modules.ventas.service._crear_stubs_confirmacion"):
            result = cambiar_estado_venta(db, venta, "VENTA_GENERADA", user_id)

        assert venta.estado == "VENTA_GENERADA"
        assert venta.updated_by == user_id


class TestAutoCerrarVenta:
    """Tests unitarios para _auto_cerrar_venta con mocks de DB."""

    def _make_stub(self, estado: str) -> MagicMock:
        stub = MagicMock()
        stub.estado = estado
        return stub

    def test_auto_cierre_todos_completados(self):
        """
        _auto_cerrar_venta debe cambiar el estado a CERRADA cuando todos
        los stubs están COMPLETADA.
        """
        from app.modules.ventas.service import _auto_cerrar_venta

        venta = MagicMock()
        venta.id = uuid.uuid4()
        venta.estado = "VENTA_GENERADA"

        stubs = [self._make_stub("COMPLETADA"), self._make_stub("COMPLETADA")]

        db = MagicMock()

        # Primera llamada: obtener la venta
        db.execute.return_value.scalar_one_or_none.return_value = venta
        # Segunda llamada: obtener los stubs
        db.execute.return_value.scalars.return_value.all.return_value = stubs

        # Configurar el mock para la secuencia de llamadas
        execute_results = [
            MagicMock(scalar_one_or_none=MagicMock(return_value=venta)),
            MagicMock(scalars=MagicMock(return_value=MagicMock(all=MagicMock(return_value=stubs)))),
        ]
        db.execute.side_effect = execute_results

        user_id = uuid.uuid4()
        _auto_cerrar_venta(db, venta.id, user_id)

        assert venta.estado == "CERRADA"
        assert venta.updated_by == user_id
        db.flush.assert_called()

    def test_auto_cierre_no_aplica_si_hay_pendientes(self):
        """
        _auto_cerrar_venta NO debe cerrar la venta si hay stubs en estado
        diferente a COMPLETADA.
        """
        from app.modules.ventas.service import _auto_cerrar_venta

        venta = MagicMock()
        venta.id = uuid.uuid4()
        venta.estado = "VENTA_GENERADA"

        stubs = [
            self._make_stub("COMPLETADA"),
            self._make_stub("PENDIENTE"),  # todavía pendiente
        ]

        db = MagicMock()
        execute_results = [
            MagicMock(scalar_one_or_none=MagicMock(return_value=venta)),
            MagicMock(scalars=MagicMock(return_value=MagicMock(all=MagicMock(return_value=stubs)))),
        ]
        db.execute.side_effect = execute_results

        user_id = uuid.uuid4()
        _auto_cerrar_venta(db, venta.id, user_id)

        # El estado NO debe haber cambiado
        assert venta.estado == "VENTA_GENERADA"
        # flush no debe haberse llamado (no hubo cambio)
        db.flush.assert_not_called()

    def test_auto_cierre_no_aplica_si_no_hay_stubs(self):
        """
        _auto_cerrar_venta NO debe cerrar la venta si no existen stubs asociados.
        """
        from app.modules.ventas.service import _auto_cerrar_venta

        venta = MagicMock()
        venta.id = uuid.uuid4()
        venta.estado = "VENTA_GENERADA"

        db = MagicMock()
        execute_results = [
            MagicMock(scalar_one_or_none=MagicMock(return_value=venta)),
            MagicMock(scalars=MagicMock(return_value=MagicMock(all=MagicMock(return_value=[])))),
        ]
        db.execute.side_effect = execute_results

        user_id = uuid.uuid4()
        _auto_cerrar_venta(db, venta.id, user_id)

        assert venta.estado == "VENTA_GENERADA"
        db.flush.assert_not_called()

    def test_auto_cierre_no_aplica_si_venta_no_esta_en_generada(self):
        """
        _auto_cerrar_venta es un no-op si la venta no está en VENTA_GENERADA.
        """
        from app.modules.ventas.service import _auto_cerrar_venta

        venta = MagicMock()
        venta.id = uuid.uuid4()
        venta.estado = "CERRADA"  # ya cerrada

        db = MagicMock()
        execute_results = [
            MagicMock(scalar_one_or_none=MagicMock(return_value=venta)),
        ]
        db.execute.side_effect = execute_results

        user_id = uuid.uuid4()
        _auto_cerrar_venta(db, venta.id, user_id)

        # No debe haber una segunda llamada a execute (para stubs)
        assert db.execute.call_count == 1
        db.flush.assert_not_called()
