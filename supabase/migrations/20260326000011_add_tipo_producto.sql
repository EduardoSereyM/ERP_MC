-- =============================================================================
-- Migración 0011: Agregar tipo_producto a productos
-- Permite distinguir producto físico (BOD), servicio instalación (SAC/Fase 1B),
-- servicio técnico (ST/Fase 1C) y servicios varios.
-- =============================================================================

alter table public.productos
  add column tipo_producto text not null default 'PRODUCTO_FISICO'
    check (tipo_producto in ('PRODUCTO_FISICO', 'SERVICIO_INSTALACION', 'SERVICIO_TECNICO', 'SERVICIO_OTRO'));

comment on column public.productos.tipo_producto is
  'Clasificación del producto: PRODUCTO_FISICO genera stub BOD al confirmar venta, '
  'SERVICIO_INSTALACION generará SAC (Fase 1B), SERVICIO_TECNICO generará ST (Fase 1C).';

create index productos_tipo_producto_idx on public.productos(tipo_producto);
