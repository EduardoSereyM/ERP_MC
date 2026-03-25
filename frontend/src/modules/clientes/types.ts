export interface Cliente {
  id: string
  codigo: string
  razon_social: string
  rut: string
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
