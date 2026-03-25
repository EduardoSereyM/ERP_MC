import { useState } from 'react'
import { Button, Input, Modal } from '@/shared/components/ui'
import type { CotizacionCreate } from '../types'

interface CotizacionFormProps {
  open: boolean
  isPending?: boolean
  onConfirm: (data: CotizacionCreate) => void
  onClose: () => void
}

export const CotizacionForm = ({ open, isPending, onConfirm, onClose }: CotizacionFormProps) => {
  const [form, setForm] = useState<CotizacionCreate>({
    validez_dias: 30,
    notas_internas: '',
    notas_cliente: '',
    lineas: [],
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onConfirm({
      validez_dias: Number(form.validez_dias),
      notas_internas: form.notas_internas || null,
      notas_cliente: form.notas_cliente || null,
      lineas: [],
    })
  }

  return (
    <Modal open={open} onClose={onClose} title="Nueva cotización" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Validez (días)"
          type="number"
          min="1"
          max="365"
          required
          value={form.validez_dias}
          onChange={e => setForm(f => ({ ...f, validez_dias: Number(e.target.value) }))}
          hint="La cotización vence automáticamente después de este período"
        />

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

        <p className="text-xs text-text-disabled">
          Los productos se agregan después de crear la cotización.
        </p>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button type="submit" loading={isPending}>Crear cotización</Button>
        </div>
      </form>
    </Modal>
  )
}
