import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { Badge, Button, Modal } from '@/shared/components/ui'
import { useToast } from '@/shared/hooks/useToast'
import {
  useSAC, useCambiarEstadoSAC,
  useContactos, useCrearContacto, useEliminarContacto,
  useOTs, useCrearOT, useCambiarEstadoOT,
  useChecklistOT, useGuardarRespuesta,
} from '../hooks/useSAC'
import {
  ESTADO_SAC_LABEL, ESTADO_OT_LABEL, CARGO_LABEL,
  TRANSICIONES_SAC, TRANSICIONES_OT,
} from '../types'
import type {
  EstadoSAC, EstadoOT, ContactoObraCreate,
  SACCambioEstado, OTCambioEstado, ChecklistItem, OrdenTrabajo,
} from '../types'

// ─── Helpers ─────────────────────────────────────────────────────────────────

const Icon = ({ name, className = '' }: { name: string; className?: string }) => (
  <span className={`material-symbols-outlined ${className}`}>{name}</span>
)

const fmtDate = (s: string | null | undefined) =>
  s ? new Date(s).toLocaleDateString('es-CL') : '—'

const fmtDateTime = (s: string | null | undefined) =>
  s ? new Date(s).toLocaleString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'

const BADGE_SAC: Record<EstadoSAC, 'info' | 'warning' | 'success' | 'neutral' | 'danger'> = {
  CREADO: 'info', REVISION_INFO: 'warning', EN_GESTION_VTA: 'warning',
  EN_COORDINACION: 'info', PROGRAMADO: 'info', REPROGRAMADO: 'warning',
  EN_EJECUCION: 'success', COMPLETADO: 'success', GESTION_COBRO: 'info',
  CERRADO: 'neutral', CERRADO_SIN_EJECUTAR: 'danger', CERRADO_SIN_TERMINAR: 'danger',
}

const BADGE_OT: Record<EstadoOT, 'info' | 'warning' | 'success' | 'neutral' | 'danger'> = {
  PENDIENTE: 'neutral', EN_EJECUCION: 'success', PAUSADA: 'warning',
  ENTREGA_PARCIAL: 'info', COMPLETADA: 'success', CERRADA_ADMIN: 'neutral',
  CERRADA_SIN_EJECUTAR: 'danger', CERRADA_SIN_TERMINAR: 'danger',
}

// ─── Sección de info ─────────────────────────────────────────────────────────

const InfoRow = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="flex gap-2 text-sm">
    <span className="text-text-secondary w-36 flex-shrink-0">{label}</span>
    <span className="text-text-primary font-medium">{value ?? '—'}</span>
  </div>
)

// ─── Panel de checklist ───────────────────────────────────────────────────────

