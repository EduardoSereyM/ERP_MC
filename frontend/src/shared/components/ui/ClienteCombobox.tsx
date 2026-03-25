import { useState, useRef, useEffect, useCallback } from 'react'
import clsx from 'clsx'
import { useClientes } from '@/modules/clientes'
import type { ClienteListItem } from '@/modules/clientes'

// ─── Props ────────────────────────────────────────────────────────────────────

interface ClienteComboboxProps {
  value: string
  onChange: (id: string, cliente?: ClienteListItem) => void
  label?: string
  required?: boolean
  error?: string
  placeholder?: string
  /** Cliente pre-seleccionado (para modo edición) */
  initialCliente?: Pick<ClienteListItem, 'id' | 'razon_social' | 'rut'>
}

// ─── Component ────────────────────────────────────────────────────────────────

export const ClienteCombobox = ({
  value,
  onChange,
  label,
  required,
  error,
  placeholder = 'Buscar por razón social o RUT...',
  initialCliente,
}: ClienteComboboxProps) => {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [selectedLabel, setSelectedLabel] = useState(
    initialCliente ? `${initialCliente.razon_social} — ${initialCliente.rut}` : ''
  )

  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Sync selectedLabel when value cleared externally or initialCliente changes
  useEffect(() => {
    if (!value) {
      setSelectedLabel('')
      setQuery('')
    } else if (initialCliente && initialCliente.id === value) {
      setSelectedLabel(`${initialCliente.razon_social} — ${initialCliente.rut}`)
    }
  }, [value, initialCliente])

  // Debounce search query
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value
    setQuery(v)
    setOpen(true)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setDebouncedQuery(v), 300)
  }

  // Close on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
        // If nothing was selected, restore label or clear
        if (!value) setQuery('')
        else setQuery('')
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [value])

  // Search: only when open and there's a query
  const { data, isFetching } = useClientes({
    busqueda: debouncedQuery || undefined,
    activo: true,
    limit: 20,
  })
  const results = data?.data ?? []

  const handleSelect = useCallback((cliente: ClienteListItem) => {
    onChange(cliente.id, cliente)
    setSelectedLabel(`${cliente.razon_social} — ${cliente.rut}`)
    setQuery('')
    setDebouncedQuery('')
    setOpen(false)
  }, [onChange])

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange('', undefined)
    setSelectedLabel('')
    setQuery('')
    setDebouncedQuery('')
    setOpen(false)
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  const handleFocus = () => {
    setOpen(true)
    setQuery('')
  }

  // Keyboard navigation
  const [activeIndex, setActiveIndex] = useState(-1)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex(i => Math.min(i + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault()
      handleSelect(results[activeIndex])
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  // Reset active index on new results
  useEffect(() => { setActiveIndex(-1) }, [results])

  const inputId = label?.toLowerCase().replace(/\s/g, '-') ?? 'cliente-combobox'

  return (
    <div className="relative flex flex-col gap-1" ref={containerRef}>
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-text-primary">
          {label}
          {required && <span className="text-danger ml-0.5">*</span>}
        </label>
      )}

      {/* Input wrapper */}
      <div
        className={clsx(
          'relative flex items-center rounded-lg border text-sm transition-colors',
          'focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-0',
          error
            ? 'border-danger bg-danger-10 focus-within:ring-danger'
            : 'border-surface-border bg-surface hover:border-text-disabled'
        )}
      >
        {/* Search icon */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="ml-3 h-4 w-4 shrink-0 text-text-disabled"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
        </svg>

        <input
          ref={inputRef}
          id={inputId}
          type="text"
          autoComplete="off"
          value={open ? query : selectedLabel}
          onChange={handleInputChange}
          onFocus={handleFocus}
          onKeyDown={handleKeyDown}
          placeholder={value ? selectedLabel : placeholder}
          className="flex-1 bg-transparent px-2 py-2 text-text-primary placeholder:text-text-disabled focus:outline-none"
        />

        {/* Clear button — only when something is selected */}
        {value && (
          <button
            type="button"
            onClick={handleClear}
            className="mr-2 rounded p-0.5 text-text-disabled hover:text-text-primary transition-colors"
            aria-label="Quitar cliente"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        )}

        {/* Dropdown chevron */}
        {!value && (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className={clsx(
              'mr-3 h-4 w-4 shrink-0 text-text-disabled transition-transform',
              open && 'rotate-180'
            )}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        )}
      </div>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 mt-1 w-full min-w-[280px] max-h-60 overflow-auto rounded-lg border border-surface-border bg-white shadow-lg">
          {isFetching ? (
            <div className="flex items-center gap-2 px-3 py-3 text-sm text-text-secondary">
              <svg
                className="h-4 w-4 animate-spin text-primary"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Buscando...
            </div>
          ) : results.length === 0 ? (
            <p className="px-3 py-3 text-sm text-text-disabled">
              {debouncedQuery ? 'Sin resultados para la búsqueda' : 'Escribe para buscar clientes'}
            </p>
          ) : (
            results.map((c, i) => (
              <button
                key={c.id}
                type="button"
                onMouseDown={(e) => { e.preventDefault(); handleSelect(c) }}
                className={clsx(
                  'w-full px-3 py-2.5 text-left text-sm transition-colors',
                  i === activeIndex
                    ? 'bg-primary/10 text-primary'
                    : 'text-text-primary hover:bg-surface-subtle',
                  c.id === value && 'font-medium'
                )}
              >
                <span className="block font-medium leading-tight">{c.razon_social}</span>
                <span className="block text-xs text-text-secondary">{c.rut}</span>
              </button>
            ))
          )}
        </div>
      )}

      {error && <p className="text-xs text-danger-text">{error}</p>}
    </div>
  )
}
