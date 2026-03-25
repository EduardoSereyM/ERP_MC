-- =============================================================================
-- Migración 0007: Tablas de productos y servicios asociados
-- =============================================================================

-- Tabla principal de productos
create table public.productos (
  id                    uuid          primary key default gen_random_uuid(),
  codigo                text          not null unique,
  nombre                text          not null,
  descripcion           text          null,
  categoria_id          uuid          null references public.categorias_configurables(id),
  precio_base           numeric(12,2) not null default 0,
  unidad_medida         text          not null default 'm2'
                          check (unidad_medida in ('m2', 'ml', 'unidad', 'kg', 'hora', 'otro')),
  requiere_instalacion  boolean       not null default false,
  activo                boolean       not null default true,

  -- Auditoría
  created_at            timestamptz   not null default now(),
  updated_at            timestamptz   not null default now(),
  created_by            uuid          null references auth.users(id),
  updated_by            uuid          null references auth.users(id),

  -- Soft delete
  is_deleted            boolean       not null default false,
  deleted_at            timestamptz   null,
  deleted_by            uuid          null references auth.users(id)
);

-- Índices
create index productos_codigo_idx         on public.productos(codigo);
create index productos_nombre_idx         on public.productos using gin(to_tsvector('spanish', nombre));
create index productos_categoria_id_idx   on public.productos(categoria_id);
create index productos_activo_idx         on public.productos(activo);
create index productos_is_deleted_idx     on public.productos(is_deleted);

-- Trigger updated_at
create trigger trg_productos_updated_at
  before update on public.productos
  for each row execute function update_updated_at();

-- RLS
alter table public.productos enable row level security;

create policy "usuarios autenticados leen productos"
  on public.productos for select
  using (auth.uid() is not null and is_deleted = false);

create policy "admin gestiona productos"
  on public.productos for all
  using (
    exists (
      select 1 from public.usuarios u
      where u.id = auth.uid()
        and u.rol_funcional in ('admin', 'gerencia')
        and u.is_deleted = false
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- Servicios asociados a productos
-- Permite asociar servicios de instalación u otros servicios a un producto.
-- ─────────────────────────────────────────────────────────────────────────────
create table public.producto_servicio_asociado (
  id                uuid          primary key default gen_random_uuid(),
  producto_id       uuid          not null references public.productos(id) on delete cascade,
  servicio_nombre   text          not null,
  precio_servicio   numeric(12,2) not null default 0,
  activo            boolean       not null default true,

  -- Auditoría
  created_at        timestamptz   not null default now(),
  updated_at        timestamptz   not null default now(),
  created_by        uuid          null references auth.users(id),
  updated_by        uuid          null references auth.users(id),

  -- Soft delete
  is_deleted        boolean       not null default false,
  deleted_at        timestamptz   null,
  deleted_by        uuid          null references auth.users(id)
);

-- Índices
create index producto_servicio_asociado_producto_id_idx on public.producto_servicio_asociado(producto_id);
create index producto_servicio_asociado_is_deleted_idx  on public.producto_servicio_asociado(is_deleted);

-- Trigger updated_at
create trigger trg_producto_servicio_asociado_updated_at
  before update on public.producto_servicio_asociado
  for each row execute function update_updated_at();

-- RLS
alter table public.producto_servicio_asociado enable row level security;

create policy "usuarios autenticados leen servicios asociados"
  on public.producto_servicio_asociado for select
  using (auth.uid() is not null and is_deleted = false);

create policy "admin gestiona servicios asociados"
  on public.producto_servicio_asociado for all
  using (
    exists (
      select 1 from public.usuarios u
      where u.id = auth.uid()
        and u.rol_funcional in ('admin', 'gerencia')
        and u.is_deleted = false
    )
  );

comment on table public.productos is 'Catálogo de productos y servicios del ERP MC.';
comment on table public.producto_servicio_asociado is 'Servicios de instalación u otros servicios vinculados a un producto.';
