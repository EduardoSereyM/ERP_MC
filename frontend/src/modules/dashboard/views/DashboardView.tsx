import { useSession } from '@/modules/auth/hooks/useSession'
import {
  AreaChart, Area,
  BarChart, Bar,
  LineChart, Line,
  Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine,
} from 'recharts'

// ═══════════════════════════════════════════════════════════════════════════════
// DATOS STUB — todos los valores son ficticios y representativos
// ═══════════════════════════════════════════════════════════════════════════════

// ── 1. Ingresos totales y crecimiento ─────────────────────────────────────────
// Meses históricos + proyección (Abr-May sin 'real', solo 'proyeccion')
const FACTURACION_MENSUAL = [
  { mes: 'Abr 25', real: 28.4, meta: 35,  ano_anterior: 22.1, proyeccion: null },
  { mes: 'May 25', real: 31.7, meta: 37,  ano_anterior: 25.6, proyeccion: null },
  { mes: 'Jun 25', real: 29.3, meta: 38,  ano_anterior: 24.2, proyeccion: null },
  { mes: 'Jul 25', real: 35.8, meta: 40,  ano_anterior: 27.9, proyeccion: null },
  { mes: 'Ago 25', real: 38.2, meta: 42,  ano_anterior: 30.1, proyeccion: null },
  { mes: 'Sep 25', real: 33.4, meta: 42,  ano_anterior: 28.7, proyeccion: null },
  { mes: 'Oct 25', real: 40.1, meta: 44,  ano_anterior: 32.6, proyeccion: null },
  { mes: 'Nov 25', real: 44.7, meta: 45,  ano_anterior: 35.8, proyeccion: null },
  { mes: 'Dic 25', real: 52.3, meta: 46,  ano_anterior: 41.2, proyeccion: null },
  { mes: 'Ene 26', real: 29.8, meta: 48,  ano_anterior: 23.4, proyeccion: null },
  { mes: 'Feb 26', real: 41.5, meta: 50,  ano_anterior: 33.7, proyeccion: null },
  { mes: 'Mar 26', real: 48.2, meta: 55,  ano_anterior: 39.0, proyeccion: 48.2 },
  { mes: 'Abr 26', real: null,  meta: 57,  ano_anterior: null,  proyeccion: 53.6 },
  { mes: 'May 26', real: null,  meta: 60,  ano_anterior: null,  proyeccion: 59.1 },
]

// ── 2. Ciclo de ventas promedio por mes (días) ────────────────────────────────
const CICLO_VENTAS = [
  { mes: 'Oct', dias: 24 }, { mes: 'Nov', dias: 21 }, { mes: 'Dic', dias: 28 },
  { mes: 'Ene', dias: 19 }, { mes: 'Feb', dias: 22 }, { mes: 'Mar', dias: 18 },
]

// ── 3. Cuota vs logro por vendedor ────────────────────────────────────────────
const CUOTA_VS_LOGRO = [
  { nombre: 'C. Muñoz',    cuota: 20, logro: 18.4, pct: 92 },
  { nombre: 'R. Pizarro',  cuota: 16, logro: 12.9, pct: 81 },
  { nombre: 'M. Fernández',cuota: 14, logro: 10.1, pct: 72 },
  { nombre: 'F. Torres',   cuota: 12, logro: 7.6,  pct: 63 },
  { nombre: 'D. Reyes',    cuota: 10, logro: 5.2,  pct: 52 },
]

// ── 4. Pipeline por estado (donut) ────────────────────────────────────────────
const PIPELINE_PIE = [
  { name: 'Consulta abierta',   value: 54, color: '#B3DCE5' },
  { name: 'Cotización enviada', value: 38, color: '#006B84' },
  { name: 'Venta generada',     value: 21, color: '#00566A' },
  { name: 'En proceso',         value: 17, color: '#4A154B' },
  { name: 'Cerrada',            value: 12, color: '#2EB67D' },
]

// ── 5. Clientes nuevos vs recurrentes ─────────────────────────────────────────
const NUEVOS_VS_RECURRENTES = [
  { mes: 'Oct', nuevos: 3.2, recurrentes: 36.9 },
  { mes: 'Nov', nuevos: 4.8, recurrentes: 39.9 },
  { mes: 'Dic', nuevos: 7.1, recurrentes: 45.2 },
  { mes: 'Ene', nuevos: 2.9, recurrentes: 26.9 },
  { mes: 'Feb', nuevos: 5.3, recurrentes: 36.2 },
  { mes: 'Mar', nuevos: 7.4, recurrentes: 40.8 },
]

