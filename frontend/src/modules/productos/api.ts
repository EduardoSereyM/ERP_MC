import { api } from '@/core/config/api'
import type { Categoria, Producto, ProductoCreate, ProductoListItem, ProductoUpdate } from './types'

// ─── Tipos ─────────────────────────────────────────────────────────────────────

export interface ListProductosParams {
  busqueda?: string
  activo?: boolean
  categoria_id?: string
  page?: number
  limit?: number
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

// ─── API functions ─────────────────────────────────────────────────────────────

export async function listarCategorias(modulo: string, tipo?: string): Promise<Categoria[]> {
  const { data } = await api.get<SimpleResponse<Categoria[]>>('/productos/categorias', {
    params: { modulo, tipo },
  })
  return data.data
}

export async function listarProductos(
  params: ListProductosParams = {}
): Promise<PaginatedResponse<ProductoListItem>> {
  const { data } = await api.get('/productos', { params })
  return data
}

export async function obtenerProducto(id: string): Promise<Producto> {
  const { data } = await api.get<SimpleResponse<Producto>>(`/productos/${id}`)
  return data.data
}

export async function crearProducto(payload: ProductoCreate): Promise<Producto> {
  const { data } = await api.post<SimpleResponse<Producto>>('/productos', payload)
  return data.data
}

export async function actualizarProducto(id: string, payload: ProductoUpdate): Promise<Producto> {
  const { data } = await api.patch<SimpleResponse<Producto>>(`/productos/${id}`, payload)
  return data.data
}

export async function eliminarProducto(id: string): Promise<Producto> {
  const { data } = await api.delete<SimpleResponse<Producto>>(`/productos/${id}`)
  return data.data
}
