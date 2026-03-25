import { api } from '@/core/config/api'
import { supabase } from '@/core/config/supabase'
import type { LoginPayload, Usuario } from './types'

export const login = async ({ email, password }: LoginPayload) => {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  return data
}

export const logout = async () => {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export const getMe = async (): Promise<Usuario> => {
  const { data } = await api.get<{ data: Usuario }>('/auth/me')
  return data.data
}

export const refreshToken = async () => {
  const { data, error } = await supabase.auth.refreshSession()
  if (error) throw error
  return data
}
