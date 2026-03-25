import { useState, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '@/core/config/supabase'
import { getMe } from '../api'
import { authKeys } from '../queryKeys'

export const useSession = () => {
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const queryClient = useQueryClient()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setIsLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (!session) {
        queryClient.removeQueries({ queryKey: authKeys.all })
      }
    })

    return () => subscription.unsubscribe()
  }, [queryClient])

  const { data: usuario, isLoading: isLoadingUsuario } = useQuery({
    queryKey: authKeys.me(),
    queryFn: getMe,
    enabled: !!session,
    staleTime: 1000 * 60 * 10, // 10 minutos
  })

  return {
    session,
    usuario,
    isLoading: isLoading || (!!session && isLoadingUsuario),
  }
}
