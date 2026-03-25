import { api } from '@/core/config/api'
import type { Cliente, ClienteCreate, ClienteListItem, ClienteUpdate } from './types'

export interface ListClientesParams {
  busqueda?: string
  activo?: boolean
  page?: number
  limit?: number
  orden?: string
  direccion?: 'asc' | 'desc'
}

export interface PaginatedResponse<T> {
  data: T[]
  meta: {
    total: number
    page: number
    limit: number
    total_pages: number
  }
}

export interface SimpleResponse<T> {
  data: T
}

export async function listarClientes(params: ListClientesParams = {}): Promise<PaginatedResponse<ClienteListItem>> {
  const { data } = await api.get('/clientes', { params })
  return data
}

export async function obtenerCliente(id: string): Promise<Cliente> {
  const { data } = await api.get<SimpleResponse<Cliente>>(`/clientes/${id}`)
  return data.data
}

export async function crearCliente(payload: ClienteCreate): Promise<Cliente> {
  const { data } = await api.post<SimpleResponse<Cliente>>('/clientes', payload)
  return data.data
}

export async function actualizarCliente(id: string, payload: ClienteUpdate): Promise<Cliente> {
  const { data } = await api.patch<SimpleResponse<Cliente>>(`/clientes/${id}`, payload)
  return data.data
}

export async function eliminarCliente(id: string): Promise<Cliente> {
  const { data } = await api.delete<SimpleResponse<Cliente>>(`/clientes/${id}`)
  return data.data
}
