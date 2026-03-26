import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useVentas } from '../hooks/useVentas'
import { VentaForm } from '../components/VentaForm'
import { Modal, Badge } from '@/shared/components/ui'
import { ESTADO_VENTA_LABEL } from '../types'
import type { VentaListItem, EstadoVenta } from '../types'
import { useMe } from '@/modules/auth/hooks/useMe'

// ─── Icono inline (usa la clase global de Material Symbols) ──────────────────
const Icon = ({ name, className = '' }: { name: string; className?: string }) => (
  <span className={`material-symbols-outlined ${className}`}>{name}</span>
)

// ─── Skeleton ────────────────────────────────────────────────────────────────
const VentasListSkeleton = () => (
  <div className="divide-y divide-surface-border animate-pulse">
    {[...Array(5)].map((_, i) => (
      <div key={i} className="flex gap-4 px-6 py-4">
        <div className="h-4 w-24 bg-surface-muted rounded" />
        <div className="h-4 w-28 bg-surface-muted rounded-full" />
        <div className="h-4 w-24 bg-surface-muted rounded" />
        <div className="h-4 w-20 bg-surface-muted rounded" />
      </div>
    ))}
  </div>
)

// ─── Badge variant por estado ────────────────────────────────────────────────
const VENTA_BADGE: Record<EstadoVenta, 'info' | 'warning' | 'success' | 'neutral' | 'danger'> = {
  CONSULTA_ABIERTA:   'info',
  COTIZACION_ENVIADA: 'warning',
  VENTA_GENERADA:     'info',
  EN_PROCESO:         'success',
  CERRADA:            'neutral',
  ANULADA:            'danger',
}

// ─── Pill de estado con color semántico ──────────────────────────────────────
type PillDef = { key: EstadoVenta | ''; label: string; activeClass: string; inactiveClass: string }

// Cada pill siempre muestra su color. Active = versión más saturada.
const ESTADO_PILLS: PillDef[] = [
  {
    key: '',
    label: 'Todas las ventas',
    activeClass:   'bg-[#006B84]/10 text-[#006B84] border-[#006B84]/25 font-bold',
    inactiveClass: 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50',
  },
  {
    key: 'CONSULTA_ABIERTA',
    label: ESTADO_VENTA_LABEL['CONSULTA_ABIERTA'],
    activeClass:   'bg-sky-100 text-sky-800 border-sky-300 font-bold',
    inactiveClass: 'bg-sky-50 text-sky-700 border-sky-100 hover:bg-sky-100',
  },
  {
    key: 'COTIZACION_ENVIADA',
    label: ESTADO_VENTA_LABEL['COTIZACION_ENVIADA'],
    activeClass:   'bg-amber-100 text-amber-800 border-amber-300 font-bold',
    inactiveClass: 'bg-amber-50 text-amber-700 border-amber-100 hover:bg-amber-100',
  },
  {
    key: 'VENTA_GENERADA',
    label: ESTADO_VENTA_LABEL['VENTA_GENERADA'],
    activeClass:   'bg-blue-100 text-blue-800 border-blue-300 font-bold',
    inactiveClass: 'bg-blue-50 text-blue-700 border-blue-100 hover:bg-blue-100',
  },
  {
    key: 'EN_PROCESO',
    label: ESTADO_VENTA_LABEL['EN_PROCESO'],
    activeClass:   'bg-emerald-100 text-emerald-800 border-emerald-300 font-bold',
    inactiveClass: 'bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-100',
  },
  {
    key: 'CERRADA',
    label: ESTADO_VENTA_LABEL['CERRADA'],
    activeClass:   'bg-slate-200 text-slate-800 border-slate-400 font-bold',
    inactiveClass: 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200',
  },
  {
    key: 'ANULADA',
    label: ESTADO_VENTA_LABEL['ANULADA'],
    activeClass:   'bg-rose-100 text-rose-800 border-rose-300 font-bold',
    inactiveClass: 'bg-rose-50 text-rose-700 border-rose-100 hover:bg-rose-100',
  },
]

