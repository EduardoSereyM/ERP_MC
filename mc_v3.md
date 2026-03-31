# Diseño del sistema — MC v3

> Actualizado: Marzo 2026
> Incluye: modelo de entidades, máquinas de estado, Servicio Técnico, incidencia universal, cierre forzado, admin, notificaciones, reportería

---

## 1. Módulos del sistema

| # | Módulo | Códigos | Entidades principales |
| --- | --- | --- | --- |
| 1 | Ventas y Casos | `VTA-XXXXXX` | Venta, Cliente, Cotización, LineaCotizacion |
| 1.1 | Stubs operacionales | `BOD-XXXXXX` `COB-XXXXXX` `CTB-XXXXXX` `GER-XXXXXX` | SolicitudStub (tabla única con botón Aprobar/Rechazar) |
| 2 | Instalaciones (SAC) | `INS-XXXXXX` `OT-XXXXXX` | SAC, ContactoObra, OT, Checklist |
| 3 | Servicio Técnico | `ST-XXXXXX` | ServicioTecnico (flujo liviano de terreno) |
| 4 | Postventa | `PVC-XXXXXX` `PVR-XXXXXX` | Consulta, Reclamo, NotaCredito, EncuestaSatisfaccion |
| 5 | Inventario | `INV-XXXXXX` | Producto, Stock, Movimiento, Reserva, Importación |
| 6 | Reportería y KPIs | — | Dashboard, Alerta, KPI por rol |
| 7 | Administración | — | Usuarios, SLA, Catálogos, Checklists, Configuración |
| T | Incidencias (transversal) | `INC-XXXXXX` | Incidencia universal con escalamiento y SLA |
| T | Notificaciones (transversal) | — | Notificación in-app con badge y panel |

### Integraciones entre módulos

| # | Módulo | Integraciones requeridas |
| --- | --- | --- |
| 1 | Ventas | SAC (Instalaciones), Bodega (stub), Contabilidad (stub), Postventa |
| 1.1 | Stubs | Solo botón Aprobar/Rechazar con notificación al módulo origen |
| 2 | Instalaciones | Ventas, Stock (stub → real), Contabilidad (stub) |
| 3 | Servicio Técnico | Ventas, Instalaciones (referencia), Postventa (origen PVR) |
| 4 | Postventa | Ventas, Contabilidad (stub → real), Servicio Técnico (genera ST) |
| 5 | Inventario | SAC, Ventas |
| 6 | Reportería | Todos los módulos |
| 7 | Administración | Todos los módulos (configuración transversal) |
| T | Incidencias | Todos los módulos (botón "Reportar incidencia" en toda vista de detalle) |
| T | Notificaciones | Todos los módulos (cada evento genera notificaciones según reglas) |

---

## 2. Principio fundamental: entidades independientes vinculables

### El Cliente es el ancla real, no la Venta

Todas las entidades operativas (INS, ST, PVR, PVC) tienen `cliente_id NOT NULL`. El `venta_id` es **nullable** — si la entidad nace desde una venta se vincula automáticamente, pero puede existir sin ella.

```
Cliente (ancla real — cliente_id NOT NULL en todo)
  │
  ├── Venta (caso contenedor — agrupa entidades relacionadas)
  │     ├── INS — si tipo ≠ suministro
  │     │     └── OT — siempre dentro de INS (sac_id NOT NULL)
  │     ├── PVR — si hay reclamo vinculado
  │     ├── PVC — si hay consulta vinculada
  │     └── ST — si hay servicio técnico vinculado
  │
  ├── INS — puede existir sin VTA (raro pero posible)
  ├── PVR — puede existir sin VTA (cliente reclama sin venta registrada)
  ├── PVC — puede existir sin VTA (consulta directa)
  └── ST — puede existir sin VTA (servicio directo)
```

### Reglas de vinculación

- **OT → INS:** `sac_id NOT NULL`. Única relación obligatoria entre entidades operativas. Una OT siempre pertenece a un SAC.
- **INS, PVR, PVC, ST → VTA:** `venta_id NULLABLE`. Si se crean desde VTA, se vinculan automáticamente. Si no, viven independientes.
- **ST → INS:** `sac_id NULLABLE`. Si el ST es una revisita de una instalación previa, se vincula.
- **ST → PVR:** `reclamo_id NULLABLE`. Si el ST nace de un reclamo, se vincula.
- **Todas → Cliente:** `cliente_id NOT NULL`. El cliente es el ancla universal.
- **Incidencia → cualquier entidad:** `entidad_tipo + entidad_id`. Polimórfico, se puede crear desde cualquier vista.

### Navegación independiente

Cada entidad tiene su propia vista, su propio flujo y sus propios estados. La relación con la Venta existe para contexto y trazabilidad, no como requisito de acceso.

- Puedes entrar directamente a un Reclamo sin pasar por la Venta
- Puedes ver todos los SAC activos sin filtrar por venta
- Puedes listar todos los ST del día
- Desde una venta X puedes ver su historia completa (INS, OT, PVR, PVC, ST, incidencias vinculadas)

---

## 3. Roles y accesos

| Rol funcional | Módulo principal | Acceso móvil | Nivel jerárquico |
| --- | --- | --- | --- |
| Vendedor/a | Ventas | No | Usuario |
| Coordinador/a Instalaciones | Instalaciones + ST | No | Jefatura |
| Supervisor Instalaciones | Instalaciones + Terreno + ST | **Sí (Mobile-first)** | Supervisor |
| Instalador/Contratista | Terreno | **Sí (Mobile-first)** | Usuario |
| Postventa | Reclamos + Consultas + ST | No | Usuario |
| Bodega | Stub → Inventario | Depende caso | Usuario |
| Contabilidad/Cobranza | Stub → Finanzas | No | Usuario |
| Gerencia | Todos (solo lectura + aprobaciones) | Opcional | Gerencia |
| Admin | Sistema completo + Administración | No | Director |

### Modelo de control de acceso

```
Usuario
├── rol_funcional    → controla acceso por módulo
└── nivel_jerarquico → controla visibilidad y aprobaciones
```

- **Control de acceso por módulo** → basado en `rol_funcional`
- **Visibilidad y aprobaciones** → basado en `nivel_jerarquico`

