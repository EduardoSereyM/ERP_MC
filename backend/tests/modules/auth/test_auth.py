"""
Tests de integración para el módulo de autenticación.

Usan TestClient (sync) y realizan llamadas reales a Supabase / DB.
Los fixtures `client` y `auth_headers` están definidos en tests/conftest.py.
"""
import pytest
from fastapi.testclient import TestClient

API_V1 = "/api/v1"

ADMIN_EMAIL = "abborgia@gmail.com"
ADMIN_PASSWORD = "Abb1582esm.Com"


# ─── Login ────────────────────────────────────────────────────────────────────

def test_login_correcto(client: TestClient):
    """POST /auth/login con credenciales correctas → 200 y access_token presente."""
    response = client.post(
        f"{API_V1}/auth/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
    )
    assert response.status_code == 200
    body = response.json()
    assert "data" in body
    assert "access_token" in body["data"]
    assert body["data"]["access_token"]  # no vacío


def test_login_email_invalido(client: TestClient):
    """POST /auth/login con email inexistente → 401."""
    response = client.post(
        f"{API_V1}/auth/login",
        json={"email": "no_existe@testdesarrollo.cl", "password": ADMIN_PASSWORD},
    )
    assert response.status_code == 401


def test_login_password_incorrecta(client: TestClient):
    """POST /auth/login con contraseña incorrecta → 401."""
    response = client.post(
        f"{API_V1}/auth/login",
        json={"email": ADMIN_EMAIL, "password": "contrasena_incorrecta_123"},
    )
    assert response.status_code == 401


# ─── /me ──────────────────────────────────────────────────────────────────────

def test_me_con_token_valido(client: TestClient, auth_headers: dict):
    """GET /auth/me con token válido → 200 con email y rol_funcional."""
    response = client.get(f"{API_V1}/auth/me", headers=auth_headers)
    assert response.status_code == 200
    body = response.json()
    assert "data" in body
    data = body["data"]
    assert "email" in data
    assert "rol_funcional" in data
    assert data["email"] == ADMIN_EMAIL


def test_me_sin_token(client: TestClient):
    """GET /auth/me sin cabecera Authorization → 401 o 403."""
    response = client.get(f"{API_V1}/auth/me")
    assert response.status_code in (401, 403)


def test_me_token_invalido(client: TestClient):
    """GET /auth/me con token falso → 401 o 403."""
    headers = {"Authorization": "Bearer token_completamente_falso_xyz"}
    response = client.get(f"{API_V1}/auth/me", headers=headers)
    assert response.status_code in (401, 403)
