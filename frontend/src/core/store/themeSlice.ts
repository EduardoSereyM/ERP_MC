export type Theme = 'light' | 'dark' | 'system'

export interface ThemeSlice {
  theme: Theme
  setTheme: (theme: Theme) => void
}

export const createThemeSlice = (set: (fn: (state: ThemeSlice) => Partial<ThemeSlice>) => void): ThemeSlice => ({
  theme: (localStorage.getItem('theme') as Theme) || 'system',

  setTheme: (theme) => {
    set(() => ({ theme }))
    localStorage.setItem('theme', theme) // única excepción permitida de localStorage
    applyThemeToDom(theme)
  },
})

export const applyThemeToDom = (theme: Theme) => {
  const root = document.documentElement
  if (theme === 'dark') {
    root.classList.add('dark')
  } else if (theme === 'light') {
    root.classList.remove('dark')
  } else {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    prefersDark ? root.classList.add('dark') : root.classList.remove('dark')
  }
}
