"use client";

import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useForgeStore } from '@/store/forgeStore'
import { CHAPTER_BREAKPOINTS, SCENE_COUNTS } from './config'

export function ParticleSystem() {
  const pointsRef = useRef<THREE.Points>(null)
  const progress = useForgeStore((state) => state.scrollProgress)
  const tier = useForgeStore((state) => state.performanceTier)
  const count = SCENE_COUNTS[tier].embers

  const base = useMemo(() => {
    const arr = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 20
      arr[i * 3 + 1] = (Math.random() - 0.5) * 10
      arr[i * 3 + 2] = (Math.random() - 0.5) * 16
    }
    return arr
  }, [count])

  const live = useMemo(() => Float32Array.from(base), [base])

  useFrame((state) => {
    if (!pointsRef.current) return
    const time = state.clock.getElapsedTime()
    const p = pointsRef.current.geometry.attributes.position.array as Float32Array
    const shatterWeight = THREE.MathUtils.smoothstep(progress, CHAPTER_BREAKPOINTS.anvilEnd, CHAPTER_BREAKPOINTS.shatterEnd + 0.08)
    const coolDown = 1 - THREE.MathUtils.smoothstep(progress, 0.86, 1)

    for (let i = 0; i < count; i++) {
      const idx = i * 3
      const seed = i / count
      const drift = 0.26 + shatterWeight * 0.65
      live[idx] = base[idx] + Math.sin(time * drift + seed * 32) * (0.16 + shatterWeight * 0.4)
      live[idx + 1] = base[idx + 1] + Math.cos(time * (drift + 0.1) + seed * 42) * (0.12 + shatterWeight * 0.3)
      live[idx + 2] = base[idx + 2] + Math.sin(time * (drift + 0.08) + seed * 25) * (0.13 + shatterWeight * 0.34)
      p[idx] = live[idx]
      p[idx + 1] = live[idx + 1]
      p[idx + 2] = live[idx + 2]
    }
    pointsRef.current.geometry.attributes.position.needsUpdate = true
    ;(pointsRef.current.material as THREE.PointsMaterial).opacity = 0.16 + shatterWeight * 0.24 * coolDown
  })

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[live, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={tier === 'low' ? 0.028 : 0.035}
        color="#ff8a3d"
        transparent
        opacity={0.24}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  )
}
