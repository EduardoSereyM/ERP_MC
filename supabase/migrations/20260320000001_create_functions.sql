-- =============================================================================
-- Migración 0001: Funciones y triggers base
-- DEBE ejecutarse antes que cualquier otra migración que cree tablas.
-- =============================================================================

-- Función update_updated_at — usada por todas las tablas
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;
