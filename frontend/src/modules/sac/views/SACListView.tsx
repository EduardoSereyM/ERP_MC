import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Badge } from '@/shared/components/ui'
import { useSACList } from '../hooks/useSAC'
import { ESTADO_SAC_LABEL } from '../types'
import type { EstadoSAC, SACListItem } from '../types'

const Icon = ({ name, className = '' }: { name: string; className?: string }) => (
  <span className={`material-symbols-outlined ${className}`}>{name}</span>
)

const Skeleton = () => (
  <div className="divide-y divide-surface-border animate-pulse">
    {[...Array(5)].map((_, i) => (
      <div key={i} className="flex gap-4 px-6 py-4">
        <div className="h-4 w-24 bg-surface-muted rounded" />
        <div className="h-4 w-32 bg-surface-muted rounded-full" />
        <div className="h-4 w-40 bg-surface-muted rounded" />
        <div className="h-4 w-24 bg-surface-muted rounded" />
      </div>
    ))}
  </div>
)

const BADGE_VARIANT: Record<EstadoSAC, 'info' | 'warning' | 'success' | 'neutral' | 'danger'> = {
  CREADO:               'info',
  REVISION_INFO:        'warning',
  EN_GESTION_VTA:       'warning',
  EN_COORDINACION:      'info',
  PROGRAMADO:           'info',
  REPROGRAMADO:         'warning',
  EN_EJECUCION:         'success',
  COMPLETADO:           'success',
  GESTION_COBRO:        'info',
  CERRADO:              'neutral',
  CERRADO_SIN_EJECUTAR: 'danger',
  CERRADO_SIN_TERMINAR: 'danger',
}

const fmtDate = (s: string | null | undefined) =>
  s ? new Date(s).toLocaleDateString('es-CL') : '—'

