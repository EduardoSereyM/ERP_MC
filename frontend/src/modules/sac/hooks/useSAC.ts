import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  actualizarSAC,
  cambiarEstadoSAC,
  cambiarEstadoOT,
  crearContacto,
  crearOT,
  crearSAC,
  eliminarContacto,
  guardarRespuestaChecklist,
  listarContactos,
  listarOTs,
  listarSAC,
  obtenerChecklistOT,
  obtenerSAC,
  type ListSACParams,
} from '../api'

const KEYS = {
  lista:    (p: ListSACParams) => ['sac', 'lista', p] as const,
  detalle:  (id: string)       => ['sac', id]         as const,
  contactos:(id: string)       => ['sac', id, 'contactos'] as const,
  ots:      (id: string)       => ['sac', id, 'ots']   as const,
  checklist:(id: string)       => ['ot', id, 'checklist'] as const,
}

export function useSACList(params: ListSACParams = {}) {
  return useQuery({
    queryKey: KEYS.lista(params),
    queryFn: () => listarSAC(params),
    staleTime: 30_000,
  })
}

export function useSAC(id: string) {
  return useQuery({
    queryKey: KEYS.detalle(id),
    queryFn: () => obtenerSAC(id),
    enabled: !!id,
    staleTime: 20_000,
  })
}

export function useCrearSAC() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: crearSAC,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sac'] }),
  })
}

export function useActualizarSAC(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: Parameters<typeof actualizarSAC>[1]) => actualizarSAC(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.detalle(id) })
      qc.invalidateQueries({ queryKey: ['sac', 'lista'] })
    },
  })
}

export function useCambiarEstadoSAC(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: Parameters<typeof cambiarEstadoSAC>[1]) => cambiarEstadoSAC(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.detalle(id) })
      qc.invalidateQueries({ queryKey: ['sac', 'lista'] })
    },
  })
}

// ─── Contactos ────────────────────────────────────────────────────────────────

export function useContactos(sacId: string) {
  return useQuery({
    queryKey: KEYS.contactos(sacId),
    queryFn: () => listarContactos(sacId),
    enabled: !!sacId,
  })
}

export function useCrearContacto(sacId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: Parameters<typeof crearContacto>[1]) => crearContacto(sacId, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.contactos(sacId) }),
  })
}

export function useEliminarContacto(sacId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (contactoId: string) => eliminarContacto(sacId, contactoId),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.contactos(sacId) }),
  })
}

// ─── OTs ─────────────────────────────────────────────────────────────────────

export function useOTs(sacId: string) {
  return useQuery({
    queryKey: KEYS.ots(sacId),
    queryFn: () => listarOTs(sacId),
    enabled: !!sacId,
  })
}

export function useCrearOT(sacId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: Parameters<typeof crearOT>[1]) => crearOT(sacId, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.ots(sacId) })
      qc.invalidateQueries({ queryKey: KEYS.detalle(sacId) })
    },
  })
}

export function useCambiarEstadoOT(otId: string, sacId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: Parameters<typeof cambiarEstadoOT>[1]) => cambiarEstadoOT(otId, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.ots(sacId) })
      qc.invalidateQueries({ queryKey: KEYS.detalle(sacId) })
    },
  })
}

// ─── Checklist ───────────────────────────────────────────────────────────────

export function useChecklistOT(otId: string) {
  return useQuery({
    queryKey: KEYS.checklist(otId),
    queryFn: () => obtenerChecklistOT(otId),
    enabled: !!otId,
  })
}

export function useGuardarRespuesta(otId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: Parameters<typeof guardarRespuestaChecklist>[1]) =>
      guardarRespuestaChecklist(otId, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.checklist(otId) }),
  })
}
