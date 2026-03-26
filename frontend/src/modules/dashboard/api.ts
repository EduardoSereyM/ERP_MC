import { api } from '@/core/config/api'
import type { DashboardSummary } from './types'

export interface SimpleResponse<T> {
  data: T
}

export async function obtenerResumen(): Promise<DashboardSummary> {
  const { data } = await api.get<SimpleResponse<DashboardSummary>>('/dashboard/summary')
  return data.data
}
