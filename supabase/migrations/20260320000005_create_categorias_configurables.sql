-- =============================================================================
-- Migración 0005: Tabla de categorías configurables
-- Tabla genérica para catálogos configurables por módulo.
-- Ejemplos: tipo_producto, motivo_rechazo, tipo_incidencia, etc.
-- =============================================================================

create table public.categorias_configurables (
  id           uuid         primary key default gen_random_uuid(),
  modulo       text         not null,
  tipo         text         not null,
  nombre       text         not null,
  descripcion  text         null,
  orden        integer      not null default 0,
  activo       boolean      not null default true,

  -- Auditoría
  created_at   timestamptz  not null default now(),
  updated_at   timestamptz  not null default now(),
  created_by   uuid         null references auth.users(id),
  updated_by   uuid         null references auth.users(id),

  -- Soft delete
  is_deleted   boolean      not null default false,
  deleted_at   timestamptz  null,
  deleted_by   uuid         null references auth.users(id),

  constraint categorias_configurables_uq unique (modulo, tipo, nombre)
);

-- Índices
create index categorias_configurables_modulo_tipo_idx on public.categorias_configurables(modulo, tipo);
create index categorias_configurables_activo_idx      on public.categorias_configurables(activo);
create index categorias_configurables_is_deleted_idx  on public.categorias_configurables(is_deleted);

-- Trigger updated_at
create trigger trg_categorias_configurables_updated_at
  before update on public.categorias_configurables
  for each row execute function update_updated_at();

-- RLS
alter table public.categorias_configurables enable row level security;

-- Todos los usuarios autenticados pueden leer
create policy "usuarios autenticados leen categorias"
  on public.categorias_configurables for select
  using (auth.uid() is not null and is_deleted = false);

-- Solo admin puede gestionar
create policy "admin gestiona categorias"
  on public.categorias_configurables for all
  using (
    exists (
      select 1 from public.usuarios u
      where u.id = auth.uid()
        and u.rol_funcional = 'admin'
        and u.is_deleted = false
    )
  );

-- Seed inicial — categorías de productos
insert into public.categorias_configurables (modulo, tipo, nombre, orden) values
  ('productos', 'tipo_producto', 'Piso Flotante',          1),
  ('productos', 'tipo_producto', 'Piso Vinílico',          2),
  ('productos', 'tipo_producto', 'Alfombra',               3),
  ('productos', 'tipo_producto', 'Porcelanato',            4),
  ('productos', 'tipo_producto', 'Cerámica',               5),
  ('productos', 'tipo_producto', 'Madera Sólida',          6),
  ('productos', 'tipo_producto', 'Servicio de Instalación',7),
  ('productos', 'tipo_producto', 'Insumos',                8),
  ('ventas',    'motivo_anulacion', 'Duplicado',           1),
  ('ventas',    'motivo_anulacion', 'Error del vendedor',  2),
  ('ventas',    'motivo_anulacion', 'Solicitud del cliente',3),
  ('ventas',    'motivo_anulacion', 'Sin stock',           4),
  ('ventas',    'motivo_anulacion', 'Otro',                5);

comment on table public.categorias_configurables is 'Catálogos configurables por módulo. Reemplaza tablas de lookup hardcodeadas.';
