-- =============================================================================
-- Migración 0004: Tabla de auditoría
-- Registro inmutable — NO usa soft delete. Nunca se modifica ni elimina.
-- =============================================================================

create table public.audit_logs (
  id           uuid         primary key default gen_random_uuid(),
  user_id      uuid         null references auth.users(id) on delete set null,
  action       text         not null,          -- CREATE | UPDATE | DELETE | LOGIN | LOGOUT | ACCESS_DENIED | ROLE_CHANGED
  entity_type  text         not null,          -- nombre del módulo (auth, usuarios, ventas, etc.)
  entity_id    uuid         null,              -- ID del registro afectado
  metadata     jsonb        null,              -- datos adicionales del evento
  ip_address   text         null,
  user_agent   text         null,
  created_at   timestamptz  not null default now()
);

-- Índices para queries frecuentes
create index concurrently audit_logs_user_id_idx     on public.audit_logs(user_id);
create index concurrently audit_logs_entity_type_idx on public.audit_logs(entity_type);
create index concurrently audit_logs_action_idx      on public.audit_logs(action);
create index concurrently audit_logs_created_at_idx  on public.audit_logs(created_at desc);

-- RLS — solo admin puede consultar logs
alter table public.audit_logs enable row level security;

create policy "solo admin ve los logs"
  on public.audit_logs for select
  using (
    exists (
      select 1 from public.usuarios
      where id = auth.uid()
        and rol_funcional = 'admin'
        and is_deleted = false
    )
  );

-- Solo el sistema (service role) puede insertar logs
create policy "sistema inserta logs"
  on public.audit_logs for insert
  with check (true);

-- Vistas por entidad
create view public.auth_activity as
  select * from public.audit_logs
  where entity_type = 'auth';

comment on table public.audit_logs is 'Registro inmutable de auditoría. No modificar ni eliminar registros.';
