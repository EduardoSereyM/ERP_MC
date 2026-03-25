import { useState, useEffect } from 'react'
import { Button, Input, PhoneInput, ChileLocationSelect } from '@/shared/components/ui'
import type { ChileLocationValue } from '@/shared/components/ui'
import { useCrearCliente, useActualizarCliente } from '../hooks/useClientes'
import type { ClienteCreate, ClienteUpdate, ClienteListItem, Cliente } from '../types'
import { validarRut, normalizarRut, formatearRut, formatearRutInput } from '@/shared/utils/rut'

interface ClienteFormProps {
  initial?: ClienteListItem | null
  onSuccess: () => void
  onCancel: () => void
  onCreated?: (cliente: Cliente) => void
}

interface FormState {
  razon_social: string
  rut: string
  email: string
  telefono: string
  direccion: string
  location: ChileLocationValue
  contacto_nombre: string
  contacto_email: string
  contacto_telefono: string
}

type TouchedState = Partial<Record<keyof FormState | 'location_region' | 'location_ciudad' | 'location_comuna', boolean>>

// ─── Validadores ──────────────────────────────────────────────────────────────

function isValidEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)
}

function isValidPhone(v: string) {
  const local = v.startsWith('+56 ') ? v.slice(4) : v.replace(/^\+56\s?/, '')
  const digits = local.replace(/\D/g, '')
  return digits.length === 9
}

// ─── Estado inicial ────────────────────────────────────────────────────────────

const EMPTY_LOCATION: ChileLocationValue = { region: '', ciudad: '', comuna: '' }

const EMPTY: FormState = {
  razon_social: '',
  rut: '',
  email: '',
  telefono: '',
  direccion: '',
  location: EMPTY_LOCATION,
  contacto_nombre: '',
  contacto_email: '',
  contacto_telefono: '',
}

// ─── Componente ───────────────────────────────────────────────────────────────

