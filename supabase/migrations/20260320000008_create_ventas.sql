-- =============================================================================
-- Migración 0008: Tablas del módulo Ventas
-- Entidades: ventas, cotizaciones, lineas_cotizacion
-- Máquina de estados VTA: CONSULTA_ABIERTA → COTIZACION_ENVIADA → VENTA_GENERADA → EN_PROCESO → CERRADA
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- Tabla principal: ventas
-- ─────────────────────────────────────────────────────────────────────────────
create table public.ventas (
  id                     uuid          primary key default gen_random_uuid(),
  codigo                 text          not null unique,

  -- Relaciones
  cliente_id             uuid          not null references public.clientes(id),
  vendedor_id            uuid          not null references public.usuarios(id),

  -- Máquina de estados
  estado                 text          not null default 'CONSULTA_ABIERTA'
                           check (estado in (
                             'CONSULTA_ABIERTA',
                             'COTIZACION_ENVIADA',
                             'VENTA_GENERADA',
                             'EN_PROCESO',
                             'CERRADA',
                             'ANULADA'
                           )),

  -- Financiero
  monto_total            numeric(12,2) not null default 0,
  descuento_pct          numeric(5,2)  not null default 0
                           check (descuento_pct >= 0 and descuento_pct <= 100),

  -- Fechas de gestión
  fecha_cierre_esperada  date          null,
  fecha_anulacion        timestamptz   null,
  motivo_anulacion       text          null,

  notas                  text          null,

  -- Auditoría
  created_at             timestamptz   not null default now(),
  updated_at             timestamptz   not null default now(),
  created_by             uuid          null references auth.users(id),
  updated_by             uuid          null references auth.users(id),

  -- Soft delete
  is_deleted             boolean       not null default false,
  deleted_at             timestamptz   null,
  deleted_by             uuid          null references auth.users(id)
);

-- Índices
create index ventas_codigo_idx          on public.ventas(codigo);
create index ventas_cliente_id_idx      on public.ventas(cliente_id);
create index ventas_vendedor_id_idx     on public.ventas(vendedor_id);
create index ventas_estado_idx          on public.ventas(estado);
create index ventas_is_deleted_idx      on public.ventas(is_deleted);
create index ventas_created_at_idx      on public.ventas(created_at desc);

-- Trigger updated_at
create trigger trg_ventas_updated_at
  before update on public.ventas
  for each row execute function update_updated_at();

-- RLS
alter table public.ventas enable row level security;

-- Vendedores ven sus propias ventas; gerencia/admin ven todo
create policy "vendedor ve sus ventas"
  on public.ventas for select
  using (
    is_deleted = false and (
      vendedor_id = auth.uid()
      or exists (
        select 1 from public.usuarios u
        where u.id = auth.uid()
          and u.rol_funcional in ('admin', 'gerencia', 'coordinador_instalaciones', 'contabilidad', 'cobranza')
          and u.is_deleted = false
      )
    )
  );

-- Vendedores pueden crear ventas
create policy "vendedor crea ventas"
  on public.ventas for insert
  with check (
    exists (
      select 1 from public.usuarios u
      where u.id = auth.uid()
        and u.rol_funcional in ('vendedor', 'admin', 'gerencia')
        and u.is_deleted = false
    )
  );

