/**
 * permisos.ts — Matriz central de permisos del ERP MC
 *
 * CÓMO USAR:
 *   import { puedeAcceder, nivelAcceso, puedeEditarCampoProtegido } from '@/core/permisos'
 *
 * NIVELES DE ACCESO:
 *   null    → Sin acceso (ruta bloqueada, ítem oculto en sidebar)
 *   'R'     → Solo lectura
 *   'RW'    → Lectura + escritura (crear, editar registros propios)
 *   'RWS'   → Lectura + escritura + especial (aprobar, anular, acciones críticas)
 */

import type { RolFuncional, NivelJerarquico } from '@/modules/auth/types'

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type NivelAcceso = 'R' | 'RW' | 'RWS' | null

export type ModuloId =
  | 'dashboard'
  | 'ventas'
  | 'clientes'
  | 'solicitudes'
  | 'productos'
  | 'logs'
  // Fase 1B+
  | 'instalaciones'
  | 'servicio_tecnico'
  | 'postventa'
  | 'inventario'
  | 'contabilidad_mod'
  | 'cobranza_mod'
  | 'reportes'

// ─── Helpers de nivel jerárquico ──────────────────────────────────────────────

const JERARQUIA_ORDEN: NivelJerarquico[] = [
  'usuario',
  'supervisor',
  'jefatura',
  'gerencia',
  'director',
]

/** true si el nivel del usuario es >= al nivel requerido */
export function nivelMinimo(nivel: NivelJerarquico, minimo: NivelJerarquico): boolean {
  return JERARQUIA_ORDEN.indexOf(nivel) >= JERARQUIA_ORDEN.indexOf(minimo)
}

/** true si el usuario es de jefatura, gerencia, director o admin */
export function esJefaturaOSuperior(
  rol: RolFuncional,
  nivel: NivelJerarquico
): boolean {
  return rol === 'admin' || nivelMinimo(nivel, 'jefatura')
}

// ─── Matriz de acceso por módulo ──────────────────────────────────────────────
//
// Estructura: MATRIZ[modulo][rol_funcional] = NivelAcceso
// La jefatura/gerencia/admin elevan el nivel base automáticamente
// mediante la función nivelAcceso() más abajo.

type MatrizModulo = Partial<Record<RolFuncional, NivelAcceso>>

const MATRIZ: Record<ModuloId, MatrizModulo> = {
  // Dashboard — todos los roles autenticados
  dashboard: {
    vendedor:                  'R',
    coordinador_instalaciones: 'R',
    supervisor_instalaciones:  'R',
    instalador:                'R',
    postventa:                 'R',
    bodega:                    'R',
    contabilidad:              'R',
    cobranza:                  'R',
    gerencia:                  'RWS',
    admin:                     'RWS',
  },

  // Ventas — equipo comercial + dirección
  ventas: {
    vendedor:     'RW',
    postventa:    'R',   // solo lectura para ver historial del cliente
    contabilidad: 'R',   // solo lectura para conciliación
    cobranza:     'R',   // solo lectura para gestión de cobro
    gerencia:     'RWS',
    admin:        'RWS',
  },

  // Clientes — todos los que trabajan con clientes
  clientes: {
    vendedor:                  'RW',
    coordinador_instalaciones: 'R',
    supervisor_instalaciones:  'R',
    postventa:                 'RW',
    contabilidad:              'R',
    cobranza:                  'R',
    gerencia:                  'RWS',
    admin:                     'RWS',
  },

  // Solicitudes (stubs + futuro SolicitudSistema)
  solicitudes: {
    vendedor:                  'RW',
    coordinador_instalaciones: 'RW',
    supervisor_instalaciones:  'RW',
    instalador:                'R',
    postventa:                 'RW',
    bodega:                    'R',
    gerencia:                  'RWS',
    admin:                     'RWS',
  },

  // Productos — catálogo (demo por ahora)
  productos: {
    vendedor:                  'R',
    coordinador_instalaciones: 'R',
    supervisor_instalaciones:  'R',
    instalador:                'R',
    bodega:                    'RW',
    contabilidad:              'R',
    gerencia:                  'RWS',
    admin:                     'RWS',
  },

  // Logs de auditoría — solo gerencia y admin
  logs: {
    gerencia: 'R',
    admin:    'RWS',
  },

  // ── Módulos futuros (Fase 1B+) ─────────────────────────────────────────────

  instalaciones: {
    vendedor:                  'R',
    coordinador_instalaciones: 'RW',
    supervisor_instalaciones:  'RW',
    instalador:                'R',
    postventa:                 'R',
    gerencia:                  'RWS',
    admin:                     'RWS',
  },

  servicio_tecnico: {
    coordinador_instalaciones: 'R',
    supervisor_instalaciones:  'RW',
    instalador:                'RW',
    postventa:                 'RW',
    gerencia:                  'RWS',
    admin:                     'RWS',
  },

  postventa: {
    vendedor:  'R',
    postventa: 'RW',
    gerencia:  'RWS',
    admin:     'RWS',
  },

  inventario: {
    coordinador_instalaciones: 'R',
    supervisor_instalaciones:  'R',
    instalador:                'R',
    postventa:                 'R',
    bodega:                    'RW',
    contabilidad:              'R',
    gerencia:                  'RWS',
    admin:                     'RWS',
  },

  contabilidad_mod: {
    contabilidad: 'RW',
    cobranza:     'R',
    gerencia:     'RWS',
    admin:        'RWS',
  },

  cobranza_mod: {
    contabilidad: 'R',
    cobranza:     'RW',
    gerencia:     'RWS',
    admin:        'RWS',
  },

  reportes: {
    vendedor:                  'R',
    coordinador_instalaciones: 'R',
    supervisor_instalaciones:  'R',
    postventa:                 'R',
    bodega:                    'R',
    contabilidad:              'R',
    cobranza:                  'R',
    gerencia:                  'RWS',
    admin:                     'RWS',
  },
}

