import { Navigate } from 'react-router-dom'
import { useSession } from '@/modules/auth/hooks/useSession'
import { puedeAcceder } from '@/core/permisos'
import type { ModuloId } from '@/core/permisos'
import type { NivelJerarquico } from '@/modules/auth/types'

const JERARQUIA: NivelJerarquico[] = ['usuario', 'supervisor', 'jefatura', 'gerencia', 'director']

interface ProtectedRouteProps {
  children: React.ReactNode
  /** Protege por módulo usando la matriz de permisos centralizada */
  requiredModulo?: ModuloId
  /** Protege por nivel jerárquico mínimo (opcional, además del módulo) */
  requiredNivelMinimo?: NivelJerarquico
}

export const ProtectedRoute = ({
  children,
  requiredModulo,
  requiredNivelMinimo,
}: ProtectedRouteProps) => {
  const { session, usuario, isLoading } = useSession()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-surface-muted">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    )
  }

  if (!session) return <Navigate to="/login" replace />

  // Verificar acceso al módulo según matriz de permisos
  if (requiredModulo && usuario) {
    if (!puedeAcceder(requiredModulo, usuario.rol_funcional, usuario.nivel_jerarquico)) {
      return <Navigate to="/sin-permiso" replace />
    }
  }

  // Verificar nivel jerárquico mínimo (para restricciones adicionales)
  if (requiredNivelMinimo && usuario) {
    const userIdx     = JERARQUIA.indexOf(usuario.nivel_jerarquico)
    const requiredIdx = JERARQUIA.indexOf(requiredNivelMinimo)
    if (userIdx < requiredIdx) {
      return <Navigate to="/sin-permiso" replace />
    }
  }

  return <>{children}</>
}
