# Revisión de Arquitectura — mc_v3

> Revisión técnica del diseño del sistema
> Actualizada: Marzo 2026
> Basada en: mc_v3.md (versión final del diseño)

---

## Veredicto general

El mc_v3 es un **blueprint listo para construir**. Las iteraciones desde el documento original resolvieron todos los problemas bloqueantes y la gran mayoría de las zonas grises. Quedan dos puntos abiertos que se pueden resolver durante implementación.

Este documento sirve como checklist de referencia para Claude Code.

---

## PARTE 1 — Problemas originales: todos resueltos ✅

| # | Problema original | Estado | Cómo se resolvió en v3 |
|---|---|---|---|
| 1.1 | LineaVenta vs LineaCotizacion duplicadas | ✅ Resuelto | Se eliminó `LineaVenta`. La Venta apunta a `cotizacion_activa_id` y los productos se leen de `LineaCotizacion`. Una sola fuente de verdad. |
| 1.2 | Entidades referenciadas sin definir (Cliente, Producto, Incidencia, NC, Encuesta, Contratista) | ✅ Resuelto | Todas definidas con campos completos. Cliente y Producto como tablas propias. Incidencia es ahora universal (INC-XXXXXX). NotaCredito y EncuestaSatisfaccion con estructura propia. Contratista = Usuario con rol en Fase 1. |
| 1.3 | PostVenta venta_id nullable contradice PVR | ✅ Resuelto | `venta_id` es NULLABLE en la DB. La regla de negocio (PVR normalmente tiene venta) se valida en la aplicación, no como constraint. Documentado como decisión explícita. |
| 1.4 | SolicitudStub sin código GER-XXXXXX | ✅ Resuelto | Agregado `GER-XXXXXX` a códigos y flujo. |
| 1.5 | Sin estrategia de almacenamiento de archivos | ✅ Resuelto | Supabase Storage con 7 buckets por tipo, límite 10 MB, compresión en mobile, naming convention definida. |

---

## PARTE 2 — Zonas grises: casi todas resueltas

| # | Zona gris original | Estado | Cómo se resolvió en v3 |
|---|---|---|---|
| 2.1 | Generación de códigos correlativos | ✅ Resuelto | Tabla `Secuencia` con `SELECT ... FOR UPDATE` atómico. Formato `PREFIJO-000001` con secuencia global por tipo. Incluye INC para incidencias. |
| 2.2 | Notificaciones sin diseño | ✅ Resuelto | Tabla `Notificacion` con 16 tipos definidos, disparadores, destinatarios, comportamiento UI (badge + panel), reglas de agrupación, limpieza automática a 30 días. Fase 1 = in-app. |
| 2.3 | SLA sin parametrización | ✅ Resuelto | Tabla `ConfiguracionSLA` con entidad_tipo + estado + prioridad + horas + tipo_hora + accion_breach. Valores por defecto definidos. Configurable desde Admin. |
| 2.4 | duracion_en_estado sin definir cómo se calcula | ✅ Resuelto | Se calcula al insertar nuevo evento: `now() - created_at del registro anterior`. En segundos (integer). Conversión a horas hábiles solo en reportería. |
| 2.5 | Concurrencia EN_GESTION_VTA con múltiples ramas | ⚠️ Abierto | **Pendiente de definir en implementación.** Recomendación: EN_GESTION_VTA = "hay al menos una devolución activa". Solo vuelve a EN_PROCESO cuando no quedan devoluciones pendientes. El detalle de cuál rama devolvió se lee de SolicitudStub + HistorialGestion. |
| 2.6 | Matriz de permisos por rol → acción → entidad | ⚠️ Abierto | **Pendiente de formalizar.** El mc_v3 define roles y jerarquía, pero no hay una matriz explícita de "vendedor puede hacer X en entidad Y". Recomendación: construirla como primera tarea al implementar Auth + RLS. Pistas del documento: vendedor → solo sus ventas; coordinador → todos los SAC; gerencia → todo en lectura + aprobaciones; admin → todo. |

---

## PARTE 3 — Lo que estaba bien y sigue bien ✅

Todo lo que se validó originalmente se mantiene intacto en v3:

- ✅ Venta como caso contenedor con navegación independiente
- ✅ Máquinas de estado con notación 🤖/👤/🔒
- ✅ HistorialGestion como log inmutable transversal
- ✅ SolicitudStub como tabla unificada
- ✅ Separación rol_funcional + nivel_jerarquico
- ✅ CON_RECLAMO como tag paralelo
- ✅ Checklist como plantilla + preguntas + respuestas
- ✅ Patrón bidireccional de devoluciones con formularios obligatorios
- ✅ Soft delete transversal

---

## PARTE 4 — Lo nuevo en v3 (no estaba en el diseño original)

Elementos que se agregaron durante las iteraciones de diseño y que forman parte integral del sistema:

### Modelo de vinculación flexible
- `cliente_id NOT NULL` como ancla universal (no la Venta)
- `venta_id NULLABLE` en INS, PVR, PVC, ST — entidades independientes vinculables
- Vinculación posterior permitida (asociar a VTA después de crear)

