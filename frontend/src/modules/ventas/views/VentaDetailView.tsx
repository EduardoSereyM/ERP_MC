import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { Button, Modal } from '@/shared/components/ui'
import { useToast } from '@/shared/hooks/useToast'
import * as ventasApiDirect from '../api'
import {
  useVenta, useCotizaciones, useCrearCotizacion,
  useCambiarEstadoVenta, useCambiarEstadoCotizacion,
  useAgregarLinea, useEliminarLinea, useActualizarLinea, useActualizarVenta,
  useStubsVenta, useActividadVenta,
} from '../hooks/useVentas'
import * as ventasApi from '../api'
import { ventasKeys } from '../queryKeys'
import { useCliente } from '@/modules/clientes'
import { EstadoBadge } from '../components/EstadoBadge'
import { AnularModal } from '../components/AnularModal'
import { CotizacionForm } from '../components/CotizacionForm'
import { LineaForm } from '../components/LineaForm'
import { useProductos } from '@/modules/productos'
import {
  ESTADO_VENTA_LABEL,
  ESTADO_COTIZACION_LABEL,
  TRANSICIONES_VENTA,
  MOTIVOS_DESCUENTO,
} from '../types'
import type {
  ActividadItem,
  Cotizacion,
  CotizacionCreate,
  EstadoCotizacion,
  EstadoVenta,
  LineaCotizacion,
  LineaCotizacionCreate,
  SolicitudStub,
} from '../types'
import { ESTADO_STUB_LABEL } from '../types'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n: number | string) =>
  Number(n).toLocaleString('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0 })

const fmtDate = (s: string | null | undefined) =>
  s ? new Date(s).toLocaleDateString('es-CL') : '—'

const fmtTime = (s: string | null | undefined) =>
  s ? new Date(s).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }) : ''

const fmtDuration = (ms: number): string => {
  if (ms < 0) ms = 0
  const mins  = Math.floor(ms / 60000)
  const hours = Math.floor(mins / 60)
  const days  = Math.floor(hours / 24)
  if (days > 0)  return `${days}d ${hours % 24}h`
  if (hours > 0) return `${hours}h ${mins % 60}min`
  if (mins > 0)  return `${mins} min`
  return '< 1 min'
}

const fmtPct = (n: number | string) => {
  const v = Number(n)
  return v % 1 === 0 ? `${v}%` : `${v}%`
}

const MOTIVO_LABEL = Object.fromEntries(MOTIVOS_DESCUENTO.map(m => [m.value, m.label]))

const TRANSICION_LABEL: Partial<Record<EstadoVenta, string>> = {
  COTIZACION_ENVIADA: 'Avanzar a cotización enviada',
  VENTA_GENERADA:     'Confirmar venta',
  CERRADA:            'Cerrar venta',
  CONSULTA_ABIERTA:   'Reabrir como consulta',
}

const TRANSICION_TOOLTIP: Partial<Record<EstadoVenta, string>> = {
  CONSULTA_ABIERTA:   'Devuelve la venta al estado inicial de consulta. Úsalo si necesitas rehacer cotizaciones desde cero.',
  COTIZACION_ENVIADA: 'Ya existe una cotización enviada al cliente. Avanza el estado de la venta para reflejarlo.',
}

const TRANSICIONES_COT: Record<EstadoCotizacion, EstadoCotizacion[]> = {
  BORRADOR:  ['ENVIADA'],
  ENVIADA:   ['ACEPTADA', 'RECHAZADA'],   // VENCIDA se gestiona automáticamente por fecha
  ACEPTADA:  [],
  RECHAZADA: [],
  VENCIDA:   [],
}

const COT_TRANSICION_LABEL: Partial<Record<EstadoCotizacion, string>> = {
  ENVIADA:   'Marcar como enviada',
  ACEPTADA:  'Marcar aceptada',
  RECHAZADA: 'Marcar rechazada',
}