-- Vendedores pueden actualizar sus propias ventas; admin/gerencia pueden todas
create policy "actualizar ventas"
  on public.ventas for update
  using (
    is_deleted = false and (
      vendedor_id = auth.uid()
      or exists (
        select 1 from public.usuarios u
        where u.id = auth.uid()
          and u.rol_funcional in ('admin', 'gerencia')
          and u.is_deleted = false
      )
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- Tabla: cotizaciones
-- ─────────────────────────────────────────────────────────────────────────────
create table public.cotizaciones (
  id                 uuid          primary key default gen_random_uuid(),
  codigo             text          not null unique,

  -- Relaciones
  venta_id           uuid          not null references public.ventas(id) on delete cascade,
  cliente_id         uuid          not null references public.clientes(id),

  -- Estado cotización
  estado             text          not null default 'BORRADOR'
                       check (estado in ('BORRADOR', 'ENVIADA', 'ACEPTADA', 'RECHAZADA', 'VENCIDA')),

  -- Validez
  validez_dias       integer       not null default 30,
  fecha_envio        timestamptz   null,
  fecha_respuesta    timestamptz   null,
  fecha_vencimiento  date          null,

  -- Financiero
  monto_subtotal     numeric(12,2) not null default 0,
  monto_iva          numeric(12,2) not null default 0,
  monto_total        numeric(12,2) not null default 0,

  notas_internas     text          null,
  notas_cliente      text          null,

  -- Auditoría
  created_at         timestamptz   not null default now(),
  updated_at         timestamptz   not null default now(),
  created_by         uuid          null references auth.users(id),
  updated_by         uuid          null references auth.users(id),

  -- Soft delete
  is_deleted         boolean       not null default false,
  deleted_at         timestamptz   null,
  deleted_by         uuid          null references auth.users(id)
);

-- Índices
create index cotizaciones_venta_id_idx     on public.cotizaciones(venta_id);
create index cotizaciones_cliente_id_idx   on public.cotizaciones(cliente_id);
create index cotizaciones_estado_idx       on public.cotizaciones(estado);
create index cotizaciones_is_deleted_idx   on public.cotizaciones(is_deleted);

-- Trigger updated_at
create trigger trg_cotizaciones_updated_at
  before update on public.cotizaciones
  for each row execute function update_updated_at();

-- RLS
alter table public.cotizaciones enable row level security;

create policy "cotizaciones visibilidad igual a ventas"
  on public.cotizaciones for select
  using (
    is_deleted = false and exists (
      select 1 from public.ventas v
      where v.id = venta_id
        and v.is_deleted = false
        and (
          v.vendedor_id = auth.uid()
          or exists (
            select 1 from public.usuarios u
            where u.id = auth.uid()
              and u.rol_funcional in ('admin', 'gerencia', 'coordinador_instalaciones', 'contabilidad', 'cobranza')
              and u.is_deleted = false
          )
        )
    )
  );

create policy "roles comerciales gestionan cotizaciones"
  on public.cotizaciones for all
  using (
    is_deleted = false and exists (
      select 1 from public.usuarios u
      where u.id = auth.uid()
        and u.rol_funcional in ('vendedor', 'admin', 'gerencia')
        and u.is_deleted = false
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- Tabla: lineas_cotizacion
-- ─────────────────────────────────────────────────────────────────────────────
create table public.lineas_cotizacion (
  id               uuid          primary key default gen_random_uuid(),
  cotizacion_id    uuid          not null references public.cotizaciones(id) on delete cascade,
  producto_id      uuid          null references public.productos(id),

  descripcion      text          not null,
  cantidad         numeric(10,3) not null default 1 check (cantidad > 0),
  precio_unitario  numeric(12,2) not null default 0,
  descuento_pct    numeric(5,2)  not null default 0
                     check (descuento_pct >= 0 and descuento_pct <= 100),
  subtotal         numeric(12,2) not null default 0,
  orden            integer       not null default 0,

  -- Auditoría
  created_at       timestamptz   not null default now(),
  updated_at       timestamptz   not null default now(),
  created_by       uuid          null references auth.users(id),
  updated_by       uuid          null references auth.users(id),

  -- Soft delete
  is_deleted       boolean       not null default false,
  deleted_at       timestamptz   null,
  deleted_by       uuid          null references auth.users(id)
);

-- Índices
create index lineas_cotizacion_cotizacion_id_idx on public.lineas_cotizacion(cotizacion_id);
create index lineas_cotizacion_producto_id_idx   on public.lineas_cotizacion(producto_id);
create index lineas_cotizacion_is_deleted_idx    on public.lineas_cotizacion(is_deleted);

-- Trigger updated_at
create trigger trg_lineas_cotizacion_updated_at
  before update on public.lineas_cotizacion
  for each row execute function update_updated_at();

-- RLS
alter table public.lineas_cotizacion enable row level security;

create policy "lineas visibles por roles comerciales"
  on public.lineas_cotizacion for select
  using (
    is_deleted = false and exists (
      select 1 from public.cotizaciones c
      join public.ventas v on v.id = c.venta_id
      where c.id = cotizacion_id
        and c.is_deleted = false
        and v.is_deleted = false
        and (
          v.vendedor_id = auth.uid()
          or exists (
            select 1 from public.usuarios u
            where u.id = auth.uid()
              and u.rol_funcional in ('admin', 'gerencia', 'coordinador_instalaciones', 'contabilidad', 'cobranza')
              and u.is_deleted = false
          )
        )
    )
  );

create policy "roles comerciales gestionan lineas"
  on public.lineas_cotizacion for all
  using (
    is_deleted = false and exists (
      select 1 from public.usuarios u
      where u.id = auth.uid()
        and u.rol_funcional in ('vendedor', 'admin', 'gerencia')
        and u.is_deleted = false
    )
  );

-- Función para recalcular totales de cotización
create or replace function public.recalcular_totales_cotizacion(p_cotizacion_id uuid)
returns void as $$
declare
  v_subtotal numeric(12,2);
  v_iva      numeric(12,2);
begin
  select coalesce(sum(subtotal), 0)
  into   v_subtotal
  from   public.lineas_cotizacion
  where  cotizacion_id = p_cotizacion_id
    and  is_deleted = false;

  v_iva := round(v_subtotal * 0.19, 2);

  update public.cotizaciones
  set    monto_subtotal = v_subtotal,
         monto_iva      = v_iva,
         monto_total    = v_subtotal + v_iva
  where  id = p_cotizacion_id;
end;
$$ language plpgsql security definer;

comment on table public.ventas           is 'Ventas del ERP MC. Máquina de estados: CONSULTA_ABIERTA→COTIZACION_ENVIADA→VENTA_GENERADA→EN_PROCESO→CERRADA.';
comment on table public.cotizaciones     is 'Cotizaciones vinculadas a una venta.';
comment on table public.lineas_cotizacion is 'Líneas de detalle de una cotización (productos o servicios).';
