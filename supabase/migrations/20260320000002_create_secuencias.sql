-- =============================================================================
-- Migración 0002: Tabla de secuencias para códigos correlativos
-- Formato: PREFIJO-000001 con SELECT ... FOR UPDATE atómico
-- =============================================================================

create table public.secuencias (
  id            uuid         primary key default gen_random_uuid(),
  tipo_entidad  text         not null unique,
  prefijo       text         not null,
  ultimo_valor  integer      not null default 0,
  updated_at    timestamptz  not null default now()
);

-- Seed: un registro por tipo de entidad del sistema mc_v3
insert into public.secuencias (tipo_entidad, prefijo) values
  ('venta',      'VTA'),
  ('sac',        'INS'),
  ('ot',         'OT'),
  ('st',         'ST'),
  ('pvr',        'PVR'),
  ('pvc',        'PVC'),
  ('bod',        'BOD'),
  ('cob',        'COB'),
  ('ctb',        'CTB'),
  ('ger',        'GER'),
  ('inc',        'INC');

-- Función para obtener el próximo código correlativo de forma atómica
create or replace function siguiente_codigo(p_tipo_entidad text)
returns text as $$
declare
  v_prefijo      text;
  v_ultimo_valor integer;
begin
  select prefijo, ultimo_valor + 1
  into   v_prefijo, v_ultimo_valor
  from   public.secuencias
  where  tipo_entidad = p_tipo_entidad
  for    update;

  if not found then
    raise exception 'Tipo de entidad no encontrado: %', p_tipo_entidad;
  end if;

  update public.secuencias
  set    ultimo_valor = v_ultimo_valor,
         updated_at   = now()
  where  tipo_entidad = p_tipo_entidad;

  return v_prefijo || '-' || lpad(v_ultimo_valor::text, 6, '0');
end;
$$ language plpgsql;

comment on table public.secuencias is 'Secuencias para códigos correlativos legibles (VTA-000001, etc.)';
