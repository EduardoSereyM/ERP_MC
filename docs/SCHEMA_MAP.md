# SCHEMA_MAP — ERP MC

> Registro de tablas, ownership y relaciones.
> Actualizar después de cada migración aplicada.
> La IA debe leer este archivo antes de crear cualquier tabla o migración.

---

## Tablas base (Fase 0)

---

### `secuencias`

| Columna       | Tipo        | Notas                                        |
|---------------|-------------|----------------------------------------------|
| id            | uuid        | PK, generado automáticamente                 |
| tipo_entidad  | text        | UNIQUE — venta, sac, ot, st, pvr, pvc, etc. |
| prefijo       | text        | VTA, INS, OT, ST, PVR, PVC, BOD, COB, CTB, GER, INC |
| ultimo_valor  | integer     | Último correlativo emitido                   |
| updated_at    | timestamptz | Automático                                   |

**RLS:** no (solo acceso via función `siguiente_codigo()`)
**Owner:** sistema / core
**Migración:** 20260320000002_create_secuencias.sql

---

### `usuarios`

| Columna           | Tipo        | Notas                                               |
|-------------------|-------------|-----------------------------------------------------|
| id                | uuid        | PK — FK → auth.users (cascade delete)              |
| email             | text        | UNIQUE, no PK                                       |
| nombre            | text        | Nombre completo                                     |
| rol_funcional     | text        | vendedor \| coordinador_instalaciones \| supervisor_instalaciones \| instalador \| postventa \| bodega \| contabilidad \| cobranza \| gerencia \| admin |
| nivel_jerarquico  | text        | director \| gerencia \| jefatura \| supervisor \| usuario |
| activo            | boolean     | default true                                        |
| created_at        | timestamptz | Automático                                          |
| updated_at        | timestamptz | Automático via trigger                              |
| created_by        | uuid        | FK → auth.users, nullable                           |
| updated_by        | uuid        | FK → auth.users, nullable                           |
| is_deleted        | boolean     | soft delete, default false                          |
| deleted_at        | timestamptz | soft delete timestamp, nullable                     |
| deleted_by        | uuid        | FK → auth.users, nullable                           |

**RLS:** habilitado — usuario ve su propio perfil; admin ve todos
**Owner:** módulo auth
**Migración:** 20260320000003_create_usuarios.sql

---

### `audit_logs`

| Columna     | Tipo        | Notas                                                              |
|-------------|-------------|--------------------------------------------------------------------|
| id          | uuid        | PK, generado automáticamente                                       |
| user_id     | uuid        | FK → auth.users, nullable (SET NULL on delete)                    |
| action      | text        | CREATE \| UPDATE \| DELETE \| LOGIN \| LOGOUT \| ACCESS_DENIED \| ROLE_CHANGED |
| entity_type | text        | Nombre del módulo (auth, usuarios, ventas, sac, etc.)             |
| entity_id   | uuid        | ID del registro afectado, nullable                                 |
| metadata    | jsonb       | Datos adicionales del evento, nullable                             |
| ip_address  | text        | IP del cliente, nullable                                           |
| user_agent  | text        | User agent, nullable                                               |
| created_at  | timestamptz | Automático                                                         |

**Nota:** No usa soft delete — registro INMUTABLE. Nunca modificar ni eliminar.
**RLS:** habilitado — solo admin puede consultar; service role puede insertar
**Owner:** core / módulo auth (via `log_audit()`)
**Migración:** 20260320000004_create_audit_logs.sql

---

## Tablas Fase 1A — Ventas

---

### `categorias_configurables`

| Columna     | Tipo        | Notas                                                              |
|-------------|-------------|--------------------------------------------------------------------|
| id          | uuid        | PK, generado automáticamente                                       |
| modulo      | text        | Nombre del módulo dueño (productos, ventas, sac, etc.)            |
| tipo        | text        | Sub-categoría dentro del módulo (tipo_producto, motivo_anulacion) |
| nombre      | text        | Nombre de la opción                                                |
| descripcion | text        | Descripción opcional                                               |
| orden       | integer     | Orden de visualización, default 0                                  |
| activo      | boolean     | default true                                                       |
| + auditoría | —           | created_at, updated_at, created_by, updated_by                    |
| + soft del. | —           | is_deleted, deleted_at, deleted_by                                |

