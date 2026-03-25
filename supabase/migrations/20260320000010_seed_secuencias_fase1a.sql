-- =============================================================================
-- Migración 0010: Seed de secuencias para entidades Fase 1A
-- Agrega los tipos: cotizacion (COT), cliente (CLI), producto (PRD)
-- =============================================================================

insert into public.secuencias (tipo_entidad, prefijo) values
  ('cotizacion', 'COT'),
  ('cliente',    'CLI'),
  ('producto',   'PRD')
on conflict (tipo_entidad) do nothing;

comment on table public.secuencias is 'Secuencias para códigos correlativos legibles (VTA-000001, COT-000001, etc.)';