// ─── Empty state (pure CSS, sin assets externos) ─────────────────────────────
const EmptyState = ({ onNueva }: { onNueva: () => void }) => (
  <div className="flex flex-col items-center justify-center p-12 text-center">
    {/* Ilustración CSS */}
    <div className="w-48 h-48 mb-8 flex items-center justify-center">
      <div className="relative">
        <div className="w-40 h-40 bg-surface-muted rounded-3xl rotate-12 absolute -top-3 -left-3" />
        <div className="w-40 h-40 bg-primary/5 rounded-3xl -rotate-6 absolute -top-1.5 -left-1.5" />
        <div className="w-40 h-40 bg-white border-2 border-surface-border rounded-3xl relative flex flex-col p-5 shadow-lg">
          <div className="w-full h-1.5 bg-surface-border/50 rounded-full mb-4" />
          <div className="flex gap-2 mb-5">
            <div className="w-1/2 h-10 bg-primary/10 rounded-lg" />
            <div className="w-1/2 h-10 bg-secondary/10 rounded-lg" />
          </div>
          <div className="space-y-2">
            <div className="w-3/4 h-1.5 bg-surface-border/40 rounded-full" />
            <div className="w-full h-1.5 bg-surface-border/40 rounded-full" />
            <div className="w-1/2 h-1.5 bg-surface-border/40 rounded-full" />
          </div>
          <div className="mt-auto flex justify-end">
            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
              <Icon name="calculate" className="text-primary text-base" />
            </div>
          </div>
        </div>
      </div>
    </div>

    <h3 className="text-xl font-bold text-text-primary mb-2">No hay ventas aún</h3>
    <p className="text-text-secondary text-sm mb-6 max-w-xs">
      Crea la primera venta para comenzar a gestionar tus ingresos y facturación de manera profesional.
    </p>

    {/* Tip */}
    <div className="w-full max-w-sm bg-surface-muted rounded-xl p-4 text-left border border-surface-border/50 mb-8">
      <div className="flex items-start gap-2">
        <Icon name="info" className="text-primary text-lg mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-sm font-semibold text-text-primary">Tip rápido</p>
          <p className="text-xs text-text-secondary leading-relaxed mt-1">
            Añade tu primer cliente y producto para facturar en minutos.
          </p>
        </div>
      </div>
    </div>

    <div className="flex gap-3">
      <button
        onClick={onNueva}
        className="px-6 py-2.5 bg-[#006B84] hover:bg-[#00566A] text-white font-bold rounded-lg transition-colors flex items-center gap-2 shadow-sm"
      >
        <Icon name="add_circle" className="text-xl" />
        Nueva venta
      </button>
      <button
        disabled
        title="Próximamente"
        className="px-6 py-2.5 bg-white text-text-secondary border border-surface-border font-semibold rounded-lg flex items-center gap-2 opacity-50 cursor-not-allowed"
      >
        <Icon name="upload_file" className="text-xl" />
        Importar datos
      </button>
    </div>
  </div>
)

// ─── Stats card ───────────────────────────────────────────────────────────────
const StatCard = ({
  label,
  value,
  note,
  noteIcon,
  accentClass,
}: {
  label: string
  value: string
  note: string
  noteIcon: string
  accentClass: string
}) => (
  <div className={`bg-white p-6 rounded-xl border border-surface-border border-l-4 ${accentClass} shadow-sm`}>
    <p className="text-[10px] font-medium text-slate-500 uppercase tracking-[0.1em] mb-1.5">{label}</p>
    <h4 className="text-2xl font-black text-text-primary">{value}</h4>
    <p className="text-[10px] text-slate-400 mt-2 flex items-center gap-1">
      <Icon name={noteIcon} className="text-xs" />
      {note}
    </p>
  </div>
)

