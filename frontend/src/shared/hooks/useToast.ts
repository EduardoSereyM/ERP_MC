import { useCallback } from 'react'
import { useAppStore } from '@/core/store'

export interface UseToastReturn {
  success: (message: string, duration?: number) => void
  error: (message: string, duration?: number) => void
  warning: (message: string, duration?: number) => void
  info: (message: string, duration?: number) => void
}

export function useToast(): UseToastReturn {
  const addToast = useAppStore((s) => s.addToast)

  return {
    success: useCallback((message: string, duration?: number) => addToast('success', message, duration), [addToast]),
    error:   useCallback((message: string, duration?: number) => addToast('error', message, duration), [addToast]),
    warning: useCallback((message: string, duration?: number) => addToast('warning', message, duration), [addToast]),
    info:    useCallback((message: string, duration?: number) => addToast('info', message, duration), [addToast]),
  }
}
