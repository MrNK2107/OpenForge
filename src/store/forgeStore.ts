import { create } from 'zustand'

export type ForgeChapter = 'anvil' | 'shatter' | 'features'
export type PerformanceTier = 'high' | 'medium' | 'low'

interface ForgeState {
  scrollProgress: number
  activeChapter: ForgeChapter
  performanceTier: PerformanceTier
  setScrollProgress: (progress: number) => void
  setActiveChapter: (chapter: ForgeChapter) => void
  setPerformanceTier: (tier: PerformanceTier) => void
}

export const useForgeStore = create<ForgeState>((set) => ({
  scrollProgress: 0,
  activeChapter: 'anvil',
  performanceTier: 'high',
  setScrollProgress: (progress) => set({ scrollProgress: Math.min(1, Math.max(0, progress)) }),
  setActiveChapter: (chapter) => set({ activeChapter: chapter }),
  setPerformanceTier: (tier) => set({ performanceTier: tier }),
}))
