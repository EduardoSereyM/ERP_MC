import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as ventasApi from '../api'
import { ventasKeys, stubsKeys } from '../queryKeys'
import type {
  CotizacionCambioEstado,
  CotizacionCreate,
  LineaCotizacionCreate,
  StubCambioEstado,
  StubCreate,
  VentaCambioEstado,
  VentaCreate,
  VentaUpdate,
} from '../types'
import type { LineaCotizacionUpdate } from '../api'
import { useToast } from '@/shared/hooks/useToast'

// ─── Ventas ───────────────────────────────────────────────────────────────────

export function useVentas(params: ventasApi.ListVentasParams = {}) {
  return useQuery({
    queryKey: ventasKeys.list(params as Record<string, unknown>),
    queryFn: () => ventasApi.listarVentas(params),
  })
}

export function useVenta(id: string) {
  return useQuery({
    queryKey: ventasKeys.detail(id),
    queryFn: () => ventasApi.obtenerVenta(id),
    enabled: !!id,
  })
}

export function useCrearVenta() {
  const queryClient = useQueryClient()
  const { success, error } = useToast()
  return useMutation({
    mutationFn: (payload: VentaCreate) => ventasApi.crearVenta(payload),
    onSuccess: () => {
      success('Venta creada correctamente')
      queryClient.invalidateQueries({ queryKey: ventasKeys.lists() })
    },
    onError: () => error('Error al crear la venta'),
  })
}

export function useActualizarVenta(id: string) {
  const queryClient = useQueryClient()
  const { success, error } = useToast()
  return useMutation({
    mutationFn: (payload: VentaUpdate) => ventasApi.actualizarVenta(id, payload),
    onSuccess: (data) => {
      success('Venta actualizada correctamente')
      queryClient.invalidateQueries({ queryKey: ventasKeys.lists() })
      queryClient.setQueryData(ventasKeys.detail(id), data)
    },
    onError: () => error('Error al actualizar la venta'),
  })
}

export function useCambiarEstadoVenta(id: string) {
  const queryClient = useQueryClient()
  const { success, error } = useToast()
  return useMutation({
    mutationFn: (payload: VentaCambioEstado) => ventasApi.cambiarEstadoVenta(id, payload),
    onSuccess: (data) => {
      success('Estado de venta actualizado')
      queryClient.setQueryData(ventasKeys.detail(id), data)
      queryClient.invalidateQueries({ queryKey: ventasKeys.lists() })
    },
    onError: () => error('Error al cambiar estado'),
  })
}

// ─── Cotizaciones ─────────────────────────────────────────────────────────────

export function useCotizaciones(ventaId: string) {
  return useQuery({
    queryKey: ventasKeys.cotizaciones(ventaId),
    queryFn: () => ventasApi.listarCotizaciones(ventaId),
    enabled: !!ventaId,
  })
}

export function useCrearCotizacion(ventaId: string) {
  const queryClient = useQueryClient()
  const { success, error } = useToast()
  return useMutation({
    mutationFn: (payload: CotizacionCreate) => ventasApi.crearCotizacion(ventaId, payload),
    onSuccess: () => {
      success('Cotización creada')
      queryClient.invalidateQueries({ queryKey: ventasKeys.cotizaciones(ventaId) })
      queryClient.invalidateQueries({ queryKey: ventasKeys.detail(ventaId) })
    },
    onError: () => error('Error al crear la cotización'),
  })
}

export function useCambiarEstadoCotizacion(ventaId: string) {
  const queryClient = useQueryClient()
  const { success, error } = useToast()
  return useMutation({
    mutationFn: ({ cotizacionId, payload }: { cotizacionId: string; payload: CotizacionCambioEstado }) =>
      ventasApi.cambiarEstadoCotizacion(cotizacionId, payload),
    onSuccess: () => {
      success('Estado de cotización actualizado')
      queryClient.invalidateQueries({ queryKey: ventasKeys.cotizaciones(ventaId) })
    },
    onError: () => error('Error al cambiar estado de la cotización'),
  })
}

// ─── Líneas de cotización ─────────────────────────────────────────────────────

export function useAgregarLinea(ventaId: string, cotizacionId: string) {
  const queryClient = useQueryClient()
  const { success, error } = useToast()
  return useMutation({
    mutationFn: (payload: LineaCotizacionCreate) => ventasApi.agregarLinea(cotizacionId, payload),
    onSuccess: () => {
      success('Línea agregada')
      queryClient.invalidateQueries({ queryKey: ventasKeys.cotizaciones(ventaId) })
    },
    onError: () => error('Error al agregar la línea'),
  })
}

export function useActualizarLinea(ventaId: string, cotizacionId: string) {
  const queryClient = useQueryClient()
  const { success, error } = useToast()
  return useMutation({
    mutationFn: ({ lineaId, payload }: { lineaId: string; payload: LineaCotizacionUpdate }) =>
      ventasApi.actualizarLinea(cotizacionId, lineaId, payload),
    onSuccess: () => {
      success('Línea actualizada')
      queryClient.invalidateQueries({ queryKey: ventasKeys.cotizaciones(ventaId) })
    },
    onError: () => error('Error al actualizar la línea'),
  })
}

export function useEliminarLinea(ventaId: string, cotizacionId: string) {
  const queryClient = useQueryClient()
  const { success, error } = useToast()
  return useMutation({
    mutationFn: (lineaId: string) => ventasApi.eliminarLinea(cotizacionId, lineaId),
    onSuccess: () => {
      success('Línea eliminada')
      queryClient.invalidateQueries({ queryKey: ventasKeys.cotizaciones(ventaId) })
    },
    onError: () => error('Error al eliminar la línea'),
  })
}

// ─── Stubs ────────────────────────────────────────────────────────────────────

export function useStubs(params: ventasApi.ListStubsParams = {}) {
  return useQuery({
    queryKey: stubsKeys.list(params as Record<string, unknown>),
    queryFn: () => ventasApi.listarStubs(params),
  })
}

export function useCrearStub() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: StubCreate) => ventasApi.crearStub(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: stubsKeys.lists() })
    },
  })
}

export function useCambiarEstadoStub() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ stubId, payload }: { stubId: string; payload: StubCambioEstado }) =>
      ventasApi.cambiarEstadoStub(stubId, payload),
    onSuccess: (_, { stubId }) => {
      queryClient.invalidateQueries({ queryKey: stubsKeys.lists() })
      queryClient.invalidateQueries({ queryKey: stubsKeys.detail(stubId) })
    },
  })
}
