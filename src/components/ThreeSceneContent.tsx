"use client";

import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useRef, useState, useMemo } from 'react'
import * as THREE from 'three'
import { Stars } from '@react-three/drei'

// Floating geometric particles
function FloatingParticles({ count = 100 }) {
  const meshRef = useRef<THREE.InstancedMesh>(null)
  const [positions] = useState(() => {
    const pos = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 30
      pos[i * 3 + 1] = (Math.random() - 0.5) * 30
      pos[i * 3 + 2] = (Math.random() - 0.5) * 30
    }
    return pos
  })
  const [scales] = useState(() => {
    const s = new Float32Array(count)
    for (let i = 0; i < count; i++) {
      s[i] = Math.random() * 0.5 + 0.1
    }
    return s
  })

  useFrame((state) => {
    if (!meshRef.current) return
    const time = state.clock.getElapsedTime()
    for (let i = 0; i < count; i++) {
      const matrix = new THREE.Matrix4()
      const x = positions[i * 3] + Math.sin(time * 0.5 + i) * 0.02
      const y = positions[i * 3 + 1] + Math.cos(time * 0.3 + i) * 0.02
      const z = positions[i * 3 + 2] + Math.sin(time * 0.4 + i) * 0.02
      matrix.setPosition(x, y, z)
      matrix.scale(new THREE.Vector3(scales[i], scales[i], scales[i]))
      meshRef.current.setMatrixAt(i, matrix)
    }
    meshRef.current.instanceMatrix.needsUpdate = true
  })

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <sphereGeometry args={[1, 16, 16]} />
      <meshStandardMaterial
        color="#7c3aed"
        emissive="#7c3aed"
        emissiveIntensity={0.5}
        metalness={0.5}
        roughness={0.2}
      />
    </instancedMesh>
  )
}

// Interactive torus knot
function InteractiveTorusKnot() {
  const meshRef = useRef<THREE.Mesh>(null)
  const [hovered, setHovered] = useState(false)

  useFrame((state) => {
    if (!meshRef.current) return
    const time = state.clock.getElapsedTime()
    meshRef.current.rotation.x = Math.sin(time * 0.3) * 0.2
    meshRef.current.rotation.y = time * 0.5
    meshRef.current.rotation.z = Math.cos(time * 0.2) * 0.1
    
    const scale = hovered ? 1.2 : 1
    meshRef.current.scale.lerp(new THREE.Vector3(scale, scale, scale), 0.1)
  })

  return (
    <mesh
      ref={meshRef}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
    >
      <torusKnotGeometry args={[1, 0.3, 128, 32]} />
      <meshStandardMaterial
        color={hovered ? '#a855f7' : '#7c3aed'}
        emissive={hovered ? '#a855f7' : '#7c3aed'}
        emissiveIntensity={0.8}
        metalness={0.8}
        roughness={0.2}
        wireframe
      />
    </mesh>
  )
}

// Floating crystal shapes
function FloatingCrystals() {
  const groupRef = useRef<THREE.Group>(null)
  const crystals = useMemo(() => {
    const arr = []
    for (let i = 0; i < 8; i++) {
      arr.push({
        position: [
          (Math.random() - 0.5) * 20,
          (Math.random() - 0.5) * 15,
          (Math.random() - 0.5) * 10 - 5
        ],
        rotation: [Math.random() * Math.PI, Math.random() * Math.PI, 0],
        scale: Math.random() * 0.5 + 0.3,
        speed: Math.random() * 0.5 + 0.2
      })
    }
    return arr
  }, [])

  useFrame((state) => {
    if (!groupRef.current) return
    const time = state.clock.getElapsedTime()
    groupRef.current.children.forEach((child, i) => {
      const crystal = crystals[i]
      child.rotation.y = crystal.rotation[1] + Math.sin(time * crystal.speed) * 0.5
      child.rotation.x = crystal.rotation[0] + Math.cos(time * crystal.speed * 0.7) * 0.3
    })
  })

  return (
    <group ref={groupRef}>
      {crystals.map((crystal, i) => (
        <mesh
          key={i}
          position={crystal.position as [number, number, number]}
          rotation={crystal.rotation as [number, number, number]}
          scale={crystal.scale}
        >
          <octahedronGeometry args={[1, 0]} />
          <meshPhysicalMaterial
            color="#a855f7"
            emissive="#7c3aed"
            emissiveIntensity={0.3}
            metalness={0.9}
            roughness={0.1}
            clearcoat={1}
            clearcoatRoughness={0.1}
            transmission={0.8}
            opacity={0.85}
            transparent
          />
        </mesh>
      ))}
    </group>
  )
}

// Particle wave
function ParticleWave() {
  const meshRef = useRef<THREE.Points>(null)
  const count = 2000
  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 40
      pos[i * 3 + 1] = (Math.random() - 0.5) * 20
      pos[i * 3 + 2] = (Math.random() - 0.5) * 40
    }
    return pos
  }, [])

  useFrame((state) => {
    if (!meshRef.current) return
    const time = state.clock.getElapsedTime()
    const positions = meshRef.current.geometry.attributes.position.array as Float32Array
    for (let i = 0; i < count; i++) {
      positions[i * 3 + 1] += Math.sin(time + positions[i * 3] * 0.1) * 0.01
      if (positions[i * 3 + 1] > 10) positions[i * 3 + 1] = -10
    }
    meshRef.current.geometry.attributes.position.needsUpdate = true
  })

  return (
    <points ref={meshRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.05}
        color="#7c3aed"
        transparent
        opacity={0.6}
        sizeAttenuation
      />
    </points>
  )
}

// Dynamic lighting system
function SceneLights() {
  return (
    <>
      <ambientLight intensity={0.3} />
      <pointLight position={[10, 10, 10]} color="#7c3aed" intensity={1.5} distance={30} />
      <pointLight position={[-10, -5, -10]} color="#a855f7" intensity={1} distance={25} />
      <spotLight
        position={[0, 15, 0]}
        angle={0.5}
        penumbra={1}
        color="#7c3aed"
        intensity={2}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <directionalLight position={[5, 5, 5]} color="#ffffff" intensity={0.5} />
    </>
  )
}

// Main scene content
function SceneContent() {
  return (
    <>
      <SceneLights />
      <FloatingParticles count={150} />
      <ParticleWave />
      <FloatingCrystals />
      <InteractiveTorusKnot />
      <Stars radius={50} depth={50} count={2000} factor={4} saturation={0} fade />
    </>
  )
}

// Camera controller
function CameraController() {
  const { camera, mouse } = useThree()
  
  useFrame(() => {
    camera.position.x += (mouse.x * 2 - camera.position.x) * 0.05
    camera.position.y += (-mouse.y * 2 - camera.position.y) * 0.05
    camera.lookAt(0, 0, 0)
  })
  
  return null
}

// Main 3D scene
export function ThreeSceneContent() {
  return (
    <Canvas
      shadows
      camera={{ position: [0, 0, 15], fov: 60 }}
      gl={{
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance',
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.2
      }}
    >
      <SceneContent />
      <CameraController />
      <fog attach="fog" args={['#0a0a0f', 10, 30]} />
    </Canvas>
  )
}