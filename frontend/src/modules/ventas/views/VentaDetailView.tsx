import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { Button } from '@/shared/components/ui'
import {
  useVenta, useCotizaciones, useCrearCotizacion,
  useCambiarEstadoVenta, useCambiarEstadoCotizacion,
  useAgregarLinea, useEliminarLinea, useActualizarVenta,
} from '../hooks/useVentas'
import * as ventasApi from '../api'
import { ventasKeys } from '../queryKeys'
import { useCliente } from '@/modules/clientes'
import { EstadoBadge } from '../components/EstadoBadge'
import { AnularModal } from '../components/AnularModal'
import { CotizacionForm } from '../components/CotizacionForm'
import { LineaForm } from '../components/LineaForm'
import {
  ESTADO_VENTA_LABEL,
  ESTADO_COTIZACION_LABEL,
  TRANSICIONES_VENTA,
} from '../types'
import type {
  Cotizacion,
  CotizacionCreate,
  EstadoCotizacion,
  EstadoVenta,
  LineaCotizacionCreate,
} from '../types'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n: number | string) =>
  Number(n).toLocaleString('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0 })

const fmtDate = (s: string | null | undefined) =>
  s ? new Date(s).toLocaleDateString('es-CL') : '—'

const TRANSICION_LABEL: Partial<Record<EstadoVenta, string>> = {
  COTIZACION_ENVIADA: 'Enviar cotización',
  VENTA_GENERADA:     'Confirmar venta',
  EN_PROCESO:         'Iniciar proceso',
  CERRADA:            'Cerrar venta',
  CONSULTA_ABIERTA:   'Volver a consulta',
}

const TRANSICIONES_COT: Record<EstadoCotizacion, EstadoCotizacion[]> = {
  BORRADOR:  ['ENVIADA'],
  ENVIADA:   ['ACEPTADA', 'RECHAZADA', 'VENCIDA'],
  ACEPTADA:  [],
  RECHAZADA: [],
  VENCIDA:   [],
}

const COT_TRANSICION_LABEL: Partial<Record<EstadoCotizacion, string>> = {
  ENVIADA:   'Enviar al cliente',
  ACEPTADA:  'Marcar aceptada',
  RECHAZADA: 'Marcar rechazada',
  VENCIDA:   'Marcar vencida',
}

// ─── CotizacionCard ───────────────────────────────────────────────────────────

function CotizacionCard({
  cotizacion: cot,
  ventaId,
  onEstadoCot,
  pendingEstadoCot,
}: {
  cotizacion: Cotizacion
  ventaId: string
  onEstadoCot: (cotId: string, estado: EstadoCotizacion) => void
  pendingEstadoCot: boolean
}) {
  const [lineaOpen, setLineaOpen] = useState(false)
  const agregarLinea = useAgregarLinea(ventaId, cot.id)
  const eliminarLinea = useEliminarLinea(ventaId, cot.id)

  const puedeEditar = cot.estado === 'BORRADOR'
  const siguientes = TRANSICIONES_COT[cot.estado as EstadoCotizacion] ?? []

  // Acepta 1 o 2 líneas (producto + instalación opcional)
  const handleAgregarLinea = async (lines: LineaCotizacionCreate[]) => {
    for (const line of lines) {
      await agregarLinea.mutateAsync(line)
    }
    setLineaOpen(false)
  }

  return (
    <div className="rounded-xl border border-surface-border bg-white shadow-sm overflow-hidden">
      {/* Card header */}
      <div className="flex items-center justify-between px-5 py-3 bg-surface-muted border-b border-surface-border">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="font-mono text-sm font-semibold text-text-primary">{cot.codigo}</span>
          <EstadoBadge estado={cot.estado as EstadoCotizacion} size="sm" />
          {cot.fecha_vencimiento && (
            <span className="text-xs text-text-disabled">Vence: {fmtDate(cot.fecha_vencimiento)}</span>
          )}
          {cot.requiere_cubicacion && (
            <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-sky-100 text-sky-700">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
              Cubicación
            </span>
          )}
          {Number(cot.descuento_global_pct) > 0 && (
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
              -{cot.descuento_global_pct}% desc.
            </span>
          )}
        </div>
        <span className="font-semibold text-text-primary text-sm">{fmt(cot.monto_total)}</span>
      </div>

      {/* Líneas */}
      <div className="px-5 py-4">
        {cot.lineas.length === 0 ? (
          <p className="text-sm text-text-disabled italic py-2">Sin líneas. Agrega productos.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-text-disabled uppercase border-b border-surface-border">
                <th className="text-left pb-2 font-medium">Descripción</th>
                <th className="text-right pb-2 font-medium w-14">Cant.</th>
                <th className="text-right pb-2 font-medium w-28">P. Unit.</th>
                <th className="text-right pb-2 font-medium w-14">Desc.</th>
                <th className="text-right pb-2 font-medium w-28">Subtotal</th>
                {puedeEditar && <th className="w-8" />}
              </tr>
            </thead>
            <tbody>
              {cot.lineas.map(l => (
                <tr key={l.id} className="border-b border-surface-border/50 last:border-0">
                  <td className="py-2 pr-4 text-text-primary">{l.descripcion}</td>
                  <td className="py-2 text-right text-text-secondary">{Number(l.cantidad)}</td>
                  <td className="py-2 text-right text-text-secondary font-mono">{fmt(l.precio_unitario)}</td>
                  <td className="py-2 text-right text-text-secondary">
                    {Number(l.descuento_pct) > 0 ? `${l.descuento_pct}%` : '—'}
                  </td>
                  <td className="py-2 text-right font-medium text-text-primary font-mono">{fmt(l.subtotal)}</td>
                  {puedeEditar && (
                    <td className="py-2 text-right">
                      <button
                        onClick={() => eliminarLinea.mutate(l.id)}
                        disabled={eliminarLinea.isPending}
                        className="text-text-disabled hover:text-danger transition-colors p-1 rounded disabled:opacity-50"
                        title="Eliminar línea"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Totales */}
        <div className="mt-3 pt-3 border-t border-surface-border space-y-1">
          <div className="flex justify-between text-sm text-text-secondary">
            <span>Subtotal</span><span className="font-mono">{fmt(cot.monto_subtotal)}</span>
          </div>
          {Number(cot.descuento_global_pct) > 0 && (
            <div className="flex justify-between text-sm text-emerald-700">
              <span>Descuento global ({cot.descuento_global_pct}%)</span>
              <span className="font-mono">-{fmt(cot.monto_subtotal * Number(cot.descuento_global_pct) / 100)}</span>
            </div>
          )}
          <div className="flex justify-between text-sm text-text-secondary">
            <span>IVA (19%)</span><span className="font-mono">{fmt(cot.monto_iva)}</span>
          </div>
          <div className="flex justify-between text-base font-semibold text-text-primary pt-1.5 border-t border-surface-border">
            <span>Total</span><span className="font-mono">{fmt(cot.monto_total)}</span>
          </div>
        </div>
      </div>

      {/* Card footer — acciones */}
      {(puedeEditar || siguientes.length > 0) && (
        <div className="flex items-center justify-between px-5 py-3 bg-surface-muted border-t border-surface-border gap-2 flex-wrap">
          <div>
            {puedeEditar && (
              <Button size="sm" variant="outline" onClick={() => setLineaOpen(true)}>
                + Agregar línea
              </Button>
            )}
          </div>
          <div className="flex gap-2 flex-wrap">
            {siguientes.map(t => (
              <Button
                key={t}
                size="sm"
                variant={t === 'RECHAZADA' || t === 'VENCIDA' ? 'danger' : 'primary'}
                loading={pendingEstadoCot}
                onClick={() => onEstadoCot(cot.id, t)}
              >
                {COT_TRANSICION_LABEL[t] ?? ESTADO_COTIZACION_LABEL[t]}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Notas */}
      {(cot.notas_internas || cot.notas_cliente) && (
        <div className="px-5 pb-4 space-y-1">
          {cot.notas_internas && (
            <p className="text-xs text-text-secondary"><strong>Interno:</strong> {cot.notas_internas}</p>
          )}
          {cot.notas_cliente && (
            <p className="text-xs text-text-secondary"><strong>Cliente:</strong> {cot.notas_cliente}</p>
          )}
        </div>
      )}

      <LineaForm
        open={lineaOpen}
        isPending={agregarLinea.isPending}
        onConfirm={handleAgregarLinea}
        onClose={() => setLineaOpen(false)}
      />
    </div>
  )
}

// ─── VentaDetailView ──────────────────────────────────────────────────────────

export const VentaDetailView = () => {
  const { id = '' } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [anularOpen, setAnularOpen] = useState(false)
  const [cotizacionOpen, setCotizacionOpen] = useState(false)
  const [editandoFecha, setEditandoFecha] = useState(false)

  const { data: venta, isLoading, isError } = useVenta(id)
  const { data: cotizaciones = [], isLoading: loadingCots } = useCotizaciones(id)
  const { data: cliente } = useCliente(venta?.cliente_id ?? '')

  const cambiarEstadoVenta = useCambiarEstadoVenta(id)
  const cambiarEstadoCot   = useCambiarEstadoCotizacion(id)
  const crearCotizacion    = useCrearCotizacion(id)
  const actualizarVenta    = useActualizarVenta(id)
  const queryClient        = useQueryClient()

  // ── Loading ──
  if (isLoading) {
    return (
      <div className="p-6 max-w-7xl mx-auto animate-pulse space-y-4">
        <div className="h-4 w-32 bg-surface-subtle rounded" />
        <div className="h-8 w-48 bg-surface-subtle rounded" />
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <div key={i} className="h-32 bg-surface-subtle rounded-xl" />)}
        </div>
      </div>
    )
  }

  if (isError || !venta) {
    return (
      <div className="p-6 text-center">
        <p className="text-text-secondary mb-4">Venta no encontrada.</p>
        <Button variant="ghost" onClick={() => navigate('/ventas')}>← Volver a ventas</Button>
      </div>
    )
  }

  const transicionesDisponibles = TRANSICIONES_VENTA[venta.estado].filter(e => e !== 'ANULADA')
  const puedeAnular = venta.estado !== 'CERRADA' && venta.estado !== 'ANULADA'

  const handleTransicion = (estado: EstadoVenta) => {
    cambiarEstadoVenta.mutate({ estado })
  }

  const handleAnular = (motivo: string) => {
    cambiarEstadoVenta.mutate(
      { estado: 'ANULADA', motivo_anulacion: motivo },
      { onSuccess: () => setAnularOpen(false) },
    )
  }

  const handleCotEstado = (cotId: string, estado: EstadoCotizacion) => {
    cambiarEstadoCot.mutate({ cotizacionId: cotId, payload: { estado } })
  }

  const handleCrearCotizacion = async (data: CotizacionCreate) => {
    try {
      const newCot = await crearCotizacion.mutateAsync(data)
      // Si requiere cubicación → auto-agregar visita técnica como línea
      if (data.requiere_cubicacion && newCot?.id) {
        await ventasApi.agregarLinea(newCot.id, {
          descripcion: 'Visita técnica / Medición en obra',
          producto_id: 'prod-fake-008',   // SRV-MED-001
          cantidad: 1,
          precio_unitario: 25000,
          descuento_pct: 0,
          unidad_medida: 'hora',
        })
        queryClient.invalidateQueries({ queryKey: ventasKeys.cotizaciones(id) })
      }
    } catch { /* errores manejados por toast en el hook */ }
    setCotizacionOpen(false)
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">

      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-text-secondary">
        <Link to="/ventas" className="hover:text-primary transition-colors">Ventas</Link>
        <span>/</span>
        <span className="text-text-primary font-medium">{venta.codigo}</span>
      </nav>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/ventas')}
            className="p-1.5 rounded-lg hover:bg-surface-subtle transition-colors text-text-secondary"
            aria-label="Volver"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-2xl font-bold text-text-primary font-mono">{venta.codigo}</h1>
          <EstadoBadge estado={venta.estado} />
        </div>
        {puedeAnular && (
          <Button variant="danger" size="sm" onClick={() => setAnularOpen(true)}>
            Anular venta
          </Button>
        )}
      </div>

      {/* Dos columnas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

        {/* ── Izquierda: cotizaciones ── */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-text-primary">
              Cotizaciones
              <span className="ml-2 text-sm text-text-disabled font-normal">({cotizaciones.length})</span>
            </h2>
            {venta.estado !== 'CERRADA' && venta.estado !== 'ANULADA' && (
              <Button size="sm" onClick={() => setCotizacionOpen(true)}>+ Nueva cotización</Button>
            )}
          </div>

          {loadingCots ? (
            <div className="space-y-3 animate-pulse">
              {[1, 2].map(i => <div key={i} className="h-40 bg-surface-subtle rounded-xl" />)}
            </div>
          ) : cotizaciones.length === 0 ? (
            <div className="rounded-xl border border-dashed border-surface-border p-10 text-center bg-white">
              <p className="text-text-secondary text-sm mb-4">No hay cotizaciones aún.</p>
              {venta.estado !== 'CERRADA' && venta.estado !== 'ANULADA' && (
                <Button size="sm" onClick={() => setCotizacionOpen(true)}>
                  Crear primera cotización
                </Button>
              )}
            </div>
          ) : (
            cotizaciones.map(cot => (
              <CotizacionCard
                key={cot.id}
                cotizacion={cot}
                ventaId={id}
                onEstadoCot={handleCotEstado}
                pendingEstadoCot={cambiarEstadoCot.isPending}
              />
            ))
          )}
        </div>

        {/* ── Derecha: info + transiciones ── */}
        <div className="space-y-4">

          {/* Info */}
          <div className="rounded-xl border border-surface-border bg-white shadow-sm p-5 space-y-3">
            <h3 className="text-xs font-semibold text-text-disabled uppercase tracking-wide">Información</h3>
            <dl className="space-y-2.5 text-sm">
              <div className="flex justify-between gap-2">
                <dt className="text-text-secondary">Cliente</dt>
                <dd className="font-medium text-text-primary text-right">
                  {cliente?.razon_social ?? '—'}
                </dd>
              </div>
              {cliente?.rut && (
                <div className="flex justify-between gap-2">
                  <dt className="text-text-secondary">RUT</dt>
                  <dd className="font-mono text-text-primary">{cliente.rut}</dd>
                </div>
              )}
              <div className="flex justify-between gap-2 pt-1 border-t border-surface-border">
                <dt className="text-text-secondary">Monto total</dt>
                <dd className="font-semibold text-text-primary font-mono">{fmt(venta.monto_total)}</dd>
              </div>
              {Number(venta.descuento_pct) > 0 && (
                <div className="flex justify-between gap-2">
                  <dt className="text-text-secondary">Descuento</dt>
                  <dd className="text-text-primary">{venta.descuento_pct}%</dd>
                </div>
              )}
              <div className="flex justify-between gap-2">
                <dt className="text-text-secondary">Creada</dt>
                <dd className="text-text-primary">{fmtDate(venta.created_at)}</dd>
              </div>

              {/* Fecha cierre — editable inline */}
              <div className="flex justify-between items-center gap-2">
                <dt className="text-text-secondary shrink-0">Cierre esperado</dt>
                <dd className="flex items-center gap-1">
                  {editandoFecha ? (
                    <input
                      type="date"
                      autoFocus
                      defaultValue={venta.fecha_cierre_esperada ?? ''}
                      onBlur={e => {
                        actualizarVenta.mutate({ fecha_cierre_esperada: e.target.value || null })
                        setEditandoFecha(false)
                      }}
                      onKeyDown={e => {
                        if (e.key === 'Escape') setEditandoFecha(false)
                        if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
                      }}
                      className="text-sm border border-primary rounded px-2 py-0.5 focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  ) : (
                    <>
                      <span className="text-text-primary text-sm">
                        {venta.fecha_cierre_esperada ? fmtDate(venta.fecha_cierre_esperada) : '—'}
                      </span>
                      {venta.estado !== 'CERRADA' && venta.estado !== 'ANULADA' && (
                        <button
                          onClick={() => setEditandoFecha(true)}
                          className="p-0.5 text-text-disabled hover:text-primary transition-colors rounded"
                          title="Editar fecha de cierre"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                              d="M15.232 5.232l3.536 3.536M9 13l6.5-6.5a2 2 0 012.828 2.828L11.828 15.828a4 4 0 01-2.828 1.172H7v-2a4 4 0 011.172-2.828z" />
                          </svg>
                        </button>
                      )}
                    </>
                  )}
                </dd>
              </div>
            </dl>
            {venta.notas && (
              <div className="pt-2 border-t border-surface-border">
                <p className="text-xs text-text-disabled uppercase tracking-wide mb-1">Notas</p>
                <p className="text-xs text-text-secondary">{venta.notas}</p>
              </div>
            )}
          </div>

          {/* Transiciones de estado */}
          {transicionesDisponibles.length > 0 && (
            <div className="rounded-xl border border-surface-border bg-white shadow-sm p-5 space-y-3">
              <h3 className="text-xs font-semibold text-text-disabled uppercase tracking-wide">Avanzar estado</h3>
              <div className="flex flex-col gap-2">
                {transicionesDisponibles.map(estado => (
                  <Button
                    key={estado}
                    variant={estado === 'CONSULTA_ABIERTA' ? 'outline' : 'primary'}
                    loading={cambiarEstadoVenta.isPending}
                    onClick={() => handleTransicion(estado)}
                    className="w-full justify-center"
                  >
                    {TRANSICION_LABEL[estado] ?? ESTADO_VENTA_LABEL[estado]}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Anulación info */}
          {venta.estado === 'ANULADA' && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-5 space-y-1">
              <h3 className="text-xs font-semibold text-rose-800 uppercase tracking-wide">Venta anulada</h3>
              {venta.fecha_anulacion && (
                <p className="text-xs text-rose-700">Fecha: {fmtDate(venta.fecha_anulacion)}</p>
              )}
              {venta.motivo_anulacion && (
                <p className="text-xs text-rose-700">Motivo: {venta.motivo_anulacion}</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modales */}
      <AnularModal
        open={anularOpen}
        entidad="venta"
        isPending={cambiarEstadoVenta.isPending}
        onConfirm={handleAnular}
        onClose={() => setAnularOpen(false)}
      />

      <CotizacionForm
        open={cotizacionOpen}
        isPending={crearCotizacion.isPending}
        onConfirm={handleCrearCotizacion}
        onClose={() => setCotizacionOpen(false)}
      />
    </div>
  )
}
