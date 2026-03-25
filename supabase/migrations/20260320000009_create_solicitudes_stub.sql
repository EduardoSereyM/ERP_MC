-- =============================================================================
-- Migración 0009: Tabla de solicitudes stub (BOD/COB/CTB/GER)
-- Flujos de coordinación entre módulos para gestión interna.
-- BOD = Bodega · COB = Cobranza · CTB = Contabilidad · GER = Gerencia
-- =============================================================================

create table public.solicitudes_stub (
  id              uuid         primary key default gen_random_uuid(),
  codigo          text         not null unique,

  -- Tipo y origen
  tipo            text         not null
                    check (tipo in ('BOD', 'COB', 'CTB', 'GER')),
  origen_modulo   text         not null
                    check (origen_modulo in ('ventas', 'sac', 'servicios_tecnicos', 'postventa')),
  origen_id       uuid         not null,

  -- Relaciones
  cliente_id      uuid         not null references public.clientes(id),
  venta_id        uuid         null     references public.ventas(id),

  -- Estado del stub
  estado          text         not null default 'PENDIENTE'
                    check (estado in ('PENDIENTE', 'EN_REVISION', 'COMPLETADA', 'RECHAZADA')),

  -- Contenido
  descripcion     text         not null,
  respuesta       text         null,

  -- Asignación
  asignado_a      uuid         null references public.usuarios(id),
  fecha_limite    timestamptz  null,

  -- Auditoría
  created_at      timestamptz  not null default now(),
  updated_at      timestamptz  not null default now(),
  created_by      uuid         null references auth.users(id),
  updated_by      uuid         null references auth.users(id),

  -- Soft delete
  is_deleted      boolean      not null default false,
  deleted_at      timestamptz  null,
  deleted_by      uuid         null references auth.users(id)
);

-- Índices
create index solicitudes_stub_tipo_idx          on public.solicitudes_stub(tipo);
create index solicitudes_stub_estado_idx        on public.solicitudes_stub(estado);
create index solicitudes_stub_cliente_id_idx    on public.solicitudes_stub(cliente_id);
create index solicitudes_stub_venta_id_idx      on public.solicitudes_stub(venta_id);
create index solicitudes_stub_asignado_a_idx    on public.solicitudes_stub(asignado_a);
create index solicitudes_stub_origen_idx        on public.solicitudes_stub(origen_modulo, origen_id);
create index solicitudes_stub_is_deleted_idx    on public.solicitudes_stub(is_deleted);
create index solicitudes_stub_created_at_idx    on public.solicitudes_stub(created_at desc);

-- Trigger updated_at
create trigger trg_solicitudes_stub_updated_at
  before update on public.solicitudes_stub
  for each row execute function update_updated_at();

-- RLS
alter table public.solicitudes_stub enable row level security;

-- El área destinataria ve sus stubs; admin/gerencia ven todos
create policy "area destinataria ve sus stubs"
  on public.solicitudes_stub for select
  using (
    is_deleted = false and (
      -- El asignado ve el suyo
      asignado_a = auth.uid()
      -- El area lee según su rol_funcional y el tipo del stub
      or exists (
        select 1 from public.usuarios u
        where u.id = auth.uid()
          and u.is_deleted = false
          and (
            (tipo = 'BOD' and u.rol_funcional in ('bodega', 'admin', 'gerencia'))
            or (tipo = 'COB' and u.rol_funcional in ('cobranza', 'admin', 'gerencia'))
            or (tipo = 'CTB' and u.rol_funcional in ('contabilidad', 'admin', 'gerencia'))
            or (tipo = 'GER' and u.rol_funcional in ('gerencia', 'admin'))
            or u.rol_funcional = 'admin'
          )
      )
      -- El creador siempre puede ver
      or created_by = auth.uid()
    )
  );

-- Cualquier usuario autenticado puede crear stubs
create policy "usuarios autenticados crean stubs"
  on public.solicitudes_stub for insert
  with check (auth.uid() is not null);

-- El asignado o admin/gerencia puede actualizar
create policy "asignado y admin actualizan stubs"
  on public.solicitudes_stub for update
  using (
    is_deleted = false and (
      asignado_a = auth.uid()
      or created_by = auth.uid()
      or exists (
        select 1 from public.usuarios u
        where u.id = auth.uid()
          and u.rol_funcional in ('admin', 'gerencia')
          and u.is_deleted = false
      )
    )
  );

comment on table public.solicitudes_stub is 'Solicitudes de coordinación inter-área (BOD/COB/CTB/GER). Stub = tarea de un módulo hacia otro área.';
