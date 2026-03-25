import { useState } from 'react'
import { Button, Input, Modal, ClienteCombobox } from '@/shared/components/ui'
import { useCrearVenta } from '@/modules/ventas'
import { ClienteForm } from '@/modules/clientes'
import type { Cliente } from '@/modules/clientes'
import type { VentaCreate } from '../types'

interface VentaFormProps {
  onSuccess: () => void
  onCancel: () => void
}

export const VentaForm = ({ onSuccess, onCancel }: VentaFormProps) => {
  const [form, setForm] = useState<VentaCreate>({
    cliente_id: '',
    fecha_cierre_esperada: null,
    descuento_pct: 0,
    notas: '',
  })
  const [nuevoClienteOpen, setNuevoClienteOpen] = useState(false)
  const [touched, setTouched] = useState(false)
  const [selectedCliente, setSelectedCliente] = useState<{ id: string; razon_social: string; rut: string } | undefined>()

  const crear = useCrearVenta()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setTouched(true)
    if (!form.cliente_id) return
    try {
      await crear.mutateAsync({
        ...form,
        descuento_pct: Number(form.descuento_pct),
        fecha_cierre_esperada: form.fecha_cierre_esperada || null,
        notas: form.notas || null,
      })
      onSuccess()
    } catch { /* error mostrado abajo */ }
  }

  const handleClienteCreado = (cliente: Cliente) => {
    setForm(f => ({ ...f, cliente_id: cliente.id }))
    setSelectedCliente({ id: cliente.id, razon_social: cliente.razon_social, rut: cliente.rut })
    setNuevoClienteOpen(false)
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Cliente */}
        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <ClienteCombobox
              label="Cliente"
              required
              value={form.cliente_id}
              onChange={(id, cliente) => {
                setForm(f => ({ ...f, cliente_id: id }))
                if (cliente) setSelectedCliente({ id: cliente.id, razon_social: cliente.razon_social, rut: cliente.rut })
              }}
              initialCliente={selectedCliente}
              error={touched && !form.cliente_id ? 'Selecciona un cliente' : ''}
              placeholder="Buscar por razón social o RUT..."
            />
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setNuevoClienteOpen(true)}
            title="Crear nuevo cliente"
            className="mb-0.5 shrink-0"
          >
            + Nuevo
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Fecha de cierre esperada"
            type="date"
            value={form.fecha_cierre_esperada ?? ''}
            onChange={e => setForm(f => ({ ...f, fecha_cierre_esperada: e.target.value || null }))}
          />
          <Input
            label="Descuento (%)"
            type="number"
            min="0"
            max="100"
            step="0.5"
            value={form.descuento_pct ?? 0}
            onChange={e => setForm(f => ({ ...f, descuento_pct: Number(e.target.value) }))}
            hint="0 – 100%"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="venta-notas" className="text-sm font-medium text-text-primary">Notas internas</label>
          <textarea
            id="venta-notas"
            rows={3}
            value={form.notas ?? ''}
            onChange={e => setForm(f => ({ ...f, notas: e.target.value }))}
            placeholder="Observaciones, referencias, contexto..."
            className="rounded-lg border border-surface-border bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-disabled focus:outline-none focus:ring-2 focus:ring-primary resize-none"
          />
        </div>

        {crear.error && (
          <p role="alert" className="text-sm text-danger-text bg-danger-10 border border-danger-30 rounded-lg px-3 py-2">
            {(crear.error as any)?.response?.data?.detail ?? 'Error al crear la venta'}
          </p>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onCancel}>Cancelar</Button>
          <Button type="submit" loading={crear.isPending}>Crear venta</Button>
        </div>
      </form>

      {/* Sub-modal: crear cliente rápido */}
      <Modal
        open={nuevoClienteOpen}
        onClose={() => setNuevoClienteOpen(false)}
        title="Nuevo cliente"
        size="lg"
      >
        <ClienteForm
          onSuccess={() => {}}
          onCancel={() => setNuevoClienteOpen(false)}
          onCreated={handleClienteCreado}
        />
      </Modal>
    </>
  )
}
