/**
 * Productos de prueba — Fase 1A
 *
 * Usados mientras el módulo Productos está en construcción.
 * Reemplazar con datos reales al activar el backend en Fase 1F.
 *
 * Campos actuales cubiertos:
 * ✅ codigo, nombre, descripcion, precio_base, unidad_medida
 * ✅ requiere_instalacion, activo, categoria_id (referencial)
 *
 * Campos a definir antes de implementar el backend:
 * ⏳ es_servicio          → diferenciar producto físico vs. servicio de MO
 * ⏳ precio_instalacion   → precio MO unitaria del producto (alternativa a línea separada)
 * ⏳ imagen_url           → foto para catálogo y cotizaciones
 * ⏳ marca / proveedor    → trazabilidad de compra
 * ⏳ notas_internas       → uso de bodega o técnico
 * 🔜 stock_actual/minimo  → Fase 2 Inventario
 */

import type { ProductoListItem } from '@/modules/productos/types'

export const PRODUCTOS_FAKE: ProductoListItem[] = [
  // ── PISOS ─────────────────────────────────────────────────────────────────
  {
    id: 'prod-fake-001',
    codigo: 'PIS-POR-001',
    nombre: 'Porcelanato rectificado 60×60 cm mate',
    precio_base: 18900,
    unidad_medida: 'm2',
    requiere_instalacion: true,
    servicio_instalacion_id: 'prod-fake-007',   // → SRV-INS-POR
    activo: true,
  },
  {
    id: 'prod-fake-002',
    codigo: 'PIS-FLO-001',
    nombre: 'Piso flotante 8 mm AC4 (roble natural)',
    precio_base: 12500,
    unidad_medida: 'm2',
    requiere_instalacion: true,
    servicio_instalacion_id: 'prod-fake-008',   // → SRV-INS-FLO
    activo: true,
  },
  {
    id: 'prod-fake-003',
    codigo: 'PIS-ALF-001',
    nombre: 'Alfombra residencial alta densidad (rollo 4 m de ancho)',
    precio_base: 8900,
    unidad_medida: 'm2',
    requiere_instalacion: true,
    servicio_instalacion_id: 'prod-fake-009',   // → SRV-INS-ALF
    activo: true,
  },

  // ── GRIFERÍAS ─────────────────────────────────────────────────────────────
  {
    id: 'prod-fake-004',
    codigo: 'GRF-BAN-001',
    nombre: 'Grifería para lavamanos monocomando cromo',
    precio_base: 42000,
    unidad_medida: 'unidad',
    requiere_instalacion: true,
    servicio_instalacion_id: 'prod-fake-010',   // → SRV-INS-GRF
    activo: true,
  },
  {
    id: 'prod-fake-005',
    codigo: 'GRF-COC-001',
    nombre: 'Grifería cocina cuello de ganso acero inox',
    precio_base: 55000,
    unidad_medida: 'unidad',
    requiere_instalacion: true,
    servicio_instalacion_id: 'prod-fake-010',   // → SRV-INS-GRF
    activo: true,
  },
  {
    id: 'prod-fake-006',
    codigo: 'GRF-DUC-001',
    nombre: 'Set grifería ducha termostática empotrada',
    precio_base: 185000,
    unidad_medida: 'unidad',
    requiere_instalacion: true,
    servicio_instalacion_id: 'prod-fake-010',   // → SRV-INS-GRF
    activo: true,
  },

  // ── SERVICIOS DE INSTALACIÓN ───────────────────────────────────────────────
  {
    id: 'prod-fake-007',
    codigo: 'SRV-INS-POR',
    nombre: 'Instalación porcelanato (incluye nivelación y fragua)',
    precio_base: 9800,
    unidad_medida: 'm2',
    requiere_instalacion: false,
    activo: true,
  },
  {
    id: 'prod-fake-008',
    codigo: 'SRV-INS-FLO',
    nombre: 'Instalación piso flotante (con zócalo)',
    precio_base: 5500,
    unidad_medida: 'm2',
    requiere_instalacion: false,
    activo: true,
  },
  {
    id: 'prod-fake-009',
    codigo: 'SRV-INS-ALF',
    nombre: 'Instalación alfombra (corte y fijación)',
    precio_base: 3200,
    unidad_medida: 'm2',
    requiere_instalacion: false,
    activo: true,
  },
  {
    id: 'prod-fake-010',
    codigo: 'SRV-INS-GRF',
    nombre: 'Instalación grifería (mano de obra)',
    precio_base: 28000,
    unidad_medida: 'unidad',
    requiere_instalacion: false,
    activo: true,
  },
]
