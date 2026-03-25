export const productosKeys = {
  all: ['productos'] as const,
  lists: () => [...productosKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) => [...productosKeys.lists(), filters] as const,
  details: () => [...productosKeys.all, 'detail'] as const,
  detail: (id: string) => [...productosKeys.details(), id] as const,
  categorias: (modulo: string, tipo?: string) => ['categorias', modulo, tipo] as const,
}