**UNIQUE:** (modulo, tipo, nombre)
**RLS:** usuarios autenticados pueden leer; solo admin gestiona
**Owner:** core / admin
**Migración:** 20260320000005_create_categorias_configurables.sql

---

### `clientes`

| Columna             | Tipo    | Notas                                  |
|---------------------|---------|----------------------------------------|
| id                  | uuid    | PK                                     |
| codigo              | text    | UNIQUE — generado via secuencias (CLI) |
| razon_social        | text    | NOT NULL — full-text index (spanish)  |
| rut                 | text    | UNIQUE, NOT NULL                       |
| email               | text    | nullable                               |
| telefono            | text    | nullable                               |
| direccion           | text    | nullable                               |
| comuna              | text    | nullable                               |
| ciudad              | text    | nullable                               |
| region              | text    | nullable                               |
| contacto_nombre     | text    | nullable                               |
| contacto_email      | text    | nullable                               |
| contacto_telefono   | text    | nullable                               |
| notas               | text    | nullable                               |
| activo              | boolean | default true                           |
| + auditoría         | —       | estándar                               |
| + soft del.         | —       | estándar                               |

**RLS:** todos leen; roles comerciales insertan; vendedor/admin actualizan
**Owner:** módulo clientes
**Migración:** 20260320000006_create_clientes.sql

---

### `productos`

| Columna              | Tipo         | Notas                                      |
|----------------------|--------------|--------------------------------------------|
| id                   | uuid         | PK                                         |
| codigo               | text         | UNIQUE — generado via secuencias (PRD)     |
| nombre               | text         | NOT NULL — full-text index (spanish)      |
| descripcion          | text         | nullable                                   |
| categoria_id         | uuid         | FK → categorias_configurables, nullable   |
| precio_base          | numeric(12,2)| default 0                                  |
| unidad_medida        | text         | m2 \| ml \| unidad \| kg \| hora \| otro  |
| requiere_instalacion | boolean      | default false                              |
| activo               | boolean      | default true                               |
| + auditoría          | —            | estándar                                   |
| + soft del.          | —            | estándar                                   |

**RLS:** todos leen; admin/gerencia gestionan
**Owner:** módulo productos
**Migración:** 20260320000007_create_productos.sql

---

### `producto_servicio_asociado`

| Columna          | Tipo         | Notas                                 |
|------------------|--------------|---------------------------------------|
| id               | uuid         | PK                                    |
| producto_id      | uuid         | FK → productos (cascade delete)      |
| servicio_nombre  | text         | NOT NULL                              |
| precio_servicio  | numeric(12,2)| default 0                             |
| activo           | boolean      | default true                          |
| + auditoría      | —            | estándar                              |
| + soft del.      | —            | estándar                              |

**RLS:** todos leen; admin/gerencia gestionan
**Owner:** módulo productos
**Migración:** 20260320000007_create_productos.sql

---

### `ventas`

| Columna               | Tipo         | Notas                                                                          |
|-----------------------|--------------|--------------------------------------------------------------------------------|
| id                    | uuid         | PK                                                                             |
| codigo                | text         | UNIQUE — generado via secuencias (VTA)                                         |
| cliente_id            | uuid         | FK → clientes, NOT NULL                                                        |
| vendedor_id           | uuid         | FK → usuarios, NOT NULL                                                        |
| estado                | text         | CONSULTA_ABIERTA \| COTIZACION_ENVIADA \| VENTA_GENERADA \| EN_PROCESO \| CERRADA \| ANULADA |
| monto_total           | numeric(12,2)| Calculado — suma de cotizacion activa                                          |
| descuento_pct         | numeric(5,2) | 0–100, default 0                                                               |
| fecha_cierre_esperada | date         | nullable                                                                       |
| fecha_anulacion       | timestamptz  | nullable — se llena al pasar a ANULADA                                         |
| motivo_anulacion      | text         | nullable                                                                       |
| notas                 | text         | nullable                                                                       |
| + auditoría           | —            | estándar                                                                       |
| + soft del.           | —            | estándar                                                                       |

**Estados válidos:** ver `TRANSICIONES_VENTA` en `frontend/src/modules/ventas/types.ts`
**RLS:** vendedor ve sus ventas; roles comerciales/admin ven todas
**Owner:** módulo ventas
**Migración:** 20260320000008_create_ventas.sql

