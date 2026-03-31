export type EstadoSAC =
  | 'CREADO'
  | 'REVISION_INFO'
  | 'EN_GESTION_VTA'
  | 'EN_COORDINACION'
  | 'PROGRAMADO'
  | 'REPROGRAMADO'
  | 'EN_EJECUCION'
  | 'COMPLETADO'
  | 'GESTION_COBRO'
  | 'CERRADO'
  | 'CERRADO_SIN_EJECUTAR'
  | 'CERRADO_SIN_TERMINAR'

export type EstadoOT =
  | 'PENDIENTE'
  | 'EN_EJECUCION'
  | 'PAUSADA'
  | 'ENTREGA_PARCIAL'
  | 'COMPLETADA'
  | 'CERRADA_ADMIN'
  | 'CERRADA_SIN_EJECUTAR'
  | 'CERRADA_SIN_TERMINAR'

export type TipoSAC = 'suministro_instalacion' | 'solo_instalacion'

export type CargoContacto =
  | 'administrador'
  | 'jefe_bodega'
  | 'prevencion_riesgos'
  | 'responsable_despacho'
  | 'responsable_ingreso'
  | 'otro'

// ─── SAC ─────────────────────────────────────────────────────────────────────

export interface SAC {
  id: string
  codigo: string
  venta_id: string | null
  cliente_id: string
  coordinador_id: string | null
  estado: EstadoSAC
  tipo: TipoSAC
  direccion_obra: string | null
  comuna_obra: string | null
  ciudad_obra: string | null
  fecha_programada: string | null
  fecha_ejecucion: string | null
  fecha_cierre: string | null
  motivo_devolucion: string | null
  respuesta_devolucion: string | null
  motivo_cierre: string | null
  notas: string | null
  created_at: string
  updated_at: string
  created_by: string | null
  updated_by: string | null
}

export interface SACListItem {
  id: string
  codigo: string
  venta_id: string | null
  cliente_id: string
  coordinador_id: string | null
  estado: EstadoSAC
  tipo: TipoSAC
  direccion_obra: string | null
  comuna_obra: string | null
  fecha_programada: string | null
  cliente_razon_social: string | null
  created_at: string
}

export interface SACCreate {
  cliente_id: string
  venta_id?: string | null
  tipo?: TipoSAC
  coordinador_id?: string | null
  direccion_obra?: string | null
  comuna_obra?: string | null
  ciudad_obra?: string | null
  fecha_programada?: string | null
  notas?: string | null
}

export interface SACUpdate {
  coordinador_id?: string | null
  direccion_obra?: string | null
  comuna_obra?: string | null
  ciudad_obra?: string | null
  fecha_programada?: string | null
  notas?: string | null
}

export interface SACCambioEstado {
  estado: EstadoSAC
  motivo_devolucion?: string | null
  respuesta_devolucion?: string | null
  motivo_cierre?: string | null
}

// ─── ContactoObra ─────────────────────────────────────────────────────────────

export interface ContactoObra {
  id: string
  sac_id: string
  nombre: string
  cargo: CargoContacto
  telefono: string | null
  email: string | null
  es_principal: boolean
  notas: string | null
  created_at: string
}

export interface ContactoObraCreate {
  nombre: string
  cargo?: CargoContacto
  telefono?: string | null
  email?: string | null
  es_principal?: boolean
  notas?: string | null
}

// ─── OT ──────────────────────────────────────────────────────────────────────

export interface OrdenTrabajo {
  id: string
  codigo: string
  sac_id: string
  supervisor_id: string | null
  contratista_id: string | null
  estado: EstadoOT
  fecha_inicio: string | null
  fecha_fin_real: string | null
  checklist_completado: boolean
  duracion_total_minutos: number | null
  motivo_pausa: string | null
  motivo_cierre: string | null
  notas: string | null
  created_at: string
  updated_at: string
}

export interface OTCreate {
  supervisor_id?: string | null
  contratista_id?: string | null
  fecha_inicio?: string | null
  notas?: string | null
}

export interface OTCambioEstado {
  estado: EstadoOT
  motivo_pausa?: string | null
  motivo_cierre?: string | null
  duracion_total_minutos?: number | null
}

// ─── Checklist ───────────────────────────────────────────────────────────────