### ServicioTecnico (ST-XXXXXX)
- Flujo liviano de terreno: CREADO → PROGRAMADO → EN_EJECUCION → COMPLETADO → CERRADO
- Puede nacer de PVR, VTA, o directo desde cliente
- FK opcionales a venta_id, sac_id, reclamo_id

### Incidencia universal (INC-XXXXXX)
- Botón "Reportar incidencia" en toda vista de detalle de cualquier entidad
- Cualquier usuario puede reportar → asignación automática al superior jerárquico
- 3 prioridades con SLA diferenciado
- Escalamiento automático doble (superior → gerencia)
- Categorías configurables por tipo de entidad
- Corre en paralelo — no bloquea el estado de la entidad origen

### Cierre forzado transversal
- Dos estados: CERRADO_SIN_EJECUTAR / CERRADO_SIN_TERMINAR
- Categorías de cierre por tipo de entidad
- Formulario obligatorio (categoría + 100 chars)
- Cascada: VTA → INS/OT/ST hijos; INS → OTs hijas
- Restricción: OT en EN_EJECUCION requiere confirmación de Gerencia

### Panel de administración (10 secciones)
- Usuarios, SLA, Productos, Clientes, Checklists, Categorías, Notificaciones, Auditoría, Secuencias, Sistema
- `CategoriaConfigurable` como tabla para todas las listas de selección — elimina listas hardcodeadas

### Notificaciones Fase 1
- 16 tipos de notificación con disparador y destinatario definidos
- UI: badge con contador + panel lateral + click navega a entidad
- Reglas de agrupación, no auto-notificación, limpieza automática

### Reportería y KPIs
- Dashboards por rol (vendedor, coordinador, supervisor, postventa, bodega, gerencia)
- KPIs mínimos definidos (tiempos, SLA, satisfacción, Pareto causas, reincidencia)
- Alertas por excepción (envejecimiento, silencio, breach, backlog)

---

## PARTE 5 — Checklist para empezar a construir

### Orden sugerido de implementación

```
Fase 0 — Base
  [ ] Migración inicial: función update_updated_at(), tabla Secuencia
  [ ] Tabla Usuario (integrada con Supabase Auth)
  [ ] Tabla Cliente
  [ ] Tabla Producto + ProductoServicioAsociado
  [ ] Tabla CategoriaConfigurable + seed con todas las listas
  [ ] Tabla ConfiguracionSLA + seed con valores por defecto
  [ ] Tabla Notificacion
  [ ] Tabla HistorialGestion
  [ ] Auth module (login, registro, roles, RLS base)

Fase 1A — Ventas
  [ ] Tabla Venta + Cotizacion + LineaCotizacion
  [ ] Máquina de estados VTA
  [ ] Tabla SolicitudStub + flujos BOD/COB/CTB/GER
  [ ] Notificaciones de VTA + Stubs
  [ ] Backlog/historial lateral de VTA

Fase 1B — Instalaciones
  [ ] Tabla SAC + ContactoObra
  [ ] Tabla OrdenTrabajo
  [ ] Tabla ChecklistPlantilla + Pregunta + Respuesta
  [ ] Máquina de estados INS + OT
  [ ] Flujo bidireccional INS ↔ VTA (devoluciones)
  [ ] Notificaciones de INS + OT

Fase 1C — Servicio Técnico
  [ ] Tabla ServicioTecnico
  [ ] Máquina de estados ST
  [ ] Notificaciones de ST

Fase 1D — Postventa
  [ ] Tabla PostVenta (PVC + PVR)
  [ ] Tabla NotaCredito
  [ ] Tabla EncuestaSatisfaccion
  [ ] Máquina de estados PVC + PVR
  [ ] Generación de ST desde PVR
  [ ] Notificaciones de PVC + PVR

Fase 1E — Transversales
  [ ] Tabla Incidencia (INC) con escalamiento y SLA
  [ ] Cierre forzado en todas las entidades + cascada
  [ ] Notificaciones de INC + cierre forzado

Fase 1F — Admin + Reportería
  [ ] Panel Admin (10 secciones)
  [ ] Dashboards por rol
  [ ] KPIs y alertas por excepción

Pendientes para implementación:
  [ ] Resolver concurrencia EN_GESTION_VTA (punto 2.5)
  [ ] Formalizar matriz de permisos y traducirla a RLS (punto 2.6)
```

---

## PARTE 6 — Documentos de referencia

| Documento | Contenido | Usar para |
|---|---|---|
| **mc_v3.md** | Diseño completo del sistema (modelo, flujos, admin, notificaciones) | Qué construir |
| **ENGINEERING_STANDARDS.md** | Stack, arquitectura espejo, convenciones, seguridad | Cómo construirlo |
| **Ventas.md** | Análisis AS-IS/TO-BE del proceso comercial | Contexto de negocio |
| **ERP_entregable_v2.md** | Análisis del proceso de instalaciones y limitaciones actuales | Contexto de negocio |
| **FM.md** | Análisis técnico de limitaciones de FileMaker | Justificación del proyecto |

---

*Revisión actualizada sobre mc_v3.md. Todos los problemas bloqueantes resueltos. Dos puntos abiertos para resolver durante implementación.*
