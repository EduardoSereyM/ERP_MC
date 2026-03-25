import { useState, useEffect } from 'react'
import { Button, Input, Modal } from '@/shared/components/ui'
import { useProductos } from '@/modules/productos'
import type { ProductoListItem } from '@/modules/productos'
import type { LineaCotizacion, LineaCotizacionCreate } from '../types'

// ─── Props ────────────────────────────────────────────────────────────────────

interface LineaFormProps {
  open: boolean
  initial?: LineaCotizacion | null
  isPending?: boolean
  /** Puede retornar 1 o 2 líneas (producto + instalación opcional) */
  onConfirm: (lines: LineaCotizacionCreate[]) => void
  onClose: () => void
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  n.toLocaleString('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0 })

const UNIDAD_LABEL: Record<string, string> = {
  m2: 'm²', ml: 'ml', unidad: 'unid.', kg: 'kg', hora: 'hr', otro: '',
}

/** Distingue servicios de productos físicos (por prefijo de código en fake data) */
const esServicio = (p: ProductoListItem) => p.codigo.startsWith('SRV-')

const EMPTY: LineaCotizacionCreate = {
  descripcion: '',
  cantidad: 1,
  precio_unitario: 0,
  descuento_pct: 0,
  producto_id: null,
}

// ─── Component ────────────────────────────────────────────────────────────────

export const LineaForm = ({ open, initial, isPending, onConfirm, onClose }: LineaFormProps) => {
  const [form, setForm] = useState<LineaCotizacionCreate>(EMPTY)
  const [incluirInstalacion, setIncluirInstalacion] = useState(false)

  const { data: productosData } = useProductos({ limit: 200, activo: true })
  const todos = productosData?.data ?? []
  const productos = todos.filter(p => !esServicio(p))
  const servicios  = todos.filter(p => esServicio(p))

  // Producto seleccionado actualmente
  const selectedProd = form.producto_id ? todos.find(p => p.id === form.producto_id) : null

  // Servicio de instalación vinculado al producto seleccionado
  const servicioVinculado: ProductoListItem | null =
    selectedProd?.servicio_instalacion_id
      ? (todos.find(p => p.id === selectedProd.servicio_instalacion_id) ?? null)
      : null

  // Reiniciar al abrir / cerrar
  useEffect(() => {
    if (initial) {
      setForm({
        descripcion: initial.descripcion,
        cantidad: Number(initial.cantidad),
        precio_unitario: Number(initial.precio_unitario),
        descuento_pct: Number(initial.descuento_pct),
        producto_id: initial.producto_id,
        unidad_medida: initial.unidad_medida,
      })
    } else {
      setForm(EMPTY)
    }
    setIncluirInstalacion(false)
  }, [initial, open])

  // Seleccionar producto → auto-rellenar campos
  const handleProductoChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const pid = e.target.value
    setIncluirInstalacion(false)
    if (!pid) {
      setForm(f => ({ ...f, producto_id: null, descripcion: '', precio_unitario: 0, unidad_medida: undefined }))
      return
    }
    const prod = todos.find(p => p.id === pid)
    if (prod) {
      setForm(f => ({
        ...f,
        producto_id: pid,
        descripcion: prod.nombre,
        precio_unitario: Number(prod.precio_base ?? 0),
        unidad_medida: prod.unidad_medida,
      }))
    }
  }

  const subtotal = Number(form.cantidad) * Number(form.precio_unitario) * (1 - Number(form.descuento_pct) / 100)

  const subtotalInstalacion = incluirInstalacion && servicioVinculado
    ? Number(form.cantidad) * Number(servicioVinculado.precio_base)
    : 0

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.descripcion.trim()) return

    const lineas: LineaCotizacionCreate[] = [
      {
        ...form,
        cantidad: Number(form.cantidad),
        precio_unitario: Number(form.precio_unitario),
        descuento_pct: Number(form.descuento_pct),
      },
    ]

    // Si el usuario quiere agregar instalación → segunda línea
    if (incluirInstalacion && servicioVinculado) {
      lineas.push({
        producto_id: servicioVinculado.id,
        descripcion: servicioVinculado.nombre,
        cantidad: Number(form.cantidad),
        precio_unitario: Number(servicioVinculado.precio_base),
        descuento_pct: 0,
        unidad_medida: servicioVinculado.unidad_medida,
      })
    }

