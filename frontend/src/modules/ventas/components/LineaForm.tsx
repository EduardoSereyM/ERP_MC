import { useState, useEffect } from 'react'
import { Button, Input, Modal } from '@/shared/components/ui'
import { useProductos } from '@/modules/productos'
import type { LineaCotizacion, LineaCotizacionCreate } from '../types'

interface LineaFormProps {
  open: boolean
  initial?: LineaCotizacion | null
  isPending?: boolean
  onConfirm: (data: LineaCotizacionCreate) => void
  onClose: () => void
}

const EMPTY: LineaCotizacionCreate = {
  descripcion: '',
  cantidad: 1,
  precio_unitario: 0,
  descuento_pct: 0,
  producto_id: null,
}

const fmt = (n: number) => n.toLocaleString('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0 })

export const LineaForm = ({ open, initial, isPending, onConfirm, onClose }: LineaFormProps) => {
  const [form, setForm] = useState<LineaCotizacionCreate>(EMPTY)
  const { data: productosData } = useProductos({ limit: 200, activo: true })
  const productos = productosData?.data ?? []

  useEffect(() => {
    if (initial) {
      setForm({
        descripcion: initial.descripcion,
        cantidad: Number(initial.cantidad),
        precio_unitario: Number(initial.precio_unitario),
        descuento_pct: Number(initial.descuento_pct),
        producto_id: initial.producto_id,
      })
    } else {
      setForm(EMPTY)
    }
  }, [initial, open])

  const handleProductoChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const pid = e.target.value
    if (!pid) { setForm(f => ({ ...f, producto_id: null })); return }
    const prod = productos.find(p => p.id === pid)
    if (prod) {
      setForm(f => ({
        ...f,
        producto_id: pid,
        descripcion: prod.nombre,
        precio_unitario: Number(prod.precio_base ?? 0),
      }))
    }
  }

  const subtotal = Number(form.cantidad) * Number(form.precio_unitario) * (1 - Number(form.descuento_pct) / 100)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.descripcion.trim()) return
    onConfirm({
      ...form,
      cantidad: Number(form.cantidad),
      precio_unitario: Number(form.precio_unitario),
      descuento_pct: Number(form.descuento_pct),
    })
  }

  return (
    <Modal open={open} onClose={onClose} title={initial ? 'Editar línea' : 'Agregar línea'} size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Producto (opcional) */}
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-text-primary">Producto (opcional)</label>
          <select
            value={form.producto_id ?? ''}
            onChange={handleProductoChange}
            className="rounded-lg border border-surface-border bg-surface px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">— Sin producto vinculado —</option>
            {productos.map(p => (
              <option key={p.id} value={p.id}>{p.codigo} — {p.nombre}</option>
            ))}
          </select>
        </div>

        <Input
          label="Descripción"
          required
          value={form.descripcion}
          onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))}
          placeholder="Descripción del ítem..."
        />

        <div className="grid grid-cols-3 gap-3">
          <Input
            label="Cantidad"
            type="number"
            min="0.01"
            step="0.01"
            required
            value={form.cantidad}
            onChange={e => setForm(f => ({ ...f, cantidad: Number(e.target.value) }))}
          />
          <Input
            label="Precio unitario"
            type="number"
            min="0"
            step="1"
            required
            value={form.precio_unitario}
            onChange={e => setForm(f => ({ ...f, precio_unitario: Number(e.target.value) }))}
          />
          <Input
            label="Descuento (%)"
            type="number"
            min="0"
            max="100"
            step="0.5"
            value={form.descuento_pct}
            onChange={e => setForm(f => ({ ...f, descuento_pct: Number(e.target.value) }))}
          />
        </div>

        {/* Subtotal preview */}
        <div className="rounded-lg bg-surface-muted px-4 py-3 flex justify-between items-center">
          <span className="text-sm text-text-secondary">Subtotal</span>
          <span className="text-base font-semibold text-text-primary">{fmt(subtotal)}</span>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button type="submit" loading={isPending}>{initial ? 'Guardar cambios' : 'Agregar línea'}</Button>
        </div>
      </form>
    </Modal>
  )
}
