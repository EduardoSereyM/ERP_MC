-- =============================================================================
-- Migración 0006: Tabla de clientes
-- Entidad ancla universal — cliente_id NOT NULL en todas las entidades operativas.
-- =============================================================================

create table public.clientes (
  id                  uuid         primary key default gen_random_uuid(),
  codigo              text         not null unique,

  -- Datos de la empresa/persona
  razon_social        text         not null,
  rut                 text         not null unique,
  email               text         null,
  telefono            text         null,

  -- Dirección principal (obra)
  direccion           text         null,
  comuna              text         null,
  ciudad              text         null,
  region              text         null,

  -- Contacto comercial
  contacto_nombre     text         null,
  contacto_email      text         null,
  contacto_telefono   text         null,

  notas               text         null,
  activo              boolean      not null default true,

  -- Auditoría
  created_at          timestamptz  not null default now(),
  updated_at          timestamptz  not null default now(),
  created_by          uuid         null references auth.users(id),
  updated_by          uuid         null references auth.users(id),

  -- Soft delete
  is_deleted          boolean      not null default false,
  deleted_at          timestamptz  null,
  deleted_by          uuid         null references auth.users(id)
);

-- Índices
create index clientes_razon_social_idx  on public.clientes using gin(to_tsvector('spanish', razon_social));
create index clientes_rut_idx           on public.clientes(rut);
create index clientes_activo_idx        on public.clientes(activo);
create index clientes_is_deleted_idx    on public.clientes(is_deleted);
create index clientes_created_at_idx    on public.clientes(created_at desc);

-- Trigger updated_at
create trigger trg_clientes_updated_at
  before update on public.clientes
  for each row execute function update_updated_at();

-- RLS
alter table public.clientes enable row level security;

-- Todos los usuarios autenticados pueden leer clientes activos
create policy "usuarios autenticados leen clientes"
  on public.clientes for select
  using (auth.uid() is not null and is_deleted = false);

-- Vendedor, coordinador, admin pueden insertar
create policy "roles comerciales insertan clientes"
  on public.clientes for insert
  with check (
    exists (
      select 1 from public.usuarios u
      where u.id = auth.uid()
        and u.rol_funcional in ('vendedor', 'coordinador_instalaciones', 'admin', 'gerencia')
        and u.is_deleted = false
    )
  );

-- Solo admin y gerencia pueden actualizar o eliminar (soft)
create policy "admin y gerencia gestionan clientes"
  on public.clientes for update
  using (
    exists (
      select 1 from public.usuarios u
      where u.id = auth.uid()
        and u.rol_funcional in ('admin', 'gerencia', 'vendedor', 'coordinador_instalaciones')
        and u.is_deleted = false
    )
  );

comment on table public.clientes is 'Clientes del sistema ERP MC. Entidad ancla universal de todas las operaciones.';
