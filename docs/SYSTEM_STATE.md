# SYSTEM_STATE.md — ERP MC

> Última actualización: 2026-03-31 (sesión 3)
> Fase actual: **1A — Ventas COMPLETA → preparando 1B (SAC/Instalaciones)**

---

## 1. Arquitectura general

| Capa | Stack | Estado |
|------|-------|--------|
| Frontend | Vite 5.4 + React 18.3 + TypeScript 5.5 | ✅ Corriendo (`localhost:5173`) |
| Backend | FastAPI 0.115 + SQLAlchemy 2.0 (sync) + Python 3.12 | ✅ Corriendo (`localhost:8000`) |
| Base de datos | PostgreSQL 17.6 vía Supabase | ✅ 12 migraciones aplicadas |
| Auth | Supabase Auth (email/password) + JWT ECC P-256 | ✅ Login verificado end-to-end |
| State management | TanStack Query 5 (server) + Zustand 4.5 (UI) | ✅ Configurado |
| API Client | Axios + interceptor JWT automático | ✅ Configurado |

### Decisiones de arquitectura vigentes

- **Monorepo simple** — `frontend/` + `backend/` + `supabase/` en el mismo repositorio
- **Arquitectura espejo** — cada módulo en frontend tiene su contraparte en backend (`validate_mirror.sh`)
- **Solo email/password** — no OAuth providers; `enable_signup = false` (admin crea usuarios)
- **Sync ORM** — SQLAlchemy sync con pool_size=10, max_overflow=20
- **JWT en memoria** — nunca en localStorage (excepción: tema de UI)
- **IVA 19%** — aplicado automáticamente en cotizaciones via `recalcular_totales_cotizacion()`
- **Soft delete en toda tabla operativa** — `is_deleted`, `deleted_at`, `deleted_by`
- **audit_logs inmutable** — nunca soft delete, nunca modificar
- **UUID → str en responses** — campos `id` de tipo `UUID` en modelos SQLAlchemy se exponen como `str` en JSON mediante `field_serializer` en schemas Pydantic

---

## 2. Módulos implementados

### 2.1 Auth (`auth`)

| Endpoint | Método | Rate limit | Roles | Descripción |
|----------|--------|------------|-------|-------------|
| `/api/v1/auth/login` | POST | 10/min | Público | Login email+password → devuelve access + refresh token |
| `/api/v1/auth/refresh` | POST | 30/min | Público | Refresca sesión con refresh_token |
| `/api/v1/auth/me` | GET | 60/min | Autenticado | Perfil del usuario autenticado |
| `/api/v1/auth/logout` | POST | 10/min | Autenticado | Cierre de sesión + log auditoría |

**Frontend:** Login con email/password vía `supabase.auth.signInWithPassword()`, hook `useSession()` / `useMe()` con TanStack Query para `/auth/me`, `ProtectedRoute` (en `modules/auth/components/`) con doble validación (rol_funcional + nivel_jerarquico).

**Lógica de negocio:**
- Login proxiado por FastAPI (`/auth/login`) — no directo a Supabase desde frontend (excepto sesión supabase-js para refresh)
- Backend valida JWT (ECC P-256 vía JWKS, fallback HS256 legacy) y devuelve perfil desde `public.usuarios`
- `handle_new_user()` trigger crea entrada en `public.usuarios` con defaults (vendedor/usuario)
- JWKS URL correcta: `{SUPABASE_URL}/auth/v1/.well-known/jwks.json`
- Verificación intenta primero ECC P-256 (tokens actuales Supabase); si falla, cae a HS256 con `SUPABASE_JWT_SECRET`

---

### 2.2 Clientes (`clientes`)

