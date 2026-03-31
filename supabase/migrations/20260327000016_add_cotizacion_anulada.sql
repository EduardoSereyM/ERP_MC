-- Agrega soporte para anular cotizaciones en estado BORRADOR
-- Agrega motivo_anulacion y fecha_anulacion a cotizaciones

ALTER TABLE public.cotizaciones
  ADD COLUMN IF NOT EXISTS motivo_anulacion TEXT,
  ADD COLUMN IF NOT EXISTS fecha_anulacion TIMESTAMPTZ;

COMMENT ON COLUMN public.cotizaciones.motivo_anulacion IS
  'Motivo de anulación (obligatorio al pasar a estado ANULADA)';
COMMENT ON COLUMN public.cotizaciones.fecha_anulacion IS
  'Timestamp en que se anuló la cotización';
