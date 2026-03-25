export type RolFuncional =
  | 'vendedor'
  | 'coordinador_instalaciones'
  | 'supervisor_instalaciones'
  | 'instalador'
  | 'postventa'
  | 'bodega'
  | 'contabilidad'
  | 'cobranza'
  | 'gerencia'
  | 'admin'

export type NivelJerarquico =
  | 'director'
  | 'gerencia'
  | 'jefatura'
  | 'supervisor'
  | 'usuario'

export interface Usuario {
  id: string
  email: string
  nombre: string
  rol_funcional: RolFuncional
  nivel_jerarquico: NivelJerarquico
  activo: boolean
}

export interface LoginPayload {
  email: string
  password: string
}
