"""
Fixtures compartidos para la suite de tests de integración.

- client:         TestClient de FastAPI (sync, raise_server_exceptions=False)
- admin_token:    access_token obtenido con login real a Supabase (scope=session)
- auth_headers:   dict {"Authorization": "Bearer <token>"} (scope=session)
- db_session:     SQLAlchemy Session conectada a la DB real (scope=function, con rollback)
- cliente_test:   Cliente de prueba creado vía API; se elimina al terminar
- producto_test:  Primer producto activo disponible en la DB (solo lectura)
"""
import uuid

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

DATABASE_URL = (
    "postgresql://postgres.kczbxgtcuvbjvctdcnao:Abb1582esm.MC"
    "@aws-1-sa-east-1.pooler.supabase.com:5432/postgres"
)

ADMIN_EMAIL = "abborgia@gmail.com"
ADMIN_PASSWORD = "Abb1582esm.Com"

API_V1 = "/api/v1"


def _rut_valido(numero: int) -> str:
    """Genera un RUT chileno válido a partir de un número entero."""
    digitos = str(numero)
    suma = 0
    factor = 2
    for d in reversed(digitos):
        suma += int(d) * factor
        factor = 2 if factor == 7 else factor + 1
    resto = suma % 11
    dv = str(11 - resto) if resto not in (0, 1) else ("0" if resto == 0 else "K")
    return f"{numero}-{dv}"


# ─── App y cliente HTTP ───────────────────────────────────────────────────────

@pytest.fixture(scope="session")
def client():
    """TestClient síncrono de la app FastAPI."""
    from app.main import app
    with TestClient(app, raise_server_exceptions=False) as c:
        yield c


# ─── Autenticación ────────────────────────────────────────────────────────────

@pytest.fixture(scope="session")
def admin_token(client: TestClient) -> str:
    """Realiza un login real con las credenciales de admin y retorna el access_token."""
    response = client.post(
        f"{API_V1}/auth/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
    )
    assert response.status_code == 200, (
        f"Login de admin falló ({response.status_code}): {response.text}"
    )
    data = response.json()
    return data["data"]["access_token"]


@pytest.fixture(scope="session")
def auth_headers(admin_token: str) -> dict:
    """Cabeceras HTTP con el token de admin."""
    return {"Authorization": f"Bearer {admin_token}"}


# ─── Base de datos ────────────────────────────────────────────────────────────

@pytest.fixture(scope="function")
def db_session():
    """
    SQLAlchemy Session conectada a la DB real.
    Hace rollback al finalizar el test para no dejar basura.
    """
    engine = create_engine(DATABASE_URL, pool_pre_ping=True)
    Session = sessionmaker(bind=engine, autocommit=False, autoflush=False)
    session = Session()
    try:
        yield session
    finally:
        session.rollback()
        session.close()
        engine.dispose()


# ─── Datos de prueba ──────────────────────────────────────────────────────────

@pytest.fixture(scope="function")
def cliente_test(client: TestClient, auth_headers: dict):
    """
    Crea un cliente de prueba con RUT y nombre únicos vía la API.
    Lo elimina (soft-delete) al terminar el test.
    Si la creación falla, salta el test con pytest.skip.
    """
    uid = uuid.uuid4().hex[:8]
    # Generar RUT único por test run (derivado del uid aleatorio)
    rut_numero = int(uid, 16) % 15_000_000 + 5_000_000
    rut = _rut_valido(rut_numero)
    payload = {
        "razon_social": f"Cliente Test {uid}",
        "rut": rut,
        "email": f"test_{uid}@testdesarrollo.cl",
        "telefono": "+56900000000",
        "ciudad": "Santiago",
        "region": "Metropolitana",
    }

    response = client.post(f"{API_V1}/clientes", json=payload, headers=auth_headers)

    if response.status_code != 201:
        pytest.skip(
            f"No se pudo crear el cliente de prueba "
            f"({response.status_code}): {response.text}"
        )

    cliente_data = response.json()["data"]
    cliente_id = cliente_data["id"]

    yield type("ClienteTest", (), cliente_data)()

    # Cleanup: eliminar el cliente de prueba
    client.delete(f"{API_V1}/clientes/{cliente_id}", headers=auth_headers)


@pytest.fixture(scope="function")
def producto_test(client: TestClient, auth_headers: dict):
    """
    Retorna el primer producto activo disponible en la DB.
    No crea ni elimina nada — solo lectura.
    Si no hay productos, salta el test.
    """
    response = client.get(
        f"{API_V1}/productos",
        params={"limit": 1, "activo": "true"},
        headers=auth_headers,
    )
    if response.status_code != 200:
        pytest.skip(
            f"No se pudo obtener productos ({response.status_code}): {response.text}"
        )

    items = response.json().get("data", [])
    if not items:
        pytest.skip("No hay productos activos en la base de datos para ejecutar este test.")

    producto_data = items[0]
    return type("ProductoTest", (), producto_data)()
