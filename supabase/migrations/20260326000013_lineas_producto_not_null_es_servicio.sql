-- Migración: limpieza de lineas_cotizacion, campo es_servicio y NOT NULL en producto_id.
-- Además: seed de producto "Visita técnica / Cubicación".
--
-- Pasos:
--   1. Seed: insertar producto "Visita técnica / Cubicación" (SERVICIO_TECNICO)
--   2. Limpiar líneas con producto_id NULL (dev data)
--   3. Agregar columna es_servicio boolean NOT NULL DEFAULT false
--   4. Poblar es_servicio desde tipo_producto del producto referenciado
--   5. Agregar restricción NOT NULL en lineas_cotizacion.producto_id

-- ─── 1. Seed: Visita técnica / Cubicación ────────────────────────────────────
-- Código SRV-001 (servicio técnico, sin precio base — se cotiza por proyecto)
insert into public.productos (
  id, codigo, nombre, descripcion,
  precio_base, unidad_medida, tipo_producto,
  requiere_instalacion, activo,
  created_at, updated_at
)
values (
  gen_random_uuid(),
  'SRV-001',
  'Visita técnica / Cubicación',
  'Visita al terreno para medición en obra y cubicación de materiales.',
  0,
  'unidad',
  'SERVICIO_TECNICO',
  false,
  true,
  now(), now()
)
on conflict (codigo) do nothing;

-- ─── 2. Limpiar líneas huérfanas (dev data con producto_id NULL) ─────────────
delete from public.lineas_cotizacion
where producto_id is null;

-- ─── 3. Columna es_servicio ───────────────────────────────────────────────────
alter table public.lineas_cotizacion
  add column if not exists es_servicio boolean not null default false;

-- ─── 4. Poblar es_servicio desde el catálogo ──────────────────────────────────
update public.lineas_cotizacion lc
set es_servicio = (
  p.tipo_producto <> 'PRODUCTO_FISICO'
)
from public.productos p
where lc.producto_id = p.id
  and p.is_deleted = false;

-- ─── 5. NOT NULL en producto_id ───────────────────────────────────────────────
alter table public.lineas_cotizacion
  alter column producto_id set not null;

create index if not exists lineas_cotizacion_producto_id_idx
  on public.lineas_cotizacion(producto_id);
