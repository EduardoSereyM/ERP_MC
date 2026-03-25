import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { login, logout } from '../api'
import { authKeys } from '../queryKeys'
import type { LoginPayload } from '../types'

export const useAuth = () => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const iniciarSesion = useCallback(async (payload: LoginPayload) => {
    const data = await login(payload)
    return data
  }, [])

  const cerrarSesion = useCallback(async () => {
    await logout()
    queryClient.removeQueries({ queryKey: authKeys.all })
    navigate('/login', { replace: true })
  }, [navigate, queryClient])

  return { iniciarSesion, cerrarSesion }
}
