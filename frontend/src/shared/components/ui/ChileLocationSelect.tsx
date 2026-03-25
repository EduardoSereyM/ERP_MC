import { CHILE_REGIONES } from '@/shared/data/chile-locations'

export interface ChileLocationValue {
  region: string
  ciudad: string
  comuna: string
}

interface ChileLocationSelectProps {
  value: ChileLocationValue
  onChange: (v: ChileLocationValue) => void
}

const selectClass =
  'rounded-lg border border-surface-border bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-disabled transition-colors hover:border-text-disabled focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-0 w-full'

export const ChileLocationSelect = ({ value, onChange }: ChileLocationSelectProps) => {
  const regionData = CHILE_REGIONES.find(r => r.nombre === value.region) ?? null
  const ciudadData = regionData?.ciudades.find(c => c.nombre === value.ciudad) ?? null

  const handleRegionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange({ region: e.target.value, ciudad: '', comuna: '' })
  }

  const handleCiudadChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange({ ...value, ciudad: e.target.value, comuna: '' })
  }

  const handleComunaChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange({ ...value, comuna: e.target.value })
  }

  return (
    <div className="col-span-3 grid grid-cols-3 gap-4">
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-text-primary">Región</label>
        <select value={value.region} onChange={handleRegionChange} className={selectClass}>
          <option value="">Seleccionar...</option>
          {CHILE_REGIONES.map(r => (
            <option key={r.nombre} value={r.nombre}>
              {r.nombre}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-text-primary">Ciudad</label>
        <select value={value.ciudad} onChange={handleCiudadChange} disabled={!regionData} className={selectClass}>
          <option value="">Seleccionar...</option>
          {regionData?.ciudades.map(c => (
            <option key={c.nombre} value={c.nombre}>
              {c.nombre}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-text-primary">Comuna</label>
        <select value={value.comuna} onChange={handleComunaChange} disabled={!ciudadData} className={selectClass}>
          <option value="">Seleccionar...</option>
          {ciudadData?.comunas.map(com => (
            <option key={com} value={com}>
              {com}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}