| Endpoint | Método | Rate limit | Roles permitidos |
|----------|--------|------------|-----------------|
| `/api/v1/clientes` | GET | 60/min | Todos autenticados |
| `/api/v1/clientes` | POST | 30/min | vendedor, coordinador_instalaciones, admin, gerencia |
| `/api/v1/clientes/{id}` | GET | 60/min | Todos autenticados |
| `/api/v1/clientes/{id}` | PATCH | 30/min | vendedor, coordinador_instalaciones, admin, gerencia |
| `/api/v1/clientes/{id}` | DELETE | 30/min | admin, gerencia |

**Frontend:** hooks `useClientes`, `useCliente`, `useCrearCliente`, `useActualizarCliente`, `useEliminarCliente`

**Lógica de negocio:**
- Código correlativo generado vía `siguiente_codigo('cliente')` → `CLI-000001`
- RUT validado con algoritmo Módulo 11 (`@field_validator` en Pydantic) — normaliza a formato `12345678-9`
- RUT único — endpoint retorna 409 si ya existe
- Búsqueda full-text en `razon_social` (índice GIN, idioma español)
- Soft delete — no se eliminan registros físicamente

---

### 2.3 Productos (`productos`)

| Endpoint | Método | Rate limit | Roles permitidos |
|----------|--------|------------|-----------------|
| `/api/v1/productos/categorias` | GET | 60/min | Todos autenticados |
| `/api/v1/productos` | GET | 60/min | Todos autenticados |
| `/api/v1/productos` | POST | 30/min | admin, gerencia |
| `/api/v1/productos/{id}` | GET | 60/min | Todos autenticados |
| `/api/v1/productos/{id}` | PATCH | 30/min | admin, gerencia |
| `/api/v1/productos/{id}` | DELETE | 30/min | admin |

**Frontend:** hooks `useCategorias` (staleTime 10min), `useProductos`, `useProducto`, `useCrearProducto`, `useActualizarProducto`, `useEliminarProducto`

**Lógica de negocio:**
- Código correlativo generado vía `siguiente_codigo('producto')` → `PRD-000001`
- Categorías configurables por módulo/tipo — tabla genérica `categorias_configurables`
- Unidades de medida: `m2 | ml | unidad | kg | hora | otro`
- **`tipo_producto`**: `PRODUCTO_FISICO | SERVICIO_INSTALACION | SERVICIO_TECNICO | SERVICIO_OTRO` — determina qué stubs se generan al confirmar venta
- Flag `requiere_instalacion` — determina si genera SAC automático (Fase 1B)
- Servicios asociados por producto (instalación, etc.)

---

### 2.4 Ventas (`ventas`)

| Endpoint | Método | Rate limit | Roles permitidos |
|----------|--------|------------|-----------------|
| `/api/v1/ventas` | GET | 60/min | Todos (RLS filtra) |
| `/api/v1/ventas` | POST | 30/min | vendedor, admin, gerencia |
| `/api/v1/ventas/{id}` | GET | 60/min | Todos (RLS filtra) |
| `/api/v1/ventas/{id}` | PATCH | 30/min | vendedor, admin, gerencia |
| `/api/v1/ventas/{id}/estado` | POST | 30/min | vendedor, admin, gerencia |
| `/api/v1/ventas/{id}/cotizaciones` | GET | 60/min | Todos (RLS filtra) |
| `/api/v1/ventas/{id}/cotizaciones` | POST | 30/min | vendedor, admin, gerencia |
| `/api/v1/ventas/{id}/actividad` | GET | 60/min | Todos autenticados |
| `/api/v1/ventas/cotizaciones/{id}/estado` | POST | 30/min | vendedor, admin, gerencia |
| `/api/v1/ventas/cotizaciones/{id}/lineas` | POST | 60/min | vendedor, admin, gerencia |
| `/api/v1/ventas/cotizaciones/{id}/lineas/{linea_id}` | PATCH | 60/min | vendedor, admin, gerencia |
| `/api/v1/ventas/cotizaciones/{id}/lineas/{linea_id}` | DELETE | 60/min | vendedor, admin, gerencia |
| `/api/v1/ventas/cotizaciones/{id}/enviar-email` | POST | 10/min | vendedor, admin, gerencia |
| `/api/v1/ventas/cotizaciones/{id}/pdf` | GET | 30/min | vendedor, admin, gerencia |