// ── 6. SLA instalaciones por mes ──────────────────────────────────────────────
const SLA_INSTALACIONES = [
  { mes: 'Oct', dentro: 85, fuera: 15, total: 20 },
  { mes: 'Nov', dentro: 76, fuera: 24, total: 17 },
  { mes: 'Dic', dentro: 90, fuera: 10, total: 21 },
  { mes: 'Ene', dentro: 68, fuera: 32, total: 19 },
  { mes: 'Feb', dentro: 80, fuera: 20, total: 15 },
  { mes: 'Mar', dentro: 78, fuera: 22, total: 18 },
]
const SLA_AVG       = Math.round(SLA_INSTALACIONES.reduce((s, d) => s + d.dentro, 0) / SLA_INSTALACIONES.length)
const SLA_MEJOR     = Math.max(...SLA_INSTALACIONES.map(d => d.dentro))
const SLA_PEOR      = Math.min(...SLA_INSTALACIONES.map(d => d.dentro))
const SLA_MEJOR_MES = SLA_INSTALACIONES.find(d => d.dentro === SLA_MEJOR)?.mes ?? ''
const SLA_PEOR_MES  = SLA_INSTALACIONES.find(d => d.dentro === SLA_PEOR)?.mes ?? ''
const SLA_CASOS_FUERA = SLA_INSTALACIONES.map(d => ({
  mes: d.mes,
  casos: Math.round(d.total * d.fuera / 100),
  total: d.total,
}))
const slaColor   = (v: number) => v >= 85 ? '#006B84' : v >= 80 ? '#2EB67D' : v >= 70 ? '#ECB22E' : '#E01E5A'
const casoColor  = (v: number) => v <= 2 ? '#2EB67D' : v <= 4 ? '#ECB22E' : '#E01E5A'

// ── 7. Actividad comercial semanal ────────────────────────────────────────────
const ACTIVIDAD_SEMANA = [
  { dia: 'Lun', nuevas: 4, cerradas: 2, cotizaciones: 7  },
  { dia: 'Mar', nuevas: 6, cerradas: 3, cotizaciones: 11 },
  { dia: 'Mié', nuevas: 3, cerradas: 5, cotizaciones: 8  },
  { dia: 'Jue', nuevas: 8, cerradas: 4, cotizaciones: 14 },
  { dia: 'Vie', nuevas: 5, cerradas: 6, cotizaciones: 9  },
  { dia: 'Sáb', nuevas: 2, cerradas: 2, cotizaciones: 3  },
]

// ── 8. Timeline de actividad reciente ─────────────────────────────────────────
const ACTIVIDAD_RECIENTE = [
  { icon: '📄', titulo: 'VTA-000142 confirmada',         desc: 'por Carolina M. — Kepler Nova Ltda.',     tiempo: 'hace 8 min'  },
  { icon: '📋', titulo: 'COT-000318 enviada',            desc: 'Constructora Andes — $12.4M',             tiempo: 'hace 23 min' },
  { icon: '📦', titulo: 'BOD-000044 completado',         desc: 'Despacho autorizado por Bodega',          tiempo: 'hace 41 min' },
  { icon: '⚠️', titulo: 'ST-000012 escalado a urgente',  desc: 'Servicio técnico requiere atención',      tiempo: 'hace 1h'     },
  { icon: '✅', titulo: 'INS-000031 completada',         desc: 'Instalación en Providencia finalizada',   tiempo: 'hace 2h'     },
]

// ═══════════════════════════════════════════════════════════════════════════════
// KPI CARDS — primera fila (resultado) + segunda fila (eficiencia)
// ═══════════════════════════════════════════════════════════════════════════════

const KPIS_RESULTADO = [
  { label: 'Ingresos del mes',          value: '$48.2M',  delta: '+16.1%', up: true,  sub: 'Meta: $55M (87.6%)' },
  { label: 'Crecimiento mes a mes',     value: '+16.1%',  delta: 'vs Feb', up: true,  sub: '$41.5M en Febrero'  },
  { label: 'Crecimiento año a año',     value: '+23.6%',  delta: 'vs Mar 25', up: true, sub: '$39M hace un año' },
  { label: 'Monto promedio por venta',  value: '$1.27M',  delta: '+5%',    up: true,  sub: '38 ventas cerradas'  },
]

