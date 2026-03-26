import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as productosApi from '../api'
import { productosKeys } from '../queryKeys'
import type { ProductoCreate, ProductoUpdate } from '../types'
import { useToast } from '@/shared/hooks/useToast'

export function useCategorias(modulo: string, tipo?: string) {
  return useQuery({
    queryKey: productosKeys.categorias(modulo, tipo),
    queryFn: () => productosApi.listarCategorias(modulo, tipo),
    staleTime: 10 * 60 * 1000, // 10 min — catálogos cambian poco
  })
}

export function useProductos(params: productosApi.ListProductosParams = {}) {
  return useQuery({
    queryKey: productosKeys.list(params as Record<string, unknown>),
    queryFn: () => productosApi.listarProductos(params),
  })
}

export function useProducto(id: string) {
  return useQuery({
    queryKey: productosKeys.detail(id),
    queryFn: () => productosApi.obtenerProducto(id),
    enabled: !!id,
  })
}

export function useCrearProducto() {
  const queryClient = useQueryClient()
  const { success, error } = useToast()
  return useMutation({
    mutationFn: (payload: ProductoCreate) => productosApi.crearProducto(payload),
    onSuccess: () => {
      success('Producto creado correctamente')
      queryClient.invalidateQueries({ queryKey: productosKeys.lists() })
    },
    onError: () => error('Error al crear el producto'),
  })
}

export function useActualizarProducto(id: string) {
  const queryClient = useQueryClient()
  const { success, error } = useToast()
  return useMutation({
    mutationFn: (payload: ProductoUpdate) => productosApi.actualizarProducto(id, payload),
    onSuccess: (data) => {
      success('Producto actualizado')
      queryClient.invalidateQueries({ queryKey: productosKeys.lists() })
      queryClient.setQueryData(productosKeys.detail(id), data)
    },
    onError: () => error('Error al actualizar el producto'),
  })
}

export function useEliminarProducto() {
  const queryClient = useQueryClient()
  const { success, error } = useToast()
  return useMutation({
    mutationFn: (id: string) => productosApi.eliminarProducto(id),
    onSuccess: () => {
      success('Producto eliminado')
      queryClient.invalidateQueries({ queryKey: productosKeys.lists() })
    },
    onError: () => error('Error al eliminar el producto'),
  })
}