Ejemplo: Magdalena tiene `rol_funcional = coordinador_instalaciones` y `nivel_jerarquico = jefatura`. Pedro tiene `rol_funcional = supervisor_instalaciones` y `nivel_jerarquico = supervisor`. Ambos están en Instalaciones, pero Magdalena puede ver los casos de Pedro, y no al revés.

### Jerarquía de escalamiento (para incidencias y aprobaciones)

```
director
  └── gerencia
        └── jefatura
              └── supervisor
                    └── usuario
```

Cuando un usuario reporta una incidencia, el sistema la enruta automáticamente al nivel inmediatamente superior dentro del mismo módulo/área.

---

## 4. Modelo de datos

### Reglas transversales (todas las tablas)

```
id            uuid PRIMARY KEY default gen_random_uuid()
created_by    uuid (FK → auth.users)
created_at    timestamptz NOT NULL default now()
updated_by    uuid (FK → auth.users)
updated_at    timestamptz NOT NULL default now()
is_deleted    boolean NOT NULL default false
deleted_at    timestamptz NULL
deleted_by    uuid (FK → auth.users)
```

### Generación de códigos correlativos

Cada entidad con código legible usa una tabla `Secuencia` con un registro por tipo y un `nextval` atómico.

```
Secuencia
  id
  tipo_entidad (venta | sac | ot | st | pvr | pvc | bod | cob | ctb | ger | inc)
  prefijo (VTA | INS | OT | ST | PVR | PVC | BOD | COB | CTB | GER | INC)
  ultimo_valor (integer)
  updated_at
```

Formato: `PREFIJO-000001` con secuencia global por tipo. Se genera en el backend con `SELECT ... FOR UPDATE` para evitar duplicados por concurrencia.

---

### `Cliente`

```
id, codigo
tipo (normal | b2b)
rut (UNIQUE, nullable — empresas siempre, personas opcional)
razon_social (nombre empresa o nombre completo persona)
nombre_contacto (persona principal de contacto)
email (UNIQUE)
telefono
direccion, comuna, ciudad
notas
activo (boolean)
```

### `Usuario`

```
id (uuid Supabase Auth)
email (UNIQUE, no PK)
nombre
rol_funcional (vendedor | coordinador_instalaciones | supervisor_instalaciones | instalador | postventa | bodega | contabilidad | cobranza | gerencia | admin)
nivel_jerarquico (director | gerencia | jefatura | supervisor | usuario)
activo (boolean)
```

---

### `Venta` → `VTA-XXXXXX`

```
id, codigo
cliente_id (NOT NULL → Cliente)
vendedor_id (NOT NULL → Usuario — automático del usuario logueado)
tipo (suministro | suministro_instalacion | solo_instalacion)
estado (semi/automático según flujo)
canal (tienda | telefono | email | whatsapp)
cotizacion_activa_id (nullable → Cotizacion — la cotización vigente/aceptada)
fecha_creacion, fecha_cierre
notas
```

> **Nota:** No existe `LineaVenta`. La Venta apunta a la cotización activa (la aceptada por el cliente) a través de `cotizacion_activa_id`. Los productos, cantidades y precios se leen de las `LineaCotizacion` de esa cotización. Una sola fuente de verdad.

---

### `Cotizacion`

```
id
venta_id (NOT NULL → Venta)
version (integer — auto-incremental por venta)
estado (borrador | enviada | aceptada | rechazada | reemplazada | vencida)
fecha_creacion, fecha_envio (nullable), fecha_vencimiento
total_neto, total_iva, total
archivo_url (nullable — PDF generado)
notas
```

### `LineaCotizacion`

```
id
cotizacion_id (NOT NULL → Cotizacion)
producto_id (NOT NULL → Producto)
cantidad, precio_unitario
descuento_porcentaje (nullable)
subtotal
es_servicio (boolean)
producto_padre_id (nullable → Producto — si es servicio vinculado a un producto)
orden (integer — orden visual)
```

> Cuando se agrega un producto con instalación, el sistema sugiere/agrega automáticamente el servicio vinculado según `ProductoServicioAsociado`.

### `Producto` (catálogo mínimo para Fase 1)

```
id, codigo, sku
nombre, descripcion
categoria (piso_flotante | vinilico | ceramica | pintura | accesorio | servicio | otro)
es_servicio (boolean)
precio_referencia (nullable — precio lista)
unidad_medida (m2 | ml | unidad | kg | otro)
activo (boolean)
```

### `ProductoServicioAsociado`

```
producto_id (→ Producto)
servicio_id (→ Producto donde es_servicio = true)
obligatorio (boolean)
```

---

### `SAC` → `INS-XXXXXX`

```
id, codigo
venta_id (NULLABLE → Venta)
cliente_id (NOT NULL → Cliente)
coordinador_id (→ Usuario)
estado (semi/automático)
direccion_obra, comuna_obra
fecha_programada, fecha_ejecucion
notas
```

### `ContactoObra` (múltiples por SAC)

```
id
sac_id (NOT NULL → SAC)
nombre, cargo (administrador | jefe_bodega | prevencion_riesgos | responsable_despacho | responsable_ingreso | otro)
telefono, email
es_contacto_principal (boolean)
notas
```

### `OrdenTrabajo` → `OT-XXXXXX`

```
id, codigo
sac_id (NOT NULL → SAC)
supervisor_id (→ Usuario)
contratista_id (→ Usuario)
estado
fecha_inicio, fecha_fin_real
checklist_completado (boolean)
duracion_total_minutos (calculado al completar)
```

---

### `ServicioTecnico` → `ST-XXXXXX`

```
id, codigo
cliente_id (NOT NULL → Cliente)
venta_id (NULLABLE → Venta — por defecto se vincula si existe)
sac_id (NULLABLE → SAC — si es revisita de instalación previa)
reclamo_id (NULLABLE → PostVenta donde tag = reclamo)
responsable_id (→ Usuario)
supervisor_id (nullable → Usuario)
tipo (revisita | garantia | emergencia | ajuste_post_instalacion | otro)
estado (semi/automático)
direccion, comuna
descripcion (mín. 100 caracteres)
fecha_programada, fecha_ejecucion
checklist_completado (boolean)
notas
```

