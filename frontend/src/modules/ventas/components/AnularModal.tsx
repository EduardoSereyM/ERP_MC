import { useState } from 'react'
import { Button, Modal } from '@/shared/components/ui'

interface AnularModalProps {
  open: boolean
  entidad: string
  isPending?: boolean
  onConfirm: (motivo: string) => void
  onClose: () => void
}

export const AnularModal = ({ open, entidad, isPending, onConfirm, onClose }: AnularModalProps) => {
  const [motivo, setMotivo] = useState('')
  const [error, setError] = useState('')

  const handleConfirm = () => {
    if (!motivo.trim()) { setError('El motivo es obligatorio'); return }
    setError('')
    onConfirm(motivo.trim())
  }

  const handleClose = () => {
    setMotivo('')
    setError('')
    onClose()
  }

  return (
    <Modal open={open} onClose={handleClose} title={`Anular ${entidad}`} size="sm">
      <div className="space-y-4">
        <p className="text-sm text-text-secondary">
          Esta acción no se puede deshacer. Por favor indica el motivo de la anulación.
        </p>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-text-primary">
            Motivo <span className="text-danger">*</span>
          </label>
          <textarea
            rows={3}
            value={motivo}
            onChange={e => { setMotivo(e.target.value); setError('') }}
            placeholder="Describe el motivo de la anulación..."
            className="rounded-lg border border-surface-border bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-disabled focus:outline-none focus:ring-2 focus:ring-danger resize-none"
          />
          {error && <p className="text-xs text-danger">{error}</p>}
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={handleClose}>Cancelar</Button>
          <Button type="button" variant="danger" loading={isPending} onClick={handleConfirm}>
            Confirmar anulación
          </Button>
        </div>
      </div>
    </Modal>
  )
}
