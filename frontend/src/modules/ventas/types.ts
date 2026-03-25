export type EstadoVenta =
  | 'CONSULTA_ABIERTA'
  | 'COTIZACION_ENVIADA'
  | 'VENTA_GENERADA'
  | 'EN_PROCESO'
  | 'CERRADA'
  | 'ANULADA'

export type EstadoCotizacion = 'BORRADOR' | 'ENVIADA' | 'ACEPTADA' | 'RECHAZADA' | 'VENCIDA'

export type TipoStub = 'BOD' | 'COB' | 'CTB' | 'GER'

export type EstadoStub = 'PENDIENTE' | 'EN_REVISION' | 'COMPLETADA' | 'RECHAZADA'

export type OrigenModulo = 'ventas' | 'sac' | 'servicios_tecnicos' | 'postventa'

// ─── Venta ────────────────────────────────────────────────────────────────────

export interface Venta {
  id: string
  codigo: string
  cliente_id: string
  vendedor_id: string
  estado: EstadoVenta
  monto_total: number
  descuento_pct: number
  fecha_cierre_esperada: string | null
  fecha_anulacion: string | null
  motivo_anulacion: string | null
  notas: string | null
  created_at: string
  updated_at: string
}

export interface VentaListItem {
  id: string
  codigo: string
  cliente_id: string
  vendedor_id: string
  estado: EstadoVenta
  monto_total: number
  descuento_pct: number
  fecha_cierre_esperada: string | null
  created_at: string
}

export interface VentaCreate {
  cliente_id: string
  notas?: string | null
}

export interface VentaUpdate {
  fecha_cierre_esperada?: string | null
  descuento_pct?: number
  notas?: string | null
}

export interface VentaCambioEstado {
  estado: EstadoVenta
  motivo_anulacion?: string | null
}

// ─── Cotización ───────────────────────────────────────────────────────────────

export interface LineaCotizacion {
  id: string
  cotizacion_id: string
  producto_id: string | null
  descripcion: string
  cantidad: number
  precio_unitario: number
  descuento_pct: number
  subtotal: number
  orden: number
  /** Unidad de medida heredada del producto — solo frontend */
  unidad_medida?: string
}

export interface LineaCotizacionCreate {
  producto_id?: string | null
  descripcion: string
  cantidad?: number
  precio_unitario?: number
  descuento_pct?: number
  orden?: number
  /** Unidad de medida — se usa para display, el backend la ignora hasta Fase 1F */
  unidad_medida?: string
}

export interface Cotizacion {
  id: string
  codigo: string
  venta_id: string
  cliente_id: string
  estado: EstadoCotizacion
  validez_dias: number
  fecha_envio: string | null
  fecha_respuesta: string | null
  fecha_vencimiento: string | null
  monto_subtotal: number
  monto_iva: number
  monto_total: number
  notas_internas: string | null
  notas_cliente: string | null
  lineas: LineaCotizacion[]
  created_at: string
  updated_at: string
  /** Descuento global sobre el subtotal — por cliente, campaña, etc. (pendiente backend) */
  descuento_global_pct?: number
  /** Si requiere visita de técnico para cubicación (pendiente backend) */
  requiere_cubicacion?: boolean
}

export interface CotizacionCreate {
  validez_dias?: number
  notas_internas?: string | null
  notas_cliente?: string | null
  lineas?: LineaCotizacionCreate[]
  /** Descuento global — el backend lo ignorará hasta Fase 1F */
  descuento_global_pct?: number
  /** Si se requiere visita de cubicación — genera línea automática en frontend */
  requiere_cubicacion?: boolean
}

export interface CotizacionCambioEstado {
  estado: EstadoCotizacion
}

// ─── Stub ─────────────────────────────────────────────────────────────────────

export interface SolicitudStub {
  id: string
  codigo: string
  tipo: TipoStub
  origen_modulo: OrigenModulo
  origen_id: string
  cliente_id: string
  venta_id: string | null
  estado: EstadoStub
  descripcion: string
  respuesta: string | null
  asignado_a: string | null
  fecha_limite: string | null
  created_at: string
  updated_at: string
}

export interface StubCreate {
  tipo: TipoStub
  origen_modulo: OrigenModulo
  origen_id: string
  cliente_id: string
  venta_id?: string | null
  descripcion: string
  fecha_limite?: string | null
}

export interface StubCambioEstado {
  estado: EstadoStub
  respuesta?: string | null
}

// ─── Labels para UI ───────────────────────────────────────────────────────────

export const ESTADO_VENTA_LABEL: Record<EstadoVenta, string> = {
  CONSULTA_ABIERTA:  'Consulta abierta',
  COTIZACION_ENVIADA: 'Cotización enviada',
  VENTA_GENERADA:    'Venta generada',
  EN_PROCESO:        'En proceso',
  CERRADA:           'Cerrada',
  ANULADA:           'Anulada',
}

export const ESTADO_COTIZACION_LABEL: Record<EstadoCotizacion, string> = {
  BORRADOR:  'Borrador',
  ENVIADA:   'Enviada',
  ACEPTADA:  'Aceptada',
  RECHAZADA: 'Rechazada',
  VENCIDA:   'Vencida',
}

export const ESTADO_STUB_LABEL: Record<EstadoStub, string> = {
  PENDIENTE:   'Pendiente',
  EN_REVISION: 'En revisión',
  COMPLETADA:  'Completada',
  RECHAZADA:   'Rechazada',
}

/** Transiciones válidas desde cada estado */
export const TRANSICIONES_VENTA: Record<EstadoVenta, EstadoVenta[]> = {
  CONSULTA_ABIERTA:   ['COTIZACION_ENVIADA', 'ANULADA'],
  COTIZACION_ENVIADA: ['VENTA_GENERADA', 'CONSULTA_ABIERTA', 'ANULADA'],
  VENTA_GENERADA:     ['EN_PROCESO', 'ANULADA'],
  EN_PROCESO:         ['CERRADA', 'ANULADA'],
  CERRADA:            [],
  ANULADA:            [],
}
