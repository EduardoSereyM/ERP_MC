import { Navigate } from 'react-router-dom'
import { useSession } from '@/modules/auth/hooks/useSession'
import type { RolFuncional, NivelJerarquico } from '@/modules/auth/types'

const JERARQUIA: NivelJerarquico[] = ['usuario', 'supervisor', 'jefatura', 'gerencia', 'director']

interface ProtectedRouteProps {
  children: React.ReactNode
  requiredRol?: RolFuncional | RolFuncional[]
  requiredNivelMinimo?: NivelJerarquico
}

export const ProtectedRoute = ({
  children,
  requiredRol,
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

  if (!session) {
    return <Navigate to="/login" replace />
  }

  if (requiredRol && usuario) {
    const roles = Array.isArray(requiredRol) ? requiredRol : [requiredRol]
    if (!roles.includes(usuario.rol_funcional)) {
      return <Navigate to="/sin-permiso" replace />
    }
  }

  if (requiredNivelMinimo && usuario) {
    const userIdx = JERARQUIA.indexOf(usuario.nivel_jerarquico)
    const requiredIdx = JERARQUIA.indexOf(requiredNivelMinimo)
    if (userIdx < requiredIdx) {
      return <Navigate to="/sin-permiso" replace />
    }
  }

  return <>{children}</>
}
