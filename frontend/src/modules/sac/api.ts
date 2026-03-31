import { api } from '@/core/config/api'
import type {
  ChecklistItem,
  ChecklistRespuestaUpsert,
  ContactoObra,
  ContactoObraCreate,
  OrdenTrabajo,
  OTCambioEstado,
  OTCreate,
  SAC,
  SACCambioEstado,
  SACCreate,
  SACListItem,
  SACUpdate,
} from './types'

export interface ListSACParams {
  estado?: string
  cliente_id?: string
  venta_id?: string
  coordinador_id?: string
  page?: number
  limit?: number
  orden?: string
  direccion?: 'asc' | 'desc'
}

export interface PaginatedResponse<T> {
  data: T[]
  meta: { total: number; page: number; limit: number; total_pages: number }
}

// ─── SAC ─────────────────────────────────────────────────────────────────────

export async function listarSAC(params: ListSACParams = {}): Promise<PaginatedResponse<SACListItem>> {
  const { data } = await api.get('/sac', { params })
  return data
}

export async function obtenerSAC(id: string): Promise<SAC> {
  const { data } = await api.get(`/sac/${id}`)
  return data.data
}

export async function crearSAC(payload: SACCreate): Promise<SAC> {
  const { data } = await api.post('/sac', payload)
  return data.data
}

export async function actualizarSAC(id: string, payload: SACUpdate): Promise<SAC> {
  const { data } = await api.patch(`/sac/${id}`, payload)
  return data.data
}

export async function cambiarEstadoSAC(id: string, payload: SACCambioEstado): Promise<SAC> {
  const { data } = await api.post(`/sac/${id}/estado`, payload)
  return data.data
}

// ─── Contactos ────────────────────────────────────────────────────────────────

export async function listarContactos(sacId: string): Promise<ContactoObra[]> {
  const { data } = await api.get(`/sac/${sacId}/contactos`)
  return data.data
}

export async function crearContacto(sacId: string, payload: ContactoObraCreate): Promise<ContactoObra> {
  const { data } = await api.post(`/sac/${sacId}/contactos`, payload)
  return data.data
}

export async function eliminarContacto(sacId: string, contactoId: string): Promise<void> {
  await api.delete(`/sac/${sacId}/contactos/${contactoId}`)
}

// ─── OTs ─────────────────────────────────────────────────────────────────────

export async function listarOTs(sacId: string): Promise<OrdenTrabajo[]> {
  const { data } = await api.get(`/sac/${sacId}/ots`)
  return data.data
}

export async function crearOT(sacId: string, payload: OTCreate): Promise<OrdenTrabajo> {
  const { data } = await api.post(`/sac/${sacId}/ots`, payload)
  return data.data
}

export async function obtenerOT(id: string): Promise<OrdenTrabajo> {
  const { data } = await api.get(`/ot/${id}`)
  return data.data
}

export async function cambiarEstadoOT(id: string, payload: OTCambioEstado): Promise<OrdenTrabajo> {
  const { data } = await api.post(`/ot/${id}/estado`, payload)
  return data.data
}

// ─── Checklist ───────────────────────────────────────────────────────────────

export async function obtenerChecklistOT(otId: string): Promise<ChecklistItem[]> {
  const { data } = await api.get(`/ot/${otId}/checklist`)
  return data.data
}

export async function guardarRespuestaChecklist(otId: string, payload: ChecklistRespuestaUpsert): Promise<void> {
  await api.post(`/ot/${otId}/checklist`, payload)
}
