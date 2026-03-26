import { useState, useRef, useEffect, useCallback } from 'react'
import clsx from 'clsx'
import { useProductos } from '@/modules/productos'
import type { ProductoListItem } from '@/modules/productos'

// ─── Props ────────────────────────────────────────────────────────────────────

interface ProductoComboboxProps {
  value: ProductoListItem | null
  onChange: (producto: ProductoListItem | null) => void
  label?: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  n.toLocaleString('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0 })

const UNIDAD_LABEL: Record<string, string> = {
  m2: 'm²', ml: 'ml', unidad: 'unid.', kg: 'kg', hora: 'hr', otro: '',
}

const esServicio = (p: ProductoListItem) => p.codigo.startsWith('SRV-')

// ─── Component ────────────────────────────────────────────────────────────────

export const ProductoCombobox = ({ value, onChange, label }: ProductoComboboxProps) => {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(-1)

  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Debounce
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value
    setQuery(v)
    setOpen(true)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setDebouncedQuery(v), 250)
  }

  // Close on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
        setQuery('')
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // Fetch products (busqueda applies to fake filter too)
  const { data, isFetching } = useProductos({
    busqueda: debouncedQuery || undefined,
    activo: true,
    limit: 100,
  })

  const todos = data?.data ?? []
  const productos = todos.filter(p => !esServicio(p))
  const servicios  = todos.filter(p => esServicio(p))

  // Flat list for keyboard navigation (includes "línea libre" at index 0)
  const flatList: Array<ProductoListItem | null> = [null, ...productos, ...servicios]

  const handleSelect = useCallback((prod: ProductoListItem | null) => {
    onChange(prod)
    setOpen(false)
    setQuery('')
    setDebouncedQuery('')
  }, [onChange])

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange(null)
    setQuery('')
    setDebouncedQuery('')
    setOpen(false)
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  const handleFocus = () => {
    setOpen(true)
    setQuery('')
    setDebouncedQuery('')
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open) { setOpen(true); return }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex(i => Math.min(i + 1, flatList.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault()
      handleSelect(flatList[activeIndex])
    } else if (e.key === 'Escape') {
      setOpen(false)
      setQuery('')
    }
  }

  useEffect(() => { setActiveIndex(-1) }, [debouncedQuery])

  const displayText = value ? `${value.codigo} — ${value.nombre}` : ''
  const unidad = value?.unidad_medida ? (UNIDAD_LABEL[value.unidad_medida] ?? value.unidad_medida) : ''