// ─── API pública ──────────────────────────────────────────────────────────────

/**
 * Devuelve el nivel de acceso efectivo al módulo.
 * La jefatura eleva RW → RWS y R → RW dentro de su área.
 */
export function nivelAcceso(
  modulo: ModuloId,
  rol: RolFuncional,
  nivel: NivelJerarquico
): NivelAcceso {
  const base = MATRIZ[modulo]?.[rol] ?? null
  if (!base) return null

  // Admin siempre RWS en cualquier módulo que tenga acceso
  if (rol === 'admin') return 'RWS'

  // Gerencia y director siempre RWS
  if (nivel === 'gerencia' || nivel === 'director') return 'RWS'

  // Jefatura eleva el nivel base: R→RW, RW→RWS
  if (nivel === 'jefatura') {
    if (base === 'R')  return 'RW'
    if (base === 'RW') return 'RWS'
    return base
  }

  return base
}

/** true si el usuario puede acceder al módulo (nivel no null) */
export function puedeAcceder(
  modulo: ModuloId,
  rol: RolFuncional,
  nivel: NivelJerarquico
): boolean {
  return nivelAcceso(modulo, rol, nivel) !== null
}

/** true si el usuario puede escribir (RW o RWS) */
export function puedeEscribir(
  modulo: ModuloId,
  rol: RolFuncional,
  nivel: NivelJerarquico
): boolean {
  const n = nivelAcceso(modulo, rol, nivel)
  return n === 'RW' || n === 'RWS'
}

/** true si el usuario tiene acceso especial (RWS) */
export function puedeAccionEspecial(
  modulo: ModuloId,
  rol: RolFuncional,
  nivel: NivelJerarquico
): boolean {
  return nivelAcceso(modulo, rol, nivel) === 'RWS'
}

// ─── Campos protegidos ────────────────────────────────────────────────────────
//
// Los campos protegidos requieren jefatura o superior para editar.
// Los inmutables no se editan nunca vía UI (solo admin vía SolicitudSistema).

export type NivelCampo = 'libre' | 'protegido' | 'inmutable'

interface CampoProtegido {
  nivel: NivelCampo
  /** Nivel jerárquico mínimo para editar (solo aplica a 'protegido') */
  minimoNivel?: NivelJerarquico
  /** Tooltip mostrado al usuario sin permiso */
  tooltip: string
}

export const CAMPOS_PROTEGIDOS: Record<string, Record<string, CampoProtegido>> = {
  clientes: {
    rut: {
      nivel: 'protegido',
      minimoNivel: 'jefatura',
      tooltip: 'Solo jefatura o gerencia puede modificar el RUT',
    },
    codigo: {
      nivel: 'inmutable',
      tooltip: 'El código no puede modificarse',
    },
  },
  ventas: {
    cliente_id: {
      nivel: 'inmutable',
      tooltip: 'El cliente no puede cambiarse — crea una nueva venta',
    },
    vendedor_id: {
      nivel: 'protegido',
      minimoNivel: 'gerencia',
      tooltip: 'Solo gerencia o admin puede reasignar el vendedor',
    },
  },
  usuarios: {
    rol_funcional: {
      nivel: 'protegido',
      minimoNivel: 'director',   // solo admin en la práctica
      tooltip: 'Solo admin puede cambiar el rol funcional',
    },
    email: {
      nivel: 'protegido',
      minimoNivel: 'gerencia',
      tooltip: 'Solo gerencia o admin puede modificar el email',
    },
  },
}

/**
 * true si el usuario puede editar el campo (no está protegido para él)
 */
export function puedeEditarCampo(
  entidad: string,
  campo: string,
  rol: RolFuncional,
  nivel: NivelJerarquico
): boolean {
  const def = CAMPOS_PROTEGIDOS[entidad]?.[campo]
  if (!def) return true                         // campo libre
  if (def.nivel === 'inmutable') return false   // nunca editable
  if (rol === 'admin') return true              // admin siempre puede
  if (!def.minimoNivel) return false
  return nivelMinimo(nivel, def.minimoNivel)
}

/**
 * Devuelve el tooltip del campo protegido, o null si no tiene restricción.
 */
export function tooltipCampoProtegido(
  entidad: string,
  campo: string,
  rol: RolFuncional,
  nivel: NivelJerarquico
): string | null {
  if (puedeEditarCampo(entidad, campo, rol, nivel)) return null
  return CAMPOS_PROTEGIDOS[entidad]?.[campo]?.tooltip ?? null
}
