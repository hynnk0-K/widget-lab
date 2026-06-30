import { create } from 'zustand'
import type { Alarm } from '@/entities/alarm/model/types'

interface SnackbarItem {
  id: string // 고유 ID (timestamp)
  alarm: Alarm
  createdAt: number
}

interface SnackbarStore {
  items: SnackbarItem[]
  push: (alarm: Alarm) => void
  remove: (id: string) => void
  clear: () => void
}

export const useSnackbarStore = create<SnackbarStore>((set) => ({
  items: [],
  push: (alarm) =>
    set((state) => ({
      items: [
        ...state.items,
        {
          id: `snk-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          alarm,
          createdAt: Date.now(),
        },
      ],
    })),
  remove: (id) =>
    set((state) => ({
      items: state.items.filter((i) => i.id !== id),
    })),
  clear: () => set({ items: [] }),
}))
