-- =============================================================================
-- Migración 0003: Tabla de usuarios del sistema
-- Vinculada 1:1 con auth.users de Supabase.
-- Combina perfil de usuario + rol funcional + nivel jerárquico (mc_v3).
-- =============================================================================

create table public.usuarios (
  -- Identidad (FK → auth.users de Supabase Auth)
  id                uuid         primary key references auth.users(id) on delete cascade,
  email             text         not null unique,
  nombre            text         not null,

  -- Roles (modelo mc_v3)
  rol_funcional     text         not null check (rol_funcional in (
                                   'vendedor',
                                   'coordinador_instalaciones',
                                   'supervisor_instalaciones',
                                   'instalador',
                                   'postventa',
                                   'bodega',
                                   'contabilidad',
                                   'cobranza',
                                   'gerencia',
                                   'admin'
                                 )),
  nivel_jerarquico  text         not null check (nivel_jerarquico in (
                                   'director',
                                   'gerencia',
                                   'jefatura',
                                   'supervisor',
                                   'usuario'
                                 )),

  -- Estado
  activo            boolean      not null default true,

  -- Auditoría
  created_at        timestamptz  not null default now(),
  updated_at        timestamptz  not null default now(),
  created_by        uuid         null references auth.users(id),
  updated_by        uuid         null references auth.users(id),

  -- Soft delete
  is_deleted        boolean      not null default false,
  deleted_at        timestamptz  null,
  deleted_by        uuid         null references auth.users(id)
);

-- Índices
create index concurrently usuarios_rol_funcional_idx    on public.usuarios(rol_funcional);
create index concurrently usuarios_nivel_jerarquico_idx on public.usuarios(nivel_jerarquico);
create index concurrently usuarios_activo_idx           on public.usuarios(activo);
create index concurrently usuarios_is_deleted_idx       on public.usuarios(is_deleted);

-- Trigger updated_at
create trigger trg_usuarios_updated_at
  before update on public.usuarios
  for each row execute function update_updated_at();

-- RLS
alter table public.usuarios enable row level security;

-- Usuarios pueden ver su propio perfil
create policy "usuario ve su propio perfil"
  on public.usuarios for select
  using (auth.uid() = id and is_deleted = false);

-- Solo admin puede ver todos los usuarios
create policy "admin ve todos los usuarios"
  on public.usuarios for select
  using (
    exists (
      select 1 from public.usuarios u
      where u.id = auth.uid()
        and u.rol_funcional = 'admin'
        and u.is_deleted = false
    )
  );

-- Solo admin puede insertar/actualizar usuarios
create policy "admin gestiona usuarios"
  on public.usuarios for all
  using (
    exists (
      select 1 from public.usuarios u
      where u.id = auth.uid()
        and u.rol_funcional = 'admin'
        and u.is_deleted = false
    )
  );

-- =============================================================================
-- Trigger: crear entrada en public.usuarios cuando se crea un auth.user
-- =============================================================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.usuarios (id, email, nombre, rol_funcional, nivel_jerarquico)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'nombre', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'rol_funcional', 'vendedor'),
    coalesce(new.raw_user_meta_data->>'nivel_jerarquico', 'usuario')
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

comment on table public.usuarios is 'Usuarios del sistema ERP MC. Vinculado 1:1 con auth.users.';
