export type UnidadMedida = 'm2' | 'ml' | 'unidad' | 'kg' | 'hora' | 'otro'

export type TipoProducto = 'PRODUCTO_FISICO' | 'SERVICIO_INSTALACION' | 'SERVICIO_TECNICO' | 'SERVICIO_OTRO'

export const TIPO_PRODUCTO_LABEL: Record<TipoProducto, string> = {
  PRODUCTO_FISICO:       'Producto físico',
  SERVICIO_INSTALACION:  'Servicio de instalación',
  SERVICIO_TECNICO:      'Servicio técnico',
  SERVICIO_OTRO:         'Servicio (otro)',
}

export interface Categoria {
  id: string
  modulo: string
  tipo: string
  nombre: string
  orden: number
  activo: boolean
}

export interface ServicioAsociado {
  id: string
  servicio_nombre: string
  precio_servicio: number
  activo: boolean
}

export interface Producto {
  id: string
  codigo: string
  nombre: string
  descripcion: string | null
  categoria_id: string | null
  precio_base: number
  unidad_medida: UnidadMedida
  tipo_producto: TipoProducto
  requiere_instalacion: boolean
  activo: boolean
  servicios: ServicioAsociado[]
  created_at: string
  updated_at: string
}

export interface ProductoListItem {
  id: string
  codigo: string
  nombre: string
  precio_base: number
  unidad_medida: UnidadMedida
  tipo_producto: TipoProducto
  requiere_instalacion: boolean
  activo: boolean
  /** ID del servicio de instalación vinculado (fake data + futuro backend) */
  servicio_instalacion_id?: string
}

export interface ProductoCreate {
  nombre: string
  descripcion?: string | null
  categoria_id?: string | null
  precio_base?: number
  unidad_medida?: UnidadMedida
  tipo_producto?: TipoProducto
  requiere_instalacion?: boolean
}

export interface ProductoUpdate {
  nombre?: string
  descripcion?: string | null
  categoria_id?: string | null
  precio_base?: number
  unidad_medida?: UnidadMedida
  tipo_producto?: TipoProducto
  requiere_instalacion?: boolean
  activo?: boolean
}
