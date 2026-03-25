import { useState } from 'react'
import { useProductos } from '../hooks/useProductos'
import { ProductoForm } from '../components/ProductoForm'
import { Modal, Badge } from '@/shared/components/ui'
import type { ProductoListItem } from '../types'

const Icon = ({ name, className = '' }: { name: string; className?: string }) => (
  <span className={`material-symbols-outlined ${className}`}>{name}</span>
)

const ProductosListSkeleton = () => (
  <div className="divide-y divide-surface-border animate-pulse">
    {[...Array(5)].map((_, i) => (
      <div key={i} className="flex gap-4 px-4 py-3">
        <div className="h-4 w-20 bg-surface-subtle rounded" />
        <div className="h-4 w-48 bg-surface-subtle rounded" />
        <div className="h-4 w-24 bg-surface-subtle rounded" />
        <div className="h-4 w-16 bg-surface-subtle rounded" />
      </div>
    ))}
  </div>
)

type ModalState =
  | { mode: 'closed' }
  | { mode: 'create' }
  | { mode: 'edit'; producto: ProductoListItem }

export const ProductosListView = () => {
  const [busqueda, setBusqueda] = useState('')
  const [page, setPage] = useState(1)
  const [modal, setModal] = useState<ModalState>({ mode: 'closed' })

  const { data, isLoading, isError, refetch } = useProductos({
    busqueda: busqueda || undefined,
    page,
    limit: 20,
  })

  const handleSuccess = () => {
    setModal({ mode: 'closed' })
    refetch()
  }

  return (
    <div className="p-8 pt-6">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-text-primary tracking-tight">Productos</h2>
        <p className="text-text-secondary font-medium mt-0.5 text-sm">
          {data?.meta?.total ?? 0} productos en catálogo
        </p>
      </div>

      <div className="flex items-center gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary text-lg" />
          <input
            type="text"
            placeholder="Buscar producto por nombre..."
            value={busqueda}
            onChange={(e) => { setBusqueda(e.target.value); setPage(1) }}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-surface-border rounded-lg text-sm text-text-primary placeholder:text-text-disabled focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
          />
        </div>
        <div className="flex-1" />
        <button
          onClick={() => setModal({ mode: 'create' })}
          className="px-5 py-2.5 bg-[#006B84] hover:bg-[#00566A] text-white font-bold rounded-lg transition-colors flex items-center gap-2 shadow-sm text-sm"
        >
          <Icon name="add" className="text-xl" />
          Nuevo producto
        </button>
      </div>

      <div className="bg-white rounded-xl border border-surface-border shadow-sm overflow-hidden">
        {isLoading ? (
          <ProductosListSkeleton />
        ) : isError ? (
          <div className="px-4 py-12 text-center">
            <p className="text-danger mb-3">Error al cargar productos</p>
            <button onClick={() => refetch()} className="text-sm text-primary hover:underline">
              Reintentar
            </button>
          </div>
        ) : data?.data?.length === 0 ? (
          <div className="px-4 py-16 text-center">
            <p className="text-text-primary font-medium mb-1">
              {busqueda ? 'Sin resultados' : 'Catálogo vacío'}
            </p>
            <p className="text-text-secondary text-sm mb-4">
              {busqueda
                ? `No se encontraron productos para "${busqueda}"`
                : 'Agrega el primer producto al catálogo'}
            </p>
            {!busqueda && (
              <button onClick={() => setModal({ mode: 'create' })} className="text-sm text-primary hover:underline">
                Crear primer producto
              </button>
            )}
          </div>
        ) : (
          <>
            <table className="w-full">
              <thead>
                <tr className="bg-surface-muted border-b border-surface-border">
                  <th className="text-left px-6 py-3 text-text-secondary text-xs font-medium uppercase tracking-wider">Código</th>
                  <th className="text-left px-6 py-3 text-text-secondary text-xs font-medium uppercase tracking-wider">Nombre</th>
                  <th className="text-right px-6 py-3 text-text-secondary text-xs font-medium uppercase tracking-wider">Precio base</th>
                  <th className="text-left px-6 py-3 text-text-secondary text-xs font-medium uppercase tracking-wider">Unidad</th>
                  <th className="text-left px-6 py-3 text-text-secondary text-xs font-medium uppercase tracking-wider">Instalación</th>
                  <th className="text-left px-6 py-3 text-text-secondary text-xs font-medium uppercase tracking-wider">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border">
                {data?.data?.map((prod: ProductoListItem) => (
                  <tr
                    key={prod.id}
                    onClick={() => setModal({ mode: 'edit', producto: prod })}
                    className="hover:bg-surface-muted transition-colors cursor-pointer"
                  >
                    <td className="px-6 py-4 text-sm font-mono text-primary font-medium">{prod.codigo}</td>
                    <td className="px-6 py-4 text-sm text-text-primary font-medium">{prod.nombre}</td>
                    <td className="px-6 py-4 text-sm text-text-primary font-bold text-right font-mono">
                      ${Number(prod.precio_base).toLocaleString('es-CL')}
                    </td>
                    <td className="px-6 py-4 text-sm text-text-secondary">{prod.unidad_medida}</td>
                    <td className="px-6 py-4">
                      {prod.requiere_instalacion
                        ? <Badge variant="info">Sí</Badge>
                        : <span className="text-text-disabled text-sm">No</span>}
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={prod.activo ? 'success' : 'neutral'}>
                        {prod.activo ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {data && data.meta.total_pages > 1 && (
              <div className="flex items-center justify-between px-6 py-3 border-t border-surface-border bg-surface-muted rounded-b-xl">
                <p className="text-text-secondary text-sm">
                  Página {data.meta.page} de {data.meta.total_pages}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="px-3 py-1.5 text-sm rounded-lg border border-surface-border bg-white hover:bg-surface-muted disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Anterior
                  </button>
                  <button
                    onClick={() => setPage(p => Math.min(data.meta.total_pages, p + 1))}
                    disabled={page >= data.meta.total_pages}
                    className="px-3 py-1.5 text-sm rounded-lg border border-surface-border bg-white hover:bg-surface-muted disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Siguiente
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <Modal
        open={modal.mode !== 'closed'}
        onClose={() => setModal({ mode: 'closed' })}
        title={modal.mode === 'edit' ? 'Editar producto' : 'Nuevo producto'}
        size="md"
      >
        <ProductoForm
          initial={modal.mode === 'edit' ? modal.producto : null}
          onSuccess={handleSuccess}
          onCancel={() => setModal({ mode: 'closed' })}
        />
      </Modal>
    </div>
  )
}