const KPIS_EFICIENCIA = [
  { label: 'Tasa de conversión',        value: '22.2%',   delta: '+1.4pp', up: true,  sub: '12 de 54 oportunidades' },
  { label: 'Ciclo promedio de venta',   value: '18 días', delta: '-2 días',up: true,  sub: 'vs 20 días en Feb'      },
  { label: 'Cuota del equipo',          value: '72%',     delta: '-3pp',   up: false, sub: '$48.2M de $67M meta'    },
  { label: 'SLA instalaciones',         value: '78%',     delta: '+6pp',   up: true,  sub: '14/18 dentro del plazo' },
]

const KPIS_CLIENTES = [
  { label: 'Clientes activos',          value: '241',     delta: '+19',    up: true,  sub: 'Nuevos este mes'        },
  { label: 'Ingresos clientes nuevos',  value: '15.4%',   delta: '',       up: true,  sub: '$7.4M de $48.2M'        },
  { label: 'Tiempo prom. instalación',  value: '4.2 días',delta: '-0.8d',  up: true,  sub: 'Desde solicitud a inicio'},
  { label: 'Ventas por vendedor',       value: '7.6 /mes',delta: '+0.8',   up: true,  sub: 'Promedio del equipo'    },
]

// ═══════════════════════════════════════════════════════════════════════════════
// TOOLTIPS
// ═══════════════════════════════════════════════════════════════════════════════

const DarkTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#1B1D37] text-white text-xs rounded-xl px-4 py-3 shadow-lg space-y-1 min-w-[140px]">
      {label && <p className="font-bold text-white/60 mb-1.5 uppercase tracking-wide text-[10px]">{label}</p>}
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex justify-between gap-4">
          <span style={{ color: p.color ?? '#9B9DAB' }}>{p.name}</span>
          <strong className="text-white">{typeof p.value === 'number' && p.value < 200 && p.name?.includes('$') === false ? p.value : `${p.value}`}{p.unit ?? ''}</strong>
        </div>
      ))}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTES AUXILIARES
// ═══════════════════════════════════════════════════════════════════════════════

const SectionHeader = ({ eyebrow, title }: { eyebrow: string; title: string }) => (
  <div className="mb-5">
    <p className="text-[11px] font-semibold text-text-disabled uppercase tracking-widest mb-0.5">{eyebrow}</p>
    <p className="text-xl font-bold text-[#1B1D37]">{title}</p>
  </div>
)

const KpiRow = ({ cards }: { cards: typeof KPIS_RESULTADO }) => (
  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
    {cards.map((k) => (
      <div key={k.label} className="bg-white rounded-2xl p-5 border border-surface-border shadow-sm">
        <p className="text-[11px] font-semibold text-text-disabled uppercase tracking-wide mb-3 leading-tight">{k.label}</p>
        <p className="text-3xl font-bold text-[#1B1D37] tracking-tight leading-none">{k.value}</p>
        <div className="mt-2 flex items-center gap-1.5 flex-wrap">
          {k.delta && (
            <span className={`text-xs font-semibold ${k.up ? 'text-[#2EB67D]' : 'text-[#E01E5A]'}`}>
              {k.up ? '▲' : '▼'} {k.delta}
            </span>
          )}
          <span className="text-[11px] text-text-disabled">{k.sub}</span>
        </div>
      </div>
    ))}
  </div>
)

// ═══════════════════════════════════════════════════════════════════════════════
// DASHBOARD VIEW PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

