import { useQuery } from '@tanstack/react-query'
import * as dashboardApi from '../api'
import { dashboardKeys } from '../queryKeys'

export function useDashboardSummary() {
  return useQuery({
    queryKey: dashboardKeys.summary(),
    queryFn: dashboardApi.obtenerResumen,
  })
}