---

### `cotizaciones`

| Columna           | Tipo         | Notas                                                 |
|-------------------|--------------|-------------------------------------------------------|
| id                | uuid         | PK                                                    |
| codigo            | text         | UNIQUE                                                |
| venta_id          | uuid         | FK → ventas (cascade delete), NOT NULL               |
| cliente_id        | uuid         | FK → clientes, NOT NULL (desnormalizado)             |
| estado            | text         | BORRADOR \| ENVIADA \| ACEPTADA \| RECHAZADA \| VENCIDA |
| validez_dias      | integer      | default 30                                            |
| fecha_envio       | timestamptz  | nullable                                              |
| fecha_respuesta   | timestamptz  | nullable                                              |
| fecha_vencimiento | date         | nullable — calculado al crear (hoy + validez_dias)   |
| monto_subtotal    | numeric(12,2)| Recalculado por `recalcular_totales_cotizacion()`    |
| monto_iva         | numeric(12,2)| 19% del subtotal                                      |
| monto_total       | numeric(12,2)| subtotal + iva                                        |
| notas_internas    | text         | nullable — no visible al cliente                     |
| notas_cliente     | text         | nullable — aparece en PDF de cotización              |
| + auditoría       | —            | estándar                                              |
| + soft del.       | —            | estándar                                              |

**Owner:** módulo ventas
**Migración:** 20260320000008_create_ventas.sql

---

### `lineas_cotizacion`

| Columna         | Tipo          | Notas                                            |
|-----------------|---------------|--------------------------------------------------|
| id              | uuid          | PK                                               |
| cotizacion_id   | uuid          | FK → cotizaciones (cascade delete), NOT NULL    |
| producto_id     | uuid          | FK → productos, nullable (línea libre)          |
| descripcion     | text          | NOT NULL                                         |
| cantidad        | numeric(10,3) | > 0                                              |
| precio_unitario | numeric(12,2) | ≥ 0                                              |
| descuento_pct   | numeric(5,2)  | 0–100, default 0                                |
| subtotal        | numeric(12,2) | Calculado: cantidad × precio × (1 - desc/100)  |
| orden           | integer       | default 0                                        |
| + auditoría     | —             | estándar                                         |
| + soft del.     | —             | estándar                                         |

**Owner:** módulo ventas
**Migración:** 20260320000008_create_ventas.sql

---

### `solicitudes_stub`

| Columna       | Tipo        | Notas                                                      |
|---------------|-------------|------------------------------------------------------------|
| id            | uuid        | PK                                                         |
| codigo        | text        | UNIQUE — prefijo según tipo (BOD-XXXXXX, COB-XXXXXX, etc.)|
| tipo          | text        | BOD \| COB \| CTB \| GER                                  |
| origen_modulo | text        | ventas \| sac \| servicios_tecnicos \| postventa          |
| origen_id     | uuid        | ID de la entidad que generó el stub                       |
| cliente_id    | uuid        | FK → clientes, NOT NULL                                   |
| venta_id      | uuid        | FK → ventas, nullable                                     |
| estado        | text        | PENDIENTE \| EN_REVISION \| COMPLETADA \| RECHAZADA       |
| descripcion   | text        | NOT NULL                                                   |
| respuesta     | text        | nullable — respuesta del área destinataria                |
| asignado_a    | uuid        | FK → usuarios, nullable                                   |
| fecha_limite  | timestamptz | nullable — para cálculo de SLA                           |
| + auditoría   | —           | estándar                                                   |
| + soft del.   | —           | estándar                                                   |

**RLS:** área destinataria (por rol_funcional) ve sus stubs; creador ve los suyos; admin ve todos
**Owner:** módulo ventas (uso transversal)
**Migración:** 20260320000009_create_solicitudes_stub.sql

---

## Tablas pendientes (fases posteriores)

| Fase | Tablas |
|------|--------|
| 1B   | sac, contactos_obra, ordenes_trabajo, checklist_plantillas, checklist_preguntas, checklist_respuestas |
| 1C   | servicios_tecnicos |
| 1D   | post_ventas, notas_credito, encuestas_satisfaccion |
| 1E   | incidencias, historial_gestion, notificaciones, configuracion_sla |
| 1F   | (vistas y funciones de reportería) |
