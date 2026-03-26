import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ProtectedRoute } from '@/modules/auth/components/ProtectedRoute'
import { AppLayout } from '@/core/components/AppLayout'
import { LoginView } from '@/modules/auth/views/LoginView'
import { DashboardView } from '@/modules/dashboard/views/DashboardView'
import { ClientesListView } from '@/modules/clientes/views/ClientesListView'
import { ProductosListView } from '@/modules/productos/views/ProductosListView'
import { VentasListView } from '@/modules/ventas/views/VentasListView'
import { StubsListView } from '@/modules/ventas/views/StubsListView'
import { VentaDetailView } from '@/modules/ventas/views/VentaDetailView'
import { AuditLogsView } from '@/modules/logs/views/AuditLogsView'

const UnauthorizedView = () => (
  <div className="flex items-center justify-center h-screen bg-surface-muted">
    <div className="text-center">
      <p className="text-2xl font-semibold text-text-primary">Sin permiso</p>
      <p className="text-text-secondary mt-2">No tienes acceso a esta sección.</p>
    </div>
  </div>
)

export const AppRouter = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* Públicas */}
        <Route path="/login" element={<LoginView />} />
        <Route path="/sin-permiso" element={<UnauthorizedView />} />

        {/* Protegidas — requieren sesión activa + Layout */}
        <Route
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          {/* Dashboard — todos los roles */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute requiredModulo="dashboard">
                <DashboardView />
              </ProtectedRoute>
            }
          />

          {/* Clientes */}
          <Route
            path="/clientes"
            element={
              <ProtectedRoute requiredModulo="clientes">
                <ClientesListView />
              </ProtectedRoute>
            }
          />

          {/* Productos (demo) */}
          <Route
            path="/productos"
            element={
              <ProtectedRoute requiredModulo="productos">
                <ProductosListView />
              </ProtectedRoute>
            }
          />

          {/* Ventas */}
          <Route
            path="/ventas"
            element={
              <ProtectedRoute requiredModulo="ventas">
                <VentasListView />
              </ProtectedRoute>
            }
          />
          <Route
            path="/ventas/:id"
            element={
              <ProtectedRoute requiredModulo="ventas">
                <VentaDetailView />
              </ProtectedRoute>
            }
          />

          {/* Solicitudes */}
          <Route
            path="/stubs"
            element={
              <ProtectedRoute requiredModulo="solicitudes">
                <StubsListView />
              </ProtectedRoute>
            }
          />

          {/* Auditoría — solo gerencia/admin */}
          <Route
            path="/admin/audit-logs"
            element={
              <ProtectedRoute requiredModulo="logs">
                <AuditLogsView />
              </ProtectedRoute>
            }
          />
        </Route>

        {/* Redirecciones */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