// ─── Vista principal ──────────────────────────────────────────────────────────
export const VentasListView = () => {
  const navigate = useNavigate()
  const [estado, setEstado] = useState<EstadoVenta | ''>('')
  const [busqueda, setBusqueda] = useState('')
  const [page, setPage] = useState(1)
  const [modalOpen, setModalOpen] = useState(false)

  const { data: me } = useMe()
  const esVendedor = me?.rol_funcional === 'vendedor'

  const { data, isLoading, isError, refetch } = useVentas({
    estado: estado || undefined,
    busqueda: busqueda || undefined,
    page,
    limit: 20,
    direccion: 'desc',
    // Los vendedores solo ven sus propias ventas
    vendedor_id: esVendedor ? me?.id : undefined,
  })

  const total = data?.meta?.total ?? 0
  const isEmpty = !isLoading && !isError && total === 0 && !busqueda && !estado

  return (
    <div className="p-8 pt-6">

      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-text-primary tracking-tight">
          Ventas
          {esVendedor && (
            <span className="ml-3 text-sm font-medium text-primary bg-primary/10 px-2.5 py-1 rounded-full align-middle">
              Mis ventas
            </span>
          )}
        </h2>
        <p className="text-text-secondary font-medium mt-0.5 text-sm">
          {total} {total === 1 ? 'venta en total' : 'ventas en total'}
        </p>
      </div>

      {/* Action zone */}
      <div className="flex items-center gap-3 mb-5">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary text-lg" />
          <input
            type="text"
            placeholder="Buscar ventas, clientes o folios..."
            value={busqueda}
            onChange={(e) => { setBusqueda(e.target.value); setPage(1) }}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-surface-border rounded-lg text-sm text-text-primary placeholder:text-text-disabled focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
          />
        </div>

        {/* Filtros avanzados (próximamente) */}
        <button
          disabled
          title="Próximamente"
          className="px-5 py-2.5 bg-white text-text-secondary font-semibold rounded-lg border border-surface-border flex items-center gap-2 opacity-60 cursor-not-allowed text-sm"
        >
          <Icon name="filter_list" className="text-lg" />
          Filtros avanzados
        </button>

        <div className="flex-1" />

        {/* CTA */}
        <button
          onClick={() => setModalOpen(true)}
          className="px-5 py-2.5 bg-[#006B84] hover:bg-[#00566A] text-white font-bold rounded-lg transition-colors flex items-center gap-2 shadow-sm text-sm"
        >
          <Icon name="add" className="text-xl" />
          Nueva venta
        </button>
      </div>

      {/* Status pills */}
      <div className="flex flex-wrap gap-2 mb-6">
        {ESTADO_PILLS.map((pill) => (
          <button
            key={pill.key}
            onClick={() => { setEstado(pill.key as EstadoVenta | ''); setPage(1) }}
            className={`px-4 py-1.5 rounded-full text-xs font-bold border transition-colors ${
              estado === pill.key ? pill.activeClass : pill.inactiveClass
            }`}
          >
            {pill.label}
          </button>
        ))}
      </div>

      {/* Main card */}
      <div className="bg-white rounded-xl border border-surface-border shadow-sm min-h-[300px]">
        {isLoading ? (
          <VentasListSkeleton />
        ) : isError ? (
          <div className="px-4 py-12 text-center">
            <p className="text-danger text-sm mb-3">Error al cargar ventas</p>
            <button onClick={() => refetch()} className="text-sm text-primary hover:underline">
              Reintentar
            </button>
          </div>
        ) : isEmpty ? (
          <EmptyState onNueva={() => setModalOpen(true)} />
        ) : data?.data?.length === 0 ? (
          <div className="px-4 py-16 text-center">
            <p className="text-text-primary font-medium mb-1">
              {estado
                ? `Sin ventas en estado "${ESTADO_VENTA_LABEL[estado]}"`
                : busqueda
                ? `Sin resultados para "${busqueda}"`
                : 'No hay ventas'}
            </p>
          </div>
        ) : (
          <>
            <table className="w-full">
              <thead>
                <tr className="bg-surface-muted border-b border-surface-border">
                  <th className="text-left px-6 py-3 text-text-secondary text-xs font-medium uppercase tracking-wider">Código</th>
                  <th className="text-left px-6 py-3 text-text-secondary text-xs font-medium uppercase tracking-wider">Estado</th>
                  <th className="text-right px-6 py-3 text-text-secondary text-xs font-medium uppercase tracking-wider">Monto total</th>
                  <th className="text-left px-6 py-3 text-text-secondary text-xs font-medium uppercase tracking-wider">Descuento</th>
                  <th className="text-left px-6 py-3 text-text-secondary text-xs font-medium uppercase tracking-wider">Cierre esperado</th>
                  <th className="text-left px-6 py-3 text-text-secondary text-xs font-medium uppercase tracking-wider">Creada</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border">
                {data?.data?.map((venta: VentaListItem) => (
                  <tr
                    key={venta.id}
                    onClick={() => navigate(`/ventas/${venta.id}`)}
                    className="hover:bg-surface-muted transition-colors cursor-pointer"
                  >
                    <td className="px-6 py-4 text-sm font-mono text-primary font-medium">{venta.codigo}</td>
                    <td className="px-6 py-4">
                      <Badge variant={VENTA_BADGE[venta.estado]}>
                        {ESTADO_VENTA_LABEL[venta.estado]}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-sm text-text-primary font-bold text-right font-mono">
                      ${Number(venta.monto_total).toLocaleString('es-CL')}
                    </td>
                    <td className="px-6 py-4 text-sm text-text-secondary">
                      {Number(venta.descuento_pct) > 0 ? `${venta.descuento_pct}%` : '—'}
                    </td>
                    <td className="px-6 py-4 text-sm text-text-secondary">
                      {venta.fecha_cierre_esperada ?? '—'}
                    </td>
                    <td className="px-6 py-4 text-sm text-text-secondary">
                      {new Date(venta.created_at).toLocaleDateString('es-CL')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Paginación */}
            {data && data.meta.total_pages > 1 && (
              <div className="flex items-center justify-between px-6 py-3 border-t border-surface-border bg-surface-muted rounded-b-xl">
                <p className="text-text-secondary text-sm">
                  Página {data.meta.page} de {data.meta.total_pages}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="px-3 py-1.5 text-sm rounded-lg border border-surface-border bg-white hover:bg-surface-muted disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Anterior
                  </button>
                  <button
                    onClick={() => setPage(p => Math.min(data.meta.total_pages, p + 1))}
                    disabled={page >= data.meta.total_pages}
                    className="px-3 py-1.5 text-sm rounded-lg border border-surface-border bg-white hover:bg-surface-muted disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Siguiente
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-3 gap-5 mt-6">
        <StatCard
          label="Por cobrar"
          value={total > 0 ? '—' : '$0.00'}
          note="0% vs mes anterior"
          noteIcon="trending_up"
          accentClass="border-l-primary"
        />
        <StatCard
          label="Ticket promedio"
          value={total > 0 ? '—' : '$0.00'}
          note="Sin datos suficientes"
          noteIcon="info"
          accentClass="border-l-secondary"
        />
        <StatCard
          label="Cotizaciones activas"
          value={String(total)}
          note="Actualizado ahora"
          noteIcon="schedule"
          accentClass="border-l-slate-300"
        />
      </div>

      {/* Modal nueva venta */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nueva venta" size="md">
        <VentaForm
          onSuccess={() => { setModalOpen(false); refetch() }}
          onCancel={() => setModalOpen(false)}
        />
      </Modal>
    </div>
  )
}
