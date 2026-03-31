import { useState } from 'react'
import { useStubs } from '../hooks/useVentas'
import { ESTADO_STUB_LABEL } from '../types'
import type { SolicitudStub, TipoStub } from '../types'

const TIPO_LABEL: Record<TipoStub, string> = {
  BOD: 'Bodega',
  COB: 'Cobranza',
  CTB: 'Contabilidad',
  GER: 'Gerencia',
  INS: 'Instalación',
}

const TIPO_STYLE: Record<TipoStub, string> = {
  BOD: 'bg-accent-10 text-accent',
  COB: 'bg-warning-10 text-warning-text',
  CTB: 'bg-info-10 text-info-text',
  GER: 'bg-danger-10 text-danger-text',
  INS: 'bg-purple-50 text-purple-700',
}

const ESTADO_STYLE: Record<string, string> = {
  PENDIENTE: 'bg-warning-10 text-warning-text',
  EN_REVISION: 'bg-info-10 text-info-text',
  COMPLETADA: 'bg-success-10 text-success-text',
  RECHAZADA: 'bg-danger-10 text-danger-text',
}

export const StubsListView = () => {
  const [tipo, setTipo] = useState<string>('')
  const [page, setPage] = useState(1)
  const { data, isLoading, error } = useStubs({
    tipo: tipo || undefined,
    page,
    limit: 20,
  })

  const tipos: TipoStub[] = ['BOD', 'COB', 'CTB', 'GER', 'INS']

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-text-primary">Solicitudes</h1>
        <p className="text-text-secondary text-sm mt-1">
          Solicitudes de coordinación inter-área
        </p>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <button
          onClick={() => { setTipo(''); setPage(1) }}
          className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
            !tipo ? 'bg-primary text-text-inverse' : 'bg-surface border border-surface-border text-text-secondary hover:bg-surface-subtle'
          }`}
        >
          Todas
        </button>
        {tipos.map((t) => (
          <button
            key={t}
            onClick={() => { setTipo(t); setPage(1) }}
            className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
              tipo === t ? 'bg-primary text-text-inverse' : 'bg-surface border border-surface-border text-text-secondary hover:bg-surface-subtle'
            }`}
          >
            {TIPO_LABEL[t]}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-surface rounded-xl border border-surface-border overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-surface-muted border-b border-surface-border">
              <th className="text-left px-4 py-3 text-text-secondary text-xs font-medium uppercase tracking-wider">Código</th>
              <th className="text-left px-4 py-3 text-text-secondary text-xs font-medium uppercase tracking-wider">Tipo</th>
              <th className="text-left px-4 py-3 text-text-secondary text-xs font-medium uppercase tracking-wider">Estado</th>
              <th className="text-left px-4 py-3 text-text-secondary text-xs font-medium uppercase tracking-wider">Descripción</th>
              <th className="text-left px-4 py-3 text-text-secondary text-xs font-medium uppercase tracking-wider">Origen</th>
              <th className="text-left px-4 py-3 text-text-secondary text-xs font-medium uppercase tracking-wider">Creada</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-border">
            {isLoading ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-text-secondary">
                  Cargando...
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-danger">
                  Error al cargar solicitudes
                </td>
              </tr>
            ) : data?.data?.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-text-secondary">
                  No hay solicitudes {tipo ? `de tipo ${TIPO_LABEL[tipo as TipoStub]}` : ''}
                </td>
              </tr>
            ) : (
              data?.data?.map((stub: SolicitudStub) => (
                <tr key={stub.id} className="hover:bg-surface-subtle transition-colors cursor-pointer">
                  <td className="px-4 py-3 text-sm font-mono text-primary">{stub.codigo}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${TIPO_STYLE[stub.tipo] ?? ''}`}>
                      {TIPO_LABEL[stub.tipo] ?? stub.tipo}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${ESTADO_STYLE[stub.estado] ?? ''}`}>
                      {ESTADO_STUB_LABEL[stub.estado] ?? stub.estado}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-text-primary max-w-xs truncate">{stub.descripcion}</td>
                  <td className="px-4 py-3 text-sm text-text-secondary">{stub.origen_modulo}</td>
                  <td className="px-4 py-3 text-sm text-text-secondary">
                    {new Date(stub.created_at).toLocaleDateString('es-CL')}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