    onConfirm(lineas)
  }

  const unidadLabel = form.unidad_medida ? (UNIDAD_LABEL[form.unidad_medida] ?? form.unidad_medida) : ''

  return (
    <Modal open={open} onClose={onClose} title={initial ? 'Editar línea' : 'Agregar línea'} size="md">
      <form onSubmit={handleSubmit} className="space-y-4">

        {/* ── Selector agrupado Productos / Servicios ── */}
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-text-primary">
            Producto o servicio <span className="text-text-disabled font-normal">(opcional)</span>
          </label>
          <select
            value={form.producto_id ?? ''}
            onChange={handleProductoChange}
            className="rounded-lg border border-surface-border bg-surface px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">— Línea libre (sin producto vinculado) —</option>

            {productos.length > 0 && (
              <optgroup label="PRODUCTOS">
                {productos.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.codigo} — {p.nombre}
                  </option>
                ))}
              </optgroup>
            )}

            {servicios.length > 0 && (
              <optgroup label="SERVICIOS DE INSTALACIÓN">
                {servicios.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.codigo} — {p.nombre}
                  </option>
                ))}
              </optgroup>
            )}
          </select>
        </div>

        {/* ── Advertencia instalación ── */}
        {selectedProd?.requiere_instalacion && (
          <div className={`rounded-lg border p-3 transition-all ${
            incluirInstalacion
              ? 'border-primary/40 bg-primary/5'
              : 'border-amber-200 bg-amber-50'
          }`}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2">
                <svg className={`w-4 h-4 mt-0.5 shrink-0 ${incluirInstalacion ? 'text-primary' : 'text-amber-500'}`}
                  fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                </svg>
                <div>
                  <p className={`text-xs font-semibold ${incluirInstalacion ? 'text-primary' : 'text-amber-700'}`}>
                    Este producto requiere instalación
                  </p>
                  {servicioVinculado ? (
                    <p className="text-xs text-text-secondary mt-0.5">
                      Servicio sugerido:{' '}
                      <span className="font-medium">{servicioVinculado.nombre}</span>
                      {' '}— {fmt(servicioVinculado.precio_base)}/{UNIDAD_LABEL[servicioVinculado.unidad_medida] ?? servicioVinculado.unidad_medida}
                    </p>
                  ) : (
                    <p className="text-xs text-text-secondary mt-0.5">
                      Recuerda agregar el servicio de instalación por separado.
                    </p>
                  )}
                </div>
              </div>

              {servicioVinculado && !incluirInstalacion && (
                <button
                  type="button"
                  onClick={() => setIncluirInstalacion(true)}
                  className="shrink-0 text-xs font-semibold text-white bg-primary hover:bg-primary/90 px-2.5 py-1.5 rounded-md transition-colors whitespace-nowrap"
                >
                  + Agregar instalación
                </button>
              )}

              {servicioVinculado && incluirInstalacion && (
                <button
                  type="button"
                  onClick={() => setIncluirInstalacion(false)}
                  className="shrink-0 text-xs font-medium text-text-secondary hover:text-danger transition-colors whitespace-nowrap"
                >
                  Quitar
                </button>
              )}
            </div>

            {/* Preview de la línea de instalación */}
            {incluirInstalacion && servicioVinculado && (
              <div className="mt-2 pt-2 border-t border-primary/20 flex items-center justify-between text-xs text-text-secondary">
                <span className="flex items-center gap-1.5">
                  <svg className="w-3 h-3 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Se agregará: {servicioVinculado.nombre}
                  <span className="text-text-disabled">× {form.cantidad} {UNIDAD_LABEL[servicioVinculado.unidad_medida] ?? ''}</span>
                </span>
                <span className="font-mono font-medium text-text-primary">{fmt(subtotalInstalacion)}</span>
              </div>
            )}
          </div>
        )}

        {/* ── Descripción ── */}
        <Input
          label="Descripción"
          required
          value={form.descripcion}
          onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))}
          placeholder="Descripción del ítem..."
        />

        {/* ── Cantidad / Precio / Descuento ── */}
        <div className="grid grid-cols-3 gap-3">
          {/* Cantidad con unidad */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-text-primary">
              Cantidad
              {unidadLabel && (
                <span className="ml-1 text-xs text-text-disabled font-normal">({unidadLabel})</span>
              )}
            </label>
            <input
              type="number"
              min="0.01"
              step="0.01"
              required
              value={form.cantidad}
              onChange={e => setForm(f => ({ ...f, cantidad: Number(e.target.value) }))}
              className="rounded-lg border border-surface-border bg-surface px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

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

        {/* ── Subtotal preview ── */}
        <div className="rounded-lg bg-surface-muted px-4 py-3 space-y-1.5">
          <div className="flex justify-between items-center text-sm">
            <span className="text-text-secondary">
              {selectedProd ? selectedProd.nombre : 'Esta línea'}
            </span>
            <span className="font-semibold font-mono text-text-primary">{fmt(subtotal)}</span>
          </div>
          {incluirInstalacion && servicioVinculado && (
            <div className="flex justify-between items-center text-sm">
              <span className="text-text-secondary">{servicioVinculado.nombre}</span>
              <span className="font-semibold font-mono text-text-primary">{fmt(subtotalInstalacion)}</span>
            </div>
          )}
          {incluirInstalacion && servicioVinculado && (
            <div className="flex justify-between items-center text-sm pt-1.5 border-t border-surface-border">
              <span className="text-text-secondary font-medium">Total a agregar</span>
              <span className="font-bold font-mono text-text-primary">{fmt(subtotal + subtotalInstalacion)}</span>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button type="submit" loading={isPending}>
            {initial ? 'Guardar cambios' : incluirInstalacion ? 'Agregar 2 líneas' : 'Agregar línea'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
