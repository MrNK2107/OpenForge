"use client";

import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useForgeStore } from '@/store/forgeStore'
import { CHAPTER_BREAKPOINTS } from './config'

export function ForgeCore() {
  const groupRef = useRef<THREE.Group>(null)
  const scrollProgress = useForgeStore((state) => state.scrollProgress)

  useFrame((state, delta) => {
    if (!groupRef.current) return
    const time = state.clock.getElapsedTime()
    const preShatter = THREE.MathUtils.clamp(
      scrollProgress / CHAPTER_BREAKPOINTS.anvilEnd,
      0,
      1
    )
    const shatterFade = THREE.MathUtils.smoothstep(
      scrollProgress,
      CHAPTER_BREAKPOINTS.anvilEnd - 0.06,
      CHAPTER_BREAKPOINTS.shatterEnd - 0.02
    )
    const heroWeight = 1 - shatterFade

    groupRef.current.position.y = Math.sin(time * 0.45) * 0.12 + heroWeight * 0.1
    groupRef.current.rotation.y += delta * (0.08 + heroWeight * 0.04)
    groupRef.current.rotation.z = Math.sin(time * 0.18) * 0.03
    groupRef.current.rotation.x = Math.cos(time * 0.2) * 0.035 + preShatter * 0.02

    const targetScale = THREE.MathUtils.lerp(1.28, 0.001, shatterFade)
    const s = THREE.MathUtils.lerp(groupRef.current.scale.x, targetScale, 0.11)
    groupRef.current.scale.set(s, s, s)
  })

  const anvilMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: "#0b0e12",
      metalness: 0.96,
      roughness: 0.16,
      emissive: '#130d0a',
      emissiveIntensity: 0.24,
      envMapIntensity: 1.8,
    })
  }, [])

  const seamMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#10151d',
        metalness: 0.92,
        roughness: 0.24,
        emissive: '#ff6a1a',
        emissiveIntensity: 0.6,
      }),
    []
  )

  return (
    <group ref={groupRef} scale={1.28}>
      <mesh position={[0, -1.5, 0]} material={anvilMaterial}>
        <boxGeometry args={[2.75, 0.58, 1.65]} />
      </mesh>
      <mesh position={[0, -0.75, 0]} material={anvilMaterial}>
        <boxGeometry args={[1.45, 1.1, 0.98]} />
      </mesh>
      <mesh position={[0, 0.25, 0]} material={anvilMaterial}>
        <boxGeometry args={[3.4, 1.05, 1.24]} />
      </mesh>
      <mesh position={[2.25, 0.25, 0]} rotation={[0, 0, -Math.PI / 2]} material={anvilMaterial}>
        <coneGeometry args={[0.48, 1.72, 32]} />
      </mesh>
      <mesh position={[-2.0, 0.25, 0]} material={anvilMaterial}>
        <boxGeometry args={[1.02, 1.02, 1.24]} />
      </mesh>
      <mesh position={[0.6, 0.86, 0]} rotation={[0, 0, 0.03]} material={seamMaterial}>
        <boxGeometry args={[1.2, 0.07, 0.08]} />
      </mesh>
      <mesh position={[-0.5, 0.62, 0.02]} rotation={[0, 0, -0.08]} material={seamMaterial}>
        <boxGeometry args={[1.38, 0.06, 0.08]} />
      </mesh>
    </group>
  )
}
