import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  contarNoLeidas,
  listarNotificaciones,
  marcarLeida,
  marcarTodasLeidas,
} from '../api'

const KEYS = {
  contador: ['notificaciones', 'contador'] as const,
  lista:    ['notificaciones', 'lista']    as const,
}

/** Polling cada 30s para el badge del topbar */
export function useContadorNotificaciones() {
  return useQuery({
    queryKey: KEYS.contador,
    queryFn: contarNoLeidas,
    refetchInterval: 30_000,
    staleTime: 20_000,
  })
}

export function useNotificaciones() {
  return useQuery({
    queryKey: KEYS.lista,
    queryFn: listarNotificaciones,
    staleTime: 15_000,
  })
}

export function useMarcarLeida() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: marcarLeida,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.contador })
      qc.invalidateQueries({ queryKey: KEYS.lista })
    },
  })
}

export function useMarcarTodasLeidas() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: marcarTodasLeidas,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.contador })
      qc.invalidateQueries({ queryKey: KEYS.lista })
    },
  })
}