const COT_TRANSICION_TOOLTIP: Partial<Record<EstadoCotizacion, string>> = {
  ACEPTADA:  'El cliente confirmó que acepta esta cotización.',
  RECHAZADA: 'El cliente rechazó esta cotización. Se puede crear una nueva.',
  VENCIDA:   'La cotización expiró sin respuesta del cliente.',
}

// ─── Tooltip ──────────────────────────────────────────────────────────────────

const Tooltip = ({ text }: { text: string }) => (
  <span className="relative group inline-flex items-center">
    <span className="ml-1.5 w-4 h-4 rounded-full bg-surface-subtle border border-surface-border text-text-disabled text-[10px] flex items-center justify-center cursor-help font-bold select-none">
      ?
    </span>
    <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 text-xs bg-gray-900 text-white rounded-lg px-3 py-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 leading-relaxed shadow-lg">
      {text}
      <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
    </span>
  </span>
)

// ─── CotizacionCard ───────────────────────────────────────────────────────────

function CotizacionCard({
  cotizacion: cot,
  ventaId,
  clienteEmail,
  ventaEstado,
  hayAceptada,
  onEstadoCot,
  onEstadoVenta,
  pendingEstadoCot,
}: {
  cotizacion: Cotizacion
  ventaId: string
  clienteEmail?: string
  ventaEstado: EstadoVenta
  hayAceptada: boolean
  onEstadoCot: (cotId: string, estado: EstadoCotizacion) => void
  onEstadoVenta: (estado: EstadoVenta) => void
  pendingEstadoCot: boolean
}) {
  const [lineaOpen, setLineaOpen] = useState(false)
  const [editingLinea, setEditingLinea] = useState<LineaCotizacion | null>(null)
  const [emailOpen, setEmailOpen] = useState(false)
  const [emailDest, setEmailDest] = useState(clienteEmail ?? '')
  const [marcarEnviadaOpen, setMarcarEnviadaOpen] = useState(false)
  const { success, error: toastError } = useToast()
  const agregarLinea    = useAgregarLinea(ventaId, cot.id)
  const actualizarLinea = useActualizarLinea(ventaId, cot.id)
  const eliminarLinea   = useEliminarLinea(ventaId, cot.id)

  const handleDescargarPdf = async () => {
    await ventasApiDirect.descargarCotizacionPdf(cot.id, cot.codigo)
    // Si está en BORRADOR, preguntar si marcar como enviada
    if (cot.estado === 'BORRADOR') setMarcarEnviadaOpen(true)
  }

  const handleConfirmarEnviada = () => {
    onEstadoCot(cot.id, 'ENVIADA')
    if (ventaEstado === 'CONSULTA_ABIERTA') onEstadoVenta('COTIZACION_ENVIADA')
    setMarcarEnviadaOpen(false)
  }

  const enviarEmail = useMutation({
    mutationFn: (email: string) => ventasApiDirect.enviarCotizacionEmail(cot.id, email),
    onSuccess: (res) => {
      success(res.mensaje)
      setEmailOpen(false)
      // Auto-transicionar cotización a ENVIADA si está en BORRADOR
      if (cot.estado === 'BORRADOR') onEstadoCot(cot.id, 'ENVIADA')
      // Auto-avanzar venta a COTIZACION_ENVIADA si corresponde
      if (ventaEstado === 'CONSULTA_ABIERTA') onEstadoVenta('COTIZACION_ENVIADA')
    },
    onError: (e: any) => toastError(e?.response?.data?.detail ?? 'Error al enviar el correo'),
  })

  const puedeEditar = cot.estado === 'BORRADOR'
  // ENVIADA se gestiona automáticamente al enviar email — no se muestra como botón manual.
  // ACEPTADA se oculta si ya existe otra cotización aceptada en esta venta.
  const siguientes = (TRANSICIONES_COT[cot.estado as EstadoCotizacion] ?? []).filter(t => {
    if (t === 'ENVIADA') return false
    if (t === 'ACEPTADA' && hayAceptada) return false
    return true
  })

  const handleAgregarLinea = async (lines: LineaCotizacionCreate[]) => {
    for (const line of lines) await agregarLinea.mutateAsync(line)
    setLineaOpen(false)
  }

  const handleEditarLinea = async (lines: LineaCotizacionCreate[]) => {
    if (!editingLinea || lines.length === 0) return
    await actualizarLinea.mutateAsync({ lineaId: editingLinea.id, payload: lines[0] })
    setEditingLinea(null)
  }

  const hayDescuento = Number(cot.descuento_global_pct) > 0

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
          {hayDescuento && (
            <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
              -{fmtPct(cot.descuento_global_pct!)}
              {cot.descuento_motivo && (
                <span className="text-emerald-600 font-normal">· {MOTIVO_LABEL[cot.descuento_motivo] ?? cot.descuento_motivo}</span>
              )}
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
              <tr className="text-xs text-text-disabled border-b border-surface-border">
                <th className="text-left pb-2 font-medium w-full">Descripción</th>
                <th className="text-right pb-2 font-medium whitespace-nowrap px-3">Cant.</th>
                <th className="text-right pb-2 font-medium whitespace-nowrap px-3">P. Unit.</th>
                <th className="text-right pb-2 font-medium whitespace-nowrap px-3">Desc.</th>
                <th className="text-right pb-2 font-medium whitespace-nowrap px-3">Sin desc.</th>
                <th className="text-right pb-2 font-medium whitespace-nowrap pl-3">Subtotal</th>
                {puedeEditar && <th className="w-16" />}
              </tr>
            </thead>
            <tbody>
              {cot.lineas.map(l => (
                <tr key={l.id} className="border-b border-surface-border/40 last:border-0 hover:bg-surface-muted/50 transition-colors">
                  <td className="py-2.5 pr-3 text-text-primary">{l.descripcion}</td>
                  <td className="py-2.5 text-right text-text-secondary px-3 tabular-nums">{Number(l.cantidad)}</td>
                  <td className="py-2.5 text-right text-text-secondary px-3 font-mono tabular-nums">{fmt(l.precio_unitario)}</td>
                  <td className="py-2.5 text-right px-3 tabular-nums">
                    {Number(l.descuento_pct) > 0
                      ? <span className="text-emerald-600 font-medium">{fmtPct(l.descuento_pct)}</span>
                      : <span className="text-text-disabled">—</span>
                    }
                  </td>
                  <td className="py-2.5 text-right text-text-disabled font-mono px-3 tabular-nums line-through">
                    {Number(l.descuento_pct) > 0
                      ? fmt(Number(l.cantidad) * Number(l.precio_unitario))
                      : <span className="no-underline">—</span>}
                  </td>
                  <td className="py-2.5 text-right font-semibold text-text-primary font-mono pl-3 tabular-nums">{fmt(l.subtotal)}</td>
                  {puedeEditar && (
                    <td className="py-2.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setEditingLinea(l)}
                          className="text-text-disabled hover:text-primary transition-colors p-1 rounded"
                          title="Editar línea"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                              d="M15.232 5.232l3.536 3.536M9 13l6.5-6.5a2 2 0 012.828 2.828L11.828 15.828a4 4 0 01-2.828 1.172H7v-2a4 4 0 011.172-2.828z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => eliminarLinea.mutate(l.id)}
                          disabled={eliminarLinea.isPending}
                          className="text-text-disabled hover:text-danger transition-colors p-1 rounded disabled:opacity-50"
                          title="Eliminar línea"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Totales */}
        <div className="mt-3 pt-3 border-t border-surface-border space-y-1.5">
          <div className="flex justify-between text-sm text-text-secondary">
            <span>Subtotal</span><span className="font-mono tabular-nums">{fmt(cot.monto_subtotal)}</span>
          </div>
          {hayDescuento && (
            <div className="flex justify-between text-sm text-emerald-700">
              <span>
                Descuento {fmtPct(cot.descuento_global_pct!)}
                {cot.descuento_motivo && <span className="text-emerald-600 text-xs ml-1">({MOTIVO_LABEL[cot.descuento_motivo] ?? cot.descuento_motivo})</span>}
              </span>
              <span className="font-mono tabular-nums">-{fmt(Number(cot.monto_subtotal) * Number(cot.descuento_global_pct) / 100)}</span>
            </div>
          )}
          <div className="flex justify-between text-sm text-text-secondary">
            <span>IVA (19%)</span><span className="font-mono tabular-nums">{fmt(cot.monto_iva)}</span>
          </div>
          <div className="flex justify-between text-base font-bold text-text-primary pt-1.5 border-t border-surface-border">
            <span>Total</span><span className="font-mono tabular-nums">{fmt(cot.monto_total)}</span>
          </div>
        </div>
      </div>

      {/* Notas */}
      {(cot.notas_internas || cot.notas_cliente) && (
        <div className="px-5 pb-3 space-y-0.5 border-t border-surface-border pt-3">
          {cot.notas_internas && (
            <p className="text-xs text-text-secondary"><strong>Interno:</strong> {cot.notas_internas}</p>
          )}
          {cot.notas_cliente && (
            <p className="text-xs text-text-secondary"><strong>Cliente:</strong> {cot.notas_cliente}</p>
          )}
        </div>
      )}

      {/* Card footer — acciones */}
      {(puedeEditar || siguientes.length > 0) && (
        <div className="flex items-center justify-between px-5 py-3 bg-surface-muted border-t border-surface-border gap-2 flex-wrap">
          <div className="flex gap-2">
            {puedeEditar && (
              <Button size="sm" variant="outline" onClick={() => setLineaOpen(true)}>
                + Agregar línea
              </Button>
            )}
            {/* Botones disponibles cuando hay líneas */}
            {cot.lineas.length > 0 && (
              <>
                <Button size="sm" variant="outline" onClick={handleDescargarPdf}>
                  <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  {cot.estado === 'ENVIADA' ? 'Re-descargar PDF' : 'Descargar PDF'}
                </Button>
                <Button size="sm" variant="outline" onClick={() => { setEmailDest(clienteEmail ?? ''); setEmailOpen(true) }}>
                  <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  {cot.estado === 'ENVIADA' ? 'Reenviar por email' : 'Enviar por email'}
                </Button>
              </>
            )}
          </div>
          <div className="flex gap-2 flex-wrap items-center">
            {siguientes.map(t => (
              <span key={t} className="inline-flex items-center">
                <Button
                  size="sm"
                  variant={t === 'RECHAZADA' || t === 'VENCIDA' ? 'danger' : 'primary'}
                  loading={pendingEstadoCot}
                  onClick={() => onEstadoCot(cot.id, t)}
                >
                  {COT_TRANSICION_LABEL[t] ?? ESTADO_COTIZACION_LABEL[t]}
                </Button>
                {COT_TRANSICION_TOOLTIP[t] && <Tooltip text={COT_TRANSICION_TOOLTIP[t]!} />}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Modal envío email */}
      <Modal open={emailOpen} onClose={() => setEmailOpen(false)} title="Enviar cotización por email" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-text-secondary">
            Se enviará la cotización <strong>{cot.codigo}</strong> al correo indicado.
          </p>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-text-primary">Correo del destinatario</label>
            <input
              type="email"
              autoFocus
              value={emailDest}
              onChange={e => setEmailDest(e.target.value)}
              placeholder="cliente@empresa.cl"
              className="rounded-lg border border-surface-border bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="ghost" onClick={() => setEmailOpen(false)}>Cancelar</Button>
            <Button
              loading={enviarEmail.isPending}
              disabled={!emailDest.includes('@')}
              onClick={() => enviarEmail.mutate(emailDest)}
            >
              Enviar
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal ¿Marcar como enviada? — aparece tras descargar PDF en BORRADOR */}
      <Modal open={marcarEnviadaOpen} onClose={() => setMarcarEnviadaOpen(false)} title="PDF descargado" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-text-secondary">
            ¿Deseas marcar <strong>{cot.codigo}</strong> como enviada al cliente?
          </p>
          <p className="text-xs text-text-disabled">
            Puedes volver a descargar el PDF en cualquier momento si necesitas reenviarla.
          </p>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="ghost" onClick={() => setMarcarEnviadaOpen(false)}>No por ahora</Button>
            <Button onClick={handleConfirmarEnviada}>Sí, marcar como enviada</Button>
          </div>
        </div>
      </Modal>

      {/* Modal agregar línea */}
      <LineaForm
        open={lineaOpen}
        isPending={agregarLinea.isPending}
        onConfirm={handleAgregarLinea}
        onClose={() => setLineaOpen(false)}
      />

      {/* Modal editar línea */}
      <LineaForm
        open={!!editingLinea}
        initial={editingLinea}
        isPending={actualizarLinea.isPending}
        onConfirm={handleEditarLinea}
        onClose={() => setEditingLinea(null)}
      />
    </div>
  )
}

// ─── Labels actividad ─────────────────────────────────────────────────────────

const ACTIVIDAD_ENTITY_LABEL: Record<string, string> = {
  ventas:             'Venta',
  cotizaciones:       'Cotización',
  lineas_cotizacion:  'Línea',
  stubs:              'Solicitud',
}

const ACTIVIDAD_ACTION_LABEL: Record<string, string> = {
  CREATE: 'Creado',
  UPDATE: 'Actualizado',
  DELETE: 'Eliminado',
}

function buildActividadTexto(item: ActividadItem): string {
  const entidad = ACTIVIDAD_ENTITY_LABEL[item.entity_type] ?? item.entity_type
  const accion  = ACTIVIDAD_ACTION_LABEL[item.action] ?? item.action
  const codigo  = item.entity_codigo ? ` ${item.entity_codigo}` : ''
  const estado  = item.event_data?.estado ? ` → ${item.event_data.estado}` : ''
  const accionExtra = item.event_data?.accion
    ? ` (${item.event_data.accion === 'email_enviado' ? 'email enviado' : item.event_data.accion})`
    : ''
  return `${entidad}${codigo} ${accion}${estado}${accionExtra}`
}

const STUB_TIPO_LABEL: Record<string, string> = { BOD: 'Bodega', COB: 'Cobranza', CTB: 'Contabilidad', GER: 'Gerencia' }
const STUB_TIPO_COLOR: Record<string, string> = {
  BOD: 'bg-sky-100 text-sky-700',
  COB: 'bg-amber-100 text-amber-700',
  CTB: 'bg-purple-100 text-purple-700',
  GER: 'bg-rose-100 text-rose-700',
}
const STUB_ESTADO_COLOR: Record<string, string> = {
  PENDIENTE:   'bg-yellow-100 text-yellow-700',
  EN_REVISION: 'bg-blue-100 text-blue-700',
  COMPLETADA:  'bg-emerald-100 text-emerald-700',
  RECHAZADA:   'bg-rose-100 text-rose-700',
}

// ─── VentaDetailView ──────────────────────────────────────────────────────────

export const VentaDetailView = () => {
  const { id = '' } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [anularOpen, setAnularOpen] = useState(false)
  const [cotizacionOpen, setCotizacionOpen] = useState(false)
  const [editandoFecha, setEditandoFecha] = useState(false)
  const [tab, setTab] = useState<'cotizaciones' | 'solicitudes' | 'instalaciones'>('cotizaciones')

  const { data: venta, isLoading, isError } = useVenta(id)
  const { data: cotizaciones = [], isLoading: loadingCots } = useCotizaciones(id)
  const { data: stubsData } = useStubsVenta(id)
  const { data: actividad = [] } = useActividadVenta(id)
  const stubs: SolicitudStub[] = stubsData?.data ?? []
  const { data: cliente } = useCliente(venta?.cliente_id ?? '')
  const { data: productosData } = useProductos({ limit: 200, activo: true })

  const cambiarEstadoVenta = useCambiarEstadoVenta(id)
  const cambiarEstadoCot   = useCambiarEstadoCotizacion(id)
  const crearCotizacion    = useCrearCotizacion(id)
  const actualizarVenta    = useActualizarVenta(id)
  const queryClient        = useQueryClient()

  if (isLoading) {
    return (
      <div className="p-6 max-w-screen-2xl mx-auto animate-pulse space-y-4">
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

  // Cotización aceptada (solo puede haber una)
  const cotizacionAceptada = cotizaciones.find(c => c.estado === 'ACEPTADA') ?? null

  // Si no hay aceptada, suma las activas (BORRADOR + ENVIADA) como referencia
  const montoTotalActivas = cotizaciones
    .filter(c => !['RECHAZADA', 'VENCIDA'].includes(c.estado))
    .reduce((sum, c) => sum + Number(c.monto_total), 0)

  // COTIZACION_ENVIADA se activa automáticamente al enviar email.
  // Se expone como botón manual solo si la venta está en CONSULTA_ABIERTA y ya hay una cotización ENVIADA.
  const hayCotEnviada = cotizaciones.some(c => c.estado === 'ENVIADA')
  const transicionesDisponibles = (TRANSICIONES_VENTA[venta.estado] ?? []).filter(e => {
    if (e === 'ANULADA') return false
    if (e === 'COTIZACION_ENVIADA') return hayCotEnviada
    return true
  })
  const puedeAnular = venta.estado !== 'CERRADA' && venta.estado !== 'ANULADA'
  const hayAceptada = cotizacionAceptada !== null
  const puedeCrearCot = venta.estado === 'CONSULTA_ABIERTA' && !hayAceptada

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
      if (data.requiere_cubicacion && newCot?.id) {
        const prodCubicacion = productosData?.data?.find(p => p.codigo === 'SRV-001')
        if (prodCubicacion) {
          await ventasApi.agregarLinea(newCot.id, {
            producto_id: prodCubicacion.id,
            descripcion: prodCubicacion.nombre,
            cantidad: 1,
            precio_unitario: Number(prodCubicacion.precio_base),
            descuento_pct: 0,
            unidad_medida: prodCubicacion.unidad_medida,
          })
        }
        queryClient.invalidateQueries({ queryKey: ventasKeys.cotizaciones(id) })
      }
    } catch { /* errores manejados por toast en el hook */ }
    setCotizacionOpen(false)
  }

  return (
    <div className="p-6 max-w-screen-2xl mx-auto space-y-5">

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
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">

        {/* ── Izquierda: tabs ── */}
        <div className="lg:col-span-2 space-y-4">

          {/* Tab bar */}
          <div className="flex items-center gap-1 border-b border-surface-border">
            {([
              { key: 'cotizaciones',  label: 'Cotizaciones',  count: cotizaciones.length },
              { key: 'solicitudes',   label: 'Solicitudes',   count: stubs.length },
              { key: 'instalaciones', label: 'Instalaciones', count: 0 },
            ] as const).map(({ key, label, count }) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={[
                  'px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors',
                  tab === key
                    ? 'border-primary text-primary'
                    : 'border-transparent text-text-secondary hover:text-text-primary',
                ].join(' ')}
              >
                {label}
                {count > 0 && (
                  <span className={[
                    'ml-1.5 text-xs px-1.5 py-0.5 rounded-full font-normal',
                    tab === key ? 'bg-primary/10 text-primary' : 'bg-surface-subtle text-text-disabled',
                  ].join(' ')}>
                    {count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* ── Tab: Cotizaciones ── */}
          {tab === 'cotizaciones' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 shrink-0 ml-auto">
                  {venta.estado === 'COTIZACION_ENVIADA' && (
                    <span className="text-xs text-text-disabled italic hidden sm:inline">
                      Reabre como consulta para crear una nueva
                    </span>
                  )}
                  {venta.estado === 'CONSULTA_ABIERTA' && hayAceptada && (
                    <Button
                      size="sm"
                      variant="primary"
                      loading={cambiarEstadoVenta.isPending}
                      onClick={() => handleTransicion('VENTA_GENERADA')}
                    >
                      Confirmar venta
                    </Button>
                  )}
                  {puedeCrearCot && (
                    <Button size="sm" onClick={() => setCotizacionOpen(true)}>+ Nueva cotización</Button>
                  )}
                </div>
              </div>

              {loadingCots ? (
                <div className="space-y-3 animate-pulse">
                  {[1, 2].map(i => <div key={i} className="h-40 bg-surface-subtle rounded-xl" />)}
                </div>
              ) : cotizaciones.length === 0 ? (
                <div className="rounded-xl border border-dashed border-surface-border p-10 text-center bg-white">
                  <p className="text-text-secondary text-sm mb-4">No hay cotizaciones aún.</p>
                  {puedeCrearCot && (
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
                    clienteEmail={cliente?.email ?? ''}
                    ventaEstado={venta.estado}
                    hayAceptada={hayAceptada}
                    onEstadoCot={handleCotEstado}
                    onEstadoVenta={handleTransicion}
                    pendingEstadoCot={cambiarEstadoCot.isPending}
                  />
                ))
              )}
            </div>
          )}

          {/* ── Tab: Solicitudes ── */}
          {tab === 'solicitudes' && (
            <div className="space-y-3">
              {stubs.length === 0 ? (
                <div className="rounded-xl border border-dashed border-surface-border p-10 text-center bg-white">
                  <p className="text-text-secondary text-sm">No hay solicitudes generadas aún.</p>
                  <p className="text-xs text-text-disabled mt-1">Se crean automáticamente al confirmar la venta.</p>
                </div>
              ) : (
                stubs.map(stub => (
                  <div key={stub.id} className="rounded-xl border border-surface-border bg-white shadow-sm p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-sm font-semibold text-text-primary">{stub.codigo}</span>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STUB_TIPO_COLOR[stub.tipo] ?? 'bg-surface-subtle text-text-secondary'}`}>
                          {STUB_TIPO_LABEL[stub.tipo] ?? stub.tipo}
                        </span>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STUB_ESTADO_COLOR[stub.estado] ?? 'bg-surface-subtle text-text-secondary'}`}>
                          {ESTADO_STUB_LABEL[stub.estado as keyof typeof ESTADO_STUB_LABEL] ?? stub.estado}
                        </span>
                      </div>
                      {stub.fecha_limite && (
                        <span className="text-xs text-text-disabled shrink-0">
                          Límite: {fmtDate(stub.fecha_limite)}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-text-secondary mt-2">{stub.descripcion}</p>
                    {stub.respuesta && (
                      <p className="text-xs text-text-disabled mt-1 italic">Respuesta: {stub.respuesta}</p>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {/* ── Tab: Instalaciones (stub Fase 1B) ── */}
          {tab === 'instalaciones' && (
            <div className="rounded-xl border border-dashed border-surface-border p-10 text-center bg-white">
              <p className="text-text-secondary text-sm">Módulo de instalaciones disponible en Fase 1B.</p>
            </div>
          )}
        </div>

        {/* ── Derecha: info + transiciones ── */}
        <div className="space-y-4">

          {/* Info */}
          <div className="rounded-xl border border-surface-border bg-white shadow-sm p-5 space-y-3">
            <h3 className="text-xs font-semibold text-text-disabled uppercase tracking-wide">Información</h3>
            <dl className="space-y-2.5 text-sm">
              <div className="flex justify-between gap-2">
                <dt className="text-text-secondary shrink-0">Cliente</dt>
                <dd className="font-medium text-text-primary text-right">{cliente?.razon_social ?? '—'}</dd>
              </div>
              {cliente?.rut && (
                <div className="flex justify-between gap-2">
                  <dt className="text-text-secondary shrink-0">RUT</dt>
                  <dd className="font-mono text-text-primary">{cliente.rut}</dd>
                </div>
              )}
              <div className="flex justify-between gap-2 pt-1 border-t border-surface-border">
                {cotizacionAceptada ? (
                  <>
                    <dt className="text-text-secondary shrink-0 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                      Cotización aceptada
                    </dt>
                    <dd className="font-semibold text-emerald-700 font-mono tabular-nums">{fmt(Number(cotizacionAceptada.monto_total))}</dd>
                  </>
                ) : (
                  <>
                    <dt className="text-text-secondary shrink-0">Cotizaciones activas</dt>
                    <dd className="font-semibold text-text-primary font-mono tabular-nums">{fmt(montoTotalActivas)}</dd>
                  </>
                )}
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-text-secondary shrink-0">Fecha Creación</dt>
                <dd className="text-text-primary">{fmtDate(venta.created_at)}</dd>
              </div>

              {/* Fecha cierre — editable inline */}
              <div className="flex justify-between items-center gap-2">
                <dt className="text-text-secondary shrink-0">Cierre esperado óptimo</dt>
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
                {transicionesDisponibles.map(estado => {
                  const requiereAceptada = estado === 'VENTA_GENERADA'
                  const deshabilitado = requiereAceptada && !hayAceptada
                  const tooltip = deshabilitado
                    ? 'Debes tener al menos una cotización aceptada para confirmar la venta.'
                    : TRANSICION_TOOLTIP[estado]
                  return (
                    <span key={estado} className="inline-flex items-center gap-1">
                      <Button
                        variant={estado === 'CONSULTA_ABIERTA' ? 'outline' : 'primary'}
                        loading={cambiarEstadoVenta.isPending}
                        disabled={deshabilitado}
                        onClick={() => handleTransicion(estado)}
                        className="w-full justify-center"
                      >
                        {TRANSICION_LABEL[estado] ?? ESTADO_VENTA_LABEL[estado]}
                      </Button>
                      {tooltip && <Tooltip text={tooltip} />}
                    </span>
                  )
                })}
              </div>
            </div>
          )}

          {/* Timeline de actividad */}
          {(() => {
            const totalMs = actividad.length >= 2
              ? new Date(actividad[0].created_at).getTime() - new Date(actividad[actividad.length - 1].created_at).getTime()
              : null
            return (
              <div className="rounded-xl border border-surface-border bg-white shadow-sm p-5 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-xs font-semibold text-text-disabled uppercase tracking-wide">Actividad</h3>
                  {totalMs !== null && (
                    <span className="text-[11px] text-text-disabled bg-surface-muted px-2 py-0.5 rounded-full">
                      Duración total: {fmtDuration(totalMs)}
                    </span>
                  )}
                </div>
                {actividad.length === 0 ? (
                  <p className="text-xs text-text-disabled italic">Sin actividad registrada.</p>
                ) : (
                  <ol className="space-y-3">
                    {actividad.map((item, idx) => {
                      const nextItem = actividad[idx + 1]
                      const duracionMs = nextItem
                        ? new Date(item.created_at).getTime() - new Date(nextItem.created_at).getTime()
                        : null
                      return (
                        <li key={item.id} className="flex gap-3">
                          <div className="flex flex-col items-center">
                            <span className="w-2 h-2 rounded-full bg-primary/40 mt-1 shrink-0" />
                            <span className="w-px flex-1 bg-surface-border mt-1" />
                          </div>
                          <div className="pb-3 min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-xs text-text-primary leading-snug">{buildActividadTexto(item)}</p>
                              {duracionMs !== null && (
                                <span className="text-[10px] text-text-disabled bg-surface-muted px-1.5 py-0.5 rounded shrink-0 tabular-nums">
                                  {fmtDuration(duracionMs)}
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-text-disabled mt-0.5">
                              {fmtDate(item.created_at)} · {fmtTime(item.created_at)}
                              <span className="ml-1 text-text-disabled/70">· {item.user_nombre ?? 'Sistema'}</span>
                            </p>
                          </div>
                        </li>
                      )
                    })}
                  </ol>
                )}
              </div>
            )
          })()}

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
