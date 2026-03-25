export interface SidebarSlice {
  isOpen: boolean
  toggle: () => void
  close: () => void
  open: () => void
}

export const createSidebarSlice = (set: (fn: (state: SidebarSlice) => Partial<SidebarSlice>) => void): SidebarSlice => ({
  isOpen: true,
  toggle: () => set((state) => ({ isOpen: !state.isOpen })),
  close: () => set(() => ({ isOpen: false })),
  open: () => set(() => ({ isOpen: true })),
})
