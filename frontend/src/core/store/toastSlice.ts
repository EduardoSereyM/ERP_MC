type ToastVariant = 'success' | 'error' | 'warning' | 'info'

export interface Toast {
  id: string
  message: string
  variant: ToastVariant
  duration: number
}

export interface ToastSlice {
  toasts: Toast[]
  addToast: (variant: ToastVariant, message: string, duration?: number) => void
  removeToast: (id: string) => void
}

export const createToastSlice = (
  set: (fn: (state: ToastSlice) => Partial<ToastSlice>) => void,
): ToastSlice => ({
  toasts: [],
  addToast: (variant, message, duration = 4000) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    set((state) => ({ toasts: [...state.toasts, { id, message, variant, duration }] }))
    setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }))
    }, duration)
  },
  removeToast: (id) =>
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
})
