/**
 * Validación de RUT chileno — Algoritmo Módulo 11.
 *
 * Formatos aceptados:
 *   "12345678-9"   "12.345.678-9"   "12345678-K"   "12345678K"
 *
 * @example
 *   validarRut("12345678-9")     // true / false
 *   normalizarRut("12.345.678-9") // "12345678-9"
 *   formatearRut("123456789")    // "12.345.678-9"
 */

const CLEAN_RE = /[.\-\s]/g

function limpiar(rut: string): string {
  return rut.trim().replace(CLEAN_RE, "").toUpperCase()
}

function calcularDv(cuerpo: string): string {
  let suma = 0
  let multiplo = 2

  for (let i = cuerpo.length - 1; i >= 0; i--) {
    suma += parseInt(cuerpo[i], 10) * multiplo
    multiplo = multiplo === 7 ? 2 : multiplo + 1
  }

  const resto = 11 - (suma % 11)
  if (resto === 11) return "0"
  if (resto === 10) return "K"
  return String(resto)
}

/**
 * Valida un RUT chileno con el algoritmo Módulo 11.
 * Retorna `true` si el RUT y su dígito verificador son correctos.
 */
export function validarRut(rut: string): boolean {
  if (!rut) return false
  const limpio = limpiar(rut)
  if (!/^\d{7,8}[0-9K]$/.test(limpio)) return false
  const cuerpo = limpio.slice(0, -1)
  const dv = limpio.slice(-1)
  return calcularDv(cuerpo) === dv
}

/**
 * Normaliza un RUT al formato estándar sin puntos: "12345678-9".
 * Retorna `null` si el RUT es inválido.
 */
export function normalizarRut(rut: string): string | null {
  if (!validarRut(rut)) return null
  const limpio = limpiar(rut)
  return `${limpio.slice(0, -1)}-${limpio.slice(-1)}`
}

/**
 * Formatea un RUT con puntos y guión: "12.345.678-9".
 * Retorna `null` si el RUT es inválido.
 */
export function formatearRut(rut: string): string | null {
  const normalizado = normalizarRut(rut)
  if (!normalizado) return null
  const [cuerpo, dv] = normalizado.split("-")
  return `${cuerpo.replace(/\B(?=(\d{3})+(?!\d))/g, ".")}-${dv}`
}

/**
 * Formatea el input del usuario en tiempo real mientras escribe.
 * Útil para inputs controlados — aplica formato "XX.XXX.XXX-X" progresivamente.
 */
export function formatearRutInput(valor: string): string {
  const limpio = valor.replace(CLEAN_RE, "").replace(/[^0-9kK]/g, "").toUpperCase()
  if (limpio.length === 0) return ""

  const cuerpo = limpio.slice(0, -1)
  const dv = limpio.slice(-1)

  if (limpio.length <= 1) return limpio

  const cuerpoFormateado = cuerpo.replace(/\B(?=(\d{3})+(?!\d))/g, ".")
  return `${cuerpoFormateado}-${dv}`
}