---

### `Incidencia` → `INC-XXXXXX`

```
id, codigo
entidad_tipo (venta | sac | ot | st | pvr | pvc | stub)
entidad_id
reportada_por (NOT NULL → Usuario)
asignada_a (NOT NULL → Usuario — superior automático según jerarquía)
prioridad (alta | media | baja)
categoria (select — ver tabla de categorías por entidad_tipo)
descripcion (NOT NULL, mín. 100 caracteres)
foto_url (nullable — obligatoria si prioridad = alta o si entidad_tipo = ot | st)
estado (abierta | en_revision | resuelta | cerrada | escalada)
resolucion_descripcion (nullable)
resuelta_por (nullable → Usuario)
resuelta_at (nullable)
sla_horas (integer — copiado de ConfiguracionSLA al crear)
fecha_limite_sla (timestamptz — calculada al crear)
escalada_a (nullable → Usuario — si se re-escaló por SLA breach)
escalada_at (nullable)
```

**Categorías de incidencia por tipo de entidad:**

| entidad_tipo | Categorías |
| --- | --- |
| venta | datos del cliente incorrectos · producto no corresponde · error de precio · cliente no responde · otro |
| sac | contactos de obra incorrectos · dirección no válida · servicio no corresponde · falta información técnica · otro |
| ot | superficie en mal estado · medidas no coinciden · material insuficiente/dañado · sin acceso a obra · cliente no presente · otro |
| st | equipo no disponible · repuesto no disponible · diagnóstico incorrecto · cliente no presente · otro |
| pvr | información contradictoria · área no responde · cliente escala · monto supera umbral · otro |
| pvc | demora en respuesta de área · información no disponible · otro |
| stub | demora excesiva en respuesta · información incompleta para resolver · otro |

**Reglas de asignación automática:**

El sistema determina `asignada_a` basándose en:
1. Buscar usuarios con el mismo `rol_funcional` del módulo donde se reportó
2. Filtrar por `nivel_jerarquico` inmediatamente superior al del reportante
3. Si hay más de uno, asignar al responsable de la entidad (coordinador del SAC, responsable del PVR, etc.)
4. Si no hay nadie, escala directo a Gerencia

**Regla de foto obligatoria:**
- Prioridad alta: foto obligatoria siempre
- Entidad OT o ST: foto obligatoria siempre (se está en terreno)
- Resto: foto opcional

---

### `SolicitudStub` (tabla única para todos los módulos stub)

```
id, codigo (BOD-XXXXXX | COB-XXXXXX | CTB-XXXXXX | GER-XXXXXX)
tipo_stub (bodega | cobranza | contabilidad | gerencia)
entidad_origen (venta | sac | reclamo | consulta | st)
entidad_origen_id
titulo (resumen en una línea)
descripcion (detalle de lo que se solicita)
estado (pendiente | aprobado | rechazado)
motivo_rechazo (texto obligatorio si rechaza)
solicitado_por (→ Usuario)
respondido_por (nullable → Usuario)
fecha_solicitud, fecha_respuesta (nullable)
```

---

### `PostVenta` → `PVC-XXXXXX` | `PVR-XXXXXX`

```
id, codigo
tag (consulta | reclamo)
cliente_id (NOT NULL → Cliente)
venta_id (NULLABLE → Venta)
sac_id (NULLABLE → SAC)
responsable_id (→ Usuario)
estado
tipo_consulta / tipo_reclamo (según tag)
motivo, descripcion
sla_horas, fecha_limite_sla
```

### `NotaCredito`

```
id
reclamo_id (NOT NULL → PostVenta donde tag = reclamo)
venta_id (NULLABLE → Venta)
monto
estado (pendiente_aprobacion | aprobada | emitida | rechazada)
aprobada_por (nullable → Usuario)
emitida_por (nullable → Usuario)
motivo
documento_url (nullable)
fecha_aprobacion, fecha_emision
```

### `EncuestaSatisfaccion`

```
id
entidad_tipo (venta | reclamo | st)
entidad_id
cliente_id (NOT NULL → Cliente)
nota (integer 1-5)
comentario (nullable, texto libre)
respondida_at
```

---

### `ChecklistPlantilla` + `ChecklistPregunta` + `ChecklistRespuesta`

```
Plantilla
  id, nombre, tipo_trabajo, activo

Pregunta
  id, plantilla_id, orden, texto
  tipo_respuesta (si_no | texto | numero | foto | firma)
  obligatorio (boolean), permite_foto (boolean)

Respuesta
  id
  entidad_tipo (ot | st)
  entidad_id
  pregunta_id
  respondido_por (→ Usuario)
  respuesta_texto, respuesta_boolean, foto_url
  respondido_at
```

> `ChecklistRespuesta` usa `entidad_tipo + entidad_id` para que tanto OT como ST puedan usar checklists.

---

### `HistorialGestion` (log inmutable — transversal a todo)

```
id
entidad_tipo (venta | sac | ot | st | pvr | pvc | stub | incidencia)
entidad_id
usuario_id (→ Usuario)
accion (cambio_estado | comentario | archivo | aprobacion | rechazo | creacion | derivacion | cierre_forzado | vinculacion | escalamiento | incidencia_reportada | incidencia_resuelta)
estado_anterior, estado_nuevo
descripcion
duracion_en_estado (integer en segundos — calculado al insertar)
created_at
```

> Visible en el panel lateral de cualquier formulario. Muestra quién hizo qué, cuándo y cuánto tiempo estuvo en cada estado. Base para todos los KPIs de SLA.

---

### `Notificacion`

```
id
usuario_destino_id (NOT NULL → Usuario)
tipo (ver tabla de tipos de notificación)
entidad_tipo (venta | sac | ot | st | pvr | pvc | stub | incidencia)
entidad_id
titulo (texto corto — max 80 caracteres)
mensaje (texto descriptivo — max 300 caracteres)
accion_url (nullable — deep link a la vista de la entidad, ej: /ventas/VTA-000123)
leida (boolean default false)
leida_at (nullable)
created_at
```

**Tipos de notificación:**

