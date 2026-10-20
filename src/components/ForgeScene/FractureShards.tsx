import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useForgeStore } from '@/store/forgeStore'
import { CHAPTER_BREAKPOINTS, SCENE_COUNTS } from './config'

type ShardDatum = {
  seed: number
  start: THREE.Vector3
  burst: THREE.Vector3
  repo: THREE.Vector3
  node: THREE.Vector3
  stream: THREE.Vector3
  spin: THREE.Vector3
}

const tmp = new THREE.Object3D()

function featureBlend(progress: number) {
  const p = THREE.MathUtils.clamp((progress - CHAPTER_BREAKPOINTS.shatterEnd) / (1 - CHAPTER_BREAKPOINTS.shatterEnd), 0, 1)
  const repoW = THREE.MathUtils.smoothstep(p, 0, 0.3) * (1 - THREE.MathUtils.smoothstep(p, 0.36, 0.58))
  const nodeW = THREE.MathUtils.smoothstep(p, 0.44, 0.72) * (1 - THREE.MathUtils.smoothstep(p, 0.74, 0.9))
  const streamW = THREE.MathUtils.smoothstep(p, 0.8, 1.0)
  const total = Math.max(repoW + nodeW + streamW, 0.0001)
  return { repo: repoW / total, node: nodeW / total, stream: streamW / total }
}

export function FractureShards() {
  const meshRef = useRef<THREE.InstancedMesh>(null)
  const lineRef = useRef<THREE.LineSegments>(null)
  const progress = useForgeStore((state) => state.scrollProgress)
  const tier = useForgeStore((state) => state.performanceTier)
  const count = SCENE_COUNTS[tier].shards

  const data = useMemo<ShardDatum[]>(() => {
    return Array.from({ length: count }, (_, i) => {
      const seed = i / count
      const band = i % 3
      const col = i % 8
      const row = Math.floor(i / 8) % 8
      const start = new THREE.Vector3(
        (Math.random() - 0.5) * 2.3,
        (Math.random() - 0.5) * 1.5,
        (Math.random() - 0.5) * 1.2
      )
      const burst = new THREE.Vector3(
        (Math.random() - 0.5) * 4.8,
        Math.random() * 2.8 - 0.6,
        (Math.random() - 0.5) * 3.9
      )
      const repo = new THREE.Vector3((col - 3.5) * 0.44 - 2.9, (row - 3.5) * 0.24 + 0.1, band * 0.12)
      const theta = (seed * Math.PI * 2.6) + band * 0.6
      const radius = 1.2 + (row / 7) * 2.4
      const node = new THREE.Vector3(Math.cos(theta) * radius, (Math.sin(seed * 17) * 1.5), Math.sin(theta) * radius + 0.3)
      const stream = new THREE.Vector3(
        THREE.MathUtils.lerp(-1.8, 4.5, seed),
        Math.sin(seed * Math.PI * 7) * 0.8 + (band - 1) * 0.26,
        Math.cos(seed * Math.PI * 5) * 0.85
      )
      return {
        seed,
        start,
        burst,
        repo,
        node,
        stream,
        spin: new THREE.Vector3(Math.random() * 3, Math.random() * 3, Math.random() * 3),
      }
    })
  }, [count])

  const connections = useMemo(() => {
    const pairs: number[] = []
    for (let i = 0; i < count; i += 9) {
      pairs.push(i, (i + 9) % count)
      pairs.push(i, (i + 3) % count)
    }
    return pairs
  }, [count])

  const linePositions = useMemo(() => new Float32Array(connections.length * 3), [connections.length])

  useFrame((state) => {
    if (!meshRef.current) return
    const t = state.clock.getElapsedTime()
    const shatter = THREE.MathUtils.smoothstep(progress, CHAPTER_BREAKPOINTS.anvilEnd - 0.04, CHAPTER_BREAKPOINTS.shatterEnd)
    const burstEase = Math.sin(shatter * Math.PI) * 0.8
    const blend = featureBlend(progress)

    for (let i = 0; i < count; i++) {
      const item = data[i]
      const p = new THREE.Vector3()
        .copy(item.start)
        .lerp(item.burst, shatter)
        .lerp(item.repo, blend.repo)
        .lerp(item.node, blend.node)
        .lerp(item.stream, blend.stream)

      p.x += Math.sin(t * 0.45 + item.seed * 10) * 0.035 * burstEase
      p.y += Math.cos(t * 0.56 + item.seed * 13) * 0.04 * burstEase

      tmp.position.copy(p)
      tmp.rotation.set(
        item.spin.x * shatter * 0.62 + t * (0.04 + item.seed * 0.2),
        item.spin.y * shatter * 0.58 + t * (0.07 + item.seed * 0.22),
        item.spin.z * shatter * 0.5 + t * (0.03 + item.seed * 0.14)
      )
      const scale = THREE.MathUtils.lerp(0.001, 0.14 + (item.seed % 0.18), shatter < 0.04 ? shatter * 25 : 1)
      tmp.scale.setScalar(scale)
      tmp.updateMatrix()
      meshRef.current.setMatrixAt(i, tmp.matrix)
    }
    meshRef.current.instanceMatrix.needsUpdate = true

    if (lineRef.current) {
      for (let i = 0; i < connections.length; i++) {
        const idx = connections[i]
        const v = data[idx].node
        linePositions[i * 3] = v.x
        linePositions[i * 3 + 1] = v.y
        linePositions[i * 3 + 2] = v.z
      }
      lineRef.current.geometry.setAttribute('position', new THREE.BufferAttribute(linePositions, 3))
      const vis = THREE.MathUtils.smoothstep(progress, 0.76, 0.9) * (1 - THREE.MathUtils.smoothstep(progress, 0.96, 1))
      ;(lineRef.current.material as THREE.LineBasicMaterial).opacity = vis * 0.45
    }
  })

  return (
    <group>
      <instancedMesh ref={meshRef} args={[undefined, undefined, count]} castShadow receiveShadow>
        <dodecahedronGeometry args={[0.22, 0]} />
        <meshStandardMaterial
          color="#121922"
          metalness={0.94}
          roughness={0.2}
          emissive="#ff7b2a"
          emissiveIntensity={0.12}
        />
      </instancedMesh>
      <lineSegments ref={lineRef}>
        <bufferGeometry />
        <lineBasicMaterial color="#78d3ff" transparent opacity={0} />
      </lineSegments>
    </group>
  )
}
