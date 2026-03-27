-- Agrega campo `tipo` (tipo de venta) y `fecha_cierre` (cierre real) a la tabla ventas.
-- tipo:         suministro | suministro_instalacion | solo_instalacion
-- fecha_cierre: timestamptz poblado automáticamente al transicionar a CERRADA

alter table public.ventas
  add column tipo text not null default 'suministro'
    check (tipo in ('suministro', 'suministro_instalacion', 'solo_instalacion')),
  add column fecha_cierre timestamptz null;

create index ventas_tipo_idx on public.ventas(tipo);
