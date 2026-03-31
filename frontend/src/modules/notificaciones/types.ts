export interface Notificacion {
  id: string
  user_id: string
  tipo: string
  titulo: string
  mensaje: string | null
  leida: boolean
  entity_type: string | null
  entity_id: string | null
  created_at: string
}

export interface ContadorNotificaciones {
  no_leidas: number
}