export interface ChecklistItem {
  pregunta: {
    id: string
    orden: number
    texto: string
    tipo_respuesta: 'si_no' | 'texto' | 'numero' | 'foto' | 'firma'
    obligatorio: boolean
    permite_foto: boolean
  }
  respuesta: {
    id: string
    respuesta_texto: string | null
    respuesta_boolean: boolean | null
    foto_url: string | null
    respondido_at: string
  } | null
}

export interface ChecklistRespuestaUpsert {
  pregunta_id: string
  respuesta_texto?: string | null
  respuesta_boolean?: boolean | null
  foto_url?: string | null
}

// ─── Labels ──────────────────────────────────────────────────────────────────

export const ESTADO_SAC_LABEL: Record<EstadoSAC, string> = {
  CREADO:               'Creado',
  REVISION_INFO:        'Revisión info',
  EN_GESTION_VTA:       'En gestión ventas',
  EN_COORDINACION:      'En coordinación',
  PROGRAMADO:           'Programado',
  REPROGRAMADO:         'Reprogramado',
  EN_EJECUCION:         'En ejecución',
  COMPLETADO:           'Completado',
  GESTION_COBRO:        'Gestión cobro',
  CERRADO:              'Cerrado',
  CERRADO_SIN_EJECUTAR: 'Cerrado sin ejecutar',
  CERRADO_SIN_TERMINAR: 'Cerrado sin terminar',
}

export const ESTADO_OT_LABEL: Record<EstadoOT, string> = {
  PENDIENTE:            'Pendiente',
  EN_EJECUCION:         'En ejecución',
  PAUSADA:              'Pausada',
  ENTREGA_PARCIAL:      'Entrega parcial',
  COMPLETADA:           'Completada',
  CERRADA_ADMIN:        'Cerrada (admin)',
  CERRADA_SIN_EJECUTAR: 'Cerrada sin ejecutar',
  CERRADA_SIN_TERMINAR: 'Cerrada sin terminar',
}

export const CARGO_LABEL: Record<CargoContacto, string> = {
  administrador:         'Administrador',
  jefe_bodega:           'Jefe de bodega',
  prevencion_riesgos:    'Prevención de riesgos',
  responsable_despacho:  'Responsable de despacho',
  responsable_ingreso:   'Responsable de ingreso',
  otro:                  'Otro',
}

export const TRANSICIONES_SAC: Record<EstadoSAC, EstadoSAC[]> = {
  CREADO:               ['REVISION_INFO', 'CERRADO_SIN_EJECUTAR'],
  REVISION_INFO:        ['EN_GESTION_VTA', 'EN_COORDINACION', 'CERRADO_SIN_EJECUTAR'],
  EN_GESTION_VTA:       ['REVISION_INFO', 'CERRADO_SIN_EJECUTAR'],
  EN_COORDINACION:      ['PROGRAMADO', 'CERRADO_SIN_EJECUTAR'],
  PROGRAMADO:           ['REPROGRAMADO', 'EN_EJECUCION', 'CERRADO_SIN_EJECUTAR'],
  REPROGRAMADO:         ['PROGRAMADO', 'CERRADO_SIN_EJECUTAR'],
  EN_EJECUCION:         ['COMPLETADO', 'CERRADO_SIN_TERMINAR'],
  COMPLETADO:           ['GESTION_COBRO'],
  GESTION_COBRO:        ['CERRADO'],
  CERRADO:              [],
  CERRADO_SIN_EJECUTAR: [],
  CERRADO_SIN_TERMINAR: [],
}

export const TRANSICIONES_OT: Record<EstadoOT, EstadoOT[]> = {
  PENDIENTE:            ['EN_EJECUCION', 'CERRADA_SIN_EJECUTAR'],
  EN_EJECUCION:         ['PAUSADA', 'ENTREGA_PARCIAL', 'COMPLETADA', 'CERRADA_SIN_TERMINAR'],
  PAUSADA:              ['EN_EJECUCION', 'CERRADA_SIN_TERMINAR'],
  ENTREGA_PARCIAL:      ['EN_EJECUCION', 'COMPLETADA', 'CERRADA_SIN_TERMINAR'],
  COMPLETADA:           ['CERRADA_ADMIN'],
  CERRADA_ADMIN:        [],
  CERRADA_SIN_EJECUTAR: [],
  CERRADA_SIN_TERMINAR: [],
}
