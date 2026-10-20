"use client";

import { EffectComposer, Bloom } from '@react-three/postprocessing'
import { useForgeStore } from '@/store/forgeStore'
import { CHAPTER_BREAKPOINTS } from './config'
import * as THREE from 'three'

export function Effects() {
  const progress = useForgeStore((state) => state.scrollProgress)
  const shatter = THREE.MathUtils.smoothstep(progress, CHAPTER_BREAKPOINTS.anvilEnd, CHAPTER_BREAKPOINTS.shatterEnd + 0.08)
  const feature = THREE.MathUtils.smoothstep(progress, CHAPTER_BREAKPOINTS.shatterEnd, 1)
  const intensity = 0.16 + shatter * 0.26 + feature * 0.08

  return (
    <EffectComposer enableNormalPass={false} multisampling={0}>
      <Bloom luminanceThreshold={0.62} luminanceSmoothing={0.75} intensity={intensity} mipmapBlur />
    </EffectComposer>
  )
}
