export type TipoCliente =
  | 'residencial'
  | 'empresa'
  | 'constructor'
  | 'inmobiliaria'
  | 'contratista'
  | 'distribuidor'
  | 'vip'

export const TIPO_CLIENTE_LABEL: Record<TipoCliente, string> = {
  residencial:  'Residencial',
  empresa:      'Empresa',
  constructor:  'Constructor',
  inmobiliaria: 'Inmobiliaria',
  contratista:  'Contratista',
  distribuidor: 'Distribuidor',
  vip:          'VIP',
}

export const TIPO_CLIENTE_COLOR: Record<TipoCliente, string> = {
  residencial:  'bg-gray-100 text-gray-700',
  empresa:      'bg-blue-100 text-blue-700',
  constructor:  'bg-orange-100 text-orange-700',
  inmobiliaria: 'bg-purple-100 text-purple-700',
  contratista:  'bg-yellow-100 text-yellow-700',
  distribuidor: 'bg-emerald-100 text-emerald-700',
  vip:          'bg-amber-100 text-amber-800',
}

export interface Cliente {
  id: string
  codigo: string
  razon_social: string
  rut: string
  tipo_cliente: TipoCliente | null
  email: string | null
  telefono: string | null
  direccion: string | null
  comuna: string | null
  ciudad: string | null
  region: string | null
  contacto_nombre: string | null
  contacto_email: string | null
  contacto_telefono: string | null
  notas: string | null
  activo: boolean
  created_at: string
  updated_at: string
}

export interface ClienteListItem {
  id: string
  codigo: string
  razon_social: string
  rut: string
  tipo_cliente: TipoCliente | null
  email: string | null
  telefono: string | null
  direccion: string | null
  comuna: string | null
  ciudad: string | null
  region: string | null
  contacto_nombre: string | null
  contacto_email: string | null
  contacto_telefono: string | null
  activo: boolean
  created_at: string
}

export interface ClienteCreate {
  razon_social: string
  rut: string
  tipo_cliente?: TipoCliente | null
  email?: string | null
  telefono?: string | null
  direccion?: string | null
  comuna?: string | null
  ciudad?: string | null
  region?: string | null
  contacto_nombre?: string | null
  contacto_email?: string | null
  contacto_telefono?: string | null
  notas?: string | null
}

export interface ClienteUpdate {
  razon_social?: string
  tipo_cliente?: TipoCliente | null
  email?: string | null
  telefono?: string | null
  direccion?: string | null
  comuna?: string | null
  ciudad?: string | null
  region?: string | null
  contacto_nombre?: string | null
  contacto_email?: string | null
  contacto_telefono?: string | null
  notas?: string | null
  activo?: boolean
}
