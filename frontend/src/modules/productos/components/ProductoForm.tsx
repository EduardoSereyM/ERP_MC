import { useState, useEffect } from 'react'
import { Button, Input } from '@/shared/components/ui'
import { useCrearProducto, useActualizarProducto, useCategorias } from '@/modules/productos'
import type { ProductoCreate, ProductoListItem, TipoProducto, UnidadMedida } from '@/modules/productos'
import { TIPO_PRODUCTO_LABEL } from '@/modules/productos'

interface ProductoFormProps {
  initial?: ProductoListItem | null
  onSuccess: () => void
  onCancel: () => void
}

const UNIDADES: { value: UnidadMedida; label: string }[] = [
  { value: 'm2', label: 'm²' },
  { value: 'ml', label: 'ml' },
  { value: 'unidad', label: 'Unidad' },
  { value: 'kg', label: 'kg' },
  { value: 'hora', label: 'Hora' },
  { value: 'otro', label: 'Otro' },
]

const TIPOS: TipoProducto[] = ['PRODUCTO_FISICO', 'SERVICIO_INSTALACION', 'SERVICIO_TECNICO', 'SERVICIO_OTRO']

export const ProductoForm = ({ initial, onSuccess, onCancel }: ProductoFormProps) => {
  const [form, setForm] = useState<ProductoCreate>({
    nombre: '',
    descripcion: '',
    categoria_id: undefined,
    precio_base: 0,
    unidad_medida: 'm2',
    tipo_producto: 'PRODUCTO_FISICO',
    requiere_instalacion: false,
  })

  const { data: categorias = [] } = useCategorias('productos', 'tipo_producto')
  const crear = useCrearProducto()
  const actualizar = useActualizarProducto(initial?.id ?? '')
  const isPending = crear.isPending || actualizar.isPending
  const error = crear.error || actualizar.error

  useEffect(() => {
    if (initial) {
      setForm({
        nombre: initial.nombre,
        precio_base: Number(initial.precio_base),
        unidad_medida: initial.unidad_medida as UnidadMedida,
        tipo_producto: initial.tipo_producto as TipoProducto,
        requiere_instalacion: initial.requiere_instalacion,
      })
    }
  }, [initial])

  const set = <K extends keyof ProductoCreate>(key: K) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm(f => ({ ...f, [key]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (initial) {
        await actualizar.mutateAsync({ ...form, precio_base: Number(form.precio_base) })
      } else {
        await crear.mutateAsync({ ...form, precio_base: Number(form.precio_base) })
      }
      onSuccess()
    } catch { /* error mostrado abajo */ }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input label="Nombre" required value={form.nombre} onChange={set('nombre')} placeholder="Piso Flotante AC5" />

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-text-primary">Categoría</label>
          <select
            value={form.categoria_id ?? ''}
            onChange={e => setForm(f => ({ ...f, categoria_id: e.target.value || undefined }))}
            className="rounded-lg border border-surface-border bg-surface px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">Sin categoría</option>
            {categorias.map(c => (
              <option key={c.id} value={c.id}>{c.nombre}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-text-primary">Unidad de medida</label>
          <select
            value={form.unidad_medida}
            onChange={e => setForm(f => ({ ...f, unidad_medida: e.target.value as UnidadMedida }))}
            className="rounded-lg border border-surface-border bg-surface px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {UNIDADES.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
          </select>
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-text-primary">Tipo de producto</label>
        <select
          value={form.tipo_producto}
          onChange={e => setForm(f => ({ ...f, tipo_producto: e.target.value as TipoProducto }))}
          className="rounded-lg border border-surface-border bg-surface px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
        >
          {TIPOS.map(t => <option key={t} value={t}>{TIPO_PRODUCTO_LABEL[t]}</option>)}
        </select>
        <p className="text-xs text-text-disabled">
          Define la lógica de despacho e instalación al confirmar una venta.
        </p>
      </div>

      <Input
        label="Precio Base"
        type="number"
        min="0"
        step="1"
        value={form.precio_base}
        onChange={set('precio_base')}
        hint="Precio sin IVA en pesos chilenos"
      />

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="requiere_instalacion"
          checked={form.requiere_instalacion}
          onChange={e => setForm(f => ({ ...f, requiere_instalacion: e.target.checked }))}
          className="rounded border-surface-border text-primary focus:ring-primary"
        />
        <label htmlFor="requiere_instalacion" className="text-sm text-text-primary">
          Requiere servicio de instalación
        </label>
      </div>

      {error && (
        <p className="text-sm text-danger-text bg-danger-10 border border-danger-30 rounded-lg px-3 py-2">
          {(error as any)?.response?.data?.detail ?? 'Error al guardar el producto'}
        </p>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" loading={isPending}>{initial ? 'Guardar cambios' : 'Crear producto'}</Button>
      </div>
    </form>
  )
}