| Tipo | Cuándo se dispara | Destinatario |
| --- | --- | --- |
| `cambio_estado` | Cualquier cambio de estado de una entidad | Responsable/dueño de la entidad |
| `asignacion` | Se asigna una entidad o tarea a alguien | El asignado |
| `devolucion` | Una rama devuelve a Ventas o a otra área | El vendedor/responsable del origen |
| `respuesta_devolucion` | Ventas u otra área responde una devolución | Quien hizo la devolución |
| `aprobacion_requerida` | Se crea un stub o NC que necesita aprobación | El área/rol que debe aprobar |
| `aprobacion_resultado` | Un stub o NC fue aprobado/rechazado | Quien lo solicitó |
| `incidencia_nueva` | Se reporta una incidencia | El superior asignado automáticamente |
| `incidencia_escalada` | Una incidencia no fue atendida en SLA | El siguiente nivel jerárquico |
| `incidencia_resuelta` | Una incidencia fue resuelta | Quien la reportó |
| `sla_en_riesgo` | Queda 25% del tiempo de SLA | El responsable de la entidad |
| `sla_breach` | Se incumplió el SLA | El responsable + su superior |
| `cierre_forzado` | Se cierra forzadamente una entidad | Todos los involucrados en la entidad |
| `cierre_automatico` | VTA cerrada automáticamente al completar ramas | El vendedor |
| `encuesta` | Se dispara encuesta de satisfacción | (Para tracking interno, no notifica al usuario) |
| `reprogramacion` | Se reprograma una fecha de OT o ST | Supervisor + vendedor + cliente (futuro) |
| `escalamiento_reincidencia` | ≥3 devoluciones por mismo motivo | Nivel jerárquico superior |

**Comportamiento en la UI (Fase 1):**

- **Badge:** Ícono de campana en el header con contador de no leídas (número rojo)
- **Panel:** Click en la campana abre panel lateral con lista de notificaciones ordenadas por fecha
- **Cada notificación muestra:** ícono por tipo + título + tiempo relativo ("hace 5 min") + indicador leída/no-leída
- **Click en notificación:** marca como leída + navega a `accion_url` (la vista de la entidad)
- **Marcar todas como leídas:** botón en el header del panel
- **Agrupación:** si hay 3+ notificaciones del mismo tipo en 1 hora, agrupar ("3 stubs pendientes de aprobación")

**Reglas de generación:**

- Las notificaciones se crean desde el backend al ejecutar cualquier acción que tenga un evento asociado
- Un usuario NUNCA recibe notificación de sus propias acciones
- Si un usuario tiene rol Gerencia, no recibe notificaciones de cambios de estado rutinarios — solo escalamientos, aprobaciones requeridas e incidencias
- Las notificaciones no leídas después de 30 días se marcan como leídas automáticamente (limpieza)

---

### `ConfiguracionSLA`

```
id
entidad_tipo (venta | sac | ot | st | pvr | pvc | stub | incidencia)
estado (el estado al que aplica el SLA — nullable para incidencias que aplican a toda la entidad)
prioridad (alta | media | baja — solo para incidencias, nullable para el resto)
horas_limite (integer)
tipo_hora (habil | corrida)
accion_breach (alerta | escalamiento)
nivel_escalamiento (jefatura | gerencia)
activo (boolean)
descripcion (texto — para que el admin entienda qué configura)
```

**SLA por defecto para incidencias:**

| Prioridad | Horas límite | Tipo hora | Acción breach |
| --- | --- | --- | --- |
| Alta (terreno, bloqueo) | 2 | hábil | Escalamiento a gerencia |
| Media (coordinación, datos) | 8 | hábil | Escalamiento a jefatura |
| Baja (informativa) | 24 | hábil | Alerta al responsable |

**SLA por defecto para stubs:**

| Área | Horas límite | Tipo hora |
| --- | --- | --- |
| Bodega | 48 | hábil |
| Contabilidad | 48 | hábil |
| Cobranza | 24 | hábil |
| Gerencia (aprobaciones) | 24 | hábil |

> Todos los SLA son configurables desde el panel Admin. Los valores por defecto se cargan en el seed inicial.

---

### Estrategia de almacenamiento de archivos

Supabase Storage con buckets por tipo:

| Bucket | Contenido | Acceso |
| --- | --- | --- |
| `cotizaciones-pdf` | PDFs de cotización generados | Privado (usuario + admin) |
| `fotos-ot` | Fotos de antes/durante/después de OT | Privado (equipo + admin) |
| `fotos-st` | Fotos de servicios técnicos | Privado (equipo + admin) |
| `fotos-incidencias` | Evidencia de incidencias | Privado (equipo + admin) |
| `firmas` | Firmas digitales de clientes | Privado (equipo + admin) |
| `evidencia-reclamos` | Fotos/documentos de reclamos | Privado (equipo + admin) |
| `documentos-nc` | PDFs de notas de crédito | Privado (contabilidad + admin) |

Reglas: máximo 10 MB por archivo, compresión de imágenes en mobile antes de subir, nombres con formato `{entidad_id}/{timestamp}_{nombre_original}`.

---

## 5. Principios de diseño

- **Soft delete** en todas las tablas — nada se borra físicamente
- **Cliente como ancla universal** — `cliente_id NOT NULL` en todas las entidades operativas
- **Venta como caso contenedor** — agrupa entidades relacionadas, pero no es requisito
- **Navegación independiente** — cada entidad tiene su propia vista y flujo
- **Estados semi/automáticos** — cambian por acciones del usuario o por reglas del sistema
- **`vendedor_id` automático** — se toma del usuario logueado
- **Mobile-first** para roles de terreno — web responsive (PWA), no app nativa
- **Email como UNIQUE**, no como Primary Key en Usuario
- **Vinculación posterior** — una entidad sin venta puede vincularse a una después
- **Incidencia universal** — cualquier usuario, en cualquier entidad, puede reportar un problema con escalamiento automático
- **Notificaciones como orquestador** — el sistema avisa, no depende de que la persona "se acuerde"

---

## 6. Máquinas de estado

### Notación

- 🤖 = automático (sistema actúa solo)
- 👤 = semi-automático (usuario realiza acción)
- 🔒 = solo ciertos roles pueden dispararlo

