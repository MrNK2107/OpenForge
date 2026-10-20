import type { ForgeChapter, PerformanceTier } from '@/store/forgeStore'

export const CHAPTER_BREAKPOINTS = {
  anvilEnd: 0.38,
  shatterEnd: 0.72,
} as const

export const FEATURE_NAMES: ForgeChapter[] = ['anvil', 'shatter', 'features']

export const SCENE_COUNTS: Record<PerformanceTier, { shards: number; embers: number }> = {
  high: { shards: 160, embers: 1100 },
  medium: { shards: 110, embers: 760 },
  low: { shards: 70, embers: 420 },
}

export const LIGHTING_TUNING = {
  baseExposure: 0.98,
  shatterBoost: 0.22,
  featureBoost: 0.12,
}
