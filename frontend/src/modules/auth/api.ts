import { api } from '@/core/config/api'
import { supabase } from '@/core/config/supabase'
import type { LoginPayload, Usuario } from './types'

interface TokenResponse {
  access_token: string
  refresh_token: string
  expires_in: number
  token_type: string
}

interface SimpleResponse<T> {
  data: T
}

export const login = async ({ email, password }: LoginPayload) => {
  // Login vía FastAPI proxy → verifica usuario activo + audit log
  const { data } = await api.post<SimpleResponse<TokenResponse>>('/auth/login', { email, password })
  const tokens = data.data

  // Inyectar tokens en el cliente Supabase para mantener sesión sincronizada
  const { error } = await supabase.auth.setSession({
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
  })
  if (error) throw error

  return tokens
}

export const logout = async () => {
  // Notificar a FastAPI para audit log (ignora errores — el signOut local siempre debe ocurrir)
  try {
    await api.post('/auth/logout')
  } catch {
    // No bloquear logout si el backend falla
  }
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export const getMe = async (): Promise<Usuario> => {
  const { data } = await api.get<SimpleResponse<Usuario>>('/auth/me')
  return data.data
}

export const refreshToken = async () => {
  // Obtener refresh token actual de Supabase
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.refresh_token) throw new Error('No hay sesión activa')

  // Refrescar vía FastAPI proxy → verifica usuario activo
  const { data } = await api.post<SimpleResponse<TokenResponse>>('/auth/refresh', {
    refresh_token: session.refresh_token,
  })
  const tokens = data.data

  // Actualizar tokens en el cliente Supabase
  const { error } = await supabase.auth.setSession({
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
  })
  if (error) throw error

  return tokens
}