---

### 6.1 Flujo Ventas — `VTA-XXXXXX`

#### Estados y transiciones

```
CONSULTA_ABIERTA
  👤 Vendedor atiende primer contacto con el cliente
  (canal: tienda | teléfono | email | whatsapp)

CONSULTA_ABIERTA → COTIZACION_ENVIADA
  👤 Vendedor crea cotización y la envía al cliente
  🤖 Cotización v1 creada → estado: ENVIADA

COTIZACION_ENVIADA → COTIZACION_EN_REPROCESO
  👤 Cliente pide cambios o ajustes
  🤖 Cotización anterior → REEMPLAZADA
  🤖 Nueva versión creada (v2, v3...)
  → vuelve a COTIZACION_ENVIADA

COTIZACION_ENVIADA → CERRADA_SIN_VENTA
  👤 Cliente rechaza definitivamente
  👤 Vendedor registra motivo de rechazo
  (fin del flujo)

COTIZACION_ENVIADA → VENTA_GENERADA
  👤 Vendedor registra aceptación del cliente
  🤖 cotizacion_activa_id = cotización aceptada
  🤖 Según tipo de venta, dispara automáticamente:
     suministro             → BOD-XXXXXX
     solo_instalacion       → INS-XXXXXX
     suministro_instalacion → BOD-XXXXXX + INS-XXXXXX

VENTA_GENERADA → EN_PROCESO
  🤖 Automático al confirmar bifurcación de ramas
  El vendedor ve desde su vista el estado de cada rama

EN_PROCESO ←──────────────────────────────────────────┐
  │                                                     │
  │ 🤖 Cualquier rama devuelve con formulario           │
  ↓                                                     │
EN_GESTION_VTA                                         │
  👤 Vendedor recibe aviso con banner + notificación    │
  👤 Completa formulario de respuesta (mín. 100 chars)  │
  🤖 Registro cruzado en historial de VTA + rama        │
  🤖 Notificación a la rama: "Ventas respondió"         │
  └──────────────── vuelve a EN_PROCESO ────────────────┘

EN_PROCESO → CERRADA
  🤖 Automático SOLO cuando todas las ramas están en estado final
  🤖 Notificación al vendedor: "VTA-XXXX cerrada automáticamente"
  🤖 Dispara encuesta de satisfacción al cliente
  ❌ Vendedor NO puede cerrar manualmente si hay ramas activas
```

#### Formulario de devolución (rama → Ventas)

```
Motivo (select):
  → Datos del cliente incompletos
  → Dirección de despacho incorrecta
  → Producto no corresponde a lo solicitado
  → Cliente no responde / no acepta fecha
  → Cambio de alcance solicitado por cliente
  → Otro
Descripción detallada: texto libre, mínimo 100 caracteres
```

#### Formulario de respuesta (Ventas → rama)

```
Acción tomada: texto libre, mínimo 100 caracteres
Rama destino: selección de a qué rama reenvía
```

#### Reglas paralelas (VTA)

```
CON_RECLAMO
  Tag paralelo — no bloquea el flujo principal
  Se activa cuando se abre un PVR vinculado

CUALQUIER_ESTADO_ACTIVO → CERRADA_SIN_EJECUTAR | CERRADA_SIN_TERMINAR
  🔒 Solo Jefatura, Gerencia o Admin (ver sección 7)

ESCALAMIENTO POR REINCIDENCIA
  🤖 Si misma rama devuelve ≥3 veces por mismo motivo
  🤖 Notificación automática a nivel jerárquico superior
```

#### Backlog de la venta

Cada VTA-XXXXXX tiene un panel lateral de historial siempre visible:
- Ver cada cambio de estado con usuario, fecha/hora, del más nuevo al más antiguo
- Agregar comentarios con botón "+"
- Al cambiar estado: modal con cuadro de texto (comentario con texto por defecto según tipo de estado)

---

### 6.2 Cotización — vinculada a Venta

```
BORRADOR → ENVIADA → ACEPTADA | RECHAZADA | REEMPLAZADA | VENCIDA
```

- Solo UNA cotización puede estar ENVIADA o ACEPTADA a la vez por venta
- Al aceptar: `VTA.cotizacion_activa_id` = esta cotización
- Al reemplazar: versión anterior → REEMPLAZADA, nueva versión creada automáticamente
- Vencimiento: automático al superar `fecha_vencimiento` sin acción

---

### 6.3 SolicitudStub — `BOD-X | COB-X | CTB-X | GER-X`

```
PENDIENTE
  🤖 Creado automáticamente desde origen (VTA, SAC, PVR, ST)
  🤖 Notificación al área stub correspondiente
  🤖 SLA activado según ConfiguracionSLA

PENDIENTE → APROBADO
  👤 Usuario del área stub aprueba
  🤖 Notificación al módulo origen
  🤖 Origen continúa su flujo

PENDIENTE → RECHAZADO
  👤 Motivo (select según tipo) + descripción mín. 100 chars
  🤖 Notificación al módulo origen
  🤖 Origen maneja el rechazo según su flujo
```

---

### 6.4 Flujo Instalaciones — `INS-XXXXXX`

