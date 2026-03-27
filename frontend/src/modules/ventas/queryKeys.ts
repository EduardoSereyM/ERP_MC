export const ventasKeys = {
  all: ['ventas'] as const,
  lists: () => [...ventasKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) => [...ventasKeys.lists(), filters] as const,
  details: () => [...ventasKeys.all, 'detail'] as const,
  detail: (id: string) => [...ventasKeys.details(), id] as const,
  cotizaciones: (ventaId: string) => [...ventasKeys.detail(ventaId), 'cotizaciones'] as const,
  stubs: (ventaId: string) => [...ventasKeys.detail(ventaId), 'stubs'] as const,
  actividad: (ventaId: string) => [...ventasKeys.detail(ventaId), 'actividad'] as const,
}

export const stubsKeys = {
  all: ['stubs'] as const,
  lists: () => [...stubsKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) => [...stubsKeys.lists(), filters] as const,
  detail: (id: string) => [...stubsKeys.all, 'detail', id] as const,
}
