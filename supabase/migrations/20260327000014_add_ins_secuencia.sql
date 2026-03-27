-- =============================================================================
-- Migración 0014: Agrega secuencia INS (Instalaciones) para stubs
-- =============================================================================

insert into public.secuencias (tipo_entidad, prefijo) values
  ('ins', 'INS')
on conflict (tipo_entidad) do nothing;
