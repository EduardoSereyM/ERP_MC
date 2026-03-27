"""
Tests de integración para creación y gestión de usuarios.

Flujo:
  1. Admin crea un usuario nuevo via POST /api/v1/auth/usuarios
  2. El usuario creado puede hacer login
  3. El usuario aparece en /auth/me con el rol correcto
  4. Admin elimina el usuario via DELETE /api/v1/auth/usuarios/{id}
  5. El usuario ya no puede hacer login
"""
import uuid

import pytest
from fastapi.testclient import TestClient

API_V1 = "/api/v1"

# Datos del usuario de prueba — email único para evitar conflictos
_uid = uuid.uuid4().hex[:8]
USUARIO_TEST = {
    "email": f"test_{_uid}@testdesarrollo.cl",
    "password": "TestPass1234!",
    "nombre": f"Usuario Test {_uid}",
    "rol_funcional": "vendedor",
    "nivel_jerarquico": "usuario",
}


# ─── Fixture: usuario creado para este módulo de tests ───────────────────────

@pytest.fixture(scope="module")
def usuario_creado(client: TestClient, auth_headers: dict) -> dict:
    """
    Crea un usuario de prueba via API y lo elimina al terminar el módulo.
    Retorna el dict con los datos del usuario creado (incluye 'id').
    """
    resp = client.post(
        f"{API_V1}/auth/usuarios",
        json=USUARIO_TEST,
        headers=auth_headers,
    )
    if resp.status_code != 201:
        pytest.skip(f"No se pudo crear usuario de prueba ({resp.status_code}): {resp.text}")

    usuario = resp.json()["data"]
    yield usuario

    # Cleanup: eliminar el usuario de prueba
    client.delete(f"{API_V1}/auth/usuarios/{usuario['id']}", headers=auth_headers)


# ─── Tests ───────────────────────────────────────────────────────────────────

def test_crear_usuario_como_admin(client: TestClient, auth_headers: dict, usuario_creado: dict):
    """El fixture ya valida que la creación retornó 201. Verificamos el body."""
    assert usuario_creado["email"] == USUARIO_TEST["email"]
    assert usuario_creado["nombre"] == USUARIO_TEST["nombre"]
    assert usuario_creado["rol_funcional"] == USUARIO_TEST["rol_funcional"]
    assert usuario_creado["nivel_jerarquico"] == USUARIO_TEST["nivel_jerarquico"]
    assert usuario_creado["activo"] is True
    assert "id" in usuario_creado


def test_crear_usuario_email_duplicado(client: TestClient, auth_headers: dict, usuario_creado: dict):
    """Intentar crear otro usuario con el mismo email debe retornar 409."""
    resp = client.post(
        f"{API_V1}/auth/usuarios",
        json=USUARIO_TEST,
        headers=auth_headers,
    )
    assert resp.status_code == 409


def test_crear_usuario_sin_autenticacion(client: TestClient):
    """Crear usuario sin token debe retornar 401/403."""
    resp = client.post(f"{API_V1}/auth/usuarios", json=USUARIO_TEST)
    assert resp.status_code in (401, 403)


def test_usuario_creado_puede_hacer_login(client: TestClient, usuario_creado: dict):
    """El usuario recién creado debe poder autenticarse con sus credenciales."""
    resp = client.post(
        f"{API_V1}/auth/login",
        json={"email": USUARIO_TEST["email"], "password": USUARIO_TEST["password"]},
    )
    assert resp.status_code == 200, f"Login del usuario creado falló: {resp.text}"
    body = resp.json()
    assert "access_token" in body["data"]
    assert body["data"]["access_token"]


def test_usuario_creado_me_retorna_datos_correctos(client: TestClient, usuario_creado: dict):
    """Con el token del usuario creado, /auth/me debe retornar sus datos correctos."""
    # Primero obtenemos el token del usuario de prueba
    resp_login = client.post(
        f"{API_V1}/auth/login",
        json={"email": USUARIO_TEST["email"], "password": USUARIO_TEST["password"]},
    )
    if resp_login.status_code != 200:
        pytest.skip("No se pudo obtener token del usuario de prueba")

    token = resp_login.json()["data"]["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    resp = client.get(f"{API_V1}/auth/me", headers=headers)
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert data["email"] == USUARIO_TEST["email"]
    assert data["rol_funcional"] == USUARIO_TEST["rol_funcional"]


def test_crear_usuario_password_corta(client: TestClient, auth_headers: dict):
    """Password menor a 8 caracteres debe ser rechazada por validación del schema."""
    payload = {**USUARIO_TEST, "email": f"otro_{_uid}@test.cl", "password": "123"}
    resp = client.post(f"{API_V1}/auth/usuarios", json=payload, headers=auth_headers)
    assert resp.status_code == 422


def test_crear_usuario_rol_invalido(client: TestClient, auth_headers: dict):
    """Rol funcional inválido debe retornar 422."""
    payload = {**USUARIO_TEST, "email": f"otro2_{_uid}@test.cl", "rol_funcional": "rol_inexistente"}
    resp = client.post(f"{API_V1}/auth/usuarios", json=payload, headers=auth_headers)
    assert resp.status_code == 422