interface PillDef { key: EstadoSAC | ''; label: string; activeClass: string; inactiveClass: string }
const PILLS: PillDef[] = [
  { key: '', label: 'Todos', activeClass: 'bg-[#006B84]/10 text-[#006B84] border-[#006B84]/25 font-bold', inactiveClass: 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50' },
  { key: 'CREADO', label: 'Creado', activeClass: 'bg-sky-100 text-sky-800 border-sky-300 font-bold', inactiveClass: 'bg-sky-50 text-sky-700 border-sky-100 hover:bg-sky-100' },
  { key: 'REVISION_INFO', label: 'Revisión info', activeClass: 'bg-amber-100 text-amber-800 border-amber-300 font-bold', inactiveClass: 'bg-amber-50 text-amber-700 border-amber-100 hover:bg-amber-100' },
  { key: 'EN_COORDINACION', label: 'En coordinación', activeClass: 'bg-blue-100 text-blue-800 border-blue-300 font-bold', inactiveClass: 'bg-blue-50 text-blue-700 border-blue-100 hover:bg-blue-100' },
  { key: 'PROGRAMADO', label: 'Programado', activeClass: 'bg-indigo-100 text-indigo-800 border-indigo-300 font-bold', inactiveClass: 'bg-indigo-50 text-indigo-700 border-indigo-100 hover:bg-indigo-100' },
  { key: 'EN_EJECUCION', label: 'En ejecución', activeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300 font-bold', inactiveClass: 'bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-100' },
  { key: 'COMPLETADO', label: 'Completado', activeClass: 'bg-green-100 text-green-800 border-green-300 font-bold', inactiveClass: 'bg-green-50 text-green-700 border-green-100 hover:bg-green-100' },
  { key: 'CERRADO', label: 'Cerrado', activeClass: 'bg-slate-200 text-slate-800 border-slate-400 font-bold', inactiveClass: 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200' },
]

export const SACListView = () => {
  const navigate = useNavigate()
  const [estadoFiltro, setEstadoFiltro] = useState<EstadoSAC | ''>('')
  const [busqueda, setBusqueda] = useState('')
  const [page, setPage] = useState(1)

  const { data, isLoading } = useSACList({
    estado: estadoFiltro || undefined,
    page,
    limit: 20,
    orden: 'created_at',
    direccion: 'desc',
  })

  const items: SACListItem[] = data?.data ?? []
  const meta = data?.meta

  const filtrados = busqueda.trim()
    ? items.filter(s =>
        s.codigo.toLowerCase().includes(busqueda.toLowerCase()) ||
        (s.cliente_razon_social ?? '').toLowerCase().includes(busqueda.toLowerCase()) ||
        (s.direccion_obra ?? '').toLowerCase().includes(busqueda.toLowerCase())
      )
    : items

  return (
    <div className="flex flex-col h-full">
      {/* ── Header ── */}
      <div className="px-8 pt-8 pb-4 bg-white border-b border-surface-border flex-shrink-0">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-text-primary">Instalaciones</h1>
            <p className="text-sm text-text-secondary mt-0.5">
              {meta ? `${meta.total} SAC en total` : 'Cargando...'}
            </p>
          </div>
        </div>

        {/* Filtros por estado */}
        <div className="flex gap-2 flex-wrap mb-4">
          {PILLS.map(pill => (
            <button
              key={pill.key}
              onClick={() => { setEstadoFiltro(pill.key as EstadoSAC | ''); setPage(1) }}
              className={`px-3 py-1.5 rounded-full text-xs border transition-all ${
                estadoFiltro === pill.key ? pill.activeClass : pill.inactiveClass
              }`}
            >
              {pill.label}
            </button>
          ))}
        </div>

        {/* Búsqueda */}
        <div className="relative max-w-sm">
          <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary text-base" />
          <input
            type="text"
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            placeholder="Buscar por código, cliente, dirección..."
            className="w-full pl-9 pr-4 py-2 text-sm border border-surface-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white"
          />
        </div>
      </div>

      {/* ── Tabla ── */}
      <div className="flex-1 overflow-auto">
        <div className="min-w-[780px]">
          {/* Cabecera */}
          <div className="grid grid-cols-[140px_1fr_160px_140px_130px] gap-4 px-6 py-3 bg-surface-muted border-b border-surface-border text-xs font-semibold text-text-secondary uppercase tracking-wide">
            <span>Código</span>
            <span>Cliente / Dirección</span>
            <span>Estado</span>
            <span>Fecha programada</span>
            <span>Tipo</span>
          </div>

          {isLoading ? (
            <Skeleton />
          ) : filtrados.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-text-secondary">
              <Icon name="construction" className="text-5xl mb-3 text-slate-300" />
              <p className="text-sm font-medium">No hay instalaciones</p>
              <p className="text-xs mt-1">
                {estadoFiltro ? 'Prueba con otro filtro de estado' : 'Las instalaciones aparecen al confirmar una venta'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-surface-border">
              {filtrados.map(sac => (
                <div
                  key={sac.id}
                  onClick={() => navigate(`/instalaciones/${sac.id}`)}
                  className="grid grid-cols-[140px_1fr_160px_140px_130px] gap-4 px-6 py-4 hover:bg-surface-muted cursor-pointer transition-colors group"
                >
                  <span className="font-mono text-sm font-semibold text-primary group-hover:underline">
                    {sac.codigo}
                  </span>

                  <div className="min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate">
                      {sac.cliente_razon_social ?? '—'}
                    </p>
                    <p className="text-xs text-text-secondary truncate mt-0.5">
                      {[sac.direccion_obra, sac.comuna_obra].filter(Boolean).join(', ') || 'Sin dirección'}
                    </p>
                  </div>

                  <div>
                    <Badge variant={BADGE_VARIANT[sac.estado]}>
                      {ESTADO_SAC_LABEL[sac.estado]}
                    </Badge>
                  </div>

                  <span className="text-sm text-text-secondary">
                    {fmtDate(sac.fecha_programada)}
                  </span>

                  <span className="text-xs text-text-secondary capitalize">
                    {sac.tipo === 'suministro_instalacion' ? 'Mat. + inst.' : 'Solo inst.'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Paginación ── */}
      {meta && meta.total_pages > 1 && (
        <div className="flex items-center justify-between px-8 py-4 border-t border-surface-border bg-white flex-shrink-0">
          <span className="text-sm text-text-secondary">
            Página {meta.page} de {meta.total_pages}
          </span>
          <div className="flex gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage(p => p - 1)}
              className="px-3 py-1.5 text-sm border border-surface-border rounded-lg disabled:opacity-40 hover:bg-surface-muted transition-colors"
            >
              Anterior
            </button>
            <button
              disabled={page >= meta.total_pages}
              onClick={() => setPage(p => p + 1)}
              className="px-3 py-1.5 text-sm border border-surface-border rounded-lg disabled:opacity-40 hover:bg-surface-muted transition-colors"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