**Máquina de estados VTA:**
```
CONSULTA_ABIERTA → COTIZACION_ENVIADA → VENTA_GENERADA → EN_PROCESO → CERRADA
         ↓                  ↓                    ↓              ↓
       ANULADA            ANULADA              ANULADA        ANULADA
                    ← CONSULTA_ABIERTA (retroceso)
```

**Máquina de estados Cotización:**
```
BORRADOR → ENVIADA → ACEPTADA
                   → RECHAZADA
                   → VENCIDA
```

**Frontend:** hooks `useVentas`, `useVenta`, `useCrearVenta`, `useActualizarVenta`, `useCambiarEstadoVenta`, `useCotizaciones`, `useCrearCotizacion`, `useCambiarEstadoCotizacion`, `useStubsVenta`, `useActividadVenta`

**Lógica de negocio:**
- Código correlativo vía `siguiente_codigo('venta')` → `VTA-000001`
- Transiciones validadas en backend — HTTP 422 si la transición no está permitida
- `vendedor_id` se asigna automáticamente al usuario que crea la venta
- Campo `tipo`: `suministro | suministro_instalacion | solo_instalacion`
- `fecha_cierre`: poblada automáticamente al transicionar a CERRADA
- Cotizaciones vinculadas a una venta (cascade delete)
- Líneas de cotización con cálculo automático de subtotal: `cantidad × precio × (1 - descuento/100)`
- Totales de cotización recalculados: subtotal, IVA 19%, total
- `fecha_vencimiento` calculada: `hoy + validez_dias` al crear cotización
- Al anular: se registra `fecha_anulacion` + `motivo_anulacion`
- Descuento 0–100% con CHECK constraint en DB
- **Búsqueda** (`busqueda` query param): filtra por `codigo` ILIKE, RUT de cliente (subquery), o código de cotización (subquery)
- **Envío email** (`/enviar-email`): envía HTML por SMTP SSL (port 465) y registra en audit_log
- **PDF** (`/pdf`): genera PDF con fpdf2 (puro Python) — usa `_build_cotizacion_data()` compartido con email
- **Auto-transición al enviar**: enviar email/PDF en BORRADOR → auto-marca cotización ENVIADA + venta COTIZACION_ENVIADA
- **VENCIDA** se gestiona automáticamente por fecha — no se expone como botón manual en UI
- **Cotización ENVIADA es inmutable** — solo BORRADOR permite editar/agregar líneas
- **Solo una cotización ACEPTADA por venta** — backend rechaza con HTTP 422 si ya hay una aceptada
- **Guard en VENTA_GENERADA** — requiere cotización ACEPTADA; rechaza HTTP 422 si no existe
- **Auto-stubs al confirmar venta** (`_crear_stubs_confirmacion`):
  - BOD (despacho) solo si hay líneas con `tipo_producto == PRODUCTO_FISICO`
  - COB (cobranza) siempre — `fecha_limite = hoy + 7 días`
- **Timeline de actividad** (`/actividad`): eventos de audit_log de la venta + cotizaciones + stubs, con nombre de usuario resuelto
- **Múltiples cotizaciones activas permitidas** — `puedeCrearCot` no bloquea si hay una aceptada

---

### 2.5 Dashboard (`dashboard`)

| Endpoint | Método | Rate limit | Roles | Descripción |
|----------|--------|------------|-------|-------------|
| `/api/v1/dashboard/summary` | GET | 60/min | Autenticado | Resumen KPIs: ventas activas, cotizaciones, clientes, stubs pendientes |

**Frontend:** `DashboardView` con métricas agregadas. hooks `useDashboardSummary`. Módulo en `frontend/src/modules/dashboard/`.

---

### 2.6 Logs de auditoría (`logs`)

