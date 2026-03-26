/**
 * Productos de prueba — Fase 1A
 *
 * Usados mientras el módulo Productos está en construcción.
 * Reemplazar con datos reales al activar el backend en Fase 1F.
 *
 * IDs: UUIDs válidos fijos para que el backend los acepte en producto_id.
 * El backend los almacenará pero no tendrá FK real hasta Fase 1F.
 */

import type { ProductoListItem } from '@/modules/productos/types'

// UUIDs fijos para datos fake — NO cambiar (rompe cotizaciones existentes)
const IDS = {
  PIS_POR: '10000000-0000-4000-8000-000000000001',
  PIS_FLO: '10000000-0000-4000-8000-000000000002',
  PIS_ALF: '10000000-0000-4000-8000-000000000003',
  GRF_BAN: '10000000-0000-4000-8000-000000000004',
  GRF_COC: '10000000-0000-4000-8000-000000000005',
  GRF_DUC: '10000000-0000-4000-8000-000000000006',
  SRV_INS_POR: '10000000-0000-4000-8000-000000000007',
  SRV_INS_FLO: '10000000-0000-4000-8000-000000000008',
  SRV_INS_ALF: '10000000-0000-4000-8000-000000000009',
  SRV_INS_GRF: '10000000-0000-4000-8000-000000000010',
}

export const PRODUCTOS_FAKE: ProductoListItem[] = [
  // ── PISOS ─────────────────────────────────────────────────────────────────
  {
    id: IDS.PIS_POR,
    codigo: 'PIS-POR-001',
    nombre: 'Porcelanato rectificado 60×60 cm mate',
    precio_base: 18900,
    unidad_medida: 'm2',
    requiere_instalacion: true,
    servicio_instalacion_id: IDS.SRV_INS_POR,
    activo: true,
  },
  {
    id: IDS.PIS_FLO,
    codigo: 'PIS-FLO-001',
    nombre: 'Piso flotante 8 mm AC4 (roble natural)',
    precio_base: 12500,
    unidad_medida: 'm2',
    requiere_instalacion: true,
    servicio_instalacion_id: IDS.SRV_INS_FLO,
    activo: true,
  },
  {
    id: IDS.PIS_ALF,
    codigo: 'PIS-ALF-001',
    nombre: 'Alfombra residencial alta densidad (rollo 4 m de ancho)',
    precio_base: 8900,
    unidad_medida: 'm2',
    requiere_instalacion: true,
    servicio_instalacion_id: IDS.SRV_INS_ALF,
    activo: true,
  },

  // ── GRIFERÍAS ─────────────────────────────────────────────────────────────
  {
    id: IDS.GRF_BAN,
    codigo: 'GRF-BAN-001',
    nombre: 'Grifería para lavamanos monocomando cromo',
    precio_base: 42000,
    unidad_medida: 'unidad',
    requiere_instalacion: true,
    servicio_instalacion_id: IDS.SRV_INS_GRF,
    activo: true,
  },
  {
    id: IDS.GRF_COC,
    codigo: 'GRF-COC-001',
    nombre: 'Grifería cocina cuello de ganso acero inox',
    precio_base: 55000,
    unidad_medida: 'unidad',
    requiere_instalacion: true,
    servicio_instalacion_id: IDS.SRV_INS_GRF,
    activo: true,
  },
  {
    id: IDS.GRF_DUC,
    codigo: 'GRF-DUC-001',
    nombre: 'Set grifería ducha termostática empotrada',
    precio_base: 185000,
    unidad_medida: 'unidad',
    requiere_instalacion: true,
    servicio_instalacion_id: IDS.SRV_INS_GRF,
    activo: true,
  },

  // ── SERVICIOS DE INSTALACIÓN ───────────────────────────────────────────────
  {
    id: IDS.SRV_INS_POR,
    codigo: 'SRV-INS-POR',
    nombre: 'Instalación porcelanato (incluye nivelación y fragua)',
    precio_base: 9800,
    unidad_medida: 'm2',
    requiere_instalacion: false,
    activo: true,
  },
  {
    id: IDS.SRV_INS_FLO,
    codigo: 'SRV-INS-FLO',
    nombre: 'Instalación piso flotante (con zócalo)',
    precio_base: 5500,
    unidad_medida: 'm2',
    requiere_instalacion: false,
    activo: true,
  },
  {
    id: IDS.SRV_INS_ALF,
    codigo: 'SRV-INS-ALF',
    nombre: 'Instalación alfombra (corte y fijación)',
    precio_base: 3200,
    unidad_medida: 'm2',
    requiere_instalacion: false,
    activo: true,
  },
  {
    id: IDS.SRV_INS_GRF,
    codigo: 'SRV-INS-GRF',
    nombre: 'Instalación grifería (mano de obra)',
    precio_base: 28000,
    unidad_medida: 'unidad',
    requiere_instalacion: false,
    activo: true,
  },
]