const ChecklistPanel = ({ ot }: { ot: OrdenTrabajo }) => {
  const { data: items = [], isLoading } = useChecklistOT(ot.id)
  const { mutate: guardar, isPending } = useGuardarRespuesta(ot.id)
  const toast = useToast()

  const handleSiNo = (preguntaId: string, valor: boolean) => {
    guardar(
      { pregunta_id: preguntaId, respuesta_boolean: valor },
      { onError: () => toast.error('Error al guardar respuesta') },
    )
  }

  if (isLoading) return <div className="text-sm text-text-secondary py-4">Cargando checklist...</div>

  const completadas = items.filter(i => i.respuesta !== null).length
  const total = items.length

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-text-secondary">{completadas}/{total} respondidas</span>
        <div className="w-32 h-1.5 bg-surface-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all"
            style={{ width: `${total > 0 ? (completadas / total) * 100 : 0}%` }}
          />
        </div>
      </div>
      <div className="space-y-3">
        {items.map((item: ChecklistItem) => (
          <div key={item.pregunta.id} className="p-3 bg-surface-muted rounded-lg">
            <p className="text-sm text-text-primary mb-2">
              {item.pregunta.obligatorio && <span className="text-danger mr-1">*</span>}
              {item.pregunta.texto}
            </p>
            {item.pregunta.tipo_respuesta === 'si_no' && (
              <div className="flex gap-2">
                {[true, false].map(val => (
                  <button
                    key={String(val)}
                    disabled={isPending}
                    onClick={() => handleSiNo(item.pregunta.id, val)}
                    className={`px-4 py-1.5 rounded-lg text-sm border transition-colors ${
                      item.respuesta?.respuesta_boolean === val
                        ? val ? 'bg-success-10 text-success-text border-success-text/30 font-semibold'
                               : 'bg-danger-10 text-danger-text border-danger-text/30 font-semibold'
                        : 'bg-white text-text-secondary border-surface-border hover:bg-surface-muted'
                    }`}
                  >
                    {val ? 'Sí' : 'No'}
                  </button>
                ))}
              </div>
            )}
            {item.pregunta.tipo_respuesta === 'texto' && (
              <textarea
                defaultValue={item.respuesta?.respuesta_texto ?? ''}
                onBlur={e => guardar({ pregunta_id: item.pregunta.id, respuesta_texto: e.target.value })}
                rows={2}
                placeholder="Escribir observación..."
                className="w-full text-sm border border-surface-border rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Panel de OT ─────────────────────────────────────────────────────────────

const OTPanel = ({ ot, sacId }: { ot: OrdenTrabajo; sacId: string }) => {
  const [expanded, setExpanded] = useState(false)
  const [showEstado, setShowEstado] = useState(false)
  const [nuevoEstado, setNuevoEstado] = useState<EstadoOT | ''>('')
  const [motivo, setMotivo] = useState('')
  const { mutate: cambiarEstado, isPending } = useCambiarEstadoOT(ot.id, sacId)
  const toast = useToast()

  const transiciones = TRANSICIONES_OT[ot.estado] ?? []
  const necesitaMotivo = nuevoEstado === 'PAUSADA' || nuevoEstado === 'CERRADA_SIN_EJECUTAR' || nuevoEstado === 'CERRADA_SIN_TERMINAR'

  const handleCambio = () => {
    if (!nuevoEstado) return
    const payload: OTCambioEstado = { estado: nuevoEstado }
    if (nuevoEstado === 'PAUSADA') payload.motivo_pausa = motivo
    if (nuevoEstado === 'CERRADA_SIN_EJECUTAR' || nuevoEstado === 'CERRADA_SIN_TERMINAR') payload.motivo_cierre = motivo
    cambiarEstado(payload, {
      onSuccess: () => { setShowEstado(false); setMotivo('') },
      onError: (e: any) => toast.error(e?.response?.data?.detail ?? 'Error al cambiar estado'),
    })
  }

  return (
    <div className="border border-surface-border rounded-xl overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 bg-surface-muted cursor-pointer hover:bg-surface-border/30 transition-colors"
        onClick={() => setExpanded(v => !v)}
      >
        <div className="flex items-center gap-3">
          <Icon name={expanded ? 'expand_less' : 'expand_more'} className="text-text-secondary text-lg" />
          <span className="font-mono text-sm font-bold text-text-primary">{ot.codigo}</span>
          <Badge variant={BADGE_OT[ot.estado]}>{ESTADO_OT_LABEL[ot.estado]}</Badge>
          {ot.checklist_completado && (
            <Badge variant="success">Checklist ✓</Badge>
          )}
        </div>
        {transiciones.length > 0 && (
          <button
            onClick={e => { e.stopPropagation(); setShowEstado(true) }}
            className="text-xs px-3 py-1 rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors"
          >
            Cambiar estado
          </button>
        )}
      </div>

      {expanded && (
        <div className="p-4 space-y-4">
          {/* Info */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <InfoRow label="Inicio" value={fmtDate(ot.fecha_inicio)} />
            <InfoRow label="Fin real" value={fmtDate(ot.fecha_fin_real)} />
            <InfoRow label="Duración" value={ot.duracion_total_minutos ? `${ot.duracion_total_minutos} min` : null} />
          </div>
          {ot.notas && <p className="text-sm text-text-secondary bg-surface-muted p-3 rounded-lg">{ot.notas}</p>}

          {/* Checklist */}
          <div>
            <p className="text-sm font-semibold text-text-primary mb-2 flex items-center gap-1">
              <Icon name="checklist" className="text-base" /> Checklist de instalación
            </p>
            <ChecklistPanel ot={ot} />
          </div>
        </div>
      )}

      {/* Modal cambio estado OT */}
      <Modal open={showEstado} onClose={() => setShowEstado(false)} title="Cambiar estado OT" size="sm">
        <div className="space-y-3">
          <select
            value={nuevoEstado}
            onChange={e => setNuevoEstado(e.target.value as EstadoOT)}
            className="w-full border border-surface-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="">Seleccionar nuevo estado</option>
            {transiciones.map(t => (
              <option key={t} value={t}>{ESTADO_OT_LABEL[t]}</option>
            ))}
          </select>
          {necesitaMotivo && (
            <textarea
              value={motivo}
              onChange={e => setMotivo(e.target.value)}
              placeholder="Motivo (requerido)"
              rows={3}
              className="w-full border border-surface-border rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          )}
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" onClick={() => setShowEstado(false)}>Cancelar</Button>
            <Button
              disabled={!nuevoEstado || isPending || (necesitaMotivo && !motivo.trim())}
              loading={isPending}
              onClick={handleCambio}
            >
              Confirmar
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

// ─── Vista principal ──────────────────────────────────────────────────────────

export const SACDetailView = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const toast = useToast()

  const { data: sac, isLoading } = useSAC(id!)
  const { data: contactos = [] } = useContactos(id!)
  const { data: ots = [] } = useOTs(id!)

  const { mutate: cambiarEstado, isPending: cambiando } = useCambiarEstadoSAC(id!)
  const { mutate: crearContacto, isPending: creandoContacto } = useCrearContacto(id!)
  const { mutate: eliminarContacto } = useEliminarContacto(id!)
  const { mutate: crearOT, isPending: creandoOT } = useCrearOT(id!)

  // Modal estado SAC
  const [showEstado, setShowEstado] = useState(false)
  const [nuevoEstado, setNuevoEstado] = useState<EstadoSAC | ''>('')
  const [motivoDevolucion, setMotivoDevolucion] = useState('')
  const [motivoCierre, setMotivoCierre] = useState('')

  // Modal contacto
  const [showContacto, setShowContacto] = useState(false)
  const [contactoForm, setContactoForm] = useState<ContactoObraCreate>({ nombre: '', cargo: 'otro' })

  // Modal OT
  const [showOT, setShowOT] = useState(false)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    )
  }

  if (!sac) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-text-secondary">
        <Icon name="error_outline" className="text-5xl mb-2" />
        <p>SAC no encontrado</p>
      </div>
    )
  }

  const transicionesSAC = TRANSICIONES_SAC[sac.estado] ?? []
  const necesitaMotivoDev = nuevoEstado === 'EN_GESTION_VTA'
  const necesitaMotivoCierre = nuevoEstado === 'CERRADO_SIN_EJECUTAR' || nuevoEstado === 'CERRADO_SIN_TERMINAR'

  const handleCambioEstado = () => {
    if (!nuevoEstado) return
    const payload: SACCambioEstado = { estado: nuevoEstado }
    if (necesitaMotivoDev) payload.motivo_devolucion = motivoDevolucion
    if (necesitaMotivoCierre) payload.motivo_cierre = motivoCierre
    cambiarEstado(payload, {
      onSuccess: () => { setShowEstado(false); setMotivoDevolucion(''); setMotivoCierre('') },
      onError: (e: any) => toast.error(e?.response?.data?.detail ?? 'Error al cambiar estado'),
    })
  }

  const handleCrearContacto = () => {
    crearContacto(contactoForm, {
      onSuccess: () => { setShowContacto(false); setContactoForm({ nombre: '', cargo: 'otro' }) },
      onError: () => toast.error('Error al crear contacto'),
    })
  }

  const handleCrearOT = () => {
    crearOT({}, {
      onSuccess: () => setShowOT(false),
      onError: () => toast.error('Error al crear OT'),
    })
  }

  return (
    <div className="flex flex-col h-full">
      {/* ── Header ── */}
      <div className="px-8 pt-8 pb-5 bg-white border-b border-surface-border flex-shrink-0">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <button onClick={() => navigate('/instalaciones')} className="text-text-secondary hover:text-primary transition-colors">
                <Icon name="arrow_back" className="text-xl" />
              </button>
              <h1 className="text-2xl font-bold text-text-primary font-mono">{sac.codigo}</h1>
              <Badge variant={BADGE_SAC[sac.estado]}>{ESTADO_SAC_LABEL[sac.estado]}</Badge>
            </div>
            {sac.venta_id && (
              <Link to={`/ventas/${sac.venta_id}`} className="text-xs text-primary hover:underline ml-9">
                <Icon name="link" className="text-xs mr-0.5 align-middle" />
                Ver venta vinculada
              </Link>
            )}
          </div>
          {transicionesSAC.length > 0 && (
            <Button onClick={() => setShowEstado(true)}>
              <Icon name="swap_horiz" className="text-base mr-1" />
              Cambiar estado
            </Button>
          )}
        </div>
      </div>

      {/* ── Contenido ── */}
      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Columna izquierda: info + contactos */}
          <div className="lg:col-span-1 space-y-6">

            {/* Info general */}
            <div className="bg-white rounded-xl border border-surface-border p-5">
              <h2 className="text-sm font-semibold text-text-primary mb-4 flex items-center gap-1">
                <Icon name="info" className="text-base text-text-secondary" /> Información
              </h2>
              <div className="space-y-3">
                <InfoRow label="Tipo" value={sac.tipo === 'suministro_instalacion' ? 'Mat. + Instalación' : 'Solo Instalación'} />
                <InfoRow label="Dirección" value={sac.direccion_obra} />
                <InfoRow label="Comuna" value={[sac.comuna_obra, sac.ciudad_obra].filter(Boolean).join(', ') || null} />
                <InfoRow label="Programado" value={fmtDate(sac.fecha_programada)} />
                <InfoRow label="Ejecución" value={fmtDate(sac.fecha_ejecucion)} />
                <InfoRow label="Cierre" value={fmtDateTime(sac.fecha_cierre)} />
                {sac.notas && <InfoRow label="Notas" value={sac.notas} />}
                {sac.motivo_devolucion && (
                  <div className="mt-2 p-3 bg-warning-10 rounded-lg text-xs text-warning-text">
                    <p className="font-semibold mb-1">Motivo devolución a Ventas</p>
                    <p>{sac.motivo_devolucion}</p>
                  </div>
                )}
                {sac.motivo_cierre && (
                  <div className="mt-2 p-3 bg-danger-10 rounded-lg text-xs text-danger-text">
                    <p className="font-semibold mb-1">Motivo cierre forzado</p>
                    <p>{sac.motivo_cierre}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Contactos de obra */}
            <div className="bg-white rounded-xl border border-surface-border p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-text-primary flex items-center gap-1">
                  <Icon name="contacts" className="text-base text-text-secondary" /> Contactos de obra
                </h2>
                <button
                  onClick={() => setShowContacto(true)}
                  className="text-xs text-primary hover:underline"
                >
                  + Agregar
                </button>
              </div>
              {contactos.length === 0 ? (
                <p className="text-xs text-text-secondary text-center py-3">Sin contactos registrados</p>
              ) : (
                <div className="space-y-3">
                  {contactos.map(c => (
                    <div key={c.id} className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium text-text-primary">
                          {c.nombre}
                          {c.es_principal && <span className="ml-1 text-[10px] text-primary font-bold">PRINCIPAL</span>}
                        </p>
                        <p className="text-xs text-text-secondary">{CARGO_LABEL[c.cargo]}</p>
                        {c.telefono && <p className="text-xs text-text-secondary">{c.telefono}</p>}
                        {c.email && <p className="text-xs text-text-secondary">{c.email}</p>}
                      </div>
                      <button
                        onClick={() => eliminarContacto(c.id)}
                        className="text-text-secondary hover:text-danger transition-colors mt-0.5"
                      >
                        <Icon name="delete" className="text-base" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Columna derecha: OTs */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-text-primary flex items-center gap-1">
                <Icon name="assignment" className="text-base text-text-secondary" />
                Órdenes de Trabajo ({ots.length})
              </h2>
              {['EN_COORDINACION', 'PROGRAMADO'].includes(sac.estado) && (
                <Button size="sm" onClick={() => setShowOT(true)}>
                  <Icon name="add" className="text-base mr-1" />
                  Nueva OT
                </Button>
              )}
            </div>

            {ots.length === 0 ? (
              <div className="bg-white rounded-xl border border-surface-border p-8 text-center text-text-secondary">
                <Icon name="assignment_late" className="text-4xl mb-2 text-slate-300" />
                <p className="text-sm">Sin órdenes de trabajo</p>
                <p className="text-xs mt-1">Crea una OT cuando el SAC esté en coordinación</p>
              </div>
            ) : (
              <div className="space-y-3">
                {ots.map(ot => (
                  <OTPanel key={ot.id} ot={ot} sacId={id!} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Modal: cambio estado SAC ── */}
      <Modal open={showEstado} onClose={() => setShowEstado(false)} title="Cambiar estado SAC" size="sm">
        <div className="space-y-3">
          <p className="text-sm text-text-secondary">Estado actual: <Badge variant={BADGE_SAC[sac.estado]}>{ESTADO_SAC_LABEL[sac.estado]}</Badge></p>
          <select
            value={nuevoEstado}
            onChange={e => setNuevoEstado(e.target.value as EstadoSAC)}
            className="w-full border border-surface-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="">Seleccionar nuevo estado</option>
            {transicionesSAC.map(t => (
              <option key={t} value={t}>{ESTADO_SAC_LABEL[t]}</option>
            ))}
          </select>
          {necesitaMotivoDev && (
            <textarea
              value={motivoDevolucion}
              onChange={e => setMotivoDevolucion(e.target.value)}
              placeholder="Motivo de devolución a Ventas (requerido)"
              rows={3}
              className="w-full border border-surface-border rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          )}
          {necesitaMotivoCierre && (
            <textarea
              value={motivoCierre}
              onChange={e => setMotivoCierre(e.target.value)}
              placeholder="Motivo de cierre forzado (requerido)"
              rows={3}
              className="w-full border border-surface-border rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          )}
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" onClick={() => setShowEstado(false)}>Cancelar</Button>
            <Button
              disabled={
                !nuevoEstado || cambiando ||
                (necesitaMotivoDev && !motivoDevolucion.trim()) ||
                (necesitaMotivoCierre && !motivoCierre.trim())
              }
              loading={cambiando}
              onClick={handleCambioEstado}
            >
              Confirmar
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── Modal: nuevo contacto ── */}
      <Modal open={showContacto} onClose={() => setShowContacto(false)} title="Agregar contacto de obra" size="sm">
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-text-secondary block mb-1">Nombre *</label>
            <input
              value={contactoForm.nombre}
              onChange={e => setContactoForm(f => ({ ...f, nombre: e.target.value }))}
              placeholder="Nombre completo"
              className="w-full border border-surface-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-text-secondary block mb-1">Cargo</label>
            <select
              value={contactoForm.cargo}
              onChange={e => setContactoForm(f => ({ ...f, cargo: e.target.value as any }))}
              className="w-full border border-surface-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              {Object.entries(CARGO_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-text-secondary block mb-1">Teléfono</label>
            <input
              value={contactoForm.telefono ?? ''}
              onChange={e => setContactoForm(f => ({ ...f, telefono: e.target.value || null }))}
              placeholder="+56 9 ..."
              className="w-full border border-surface-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-text-secondary block mb-1">Email</label>
            <input
              type="email"
              value={contactoForm.email ?? ''}
              onChange={e => setContactoForm(f => ({ ...f, email: e.target.value || null }))}
              placeholder="contacto@obra.cl"
              className="w-full border border-surface-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={contactoForm.es_principal ?? false}
              onChange={e => setContactoForm(f => ({ ...f, es_principal: e.target.checked }))}
              className="accent-primary"
            />
            Contacto principal
          </label>
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" onClick={() => setShowContacto(false)}>Cancelar</Button>
            <Button disabled={!contactoForm.nombre.trim() || creandoContacto} loading={creandoContacto} onClick={handleCrearContacto}>
              Agregar
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── Modal: nueva OT ── */}
      <Modal open={showOT} onClose={() => setShowOT(false)} title="Crear Orden de Trabajo" size="sm">
        <div className="space-y-3">
          <p className="text-sm text-text-secondary">Se creará una nueva OT para el SAC <span className="font-mono font-bold">{sac.codigo}</span>.</p>
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" onClick={() => setShowOT(false)}>Cancelar</Button>
            <Button loading={creandoOT} onClick={handleCrearOT}>Crear OT</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
