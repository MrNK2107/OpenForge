"use client";

import { Environment } from '@react-three/drei'
import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useForgeStore } from '@/store/forgeStore'
import { CHAPTER_BREAKPOINTS } from './config'

export function Lighting() {
  const keyRef = useRef<THREE.PointLight>(null)
  const rimRef = useRef<THREE.SpotLight>(null)
  const fillRef = useRef<THREE.PointLight>(null)
  const progress = useForgeStore((state) => state.scrollProgress)

  useFrame(() => {
    const shatter = THREE.MathUtils.smoothstep(progress, CHAPTER_BREAKPOINTS.anvilEnd, CHAPTER_BREAKPOINTS.shatterEnd)
    const feature = THREE.MathUtils.smoothstep(progress, CHAPTER_BREAKPOINTS.shatterEnd, 1)
    if (keyRef.current) {
      keyRef.current.intensity = 820 + shatter * 760 - feature * 260
      keyRef.current.position.x = 4.8 + shatter * 0.9
      keyRef.current.position.y = 6.8 + shatter * 0.5
    }
    if (rimRef.current) {
      rimRef.current.intensity = 1080 + shatter * 880 + feature * 460
      rimRef.current.angle = 0.42 + feature * 0.08
    }
    if (fillRef.current) {
      fillRef.current.intensity = 120 + feature * 170
      fillRef.current.position.z = 2.3 + feature * 1.6
    }
  })

  return (
    <>
      <ambientLight intensity={0.2} color="#d8e9ff" />
      <pointLight ref={keyRef} position={[4.8, 6.8, 7.5]} color="#ff7a2d" intensity={820} distance={60} decay={2} castShadow />
      <spotLight ref={rimRef} position={[-6.4, 8.4, -7.2]} color="#8fd8ff" intensity={1080} angle={0.42} penumbra={1} distance={72} decay={1.8} castShadow />
      <pointLight ref={fillRef} position={[0, -2.8, 2.3]} color="#dcefff" intensity={120} distance={24} decay={2} />
      <Environment preset="night" />
    </>
  )
}