| Endpoint | Método | Rate limit | Roles | Descripción |
|----------|--------|------------|-------|-------------|
| `/api/v1/admin/audit-logs` | GET | 30/min | nivel ≥ gerencia | Lista paginada de audit_logs con filtros por action, entity_type, user_id |

**Frontend:** `AuditLogsView` en `frontend/src/modules/logs/`. Acceso restringido al menú según nivel jerárquico.

---

### 2.7 Stubs (`stubs`)

| Endpoint | Método | Rate limit | Roles permitidos |
|----------|--------|------------|-----------------|
| `/api/v1/stubs` | GET | 60/min | Según tipo (ver RLS) |
| `/api/v1/stubs` | POST | 30/min | Todos autenticados |
| `/api/v1/stubs/{id}/estado` | POST | 30/min | Asignado, creador, admin, gerencia |

**Tipos:** BOD (Bodega), COB (Cobranza), CTB (Contabilidad), GER (Gerencia)

**Máquina de estados Stub:**
```
PENDIENTE → EN_REVISION → COMPLETADA
                        → RECHAZADA
          → COMPLETADA (directo)
          → RECHAZADA (directo)
```

**Frontend:** hook `useStubs` con filtro por tipo, `StubsListView` con paginación

**Lógica de negocio:**
- Código correlativo según tipo: `BOD-000001`, `COB-000001`, etc.
- RLS: cada área solo ve los stubs que le corresponden según `tipo` ↔ `rol_funcional`
- El creador siempre puede ver sus stubs independiente de su rol
- `fecha_limite` para cálculo de SLA (implementación UI en Fase 1E)

---

## 3. Base de datos

### 3.1 Tablas existentes

| Tabla | Migración | Owner |
|-------|-----------|-------|
| `secuencias` | 0002 + 0010 | core |
| `usuarios` | 0003 | auth |
| `audit_logs` | 0004 | core |
| `categorias_configurables` | 0005 | core/admin |
| `clientes` | 0006 | clientes |
| `productos` | 0007 | productos |
| `producto_servicio_asociado` | 0007 | productos |
| `ventas` | 0008 | ventas |
| `cotizaciones` | 0008 | ventas |
| `lineas_cotizacion` | 0008 | ventas |
| `solicitudes_stub` | 0009 | ventas (transversal) |
| `productos.tipo_producto` | 0011 | productos (nueva columna) |
| `ventas.tipo`, `ventas.fecha_cierre` | 0012 | ventas (nuevas columnas) |

### 3.2 Funciones SQL

| Función | Descripción |
|---------|-------------|
| `update_updated_at()` | Trigger function — actualiza `updated_at` en cada UPDATE |
| `siguiente_codigo(tipo)` | Genera códigos correlativos atómicos con `SELECT FOR UPDATE` |
| `handle_new_user()` | Trigger — crea registro en `public.usuarios` al crear auth.user |
| `recalcular_totales_cotizacion(id)` | Recalcula subtotal, IVA 19% y total de una cotización |

### 3.3 Tipos de secuencia registrados

| tipo_entidad | prefijo | Ejemplo |
|-------------|---------|---------|
| venta | VTA | VTA-000001 |
| cotizacion | COT | COT-000001 |
| cliente | CLI | CLI-000001 |
| producto | PRD | PRD-000001 |
| sac | INS | INS-000001 |
| ot | OT | OT-000001 |
| st | ST | ST-000001 |
| pvr | PVR | PVR-000001 |
| pvc | PVC | PVC-000001 |
| bod | BOD | BOD-000001 |
| cob | COB | COB-000001 |
| ctb | CTB | CTB-000001 |
| ger | GER | GER-000001 |
| inc | INC | INC-000001 |

---

## 4. Seguridad

