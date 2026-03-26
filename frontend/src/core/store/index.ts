import { create } from 'zustand'
import { createThemeSlice, type ThemeSlice } from './themeSlice'
import { createSidebarSlice, type SidebarSlice } from './sidebarSlice'
import { createToastSlice, type ToastSlice } from './toastSlice'

type AppStore = ThemeSlice & SidebarSlice & ToastSlice

export const useAppStore = create<AppStore>()((set) => ({
  ...createThemeSlice(set as Parameters<typeof createThemeSlice>[0]),
  ...createSidebarSlice(set as Parameters<typeof createSidebarSlice>[0]),
  ...createToastSlice(set as Parameters<typeof createToastSlice>[0]),
}))

// Selectores con nombre para evitar re-renders innecesarios
export const useTheme = () => useAppStore((s) => s.theme)
export const useSetTheme = () => useAppStore((s) => s.setTheme)
export const useSidebarOpen = () => useAppStore((s) => s.isOpen)
export const useSidebarToggle = () => useAppStore((s) => s.toggle)
export const useToasts = () => useAppStore((s) => s.toasts)
export const useRemoveToast = () => useAppStore((s) => s.removeToast)
