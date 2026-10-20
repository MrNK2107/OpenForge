"use client";

import { Canvas } from '@react-three/fiber'
import { ForgeCore } from './ForgeCore'
import { FractureShards } from './FractureShards'
import { MercuryVoid } from './MercuryVoid'
import { ParticleSystem } from './ParticleSystem'
import { Lighting } from './Lighting'
import { Effects } from './Effects'
import { PerspectiveCamera } from '@react-three/drei'
import * as THREE from 'three'
import { useForgeStore } from '@/store/forgeStore'
import { useMemo } from 'react'
import { LIGHTING_TUNING } from './config'

export function ForgeScene() {
  const tier = useForgeStore((state) => state.performanceTier)
  const dpr = useMemo(() => {
    if (tier === 'low') return [1, 1.2] as [number, number]
    if (tier === 'medium') return [1, 1.5] as [number, number]
    return [1, 2] as [number, number]
  }, [tier])

  return (
    <div className="fixed inset-0 z-0 pointer-events-none h-screen w-screen overflow-hidden">
      <Canvas
        dpr={dpr}
        shadows
        gl={{
          antialias: tier !== 'low',
          powerPreference: "high-performance",
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: LIGHTING_TUNING.baseExposure,
        }}
      >
        <color attach="background" args={['#050608']} />
        <fog attach="fog" args={['#050608', 16, 56]} />
        <PerspectiveCamera makeDefault position={[0, 1.55, 10.4]} fov={42} />
        
        <Lighting />
        <ForgeCore />
        <FractureShards />
        <MercuryVoid />
        <ParticleSystem />
        <Effects />
      </Canvas>
    </div>
  )
}