### 4.1 Autenticación
- Supabase Auth con JWT ECC P-256 (clave actual) — verificado vía JWKS endpoint
- JWKS URL: `{SUPABASE_URL}/auth/v1/.well-known/jwks.json` (cacheado 1 hora)
- Fallback HS256 con `SUPABASE_JWT_SECRET` para tokens legacy
- `enable_signup = false` — solo admin crea usuarios
- `jwt_expiry = 3600` (1 hora)
- Session persistence vía `supabase-js` (storageKey: `erp-mc-auth`)

### 4.2 Autorización
- **Modelo dual:** `rol_funcional` (acceso a módulos) + `nivel_jerarquico` (visibilidad/aprobaciones)
- `require_rol()` — dependency factory para restringir endpoints por rol
- `require_nivel_minimo()` — dependency factory para mínimo jerárquico
- RLS habilitado en todas las tablas
- **Roles funcionales:** `vendedor | coordinador_instalaciones | admin | gerencia`
- **Niveles jerárquicos** (orden ascendente): `usuario → supervisor → jefatura → gerencia → director`

### 4.3 Rate limiting

| Categoría | Límite |
|-----------|--------|
| Auth login / logout | 10/min |
| Auth refresh | 30/min |
| Auth me | 60/min |
| Lectura general | 60/min |
| Escritura general | 30/min |
| Admin (audit-logs) | 30/min |
| Email cotización | 10/min |

### 4.4 Validación
- RUT chileno validado con algoritmo Módulo 11 (backend + frontend)
- Pydantic valida todos los payloads de entrada
- CHECK constraints en DB como segunda barrera

---

## 5. Utilidades compartidas

| Archivo | Descripción |
|---------|-------------|
| `backend/app/shared/rut.py` | Validador RUT Módulo 11: `validar_rut()`, `normalizar_rut()`, `validar_rut_o_error()` — rechaza cuerpo todo ceros |
| `backend/app/shared/secuencias.py` | Helper para `siguiente_codigo()` — delega a función SQL |
| `backend/app/shared/pagination.py` | `PaginacionParams` (page, limit, orden, direccion) |
| `backend/app/shared/responses.py` | `RespuestaSimple[T]`, `RespuestaPaginada[T]`, `MetaPaginacion`, `make_paginacion_meta(total, params)` |
| `backend/app/shared/email.py` | `enviar_cotizacion()` + `_build_cotizacion_html()` — SMTP SSL port 465 |
| `backend/app/shared/pdf.py` | `generar_cotizacion_pdf()` — fpdf2, Latin-1 safe con `_safe()`, misma estructura que email |
| `frontend/src/shared/utils/rut.ts` | `validarRut()`, `normalizarRut()`, `formatearRut()`, `formatearRutInput()` |

---

## 6. Frontend — Estado de módulos

| Módulo | Data layer (types/hooks/api) | Views/Components | Rutas |
|--------|------------------------------|------------------|-------|
| auth | ✅ `useMe`, `useSession` | ✅ LoginView, LoginForm, ProtectedRoute | `/login` |
| clientes | ✅ | ✅ ClientesListView, ClienteForm (crear/editar + validación RUT) | `/clientes` |
| productos | ✅ | ✅ ProductosListView, ProductoForm (crear/editar + selector `tipo_producto`) | `/productos` |
| ventas | ✅ | ✅ VentasListView (búsqueda), VentaForm (modal + nuevo cliente), VentaDetailView (cotizaciones + líneas + PDF + transiciones + actividad timeline + stubs panel) | `/ventas`, `/ventas/:id` |
| stubs | ✅ | ✅ StubsListView (filtro por tipo, paginación) | `/stubs` |
| dashboard | ✅ `useDashboardSummary` | ✅ DashboardView con KPIs reales + gráficos + stub data | `/dashboard` |
| logs | ✅ `useLogs` | ✅ AuditLogsView (paginada, filtros) | `/admin/audit-logs` |

**Layout:** `AppLayout` con sidebar colapsable (navy), navegación principal, sección de usuario y botón cerrar sesión. Rutas protegidas con `ProtectedRoute` (en `modules/auth/components/`).

