-- Agrega tipo_cliente a la tabla clientes
-- Tipos: residencial, empresa, constructor, inmobiliaria, contratista, distribuidor, vip

ALTER TABLE public.clientes
  ADD COLUMN IF NOT EXISTS tipo_cliente VARCHAR(50);

COMMENT ON COLUMN public.clientes.tipo_cliente IS
  'Clasificación comercial del cliente: residencial, empresa, constructor, inmobiliaria, contratista, distribuidor, vip';