export const ClienteForm = ({ initial, onSuccess, onCancel, onCreated }: ClienteFormProps) => {
  const [form, setForm] = useState<FormState>(EMPTY)
  const [touched, setTouched] = useState<TouchedState>({})
  const [rutError, setRutError] = useState('')

  const crear = useCrearCliente()
  const actualizar = useActualizarCliente(initial?.id ?? '')
  const isPending = crear.isPending || actualizar.isPending
  const apiError = crear.error || actualizar.error

  // ── Cargar datos en modo edición ─────────────────────────────────────────
  useEffect(() => {
    if (initial) {
      setForm({
        razon_social: initial.razon_social,
        rut: formatearRut(initial.rut) ?? initial.rut,
        email: initial.email ?? '',
        telefono: initial.telefono ?? '',
        direccion: initial.direccion ?? '',
        location: {
          region: initial.region ?? '',
          ciudad: initial.ciudad ?? '',
          comuna: initial.comuna ?? '',
        },
        contacto_nombre: initial.contacto_nombre ?? '',
        contacto_email: initial.contacto_email ?? '',
        contacto_telefono: initial.contacto_telefono ?? '',
      })
      setTouched({})
      setRutError('')
    } else {
      setForm(EMPTY)
      setTouched({})
      setRutError('')
    }
  }, [initial])

  // ── Helpers ──────────────────────────────────────────────────────────────
  const touch = (key: keyof TouchedState) => setTouched(t => ({ ...t, [key]: true }))

  const set = (key: keyof Omit<FormState, 'location'>) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm(f => ({ ...f, [key]: e.target.value }))

  // ── RUT ──────────────────────────────────────────────────────────────────
  const handleRutChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(f => ({ ...f, rut: formatearRutInput(e.target.value) }))
    if (rutError) setRutError('')
  }

  const handleRutBlur = () => {
    touch('rut')
    if (!form.rut) { setRutError('El RUT es requerido'); return }
    if (!validarRut(form.rut)) {
      setRutError('RUT inválido — verifica el dígito verificador')
    } else {
      setRutError('')
      setForm(f => ({ ...f, rut: formatearRut(f.rut) ?? f.rut }))
    }
  }

  // ── Validación campos ─────────────────────────────────────────────────────
  const errors = {
    razon_social: touched.razon_social && !form.razon_social.trim()
      ? 'La razón social es requerida' : '',
    email: touched.email && !isValidEmail(form.email)
      ? 'Email inválido' : '',
    telefono: touched.telefono && !isValidPhone(form.telefono)
      ? 'Ingresa un teléfono válido (9 dígitos)' : '',
    direccion: touched.direccion && !form.direccion.trim()
      ? 'La dirección es requerida' : '',
    contacto_nombre: touched.contacto_nombre && !form.contacto_nombre.trim()
      ? 'El nombre de contacto es requerido' : '',
    contacto_email: touched.contacto_email && !isValidEmail(form.contacto_email)
      ? 'Email de contacto inválido' : '',
    contacto_telefono: touched.contacto_telefono && !isValidPhone(form.contacto_telefono)
      ? 'Ingresa un teléfono válido (9 dígitos)' : '',
  }

  const success = {
    razon_social: !!touched.razon_social && !!form.razon_social.trim(),
    rut: !rutError && !!form.rut && validarRut(form.rut),
    email: !!touched.email && isValidEmail(form.email),
    telefono: !!touched.telefono && isValidPhone(form.telefono),
    direccion: !!touched.direccion && !!form.direccion.trim(),
    contacto_nombre: !!touched.contacto_nombre && !!form.contacto_nombre.trim(),
    contacto_email: !!touched.contacto_email && isValidEmail(form.contacto_email),
    contacto_telefono: !!touched.contacto_telefono && isValidPhone(form.contacto_telefono),
  }

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Marcar todo como tocado para mostrar todos los errores
    setTouched({
      razon_social: true, rut: true, email: true, telefono: true,
      direccion: true, contacto_nombre: true, contacto_email: true, contacto_telefono: true,
    })

    // Validaciones requeridas
    if (!form.razon_social.trim()) return
    if (!validarRut(form.rut)) { setRutError('RUT inválido'); return }
    if (!isValidEmail(form.email)) return
    if (!isValidPhone(form.telefono)) return
    if (!form.direccion.trim()) return
    if (!form.location.region) return
    if (!form.location.ciudad) return
    if (!form.location.comuna) return
    if (!form.contacto_nombre.trim()) return
    if (!isValidEmail(form.contacto_email)) return
    if (!isValidPhone(form.contacto_telefono)) return

    const basePayload = {
      email: form.email,
      telefono: form.telefono,
      direccion: form.direccion,
      region: form.location.region,
      ciudad: form.location.ciudad,
      comuna: form.location.comuna,
      contacto_nombre: form.contacto_nombre,
      contacto_email: form.contacto_email,
      contacto_telefono: form.contacto_telefono,
    }

    try {
      if (initial) {
        const payload: ClienteUpdate = {
          razon_social: form.razon_social,
          ...basePayload,
        }
        await actualizar.mutateAsync(payload)
        onSuccess()
      } else {
        const payload: ClienteCreate = {
          razon_social: form.razon_social,
          rut: normalizarRut(form.rut)!,
          ...basePayload,
        }
        const nuevo = await crear.mutateAsync(payload)
        onCreated?.(nuevo)
        onSuccess()
      }
    } catch {
      // error mostrado abajo
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────
  const locationError = touched.contacto_nombre && !form.location.region
    ? 'Selecciona región, ciudad y comuna'
    : ''

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Razón Social"
          required
          value={form.razon_social}
          onChange={set('razon_social')}
          onBlur={() => touch('razon_social')}
          placeholder="Empresa Ejemplo SpA"
          className="col-span-2"
          error={errors.razon_social}
          success={success.razon_social}
        />
        <Input
          label="RUT"
          required
          value={form.rut}
          onChange={handleRutChange}
          onBlur={handleRutBlur}
          placeholder="12.345.678-9"
          error={rutError}
          success={success.rut}
        />
        <Input
          label="Email"
          type="email"
          required
          value={form.email}
          onChange={set('email')}
          onBlur={() => touch('email')}
          placeholder="contacto@empresa.cl"
          error={errors.email}
          success={success.email}
        />
        <PhoneInput
          label="Teléfono"
          required
          value={form.telefono}
          onChange={v => setForm(f => ({ ...f, telefono: v }))}
          onBlur={() => touch('telefono')}
          error={errors.telefono}
          success={success.telefono}
        />
        <Input
          label="Dirección"
          required
          value={form.direccion}
          onChange={set('direccion')}
          onBlur={() => touch('direccion')}
          placeholder="Av. Ejemplo 123"
          error={errors.direccion}
          success={success.direccion}
        />
        <ChileLocationSelect
          value={form.location}
          onChange={location => setForm(f => ({ ...f, location }))}
        />
        {locationError && (
          <p className="col-span-2 text-xs text-danger-text">{locationError}</p>
        )}
      </div>

      <hr className="border-surface-border" />
      <p className="text-xs font-medium text-text-secondary uppercase tracking-wide">Contacto comercial</p>
      <div className="grid grid-cols-3 gap-4">
        <Input
          label="Nombre contacto"
          required
          value={form.contacto_nombre}
          onChange={set('contacto_nombre')}
          onBlur={() => touch('contacto_nombre')}
          placeholder="Juan Pérez"
          error={errors.contacto_nombre}
          success={success.contacto_nombre}
        />
        <Input
          label="Email contacto"
          type="email"
          required
          value={form.contacto_email}
          onChange={set('contacto_email')}
          onBlur={() => touch('contacto_email')}
          placeholder="juan@empresa.cl"
          error={errors.contacto_email}
          success={success.contacto_email}
        />
        <PhoneInput
          label="Teléfono contacto"
          required
          value={form.contacto_telefono}
          onChange={v => setForm(f => ({ ...f, contacto_telefono: v }))}
          onBlur={() => touch('contacto_telefono')}
          error={errors.contacto_telefono}
          success={success.contacto_telefono}
        />
      </div>

      {apiError && (
        <p className="text-sm text-danger-text bg-danger-10 border border-danger-30 rounded-lg px-3 py-2">
          {(() => {
            const detail = (apiError as any)?.response?.data?.detail
            if (!detail) return 'Error al guardar el cliente'
            if (typeof detail === 'string') return detail
            if (Array.isArray(detail)) return detail.map((d: any) => d.msg).join(' · ')
            return 'Error al guardar el cliente'
          })()}
        </p>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" loading={isPending}>
          {initial ? 'Guardar cambios' : 'Crear cliente'}
        </Button>
      </div>
    </form>
  )
}
