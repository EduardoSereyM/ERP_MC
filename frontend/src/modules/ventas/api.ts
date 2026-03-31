import { api } from '@/core/config/api'
import type {
  ActividadItem,
  Cotizacion,
  CotizacionCambioEstado,
  CotizacionCreate,
  LineaCotizacionCreate,
  SolicitudStub,
  StubCambioEstado,
  StubCreate,
  Venta,
  VentaCambioEstado,
  VentaCreate,
  VentaListItem,
  VentaUpdate,
} from './types'

export interface ListVentasParams {
  vendedor_id?: string
  cliente_id?: string
  estado?: string
  busqueda?: string
  page?: number
  limit?: number
  orden?: string
  direccion?: 'asc' | 'desc'
}

export interface ListStubsParams {
  tipo?: string
  estado?: string
  cliente_id?: string
  venta_id?: string
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

// ─── Ventas ───────────────────────────────────────────────────────────────────

export async function listarVentas(params: ListVentasParams = {}): Promise<PaginatedResponse<VentaListItem>> {
  const { data } = await api.get('/ventas', { params })
  return data
}

export async function obtenerVenta(id: string): Promise<Venta> {
  const { data } = await api.get<SimpleResponse<Venta>>(`/ventas/${id}`)
  return data.data
}

export async function crearVenta(payload: VentaCreate): Promise<Venta> {
  const { data } = await api.post<SimpleResponse<Venta>>('/ventas', payload)
  return data.data
}

export async function actualizarVenta(id: string, payload: VentaUpdate): Promise<Venta> {
  const { data } = await api.patch<SimpleResponse<Venta>>(`/ventas/${id}`, payload)
  return data.data
}

export async function cambiarEstadoVenta(id: string, payload: VentaCambioEstado): Promise<Venta> {
  const { data } = await api.post<SimpleResponse<Venta>>(`/ventas/${id}/estado`, payload)
  return data.data
}

// ─── Cotizaciones ─────────────────────────────────────────────────────────────

export async function listarCotizaciones(ventaId: string): Promise<Cotizacion[]> {
  const { data } = await api.get<SimpleResponse<Cotizacion[]>>(`/ventas/${ventaId}/cotizaciones`)
  return data.data
}

export interface DescuentoSugerido {
  descuento_pct: number
  motivo: string | null
  mensaje: string | null
}

export async function getDescuentoSugerido(clienteId: string): Promise<DescuentoSugerido> {
  const { data } = await api.get<{ data: DescuentoSugerido }>(`/ventas/descuento-sugerido`, { params: { cliente_id: clienteId } })
  return data.data
}

export async function crearCotizacion(ventaId: string, payload: CotizacionCreate): Promise<Cotizacion> {
  const { data } = await api.post<SimpleResponse<Cotizacion>>(`/ventas/${ventaId}/cotizaciones`, payload)
  return data.data
}

export async function cambiarEstadoCotizacion(cotizacionId: string, payload: CotizacionCambioEstado): Promise<Cotizacion> {
  const { data } = await api.post<SimpleResponse<Cotizacion>>(`/ventas/cotizaciones/${cotizacionId}/estado`, payload)
  return data.data
}

// ─── Líneas de cotización ─────────────────────────────────────────────────────

export interface LineaCotizacionUpdate {
  descripcion?: string
  cantidad?: number
  precio_unitario?: number
  descuento_pct?: number
  orden?: number
}

export async function agregarLinea(cotizacionId: string, payload: LineaCotizacionCreate): Promise<Cotizacion> {
  const { data } = await api.post<SimpleResponse<Cotizacion>>(`/ventas/cotizaciones/${cotizacionId}/lineas`, payload)
  return data.data
}

export async function actualizarLinea(cotizacionId: string, lineaId: string, payload: LineaCotizacionUpdate): Promise<Cotizacion> {
  const { data } = await api.patch<SimpleResponse<Cotizacion>>(`/ventas/cotizaciones/${cotizacionId}/lineas/${lineaId}`, payload)
  return data.data
}

export async function eliminarLinea(cotizacionId: string, lineaId: string): Promise<void> {
  await api.delete(`/ventas/cotizaciones/${cotizacionId}/lineas/${lineaId}`)
}

export async function enviarCotizacionEmail(cotizacionId: string, email: string): Promise<{ ok: boolean; mensaje: string }> {
  const { data } = await api.post(`/ventas/cotizaciones/${cotizacionId}/enviar-email`, { email_destinatario: email })
  return data
}

export async function descargarCotizacionPdf(cotizacionId: string, codigo: string): Promise<void> {
  const response = await api.get(`/ventas/cotizaciones/${cotizacionId}/pdf`, { responseType: 'blob' })
  const url = URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }))
  const a = document.createElement('a')
  a.href = url
  a.download = `${codigo}.pdf`
  a.click()
  URL.revokeObjectURL(url)
}

// ─── Stubs ────────────────────────────────────────────────────────────────────

export async function listarStubs(params: ListStubsParams = {}): Promise<PaginatedResponse<SolicitudStub>> {
  const { data } = await api.get('/stubs', { params })
  return data
}

export async function crearStub(payload: StubCreate): Promise<SolicitudStub> {
  const { data } = await api.post<SimpleResponse<SolicitudStub>>('/stubs', payload)
  return data.data
}

export async function cambiarEstadoStub(stubId: string, payload: StubCambioEstado): Promise<SolicitudStub> {
  const { data } = await api.post<SimpleResponse<SolicitudStub>>(`/stubs/${stubId}/estado`, payload)
  return data.data
}

// ─── Actividad ─────────────────────────────────────────────────────────────────

export async function listarActividadVenta(ventaId: string, limit = 50): Promise<ActividadItem[]> {
  const { data } = await api.get<SimpleResponse<ActividadItem[]>>(`/ventas/${ventaId}/actividad`, { params: { limit } })
  return data.data
}