```
CREADO
  🤖 Nace automáticamente desde VENTA_GENERADA (si aplica)
     o 👤 creado manualmente por coordinador (sin venta)
  🤖 Notificación a Coordinadora

CREADO → REVISION_INFO
  👤 Coordinadora verifica datos, servicios, contactos, acceso

REVISION_INFO → EN_GESTION_VTA
  👤 Datos faltantes → formulario devolución a Ventas (mín. 100 chars)
  🤖 Registro cruzado en historial SAC + VTA
  👤 Vendedor corrige y responde → SAC vuelve a REVISION_INFO

REVISION_INFO → EN_COORDINACION
  👤 Coordinadora confirma info completa ✅

EN_COORDINACION → PROGRAMADO
  👤 Contratista asignado + fecha acordada + OT-XXXXXX creada
  🤖 Notificación a Supervisor + cliente

PROGRAMADO → REPROGRAMADO
  👤 Formulario: motivo (select) + descripción (mín. 100 chars)
  🤖 Notificación a vendedor + supervisor + cliente
  → vuelve a PROGRAMADO

PROGRAMADO → EN_EJECUCION
  👤 Supervisor confirma inicio desde terreno (mobile-first)

EN_EJECUCION → COMPLETADO
  👤 Supervisor cierra: checklist 100% + fotos + firma
  🤖 OT-XXXXXX → COMPLETADA
  🤖 Notificación a Coordinadora y vendedor

COMPLETADO → GESTION_COBRO
  👤 Coordinadora inicia cierre administrativo
  🤖 Solicitud a Contabilidad (CTB-XXXXXX)

GESTION_COBRO → CERRADO
  👤 Coordinadora confirma cierre total
  🤖 Si VTA-X tiene todas sus ramas completadas → VTA-X → CERRADA
  🤖 Encuesta de satisfacción

CUALQUIER_ESTADO_ACTIVO → CERRADO_SIN_EJECUTAR | CERRADO_SIN_TERMINAR
  🔒 Solo Jefatura, Gerencia o Admin (ver sección 7)
```

---

### 6.5 Orden de Trabajo — `OT-XXXXXX`

```
PENDIENTE → EN_EJECUCION → PAUSADA (y vuelta) → ENTREGA_PARCIAL (repetible) → COMPLETADA → CERRADA_ADMIN

COMPLETADA requiere: checklist 100% + fotos + firma
CERRADA_ADMIN: automático cuando SAC pasa a CERRADO

CUALQUIER_ESTADO_ACTIVO → CERRADA_SIN_EJECUTAR | CERRADA_SIN_TERMINAR
  🔒 Solo Jefatura, Gerencia o Admin (ver sección 7)
  🤖 Si cascada desde VTA o INS, se registra en historial
```

---

### 6.6 Servicio Técnico — `ST-XXXXXX`

```
CREADO
  👤 Coordinadora, Postventa o Vendedor crea el ST
  Vinculado a: cliente_id (obligatorio) + venta_id, sac_id, reclamo_id (opcionales)
  Tipo (select): revisita | garantia | emergencia | ajuste_post_instalacion | otro
  Descripción: mín. 100 caracteres

CREADO → PROGRAMADO
  👤 Responsable coordina fecha y asigna supervisor
  🤖 Notificación a supervisor y cliente

PROGRAMADO → REPROGRAMADO
  👤 Formulario: motivo (select) + descripción (mín. 100 chars)
  → vuelve a PROGRAMADO

PROGRAMADO → EN_EJECUCION
  👤 Supervisor confirma inicio desde terreno (mobile-first)

EN_EJECUCION → COMPLETADO
  👤 Supervisor cierra: checklist (si aplica) + fotos + descripción trabajo realizado
  🤖 Notificación a responsable y vendedor

COMPLETADO → CERRADO
  👤 Responsable confirma cierre
  🤖 Si viene de PVR, actualiza estado del reclamo
  🤖 Encuesta de satisfacción (si aplica)

CUALQUIER_ESTADO_ACTIVO → CERRADO_SIN_EJECUTAR | CERRADO_SIN_TERMINAR
  🔒 Solo Jefatura, Gerencia o Admin (ver sección 7)
```

---

### 6.7 PostVenta Consulta — `PVC-XXXXXX`

```
ABIERTA → EN_GESTION → DERIVADA (y vuelta) → RESUELTA → CERRADA (auto 48h o manual)
RESUELTA → REABIERTA (→ vuelve a EN_GESTION)

CUALQUIER_ESTADO_ACTIVO → CERRADA_SIN_EJECUTAR
  🔒 Solo Jefatura, Gerencia o Admin
```

---

### 6.8 PostVenta Reclamo — `PVR-XXXXXX`

```
ABIERTO → EN_ANALISIS → DERIVADO_[BOD|INS|CTB|GER] (y vuelta) → PENDIENTE_APROBACION_GER (si aplica) → EN_RESOLUCION → RESUELTO → CERRADO
RESUELTO → REABIERTO (→ vuelve a EN_ANALISIS)

EN_RESOLUCION puede generar:
  → ST-XXXXXX (si requiere revisita técnica)
  → NotaCredito (si requiere NC)

CUALQUIER_ESTADO_ACTIVO → CERRADO_SIN_EJECUTAR | CERRADO_SIN_TERMINAR
  🔒 Solo Jefatura, Gerencia o Admin
```

#### Diferencia clave entre PVC y PVR

| | Consulta `PVC` | Reclamo `PVR` |
| --- | --- | --- |
| Formulario | Liviano | Estructurado + mín. 100 chars |
| Derivaciones | Nota breve | Formulario completo por área |
| Aprobación Gerencia | No | Sí (por monto/tipo) |
| NC posible | No | Sí |
| Puede generar ST | No | Sí |
| Encuesta cierre | No | ✅ Siempre |
| Tag en VTA | Opcional | ✅ Siempre (si hay VTA) |
| Escalamiento SLA | Por horas | Por horas + reincidencia |

---

### 6.9 Incidencia — `INC-XXXXXX`

#### El botón "Reportar incidencia"

Está presente en **toda vista de detalle** de cualquier entidad operativa. Cualquier usuario logueado puede usarlo. Es el mecanismo universal para decir "aquí hay un problema que necesita atención de un superior".

#### Estados y transiciones

