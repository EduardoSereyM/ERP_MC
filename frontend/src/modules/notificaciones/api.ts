import { api } from '@/core/config/api'
import type { ContadorNotificaciones, Notificacion } from './types'

export async function listarNotificaciones(): Promise<Notificacion[]> {
  const { data } = await api.get('/notificaciones')
  return data.data
}

export async function contarNoLeidas(): Promise<ContadorNotificaciones> {
  const { data } = await api.get('/notificaciones/contador')
  return data.data
}

export async function marcarLeida(id: string): Promise<Notificacion> {
  const { data } = await api.post(`/notificaciones/${id}/leer`)
  return data.data
}

export async function marcarTodasLeidas(): Promise<{ marcadas: number }> {
  const { data } = await api.post('/notificaciones/leer-todas')
  return data.data
}