**Store Zustand:** `sidebarSlice` (colapso sidebar), `themeSlice` (tema UI), `toastSlice` (notificaciones toast globales).

**Componentes UI reutilizables:** `Button` (variant/size/loading), `Input` (label/error/hint), `Modal` (sm/md/lg, ESC para cerrar, backdrop click), `PhoneInput` (prefijo +56), `ChileLocationSelect` (región/ciudad/comuna), `Toaster` (toast via hook `useToast`), `EmptyState`, `Badge`.

**Permisos frontend:** `core/permisos.ts` + `usePermisos()` — controla visibilidad de campos protegidos (ej: RUT solo editable por jefatura+).

---

## 7. CI/CD

| Workflow | Trigger | Acciones |
|----------|---------|----------|
| `ci-backend.yml` | `backend/**` changes | ruff, pytest, pip-audit |
| `ci-frontend.yml` | `frontend/**` changes | eslint, tsc, vitest, npm audit |
| `ci-architecture.yml` | module dir changes | validate_mirror.sh, validate_schema_registry.py |

---

## 8. Bugs conocidos y fixes aplicados

| Bug | Fix |
|-----|-----|
| `AuditLog.metadata` colisionaba con nombre reservado SQLAlchemy | Renombrado a `event_data` con `mapped_column("metadata", ...)` |
| `log_audit` era `async def` pero se llamaba sin `await` | Convertido a `def` síncrono |
| `@field_validator("rut")` en schemas colocado antes de los fields | Movido después de todos los fields |
| `pyproject.toml` build-backend incorrecto | Cambiado a `setuptools.build_meta` |
| `AppLayout.tsx` importaba `useNavigate` sin usarlo | Eliminado del import |
| `vite-env.d.ts` ausente causaba error TS en `import.meta.env` | Creado con `/// <reference types="vite/client" />` |
| `CREATE INDEX CONCURRENTLY` falla dentro de transaction | Quitado `CONCURRENTLY` en migraciones iniciales |
| Supabase usa JWT ECC P-256, backend solo soportaba HS256 | `security.py` intenta JWKS primero, fallback HS256 |
| `UsuarioResponse.id` esperaba `str`, recibía `UUID` | Agregar `field_serializer` para `id` en schema |
| `make_paginacion_meta()` llamado con un solo argumento | Firma corregida a `make_paginacion_meta(total, params)` |
| `validar_rut('00000000-0')` retornaba `True` | Agregado chequeo `int(cuerpo) == 0` en `validar_rut()` |
| Test data `12345678-9` era inválida (DV real = 5) | Corregida a `12345678-5` en `test_rut.py` |
| `esServicio` declarado pero no usado en `LineaForm.tsx` | Eliminado |
| `useActualizarCliente` usaba `setQueriesData` con spread que no propagaba cambios al refetch | Simplificado a `setQueryData(detail)` + `invalidateQueries(all)` |
| `fpdf2` lanzaba `FPDFUnicodeEncodingException` con carácter "—" en Helvetica | Agregado `_safe()` que convierte caracteres fuera de Latin-1; `"—"` → `"-"` |

---

## 9. Pendiente (NO implementado aún)

| Item | Fase |
|------|------|
| SAC / Instalaciones | 1B |
| Servicios Técnicos | 1C |
| Postventa | 1D |
| Incidencias, SLA configs | 1E |
| Reportería, KPIs, Admin avanzado | 1F |
| Inventario | 2 |

### Completado en sesión 3 (2026-03-31)
- ✅ Auto-vencimiento cotizaciones on-read (`_auto_vencer_cotizaciones` en service.py)
- ✅ `fecha_cierre` ya estaba implementado en `cambiar_estado_venta` y `_auto_cerrar_venta`
- ✅ Notificaciones in-app: tabla `notificaciones`, módulo backend completo, polling frontend, badge + panel dropdown en topbar
  - Triggers: stub creado → notifica área correspondiente; stub completado/rechazado → notifica vendedor
