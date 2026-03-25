import { useSession } from '@/modules/auth/hooks/useSession'

export const DashboardView = () => {
  const { usuario } = useSession()

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-text-primary">
          Bienvenido, {usuario?.nombre ?? 'Usuario'}
        </h1>
        <p className="text-text-secondary mt-1">
          Panel de control — ERP MC
        </p>
      </div>

      {/* Placeholder cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Ventas activas', value: '—', color: 'bg-primary-10 text-primary-dark' },
          { label: 'Cotizaciones pendientes', value: '—', color: 'bg-warning-10 text-warning-text' },
          { label: 'Stubs sin respuesta', value: '—', color: 'bg-danger-10 text-danger-text' },
          { label: 'Clientes registrados', value: '—', color: 'bg-success-10 text-success-text' },
        ].map((card) => (
          <div
            key={card.label}
            className="bg-surface rounded-xl border border-surface-border p-5"
          >
            <p className="text-text-secondary text-sm">{card.label}</p>
            <p className={`text-3xl font-bold mt-2 ${card.color} inline-block px-2 py-1 rounded-lg`}>
              {card.value}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-8 bg-surface rounded-xl border border-surface-border p-6">
        <p className="text-text-secondary text-center py-8">
          Los KPIs y gráficos se implementarán en Fase 1F
        </p>
      </div>
    </div>
  )
}
