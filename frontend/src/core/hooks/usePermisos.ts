/**
 * usePermisos — hook que expone la matriz de permisos para el usuario actual
 *
 * Uso:
 *   const { puedeEscribir, puedeAccionEspecial, puedeEditarCampo, tooltipCampo } = usePermisos()
 *
 *   puedeEscribir('ventas')              → true si RW o RWS
 *   puedeAccionEspecial('ventas')        → true si RWS
 *   puedeEditarCampo('clientes', 'rut')  → false para vendedor sin jefatura
 *   tooltipCampo('clientes', 'rut')      → "Solo jefatura..." | null
 */

import { useMe } from '@/modules/auth/hooks/useMe'
import {
  puedeAcceder,
  puedeEscribir,
  puedeAccionEspecial,
  puedeEditarCampo,
  tooltipCampoProtegido,
  nivelAcceso,
  esJefaturaOSuperior,
} from '@/core/permisos'
import type { ModuloId } from '@/core/permisos'

export function usePermisos() {
  const { data: usuario } = useMe()

  const rol    = usuario?.rol_funcional
  const nivel  = usuario?.nivel_jerarquico

  // Mientras carga el usuario → denegar todo (safe default)
  if (!rol || !nivel) {
    return {
      listo:               false,
      esJefaturaOSuperior: false,
      nivelAcceso:         (_m: ModuloId) => null as ReturnType<typeof nivelAcceso>,
      puedeAcceder:        (_m: ModuloId) => false,
      puedeEscribir:       (_m: ModuloId) => false,
      puedeAccionEspecial: (_m: ModuloId) => false,
      puedeEditarCampo:    (_e: string, _c: string) => false,
      tooltipCampo:        (_e: string, _c: string) => null as string | null,
    }
  }

  return {
    listo: true,
    esJefaturaOSuperior: esJefaturaOSuperior(rol, nivel),

    nivelAcceso:         (modulo: ModuloId) => nivelAcceso(modulo, rol, nivel),
    puedeAcceder:        (modulo: ModuloId) => puedeAcceder(modulo, rol, nivel),
    puedeEscribir:       (modulo: ModuloId) => puedeEscribir(modulo, rol, nivel),
    puedeAccionEspecial: (modulo: ModuloId) => puedeAccionEspecial(modulo, rol, nivel),

    puedeEditarCampo:    (entidad: string, campo: string) =>
      puedeEditarCampo(entidad, campo, rol, nivel),

    tooltipCampo:        (entidad: string, campo: string) =>
      tooltipCampoProtegido(entidad, campo, rol, nivel),
  }
}