```
ABIERTA
  👤 Cualquier usuario reporta desde cualquier entidad
  Formulario:
    Categoría (select — según entidad_tipo, ver tabla arriba)
    Prioridad (select): alta | media | baja
    Descripción: mín. 100 caracteres
    Foto: obligatoria si prioridad = alta o entidad_tipo = ot | st
  🤖 Sistema determina asignada_a (superior automático)
  🤖 Notificación inmediata al superior asignado (tipo: incidencia_nueva)
  🤖 SLA activado según ConfiguracionSLA (prioridad + tipo)
  🤖 HistorialGestion registra en la entidad origen: "Incidencia INC-X reportada"

ABIERTA → EN_REVISION
  👤 Superior asignado abre y toma la incidencia
  🤖 Timestamp de primera respuesta registrado (KPI)

EN_REVISION → RESUELTA
  👤 Superior registra solución
  Formulario:
    Descripción de resolución: mín. 100 caracteres
  🤖 Notificación a quien la reportó (tipo: incidencia_resuelta)
  🤖 HistorialGestion registra en la entidad origen: "Incidencia INC-X resuelta"

RESUELTA → CERRADA
  🤖 Automático tras 24h sin reapertura
  (o 👤 cierre manual por quien reportó si está conforme)

RESUELTA → REABIERTA
  👤 Quien reportó no está conforme → vuelve a EN_REVISION

── reglas paralelas ──

ESCALAMIENTO POR SLA
  🤖 Incidencia lleva más de sla_horas sin pasar de ABIERTA a EN_REVISION
  🤖 Estado pasa a ESCALADA
  🤖 Se re-asigna al siguiente nivel jerárquico (escalada_a)
  🤖 Notificación al nuevo asignado (tipo: incidencia_escalada)
  🤖 Notificación al asignado original: "Incidencia re-escalada por SLA"

ESCALAMIENTO DOBLE
  🤖 Si la incidencia ESCALADA no se atiende en otro período de SLA
  🤖 Notificación a Gerencia independiente del nivel actual
```

#### Incidencias vs Devoluciones

Las incidencias NO reemplazan el flujo de devoluciones (EN_GESTION_VTA). Son complementarias:

| | Devolución (EN_GESTION_VTA) | Incidencia (INC-XXXXXX) |
| --- | --- | --- |
| Propósito | Devolver un caso a otra área para corrección | Reportar un problema que necesita atención superior |
| Quién inicia | Coordinadora / Supervisor / Contabilidad | Cualquier usuario |
| A quién va | Al área específica (Ventas, Bodega, etc.) | Al superior jerárquico automático |
| Afecta estado de la entidad | Sí (cambia a EN_GESTION_VTA) | No (corre en paralelo) |
| SLA | Configurable | Configurable con escalamiento automático |
| Ejemplo | "Faltan datos del cliente en el SAC" | "Bodega lleva 3 días sin responder mi stub" |

---

## 7. Cierre forzado — patrón transversal

Jefatura, Gerencia o Admin puede cerrar cualquier entidad en cualquier estado activo.

### Dos estados de cierre forzado

| Estado | Cuándo aplica |
| --- | --- |
| `CERRADO_SIN_EJECUTAR` | La entidad nunca llegó a ejecución |
| `CERRADO_SIN_TERMINAR` | La entidad se inició pero no se completó |

El sistema determina automáticamente cuál aplica según el estado actual al momento del cierre.

### Formulario obligatorio

**Categoría de cierre** (select, por tipo de entidad):

| Entidad | Categorías |
| --- | --- |
| VTA | cliente desistió · cambio de proveedor · fuerza mayor · duplicada · error de registro · otro |
| INS / OT | obra cancelada · cliente no disponible · sin stock definitivo · fuerza mayor · otro |
| ST | resuelto por otra vía · cliente desistió · fuera de garantía · fuerza mayor · otro |
| PVR / PVC | resuelto por otra vía · cliente desistió · fuera de alcance · duplicado · otro |

**Comentario obligatorio:** mínimo 100 caracteres con justificación.

### Cascada

- VTA cerrada forzada → INS, OT, ST hijos activos → cierre forzado en cascada
- INS cerrado forzado → OTs activas → cierre forzado en cascada
- Incidencias abiertas de entidades cerradas forzadas → CERRADA automáticamente con nota "Entidad origen cerrada forzadamente"

**Restricción:** Si hay una OT en estado EN_EJECUCION (gente en terreno), el cierre forzado del INS o VTA requiere confirmación adicional de Gerencia.

---

## 8. Panel de administración (Módulo 7)

> Acceso: solo `rol_funcional = admin` o `nivel_jerarquico = director`

### 8.1 Gestión de usuarios

- Crear, editar, desactivar usuarios
- Asignar `rol_funcional` y `nivel_jerarquico`
- Ver historial de acciones por usuario (filtro sobre HistorialGestion)
- Reset de contraseña (via Supabase Auth)

### 8.2 Configuración de SLA

- CRUD sobre tabla `ConfiguracionSLA`
- Definir horas límite por combinación de entidad_tipo + estado + prioridad
- Tipo de hora: hábil o corrida
- Acción al breach: alerta o escalamiento
- Nivel de escalamiento: jefatura o gerencia
- Activar / desactivar reglas individuales
- Vista de preview: "Con esta configuración, un reclamo en estado ABIERTO tiene 8 horas hábiles antes de escalar a jefatura"

### 8.3 Catálogo de productos

- CRUD sobre tabla `Producto`
- Vincular producto → servicio asociado (`ProductoServicioAsociado`)
- Marcar obligatoriedad del servicio
- Precios de referencia
- Activar / desactivar productos

### 8.4 Gestión de clientes

- CRUD sobre tabla `Cliente`
- Tipo normal vs B2B
- Vista de historial completo por cliente (todas las entidades vinculadas)
- Activar / desactivar

### 8.5 Plantillas de checklist

- CRUD sobre `ChecklistPlantilla`
- Definir preguntas por plantilla: texto, tipo de respuesta, orden, obligatoriedad
- Asignar plantilla a tipo de trabajo
- Duplicar plantilla existente como base para una nueva
- Activar / desactivar plantillas

### 8.6 Categorías y listas de valores

Todas las listas de selección del sistema son configurables:

| Lista | Dónde se usa |
| --- | --- |
| Motivos de rechazo por tipo de stub | SolicitudStub (BOD, CTB, COB, GER) |
| Tipos de reclamo | PostVenta (PVR) |
| Tipos de consulta | PostVenta (PVC) |
| Tipos de servicio técnico | ServicioTecnico (ST) |
| Categorías de cierre forzado por entidad | Cierre forzado (todas las entidades) |
| Categorías de incidencia por entidad | Incidencia (INC) |
| Motivos de reprogramación | SAC, OT, ST |
| Motivos de devolución a Ventas | SAC → VTA |
| Canales de venta | Venta (VTA) |
| Cargos de contacto de obra | ContactoObra |

**Modelo de datos para listas configurables:**

