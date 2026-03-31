import { useState, useEffect } from 'react'
import { Button, Modal } from '@/shared/components/ui'
import { MOTIVOS_DESCUENTO } from '../types'
import type { CotizacionCreate, MotivoDescuento } from '../types'
import { getDescuentoSugerido } from '../api'
import type { DescuentoSugerido } from '../api'

interface CotizacionFormProps {
  open: boolean
  isPending?: boolean
  /** ID del cliente de la venta — para calcular descuento sugerido */
  clienteId?: string
  onConfirm: (data: CotizacionCreate) => void
  onClose: () => void
}

// Opciones de validez en días (administrable en el futuro)
const OPCIONES_VALIDEZ = [
  { dias: 7,  label: '7 días' },
  { dias: 10, label: '10 días' },
  { dias: 15, label: '15 días' },
  { dias: 30, label: '30 días  (recomendado)' },
  { dias: 60, label: '60 días' },
  { dias: 90, label: '90 días' },
]

const VISITA_PRECIO = 25000

export const CotizacionForm = ({ open, isPending, clienteId, onConfirm, onClose }: CotizacionFormProps) => {
  const [form, setForm] = useState<CotizacionCreate>({
    validez_dias: 30,
    descuento_global_pct: 0,
    descuento_motivo: null,
    requiere_cubicacion: false,
    notas_internas: '',
    notas_cliente: '',
    lineas: [],
  })
  const [touched, setTouched] = useState(false)
  const [descuentoSugerido, setDescuentoSugerido] = useState<DescuentoSugerido | null>(null)
  const [descuentoAplicado, setDescuentoAplicado] = useState(false)

  // Cargar descuento sugerido al abrir el form
  useEffect(() => {
    if (!open || !clienteId) { setDescuentoSugerido(null); setDescuentoAplicado(false); return }
    getDescuentoSugerido(clienteId).then(d => {
      if (d.descuento_pct > 0) setDescuentoSugerido(d)
      else setDescuentoSugerido(null)
    }).catch(() => setDescuentoSugerido(null))
    setDescuentoAplicado(false)
  }, [open, clienteId])

  const aplicarDescuentoSugerido = () => {
    if (!descuentoSugerido) return
    setForm(f => ({
      ...f,
      descuento_global_pct: descuentoSugerido.descuento_pct,
      descuento_motivo: descuentoSugerido.motivo as MotivoDescuento,
    }))
    setDescuentoAplicado(true)
  }

  const hayDescuento = Number(form.descuento_global_pct) > 0
  const motivoError = touched && hayDescuento && !form.descuento_motivo

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setTouched(true)
    if (hayDescuento && !form.descuento_motivo) return
    onConfirm({
      validez_dias: Number(form.validez_dias),
      descuento_global_pct: Number(form.descuento_global_pct ?? 0),
      descuento_motivo: form.descuento_motivo ?? null,
      requiere_cubicacion: Boolean(form.requiere_cubicacion),
      notas_internas: form.notas_internas || null,
      notas_cliente: form.notas_cliente || null,
      lineas: [],
    })
  }

  return (
    <Modal open={open} onClose={onClose} title="Nueva cotización" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">

        {/* Alerta descuento sugerido por tipo cliente */}
        {descuentoSugerido && !descuentoAplicado && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 flex items-start justify-between gap-3">
            <div className="flex items-start gap-2">
              <svg className="w-4 h-4 mt-0.5 text-amber-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
              <div>
                <p className="text-sm font-semibold text-amber-800">{descuentoSugerido.mensaje}</p>
                <p className="text-xs text-amber-700 mt-0.5">
                  Descuento disponible: <span className="font-bold">{descuentoSugerido.descuento_pct}%</span>
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={aplicarDescuentoSugerido}
              className="shrink-0 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 px-2.5 py-1.5 rounded-md transition-colors whitespace-nowrap"
            >
              Aplicar {descuentoSugerido.descuento_pct}%
            </button>
          </div>
        )}

        {descuentoSugerido && descuentoAplicado && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 flex items-center gap-2 text-sm text-emerald-700">
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Descuento del {descuentoSugerido.descuento_pct}% aplicado
          </div>
        )}

        {/* Validez — selector predefinido */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-text-primary">
              Período de vigencia <span className="text-danger">*</span>
            </label>
            <select
              value={form.validez_dias}
              onChange={e => setForm(f => ({ ...f, validez_dias: Number(e.target.value) }))}
              className="rounded-lg border border-surface-border bg-surface px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {OPCIONES_VALIDEZ.map(op => (
                <option key={op.dias} value={op.dias}>{op.label}</option>
              ))}
            </select>
            <p className="text-xs text-text-secondary">La cotización vence después de este período</p>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-text-primary">Descuento global (%)</label>
            <input
              type="number"
              min="0"
              max="100"
              step="0.5"
              value={form.descuento_global_pct ?? 0}
              onChange={e => {
                const v = Number(e.target.value)
                setForm(f => ({ ...f, descuento_global_pct: v, descuento_motivo: v === 0 ? null : f.descuento_motivo }))
                if (v !== descuentoSugerido?.descuento_pct) setDescuentoAplicado(false)
              }}
              className="rounded-lg border border-surface-border bg-surface px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <p className="text-xs text-text-secondary">Por cliente VIP, campaña, etc.</p>
          </div>
        </div>

        {/* Motivo de descuento — obligatorio cuando hay descuento */}
        {hayDescuento && (
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-text-primary">
              Motivo del descuento <span className="text-danger">*</span>
            </label>
            <select
              value={form.descuento_motivo ?? ''}
              onChange={e => setForm(f => ({ ...f, descuento_motivo: e.target.value as MotivoDescuento || null }))}
              className={`rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-colors ${
                motivoError
                  ? 'border-danger bg-danger/5 text-text-primary'
                  : 'border-surface-border bg-surface text-text-primary'
              }`}
            >
              <option value="">— Selecciona un motivo —</option>
              {MOTIVOS_DESCUENTO.map(m => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
            {motivoError && (
              <p className="text-xs text-danger-text">Debes indicar el motivo del descuento</p>
            )}
          </div>
        )}

        {/* Cubicación */}
        <div
          className={`rounded-lg border p-4 transition-colors cursor-pointer ${
            form.requiere_cubicacion
              ? 'border-primary bg-primary/5'
              : 'border-surface-border bg-surface'
          }`}
          onClick={() => setForm(f => ({ ...f, requiere_cubicacion: !f.requiere_cubicacion }))}
        >
          <div className="flex items-start gap-3">
            <div className={`mt-0.5 w-4 h-4 rounded flex items-center justify-center border-2 shrink-0 transition-colors ${
              form.requiere_cubicacion
                ? 'bg-primary border-primary'
                : 'border-surface-border bg-white'
            }`}>
              {form.requiere_cubicacion && (
                <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
            <div>
              <p className="text-sm font-medium text-text-primary">Requiere visita de cubicación</p>
              <p className="text-xs text-text-secondary mt-0.5">
                Un técnico irá a terreno a medir el espacio antes de confirmar cantidades.
              </p>
              {form.requiere_cubicacion && (
                <div className="mt-2 flex items-center gap-2 text-xs text-primary font-medium">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Se agregará: Visita técnica / Medición en obra — ${VISITA_PRECIO.toLocaleString('es-CL')}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Notas */}
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-text-primary">Notas internas</label>
          <textarea
            rows={2}
            value={form.notas_internas ?? ''}
            onChange={e => setForm(f => ({ ...f, notas_internas: e.target.value }))}
            placeholder="Notas solo visibles para el equipo..."
            className="rounded-lg border border-surface-border bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-disabled focus:outline-none focus:ring-2 focus:ring-primary resize-none"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-text-primary">Notas para el cliente</label>
          <textarea
            rows={2}
            value={form.notas_cliente ?? ''}
            onChange={e => setForm(f => ({ ...f, notas_cliente: e.target.value }))}
            placeholder="Mensaje que verá el cliente en la cotización..."
            className="rounded-lg border border-surface-border bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-disabled focus:outline-none focus:ring-2 focus:ring-primary resize-none"
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button type="submit" loading={isPending}>Crear cotización</Button>
        </div>
      </form>
    </Modal>
  )
}
