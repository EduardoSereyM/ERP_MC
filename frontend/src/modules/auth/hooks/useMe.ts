import { useQuery } from '@tanstack/react-query'
import { getMe } from '../api'
import { authKeys } from '../queryKeys'

export function useMe() {
  return useQuery({
    queryKey: authKeys.me(),
    queryFn: getMe,
    staleTime: 1000 * 60 * 10,
  })
}
