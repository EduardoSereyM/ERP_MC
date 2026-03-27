import clsx from 'clsx'
import type { EstadoCotizacion, EstadoVenta } from '../types'

type EstadoTipo = EstadoVenta | EstadoCotizacion

const BADGE_STYLES: Record<string, string> = {
  // Venta
  CONSULTA_ABIERTA:   'bg-sky-100 text-sky-800 border-sky-200',
  COTIZACION_ENVIADA: 'bg-amber-100 text-amber-800 border-amber-200',
  VENTA_GENERADA:     'bg-violet-100 text-violet-800 border-violet-200',
  CERRADA:            'bg-emerald-100 text-emerald-800 border-emerald-200',
  ANULADA:            'bg-rose-100 text-rose-800 border-rose-200',
  // Cotización
  BORRADOR:   'bg-slate-100 text-slate-700 border-slate-200',
  ENVIADA:    'bg-amber-100 text-amber-800 border-amber-200',
  ACEPTADA:   'bg-emerald-100 text-emerald-800 border-emerald-200',
  RECHAZADA:  'bg-rose-100 text-rose-800 border-rose-200',
  VENCIDA:    'bg-orange-100 text-orange-800 border-orange-200',
}

const LABELS: Record<string, string> = {
  CONSULTA_ABIERTA:   'Consulta abierta',
  COTIZACION_ENVIADA: 'Cotización enviada',
  VENTA_GENERADA:     'Venta generada',
  CERRADA:            'Cerrada',
  ANULADA:            'Anulada',
  BORRADOR:   'Borrador',
  ENVIADA:    'Enviada',
  ACEPTADA:   'Aceptada',
  RECHAZADA:  'Rechazada',
  VENCIDA:    'Vencida',
}

interface EstadoBadgeProps {
  estado: EstadoTipo
  size?: 'sm' | 'md'
}

export const EstadoBadge = ({ estado, size = 'md' }: EstadoBadgeProps) => (
  <span
    className={clsx(
      'inline-flex items-center rounded-full border font-medium',
      size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs',
      BADGE_STYLES[estado] ?? 'bg-slate-100 text-slate-700 border-slate-200',
    )}
  >
    {LABELS[estado] ?? estado}
  </span>
)