  return (
    <div className="flex flex-col gap-1" ref={containerRef}>
      {label && (
        <label className="text-sm font-medium text-text-primary">
          {label}
          <span className="ml-1 text-xs text-text-disabled font-normal">(opcional)</span>
        </label>
      )}

      {/* Input wrapper */}
      <div
        className={clsx(
          'relative flex items-center rounded-lg border text-sm transition-colors',
          'focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-0',
          'border-surface-border bg-surface hover:border-text-disabled'
        )}
      >
        {/* Search icon */}
        <svg className="ml-3 h-4 w-4 shrink-0 text-text-disabled" viewBox="0 0 24 24"
          fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
        </svg>

        <input
          ref={inputRef}
          type="text"
          autoComplete="off"
          value={open ? query : displayText}
          onChange={handleInputChange}
          onFocus={handleFocus}
          onKeyDown={handleKeyDown}
          placeholder="Buscar por nombre, código o tipo..."
          className="flex-1 bg-transparent px-2 py-2 text-text-primary placeholder:text-text-disabled focus:outline-none"
        />

        {/* Precio badge when selected */}
        {value && !open && (
          <span className="mr-2 shrink-0 text-xs font-mono text-text-secondary bg-surface-muted px-2 py-0.5 rounded">
            {fmt(Number(value.precio_base))}{unidad ? `/${unidad}` : ''}
          </span>
        )}

        {/* Clear */}
        {value && (
          <button type="button" onClick={handleClear}
            className="mr-2 rounded p-0.5 text-text-disabled hover:text-text-primary transition-colors"
            aria-label="Quitar producto">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18" /><path d="m6 6 12 12" />
            </svg>
          </button>
        )}

        {/* Chevron when nothing selected */}
        {!value && (
          <svg className={clsx('mr-3 h-4 w-4 shrink-0 text-text-disabled transition-transform', open && 'rotate-180')}
            viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
            strokeLinecap="round" strokeLinejoin="round">
            <path d="m6 9 6 6 6-6" />
          </svg>
        )}

        {/* Dropdown */}
        {open && (
          <div className="absolute top-full left-0 z-50 mt-1 w-full max-h-72 overflow-auto rounded-lg border border-surface-border bg-white shadow-lg">

            {/* Línea libre */}
            <button
              type="button"
              onMouseDown={(e) => { e.preventDefault(); handleSelect(null) }}
              className={clsx(
                'w-full px-3 py-2.5 text-left text-sm transition-colors border-b border-surface-border/50',
                activeIndex === 0
                  ? 'bg-primary/10 text-primary'
                  : value === null ? 'bg-surface-muted text-text-secondary font-medium' : 'text-text-secondary hover:bg-surface-subtle'
              )}
            >
              — Línea libre (sin producto vinculado) —
            </button>

            {isFetching && (
              <div className="flex items-center gap-2 px-3 py-2.5 text-sm text-text-secondary">
                <svg className="h-4 w-4 animate-spin text-primary" xmlns="http://www.w3.org/2000/svg"
                  fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Buscando...
              </div>
            )}

            {!isFetching && todos.length === 0 && debouncedQuery && (
              <p className="px-3 py-3 text-sm text-text-disabled">
                Sin resultados para "{debouncedQuery}"
              </p>
            )}

            {/* Grupo: PRODUCTOS */}
            {!isFetching && productos.length > 0 && (
              <>
                <div className="px-3 pt-2 pb-1">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-text-disabled">Productos</span>
                </div>
                {productos.map((p, i) => {
                  const idx = i + 1 // offset by "línea libre"
                  const uni = UNIDAD_LABEL[p.unidad_medida] ?? p.unidad_medida
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onMouseDown={(e) => { e.preventDefault(); handleSelect(p) }}
                      className={clsx(
                        'w-full px-3 py-2 text-left transition-colors',
                        idx === activeIndex
                          ? 'bg-primary/10'
                          : p.id === value?.id ? 'bg-primary/5' : 'hover:bg-surface-subtle'
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <span className="font-mono text-[10px] text-text-disabled mr-1.5">{p.codigo}</span>
                          <span className="text-sm text-text-primary font-medium truncate">{p.nombre}</span>
                        </div>
                        <span className="shrink-0 text-xs font-mono text-text-secondary">
                          {fmt(Number(p.precio_base))}{uni ? `/${uni}` : ''}
                        </span>
                      </div>
                    </button>
                  )
                })}
              </>
            )}

            {/* Grupo: SERVICIOS DE INSTALACIÓN */}
            {!isFetching && servicios.length > 0 && (
              <>
                <div className={clsx('px-3 pt-2 pb-1', productos.length > 0 && 'border-t border-surface-border/50 mt-1')}>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-text-disabled">Servicios de instalación</span>
                </div>
                {servicios.map((p, i) => {
                  const idx = productos.length + i + 1
                  const uni = UNIDAD_LABEL[p.unidad_medida] ?? p.unidad_medida
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onMouseDown={(e) => { e.preventDefault(); handleSelect(p) }}
                      className={clsx(
                        'w-full px-3 py-2 text-left transition-colors',
                        idx === activeIndex
                          ? 'bg-primary/10'
                          : p.id === value?.id ? 'bg-primary/5' : 'hover:bg-surface-subtle'
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <span className="font-mono text-[10px] text-text-disabled mr-1.5">{p.codigo}</span>
                          <span className="text-sm text-text-primary truncate">{p.nombre}</span>
                        </div>
                        <span className="shrink-0 text-xs font-mono text-text-secondary">
                          {fmt(Number(p.precio_base))}{uni ? `/${uni}` : ''}
                        </span>
                      </div>
                    </button>
                  )
                })}
              </>
            )}

            {/* Padding bottom */}
            <div className="h-1" />
          </div>
        )}
      </div>
    </div>
  )
}
