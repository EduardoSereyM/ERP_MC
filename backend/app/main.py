from fastapi import FastAPI
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.core.config import settings
from app.core.middleware import limiter, setup_middleware

# Routers
from app.modules.auth.router import router as auth_router
from app.modules.clientes.router import router as clientes_router
from app.modules.productos.router import router as productos_router
from app.modules.ventas.router import router as ventas_router, stubs_router

app = FastAPI(
    title=settings.PROJECT_NAME,
    version="0.1.0",
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url="/redoc" if settings.DEBUG else None,
    openapi_url="/openapi.json",
)

# Slowapi state
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Middleware (CORS, error handlers)
setup_middleware(app)

# ── Routers ────────────────────────────────────────────────────────────────────
app.include_router(auth_router, prefix=settings.API_V1_PREFIX)

app.include_router(clientes_router, prefix=settings.API_V1_PREFIX)
app.include_router(productos_router, prefix=settings.API_V1_PREFIX)
app.include_router(ventas_router, prefix=settings.API_V1_PREFIX)
app.include_router(stubs_router, prefix=settings.API_V1_PREFIX)

# Agregar aquí los routers de fases posteriores:
# app.include_router(sac_router, prefix=settings.API_V1_PREFIX)


@app.get("/health", tags=["sistema"])
async def health_check():
    return {"status": "ok", "app": settings.PROJECT_NAME}
