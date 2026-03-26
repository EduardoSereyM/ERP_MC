import { useState } from 'react'
import { Button, Input, Modal } from '@/shared/components/ui'
import { MOTIVOS_DESCUENTO } from '../types'
import type { CotizacionCreate, MotivoDescuento } from '../types'

interface CotizacionFormProps {
  open: boolean
  isPending?: boolean
  onConfirm: (data: CotizacionCreate) => void
  onClose: () => void
}

const VISITA_PRECIO = 25000

export const CotizacionForm = ({ open, isPending, onConfirm, onClose }: CotizacionFormProps) => {
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

        {/* Validez + Descuento */}
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Validez (días)"
            type="number"
            min="1"
            max="365"
            required
            value={form.validez_dias}
            onChange={e => setForm(f => ({ ...f, validez_dias: Number(e.target.value) }))}
            hint="La cotización vence después de este período"
          />
          <Input
            label="Descuento global (%)"
            type="number"
            min="0"
            max="100"
            step="0.5"
            value={form.descuento_global_pct ?? 0}
            onChange={e => {
              const v = Number(e.target.value)
              setForm(f => ({ ...f, descuento_global_pct: v, descuento_motivo: v === 0 ? null : f.descuento_motivo }))
            }}
            hint="Por cliente VIP, campaña, etc."
          />
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
            {/* Checkbox custom */}
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
