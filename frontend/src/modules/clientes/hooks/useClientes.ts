import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as clientesApi from '../api'
import { clientesKeys } from '../queryKeys'
import type { Cliente, ClienteCreate, ClienteUpdate } from '../types'
import { useToast } from '@/shared/hooks/useToast'

export function useClientes(params: clientesApi.ListClientesParams = {}) {
  return useQuery({
    queryKey: clientesKeys.list(params as Record<string, unknown>),
    queryFn: () => clientesApi.listarClientes(params),
  })
}

export function useCliente(id: string) {
  return useQuery({
    queryKey: clientesKeys.detail(id),
    queryFn: () => clientesApi.obtenerCliente(id),
    enabled: !!id,
  })
}

export function useCrearCliente() {
  const queryClient = useQueryClient()
  const { success, error } = useToast()
  return useMutation({
    mutationFn: (payload: ClienteCreate) => clientesApi.crearCliente(payload),
    onSuccess: () => {
      success('Cliente creado correctamente')
      queryClient.invalidateQueries({ queryKey: clientesKeys.lists() })
    },
    onError: () => error('Error al crear el cliente'),
  })
}

export function useActualizarCliente(id: string) {
  const queryClient = useQueryClient()
  const { success, error } = useToast()
  return useMutation({
    mutationFn: (payload: ClienteUpdate) => clientesApi.actualizarCliente(id, payload),
    onSuccess: (data) => {
      success('Cliente actualizado')
      // Actualizar el detalle directamente con la respuesta del servidor
      queryClient.setQueryData<Cliente>(clientesKeys.detail(id), data)
      // Invalidar todas las queries de clientes para forzar refetch limpio
      queryClient.invalidateQueries({ queryKey: clientesKeys.all })
    },
    onError: () => error('Error al actualizar el cliente'),
  })
}

export function useEliminarCliente() {
  const queryClient = useQueryClient()
  const { success, error } = useToast()
  return useMutation({
    mutationFn: (id: string) => clientesApi.eliminarCliente(id),
    onSuccess: () => {
      success('Cliente eliminado')
      queryClient.invalidateQueries({ queryKey: clientesKeys.lists() })
    },
    onError: () => error('Error al eliminar el cliente'),
  })
}