```
CategoriaConfigurable
  id
  grupo (motivo_rechazo_bod | motivo_rechazo_ctb | tipo_reclamo | tipo_consulta | tipo_st | cierre_forzado_vta | cierre_forzado_ins | categoria_incidencia_ot | ...)
  valor (el texto que se muestra en el select)
  orden (integer — orden de aparición)
  activo (boolean)
```

> Esto permite que el admin agregue, reordene o desactive opciones sin tocar código. Las listas hardcodeadas en el mc original se migran a esta tabla como seed.

### 8.7 Configuración de notificaciones

- Activar / desactivar tipos de notificación globalmente
- Configurar qué roles reciben qué tipos de notificación
- Vista de preview: "Con esta configuración, los vendedores reciben notificación de: cambio_estado, devolucion, aprobacion_resultado, incidencia_resuelta, cierre_forzado"

### 8.8 Auditoría y logs

- Vista de `HistorialGestion` global con filtros: usuario, entidad_tipo, entidad, rango de fechas, tipo de acción
- Exportar a CSV
- Vista de "quién hizo qué hoy" (actividad reciente)

### 8.9 Secuencias y códigos

- Ver último correlativo por tipo de entidad
- Reset de secuencia (protegido con doble confirmación)

### 8.10 Sistema

- Recuperar registros eliminados (soft delete) — buscar por entidad y restaurar
- Estado de salud: conexión a DB, storage, últimas notificaciones generadas
- Información de versión del sistema

---

## 9. Resumen de transiciones automáticas clave 🤖

| Disparador | Acción automática |
| --- | --- |
| Venta cerrada + tipo instalación | Crea SAC (INS) |
| SAC completado + todas las ramas de VTA completadas | Venta pasa a CERRADA |
| Cotización nueva versión | Versión anterior → REEMPLAZADA |
| Cotización vence fecha | → VENCIDA |
| SAC programado | Crea OT |
| Reclamo resuelto | Dispara encuesta satisfacción |
| Venta cerrada | Dispara encuesta satisfacción |
| ST completado (si viene de PVR) | Actualiza estado del reclamo |
| VTA cerrada forzada | INS/OT/ST hijos → cierre forzado en cascada |
| INS cerrado forzado | OTs hijas → cierre forzado en cascada |
| Incidencia no atendida en SLA | Escalamiento automático al nivel superior |
| Incidencia escalada no atendida | Notificación a Gerencia |
| SLA en riesgo (25% tiempo restante) | Notificación al responsable |
| SLA excedido | Notificación al responsable + superior |
| Reincidencia ≥3 devoluciones mismo motivo | Escalamiento a nivel jerárquico superior |
| PVC resuelta + 48h sin respuesta | PVC → CERRADA automáticamente |
| Incidencia resuelta + 24h sin reapertura | Incidencia → CERRADA automáticamente |
| Entidad cerrada forzada con incidencias abiertas | Incidencias → CERRADA con nota |

---

## 10. Reportería y KPIs (Módulo 6)

### Dashboards por rol

| Rol | Vista principal | KPIs clave |
| --- | --- | --- |
| Vendedor/a | Mis ventas (Kanban por estado) | Ventas abiertas, tiempo promedio cierre, reclamos activos, incidencias que reporté |
| Coordinador/a | SACs activos (Kanban por estado) | SACs en cola, tiempo en coordinación, reprogramaciones, incidencias asignadas a mí |
| Supervisor | Mis OTs del día + ST asignados | OTs pendientes, completadas hoy, incidencias abiertas |
| Postventa | Reclamos y consultas (Kanban) | Reclamos abiertos, SLA en riesgo, reincidencia |
| Bodega | Solicitudes pendientes (lista) | Stubs pendientes, tiempo promedio respuesta, SLA status |
| Gerencia | Vista ejecutiva (resumen) | Volumen total, SLA global, satisfacción, cuellos de botella, incidencias escaladas |

### KPIs mínimos

- Tiempo a primera respuesta (reclamos e incidencias)
- Tiempo total de resolución (reclamos, ventas, incidencias)
- Tiempo por estado y por área
- % de casos dentro de SLA por etapa
- % de incidencias resueltas dentro de SLA
- Cumplimiento de compromisos: % visitas en fecha, % despachos en fecha
- Backlog por área y "casos sin dueño"
- Principales causas de reclamo (Pareto)
- Principales categorías de incidencia (Pareto)
- Reincidencia: mismo cliente + mismo motivo en Y días
- Satisfacción post-reclamo y post-venta (nota 1-5)
- Tasa de escalamiento de incidencias (% que pasan de ABIERTA a ESCALADA)

### Alertas por excepción

- Caso "envejecido": supera X días sin avance
- "Silencio": sin actividad registrada en X horas
- SLA en riesgo: queda 25% del tiempo
- Breach: SLA incumplido → escalamiento automático
- Backlog crítico / sin dueño
- Reincidencia elevada
- Incidencias acumuladas sin resolver en un área

> Todos los KPIs se calculan desde `HistorialGestion` (campo `duracion_en_estado`) y los estados de cada entidad. Las incidencias agregan una capa de visibilidad sobre la salud operacional de cada área.

---

## 11. Lo que queda fuera de Fase 1 (pendiente)

| Entidad / Funcionalidad | Razón | Fase estimada |
| --- | --- | --- |
| Inventario completo (Stock, Movimientos, Reservas, Importaciones) | Módulo 5. Fase 1 usa stubs de Bodega | Fase 2 |
| Tabla de zonas de despacho parametrizada | Configuración de costos por comuna/zona | Fase 2 |
| Contratista como entidad separada (empresa externa) | Fase 1 lo modela como Usuario. Si necesita RUT, contacto propio, evaluación → entidad propia | Fase 2 |
| Notificaciones por email | Fase 1 = in-app. Email como canal adicional | Fase 2 |
| Portal cliente (consultar estado de su caso) | Acceso externo para clientes | Fase 2+ |
| IA / asistencia inteligente | Sugerencias, clasificación automática, chatbot | Fase 3+ |

---

*Documento v3 — Incluye incidencia universal con escalamiento, panel admin completo, notificaciones detalladas para Fase 1, y reportería por rol.*
