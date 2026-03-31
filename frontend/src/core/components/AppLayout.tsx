import { Outlet, Link, useLocation } from 'react-router-dom'
import icono from '@/assets/icono.png'
import { useSession } from '@/modules/auth/hooks/useSession'
import { useAuth } from '@/modules/auth/hooks/useAuth'
import { usePermisos } from '@/core/hooks/usePermisos'
import type { ModuloId } from '@/core/permisos'
import type { RolFuncional } from '@/modules/auth/types'

// ─── Íconos Material Symbols ─────────────────────────────────────────────────
const Icon = ({ name, filled = false, className = '' }: { name: string; filled?: boolean; className?: string }) => (
  <span
    className={`material-symbols-outlined ${className}`}
    style={{ fontVariationSettings: `'FILL' ${filled ? 1 : 0}, 'wght' 400, 'GRAD' 0, 'opsz' 24` }}
  >
    {name}
  </span>
)

// ─── Etiqueta legible del rol ─────────────────────────────────────────────────
const ROL_LABEL: Record<RolFuncional, string> = {
  vendedor:                  'Vendedor',
  coordinador_instalaciones: 'Coord. Instalaciones',
  supervisor_instalaciones:  'Supervisor Instalaciones',
  instalador:                'Instalador',
  postventa:                 'Postventa',
  bodega:                    'Bodega',
  contabilidad:              'Contabilidad',
  cobranza:                  'Cobranza',
  gerencia:                  'Gerencia',
  admin:                     'Administrador',
}

// ─── Nav items vinculados a la matriz de permisos ─────────────────────────────
interface NavItemDef {
  path: string
  label: string
  icon: string
  modulo?: ModuloId   // si está definido, se filtra según puedeAcceder()
}

const NAV_ITEMS: NavItemDef[] = [
  { path: '/dashboard', label: 'Dashboard',  icon: 'dashboard', modulo: 'dashboard'    },
  { path: '/ventas',    label: 'Ventas',      icon: 'payments',  modulo: 'ventas'       },
  { path: '/clientes',  label: 'Clientes',    icon: 'group',     modulo: 'clientes'     },
  { path: '/stubs',     label: 'Solicitudes', icon: 'task_alt',  modulo: 'solicitudes'  },
]

// ─── Nav items deshabilitados (en construcción o fases futuras) ───────────────
const NAV_DISABLED = [
  { label: 'Productos',  icon: 'category',    badge: 'Demo'    },
  { label: 'Inventario', icon: 'inventory_2', badge: undefined },
  { label: 'Reportes',   icon: 'analytics',   badge: undefined },
]

const NAV_BOTTOM_DISABLED = [
  { label: 'Ajustes', icon: 'settings' },
  { label: 'Soporte', icon: 'help'     },
]

// ─── Iniciales del usuario ────────────────────────────────────────────────────
function getInitials(nombre: string): string {
  return nombre
    .split(' ')
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase() ?? '')
    .join('')
}

export const AppLayout = () => {
  const { usuario } = useSession()
  const { cerrarSesion } = useAuth()
  const location = useLocation()
  const permisos = usePermisos()

  const initials = usuario ? getInitials(usuario.nombre) : '?'

  // Filtrar items de nav según la matriz de permisos
  const navItems = NAV_ITEMS.filter(item =>
    !item.modulo || permisos.puedeAcceder(item.modulo)
  )

  return (
    <div className="flex h-screen overflow-hidden bg-surface-muted">

      {/* ── Sidebar ── */}
      <aside className="flex flex-col h-full bg-navy w-64 flex-shrink-0 z-50">

        {/* Logo */}
        <div className="p-6">
          <div className="flex items-center gap-3">
            <img src={icono} alt="Logo" className="w-10 h-10 flex-shrink-0" />
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight leading-none">ESM ERP</h1>
              <p className="text-xs text-slate-400 font-medium mt-0.5">Enterprise Resource</p>
            </div>
          </div>
        </div>

        {/* Navigation activa */}
        <nav className="flex-1 mt-2 space-y-0.5">
          {navItems.map((item) => {
            const isActive = location.pathname.startsWith(item.path)
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 mx-2 px-4 py-3 rounded-md transition-colors text-sm ${
                  isActive
                    ? 'bg-white/10 text-white font-semibold'
                    : 'text-slate-300 hover:text-white hover:bg-white/10'
                }`}
              >
                <Icon name={item.icon} filled={isActive} className="text-xl flex-shrink-0" />
                <span className="tracking-wide">{item.label}</span>
              </Link>
            )
          })}

          {/* Separador */}
          <div className="mx-6 my-2 border-t border-white/5" />

          {/* Navigation deshabilitada */}
          {NAV_DISABLED.map((item) => (
            <div
              key={item.label}
              title={item.badge === 'Demo' ? 'Módulo en construcción — datos de prueba' : 'Próximamente'}
              className="flex items-center gap-3 mx-2 px-4 py-3 rounded-md text-slate-600 cursor-not-allowed text-sm"
            >
              <Icon name={item.icon} className="text-xl flex-shrink-0" />
              <span className="tracking-wide flex-1">{item.label}</span>
              {item.badge && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 uppercase tracking-wider">
                  {item.badge}
                </span>
              )}
            </div>
          ))}
        </nav>

        {/* Bottom nav */}
        <div className="mt-auto pb-4 border-t border-white/5 pt-3">
          {NAV_BOTTOM_DISABLED.map((item) => (
            <div
              key={item.label}
              title="Próximamente"
              className="flex items-center gap-3 mx-2 px-4 py-3 rounded-md text-slate-600 cursor-not-allowed text-sm"
            >
              <Icon name={item.icon} className="text-xl flex-shrink-0" />
              <span className="tracking-wide">{item.label}</span>
            </div>
          ))}
        </div>
      </aside>

      {/* ── Main area ── */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">

        {/* Topbar */}
        <header className="flex justify-end items-center h-16 px-8 bg-white border-b border-surface-border z-40 flex-shrink-0">
          <div className="flex items-center gap-3">
            {/* Notificaciones */}
            <button className="p-2 text-text-secondary hover:text-primary transition-colors relative rounded-lg hover:bg-surface-muted">
              <Icon name="notifications" className="text-xl" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-danger rounded-full" />
            </button>

            {/* Apps */}
            <button className="p-2 text-text-secondary hover:text-primary transition-colors rounded-lg hover:bg-surface-muted">
              <Icon name="apps" className="text-xl" />
            </button>

            {/* Divisor */}
            <div className="h-8 w-px bg-surface-border mx-1" />

            {/* Usuario */}
            <div className="flex items-center gap-3 pl-1">
              <div className="flex flex-col items-end">
                <span className="text-xs font-bold text-text-primary leading-tight">
                  {usuario?.nombre ?? ''}
                </span>
                <span className="text-[10px] text-text-secondary leading-tight">
                  {usuario ? ROL_LABEL[usuario.rol_funcional] : ''}
                </span>
                <button
                  onClick={cerrarSesion}
                  className="text-[10px] text-danger font-semibold hover:underline leading-tight mt-0.5"
                >
                  Cerrar sesión
                </button>
              </div>
              <div className="w-9 h-9 rounded-full bg-navy text-white flex items-center justify-center font-bold text-sm shadow-sm border border-white/20 flex-shrink-0">
                {initials}
              </div>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
