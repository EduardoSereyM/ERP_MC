import { api } from '@/core/config/api'
import { PRODUCTOS_FAKE } from '@/shared/data/productos-fake'
import type { Categoria, Producto, ProductoCreate, ProductoListItem, ProductoUpdate } from './types'

// ─── Feature flag ──────────────────────────────────────────────────────────────
// true  → usa datos fake locales (backend no requerido)
// false → conecta al backend real (activar en Fase 1F)
const FAKE_MODE = true

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

// ─── Helpers fake ──────────────────────────────────────────────────────────────

function filtrarFake(params: ListProductosParams): PaginatedResponse<ProductoListItem> {
  let items = [...PRODUCTOS_FAKE]

  if (params.activo !== undefined) {
    items = items.filter(p => p.activo === params.activo)
  }
  if (params.busqueda) {
    const q = params.busqueda.toLowerCase()
    items = items.filter(
      p => p.nombre.toLowerCase().includes(q) || p.codigo.toLowerCase().includes(q)
    )
  }

  const limit = params.limit ?? 20
  const page = params.page ?? 1
  const total = items.length
  const total_pages = Math.max(1, Math.ceil(total / limit))
  const start = (page - 1) * limit
  const data = items.slice(start, start + limit)

  return { data, meta: { total, page, limit, total_pages } }
}

// ─── API functions ─────────────────────────────────────────────────────────────

export async function listarCategorias(modulo: string, tipo?: string): Promise<Categoria[]> {
  if (FAKE_MODE) return []
  const { data } = await api.get<SimpleResponse<Categoria[]>>('/productos/categorias', {
    params: { modulo, tipo },
  })
  return data.data
}

export async function listarProductos(
  params: ListProductosParams = {}
): Promise<PaginatedResponse<ProductoListItem>> {
  if (FAKE_MODE) return filtrarFake(params)
  const { data } = await api.get('/productos', { params })
  return data
}

export async function obtenerProducto(id: string): Promise<Producto> {
  if (FAKE_MODE) {
    const found = PRODUCTOS_FAKE.find(p => p.id === id)
    if (!found) throw new Error('Producto no encontrado')
    return { ...found, descripcion: null, categoria_id: null, servicios: [], created_at: '', updated_at: '' }
  }
  const { data } = await api.get<SimpleResponse<Producto>>(`/productos/${id}`)
  return data.data
}

export async function crearProducto(payload: ProductoCreate): Promise<Producto> {
  if (FAKE_MODE) throw new Error('Módulo en construcción — usa datos de prueba')
  const { data } = await api.post<SimpleResponse<Producto>>('/productos', payload)
  return data.data
}

export async function actualizarProducto(id: string, payload: ProductoUpdate): Promise<Producto> {
  if (FAKE_MODE) throw new Error('Módulo en construcción — usa datos de prueba')
  const { data } = await api.patch<SimpleResponse<Producto>>(`/productos/${id}`, payload)
  return data.data
}

export async function eliminarProducto(id: string): Promise<Producto> {
  if (FAKE_MODE) throw new Error('Módulo en construcción — usa datos de prueba')
  const { data } = await api.delete<SimpleResponse<Producto>>(`/productos/${id}`)
  return data.data
}
