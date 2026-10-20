"use client";

import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { MeshReflectorMaterial } from '@react-three/drei'
import { useForgeStore } from '@/store/forgeStore'

export function MercuryVoid() {
  const meshRef = useRef<THREE.Mesh>(null)
  const progress = useForgeStore((state) => state.scrollProgress)

  useFrame((state) => {
    if (!meshRef.current) return
    const time = state.clock.getElapsedTime()
    meshRef.current.position.y = -4.6 + Math.sin(time * 0.4) * 0.06
    meshRef.current.rotation.z = Math.sin(time * 0.08) * 0.02
    const mat = meshRef.current.material as THREE.MeshStandardMaterial
    mat.opacity = 0.72 + THREE.MathUtils.smoothstep(progress, 0.35, 1) * 0.15
  })

  return (
    <mesh ref={meshRef} position={[0, -4.6, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[130, 130, 64, 64]} />
      <MeshReflectorMaterial
        blur={[260, 90]}
        resolution={1024}
        mixBlur={0.8}
        mixStrength={68}
        roughness={0.02}
        depthScale={1}
        minDepthThreshold={0.4}
        maxDepthThreshold={1.5}
        color="#090b0e"
        metalness={1}
        mirror={0.95}
      />
    </mesh>
  )
}