export const DashboardView = () => {
  const { usuario } = useSession()
  const hoy = new Date().toLocaleDateString('es-CL', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })

  return (
    <div className="min-h-screen bg-[#F5F4F2] p-8 max-w-screen-2xl mx-auto space-y-8">

      {/* ── HEADER ── */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <p className="text-xs font-semibold text-text-disabled uppercase tracking-widest mb-2 capitalize">{hoy}</p>
          <h1 className="text-4xl font-bold text-[#1B1D37] leading-tight">Panel Ejecutivo</h1>
          <p className="text-text-secondary mt-1.5 text-sm">
            Bienvenido, <strong>{usuario?.nombre ?? 'Usuario'}</strong> — ESM ERP
          </p>
        </div>
        <span className="inline-flex items-center gap-2 text-xs bg-amber-50 border border-amber-200 text-amber-700 px-3 py-1.5 rounded-full font-medium mt-2">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          Datos de demostración
        </span>
      </div>

      {/* ═══════════════════════════════════════════════════════════
          BLOQUE A — MÉTRICAS DE RESULTADO
      ═══════════════════════════════════════════════════════════ */}
      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <span className="h-px flex-1 bg-surface-border" />
          <span className="text-[11px] font-bold text-text-disabled uppercase tracking-widest px-2">A. Métricas de resultado</span>
          <span className="h-px flex-1 bg-surface-border" />
        </div>

        <KpiRow cards={KPIS_RESULTADO} />

        {/* Gráfico principal: facturación 12 meses real vs meta vs año anterior */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 bg-white rounded-2xl p-7 border border-surface-border shadow-sm">
            <SectionHeader eyebrow="Ingresos totales" title="Facturación mensual — Real vs Meta vs Año anterior" />
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={FACTURACION_MENSUAL} margin={{ top: 4, right: 8, left: -12, bottom: 0 }}>
                <defs>
                  <linearGradient id="gReal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor="#006B84" stopOpacity={0.22} />
                    <stop offset="100%" stopColor="#006B84" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gAnt" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor="#9B9DAB" stopOpacity={0.12} />
                    <stop offset="100%" stopColor="#9B9DAB" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="#E6E5E3" strokeDasharray="4 4" />
                <XAxis dataKey="mes" tick={{ fontSize: 10, fill: '#9B9DAB' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#9B9DAB' }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}M`} />
                <Tooltip content={<DarkTooltip />} />
                <Area type="monotone" dataKey="ano_anterior" name="Año anterior" stroke="#D0CFCC" strokeWidth={1.5} fill="url(#gAnt)" dot={false} strokeDasharray="4 3" />
                <Area type="monotone" dataKey="meta" name="Meta" stroke="#B3DCE5" strokeWidth={1.5} fill="none" dot={false} strokeDasharray="6 3" />
                <Area type="monotone" dataKey="real" name="Real" stroke="#006B84" strokeWidth={2.5} fill="url(#gReal)" dot={{ r: 3, fill: '#006B84', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 5 }} connectNulls={false} />
                <Area type="monotone" dataKey="proyeccion" name="Proyección" stroke="#006B84" strokeWidth={2} fill="none" strokeDasharray="6 4" dot={{ r: 3, fill: '#fff', strokeWidth: 2, stroke: '#006B84' }} connectNulls={false} />
              </AreaChart>
            </ResponsiveContainer>
            <div className="flex items-center gap-5 mt-3 text-[11px] text-text-disabled flex-wrap">
              <span className="flex items-center gap-1.5"><span className="w-4 h-0.5 bg-[#006B84] inline-block rounded" /> Real</span>
              <span className="flex items-center gap-1.5"><span className="w-4 h-0.5 bg-[#B3DCE5] inline-block rounded" /> Meta</span>
              <span className="flex items-center gap-1.5"><span className="w-4 h-0.5 bg-[#D0CFCC] inline-block rounded" /> Año anterior</span>
              <span className="flex items-center gap-1.5"><span className="w-5 border-t-2 border-dashed border-[#006B84] inline-block" /> Proyección</span>
            </div>
          </div>

          {/* Card de alerta */}
          <div className="bg-[#4A154B] rounded-2xl p-8 shadow-sm flex flex-col justify-between text-white">
            <div>
              <p className="text-[11px] font-semibold text-purple-300 uppercase tracking-widest mb-4">Alertas críticas</p>
              <h2 className="text-2xl font-bold leading-snug mb-4">
                3 cotizaciones vencen <span className="text-purple-300">hoy</span>
              </h2>
              <p className="text-purple-200 text-sm leading-relaxed mb-5">
                Requieren respuesta antes de las <strong className="text-white">18:00 hrs</strong>. Asigna vendedor ahora.
              </p>
              <div className="space-y-2">
                {[
                  { codigo: 'COT-000301', monto: '$8.4M', prob: 78,  tag: 'ALTA',  tagColor: 'bg-rose-400/30 text-rose-200' },
                  { codigo: 'COT-000308', monto: '$3.2M', prob: 61,  tag: 'MEDIA', tagColor: 'bg-amber-400/30 text-amber-200' },
                  { codigo: 'COT-000312', monto: '$5.1M', prob: 84,  tag: 'ALTA',  tagColor: 'bg-rose-400/30 text-rose-200' },
                ].map(c => (
                  <div key={c.codigo} className="text-xs text-purple-200 bg-white/10 rounded-lg px-3 py-2 space-y-1.5">
                    <div className="flex justify-between">
                      <span className="font-mono font-bold text-white">{c.codigo}</span>
                      <span className="text-purple-300 font-semibold">{c.monto}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${c.tagColor}`}>
                        ✦ IA · Prioridad {c.tag}
                      </span>
                      <span className="text-[11px] text-purple-300">{c.prob}% prob. cierre</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <button className="mt-8 w-full bg-white text-[#4A154B] font-bold text-xs uppercase tracking-widest px-4 py-3 rounded-xl hover:bg-purple-50 transition-colors">
              Revisar ahora →
            </button>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          BLOQUE B — EFICIENCIA DEL EQUIPO
      ═══════════════════════════════════════════════════════════ */}
      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <span className="h-px flex-1 bg-surface-border" />
          <span className="text-[11px] font-bold text-text-disabled uppercase tracking-widest px-2">B. Eficiencia del equipo comercial</span>
          <span className="h-px flex-1 bg-surface-border" />
        </div>

        <KpiRow cards={KPIS_EFICIENCIA} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* Cuota vs logro por vendedor */}
          <div className="lg:col-span-2 bg-white rounded-2xl p-7 border border-surface-border shadow-sm">
            <SectionHeader eyebrow="Equipo comercial" title="Cuota asignada vs Logro real — Marzo 2026" />
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={CUOTA_VS_LOGRO} barGap={4} barCategoryGap="30%">
                <CartesianGrid vertical={false} stroke="#E6E5E3" strokeDasharray="4 4" />
                <XAxis dataKey="nombre" tick={{ fontSize: 11, fill: '#6B6E80', fontWeight: 600 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#9B9DAB' }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}M`} />
                <Tooltip content={<DarkTooltip />} />
                <Legend wrapperStyle={{ fontSize: '11px', color: '#9B9DAB', paddingTop: '10px' }} />
                <Bar dataKey="cuota" name="Cuota ($M)" fill="#E6E5E3" radius={[4, 4, 0, 0]} />
                <Bar dataKey="logro" name="Logro ($M)" fill="#006B84" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* % cumplimiento individual */}
          <div className="bg-white rounded-2xl p-7 border border-surface-border shadow-sm">
            <SectionHeader eyebrow="Cumplimiento individual" title="% Cuota alcanzada" />
            <div className="space-y-4">
              {CUOTA_VS_LOGRO.map((v) => {
                const color = v.pct >= 90 ? '#2EB67D' : v.pct >= 70 ? '#006B84' : v.pct >= 55 ? '#ECB22E' : '#E01E5A'
                return (
                  <div key={v.nombre}>
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="font-medium text-text-primary">{v.nombre}</span>
                      <span className="font-bold" style={{ color }}>{v.pct}%</span>
                    </div>
                    <div className="h-2 bg-surface-muted rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${v.pct}%`, background: color }} />
                    </div>
                    <p className="text-[11px] text-text-disabled mt-1">
                      ${v.logro}M logrado de ${v.cuota}M
                    </p>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Ciclo de ventas + Pipeline */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Ciclo de ventas — AreaChart con gradiente de performance */}
          <div className="lg:col-span-2 bg-white rounded-2xl p-7 border border-surface-border shadow-sm">
            <SectionHeader eyebrow="Duración promedio del ciclo" title="Días desde consulta hasta cierre" />
            <div className="flex items-center gap-4 mb-4 flex-wrap text-[11px]">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-[#2EB67D]/70 inline-block" /> <span className="text-text-secondary font-medium">&lt; 20d — En objetivo</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-[#ECB22E]/70 inline-block" /> <span className="text-text-secondary font-medium">20–25d — Cercano al límite</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-[#E01E5A]/70 inline-block" /> <span className="text-text-secondary font-medium">&gt; 25d — Por encima del objetivo</span>
              </span>
            </div>
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={CICLO_VENTAS} margin={{ top: 4, right: 60, left: -12, bottom: 0 }}>
                <defs>
                  {/* Gradiente vertical: rojo (arriba=35d) → amarillo (25d=29%) → verde (20d=43%) → verde suave (0d) */}
                  <linearGradient id="gCicloFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor="#E01E5A" stopOpacity={0.5} />
                    <stop offset="29%"  stopColor="#ECB22E" stopOpacity={0.45} />
                    <stop offset="43%"  stopColor="#2EB67D" stopOpacity={0.30} />
                    <stop offset="100%" stopColor="#2EB67D" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="#E6E5E3" strokeDasharray="4 4" />
                <XAxis
                  dataKey="mes"
                  tick={{ fontSize: 12, fill: '#1B1D37', fontWeight: 700 }}
                  axisLine={false} tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#9B9DAB' }}
                  axisLine={false} tickLine={false}
                  unit=" d" domain={[0, 35]}
                />
                <Tooltip content={<DarkTooltip />} />
                <ReferenceLine
                  y={20}
                  stroke="#ECB22E"
                  strokeWidth={2.5}
                  strokeDasharray="8 4"
                  label={{ value: 'Objetivo: 20d', position: 'right', fontSize: 11, fill: '#8A5A0C', fontWeight: 700 }}
                />
                <Area
                  type="monotone"
                  dataKey="dias"
                  name="Días promedio"
                  stroke="#006B84"
                  strokeWidth={3}
                  fill="url(#gCicloFill)"
                  dot={{ r: 5, fill: '#006B84', strokeWidth: 2.5, stroke: '#fff' }}
                  activeDot={{ r: 7, stroke: '#006B84', strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Pipeline Circuit (CSS Grid/Flexbox) */}
          <div className="bg-white rounded-2xl p-7 border border-surface-border shadow-sm flex flex-col">
            <SectionHeader eyebrow="Distribución de oportunidades" title="The Pipeline Circuit" />
            <div className="flex-1 flex flex-col justify-center space-y-6 mt-2">
              {PIPELINE_PIE.map((p, i) => {
                // Asumimos un 'Target' ficticio de 100 para que la barra más larga (54) ocupe ~54%
                // y se vea el fondo gris claro del recorrido.
                const target = 100;
                const percentage = Math.min(100, Math.round((p.value / target) * 100));
                
                return (
                  <div key={p.name} className="relative">
                    <div className="flex justify-between items-end mb-1.5">
                      <span className="text-[10px] font-bold text-text-primary uppercase tracking-widest leading-none">
                        {p.name}
                      </span>
                      <span className="text-xs font-bold text-text-primary leading-none">
                        {p.value} <span className="text-[10px] text-text-disabled font-semibold">Units</span>
                      </span>
                    </div>
                    {/* Track Container */}
                    <div className="h-2.5 w-full bg-[#E6E5E3] rounded-full overflow-hidden">
                      {/* Active Fill */}
                      <div 
                        className="h-full rounded-full transition-all duration-1000 ease-out" 
                        style={{ width: `${percentage}%`, backgroundColor: p.color }}
                      />
                    </div>
                    {/* Líneas conectoras sutiles (simulando el circuito entre etapas, opcional visualmente) */}
                    {i < PIPELINE_PIE.length - 1 && (
                      <div className="absolute left-3 -bottom-6 w-px h-5 bg-surface-border" />
                    )}
                  </div>
                )
              })}
            </div>
            {/* Target marker en el footer del gráfico */}
            <div className="mt-8 pt-4 border-t border-surface-border flex justify-end">
              <div className="text-right">
                <span className="text-[9px] font-bold text-text-disabled uppercase tracking-widest block leading-tight">
                  Target
                </span>
                <span className="text-[9px] font-bold text-text-disabled uppercase tracking-widest block leading-tight">
                  Conversion
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          BLOQUE C — CLIENTES y RENTABILIDAD
      ═══════════════════════════════════════════════════════════ */}
      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <span className="h-px flex-1 bg-surface-border" />
          <span className="text-[11px] font-bold text-text-disabled uppercase tracking-widest px-2">C. Clientes y rentabilidad</span>
          <span className="h-px flex-1 bg-surface-border" />
        </div>

        <KpiRow cards={KPIS_CLIENTES} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Nuevos vs recurrentes (stacked area) */}
          <div className="bg-white rounded-2xl p-7 border border-surface-border shadow-sm">
            <SectionHeader eyebrow="Composición de ingresos ($M)" title="Clientes nuevos vs recurrentes" />
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={NUEVOS_VS_RECURRENTES} margin={{ top: 4, right: 4, left: -12, bottom: 0 }}>
                <defs>
                  <linearGradient id="gNuevos" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor="#4A154B" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#4A154B" stopOpacity={0.05} />
                  </linearGradient>
                  <linearGradient id="gRecurrentes" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor="#006B84" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#006B84" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="#E6E5E3" strokeDasharray="4 4" />
                <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#9B9DAB' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#9B9DAB' }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}M`} />
                <Tooltip content={<DarkTooltip />} />
                <Legend wrapperStyle={{ fontSize: '11px', color: '#9B9DAB', paddingTop: '10px' }} />
                <Area type="monotone" dataKey="recurrentes" name="Recurrentes ($M)" stackId="1" stroke="#006B84" fill="url(#gRecurrentes)" strokeWidth={2} />
                <Area type="monotone" dataKey="nuevos"      name="Nuevos ($M)"      stackId="1" stroke="#4A154B" fill="url(#gNuevos)"      strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Actividad semanal — LineChart suavizado */}
          <div className="bg-white rounded-2xl p-7 border border-surface-border shadow-sm">
            <SectionHeader eyebrow="Esta semana" title="Actividad comercial diaria" />
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={ACTIVIDAD_SEMANA} margin={{ top: 4, right: 8, left: -12, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="#E6E5E3" strokeDasharray="4 4" />
                <XAxis dataKey="dia" tick={{ fontSize: 11, fill: '#6B6E80', fontWeight: 600 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#9B9DAB' }} axisLine={false} tickLine={false} />
                <Tooltip content={<DarkTooltip />} />
                <Legend wrapperStyle={{ fontSize: '11px', color: '#9B9DAB', paddingTop: '8px' }} />
                <Line type="monotone" dataKey="cotizaciones" name="Cotizaciones"   stroke="#B3DCE5" strokeWidth={2.5} dot={{ r: 3, fill: '#B3DCE5', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 5 }} />
                <Line type="monotone" dataKey="nuevas"       name="Ventas nuevas"  stroke="#006B84" strokeWidth={2.5} dot={{ r: 3, fill: '#006B84', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 5 }} />
                <Line type="monotone" dataKey="cerradas"     name="Ventas cerradas" stroke="#2EB67D" strokeWidth={2.5} dot={{ r: 3, fill: '#2EB67D', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          BLOQUE D — INSTALACIONES y SLA
      ═══════════════════════════════════════════════════════════ */}
      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <span className="h-px flex-1 bg-surface-border" />
          <span className="text-[11px] font-bold text-text-disabled uppercase tracking-widest px-2">D. Instalaciones y SLA</span>
          <span className="h-px flex-1 bg-surface-border" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* SLA por mes — barra única con semáforo + estadísticas */}
          <div className="bg-white rounded-2xl p-7 border border-surface-border shadow-sm">
            <SectionHeader eyebrow="Cumplimiento SLA" title="% Instalaciones dentro del plazo comprometido" />
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={SLA_INSTALACIONES} barCategoryGap="18%" margin={{ top: 4, right: 56, left: -12, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="#E6E5E3" strokeDasharray="4 4" />
                <XAxis
                  dataKey="mes"
                  tick={{ fontSize: 12, fill: '#1B1D37', fontWeight: 700 }}
                  axisLine={false} tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#9B9DAB' }}
                  axisLine={false} tickLine={false}
                  unit="%" domain={[0, 100]}
                />
                <Tooltip content={<DarkTooltip />} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
                <ReferenceLine
                  y={80}
                  stroke="#ECB22E"
                  strokeWidth={2.5}
                  strokeDasharray="8 4"
                  label={{ value: 'Meta 80%', position: 'right', fontSize: 11, fill: '#7A5A0F', fontWeight: 700 }}
                />
                <Bar dataKey="dentro" name="Cumplimiento SLA (%)" radius={[6, 6, 0, 0]}>
                  {SLA_INSTALACIONES.map((entry, i) => (
                    <Cell key={i} fill={slaColor(entry.dentro)} fillOpacity={0.88} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>

            {/* Estadísticas resumen con mes */}
            <div className="mt-5 pt-4 border-t border-surface-border grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-[#1B1D37]">{SLA_AVG}%</p>
                <p className="text-[11px] text-text-disabled mt-0.5 uppercase tracking-widest">Promedio</p>
                <span className="mt-1.5 inline-block text-[10px] font-bold text-text-secondary border border-surface-border rounded px-2 py-0.5 uppercase tracking-wider">
                  Últimos 6 meses
                </span>
              </div>
              <div>
                <p className="text-2xl font-bold text-[#2EB67D]">{SLA_MEJOR}%</p>
                <p className="text-[11px] text-text-disabled mt-0.5 uppercase tracking-widest">Mejor mes</p>
                <span className="mt-1.5 inline-block text-[10px] font-bold text-[#2EB67D] border border-[#2EB67D]/40 rounded px-2 py-0.5 uppercase tracking-wider bg-[#E9F7F0]">
                  {SLA_MEJOR_MES}
                </span>
              </div>
              <div>
                <p className="text-2xl font-bold text-[#E01E5A]">{SLA_PEOR}%</p>
                <p className="text-[11px] text-text-disabled mt-0.5 uppercase tracking-widest">A mejorar</p>
                <span className="mt-1.5 inline-block text-[10px] font-bold text-[#E01E5A] border border-[#E01E5A]/40 rounded px-2 py-0.5 uppercase tracking-wider bg-[#FCEAEF]">
                  {SLA_PEOR_MES}
                </span>
              </div>
            </div>

            {/* Mini-gráfico: total de casos sin cumplir por mes */}
            <div className="mt-5 pt-4 border-t border-surface-border">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[11px] font-semibold text-text-disabled uppercase tracking-widest">
                  Casos sin cumplir por mes
                </p>
                <span className="text-[11px] font-bold text-[#E01E5A]">
                  Total: {SLA_CASOS_FUERA.reduce((s, d) => s + d.casos, 0)} casos
                </span>
              </div>
              <ResponsiveContainer width="100%" height={100}>
                <BarChart
                  data={SLA_CASOS_FUERA}
                  barCategoryGap="25%"
                  margin={{ top: 0, right: 8, left: -20, bottom: 0 }}
                >
                  <CartesianGrid vertical={false} stroke="#E6E5E3" strokeDasharray="4 4" />
                  <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#1B1D37', fontWeight: 700 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#9B9DAB' }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip
                    formatter={(v: any) => [`${v} instalaciones`, 'Sin cumplir']}
                    contentStyle={{ fontSize: '11px', borderRadius: '12px', border: 'none', background: '#1B1D37', color: '#fff' }}
                    itemStyle={{ color: '#fff' }}
                    labelStyle={{ color: 'rgba(255,255,255,0.5)', fontWeight: 700, fontSize: '10px', textTransform: 'uppercase' }}
                  />
                  <Bar dataKey="casos" name="Sin cumplir" radius={[4, 4, 0, 0]}>
                    {SLA_CASOS_FUERA.map((entry, i) => (
                      <Cell key={i} fill={casoColor(entry.casos)} fillOpacity={0.85} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <p className="text-[10px] text-text-disabled mt-2">
                🟢 1–2 casos &nbsp;🟡 3–4 casos &nbsp;🔴 5+ casos
              </p>
            </div>
          </div>

          {/* Timeline actividad + status */}
          <div className="bg-white rounded-2xl p-7 border border-surface-border shadow-sm flex flex-col">
            <SectionHeader eyebrow="Actividad" title="Últimas acciones en el sistema" />
            <div className="space-y-4 flex-1">
              {ACTIVIDAD_RECIENTE.map((a, i) => (
                <div key={i} className="flex gap-3">
                  <div className="w-9 h-9 rounded-xl bg-surface-muted flex items-center justify-center text-sm shrink-0">{a.icon}</div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-text-primary leading-tight">{a.titulo}</p>
                    <p className="text-xs text-text-secondary mt-0.5 leading-snug">{a.desc}</p>
                    <p className="text-[11px] text-text-disabled mt-1 uppercase tracking-wide">{a.tiempo}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6 pt-5 border-t border-surface-border flex items-center justify-between">
              <span className="flex items-center gap-2 text-xs text-text-secondary">
                <span className="w-2 h-2 rounded-full bg-[#2EB67D] animate-pulse" />
                Sistemas operativos
              </span>
              <span className="text-[11px] text-text-disabled">
                {new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <div className="flex items-center justify-between pt-2 pb-4">
        <div>
          <p className="text-xs font-bold text-[#1B1D37]">ESM ERP</p>
          <p className="text-[11px] text-text-disabled">Enterprise Resource Planning — Panel Ejecutivo</p>
        </div>
        <p className="text-[11px] text-text-disabled capitalize">{hoy}</p>
      </div>

    </div>
  )
}
