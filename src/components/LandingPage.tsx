'use client'

import { Suspense, useEffect, useMemo, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { motion, useScroll, useSpring, useTransform } from 'framer-motion'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import {
  ContactShadows,
  Environment,
  Float,
  OrbitControls,
  useGLTF,
} from '@react-three/drei'
import * as THREE from 'three'
import { ArrowRight, BarChart3, CircleGauge, ListChecks, Sparkles, Users } from 'lucide-react'
import { Instrument_Sans, Plus_Jakarta_Sans } from 'next/font/google'
import { SceneErrorBoundary } from './SceneErrorBoundary'

const instrument = Instrument_Sans({ subsets: ['latin'], variable: '--font-instrument' })
const jakarta = Plus_Jakarta_Sans({ subsets: ['latin'], variable: '--font-jakarta' })

const navItems = [
  { label: 'Explore Projects', href: '/explore' },
  { label: 'How It Works', href: '/#how-it-works' },
  { label: 'For Contributors', href: '/matches' },
  { label: 'For Creators', href: '/create' },
  { label: 'About', href: '/#about' },
]

const featureItems = [
  {
    icon: CircleGauge,
    title: 'Idea to Repo',
    desc: 'Turn a raw concept into a contributor-ready open source launch.',
  },
  {
    icon: Users,
    title: 'Right People',
    desc: 'Match with contributors around skills, intent, and project momentum.',
  },
  {
    icon: ListChecks,
    title: 'Clear Workflows',
    desc: 'Ship with structured tasks, visible ownership, and transparent progress.',
  },
  {
    icon: BarChart3,
    title: 'Measured Growth',
    desc: 'Track project traction, community signals, and contribution health.',
  },
]

const FORGE_MODEL_URL = '/assets/hero_object_3d.glb'
const HERO_BACKGROUND_URL = '/assets/background.png'

function useForgeAssetPreload() {
  useEffect(() => {
    const assetHints = [
      { href: FORGE_MODEL_URL, as: 'fetch', type: 'model/gltf-binary', crossOrigin: 'anonymous' },
      { href: HERO_BACKGROUND_URL, as: 'image', type: 'image/png' },
    ]

    const links = assetHints
      .filter((asset) => !document.querySelector(`link[rel="preload"][href="${asset.href}"]`))
      .map((asset) => {
        const link = document.createElement('link')
        link.rel = 'preload'
        link.href = asset.href
        link.as = asset.as
        link.type = asset.type
        if (asset.crossOrigin) link.crossOrigin = asset.crossOrigin
        document.head.appendChild(link)
        return link
      })

    useGLTF.preload(FORGE_MODEL_URL)

    return () => {
      links.forEach((link) => link.remove())
    }
  }, [])
}

function tunePbrMaterial(material: THREE.Material, maxAnisotropy: number) {
  const pbr = material as THREE.MeshStandardMaterial
  pbr.envMapIntensity = 2.35

  if ('metalness' in pbr) pbr.metalness = Math.max(pbr.metalness ?? 0.82, 0.9)
  if ('roughness' in pbr) pbr.roughness = THREE.MathUtils.clamp(pbr.roughness ?? 0.18, 0.12, 0.34)

  ;(['map', 'emissiveMap'] as const).forEach((slot) => {
    const texture = pbr[slot]
    if (!texture) return
    texture.colorSpace = THREE.SRGBColorSpace
    texture.anisotropy = maxAnisotropy
    texture.generateMipmaps = true
    texture.needsUpdate = true
  })

  ;(['normalMap', 'roughnessMap', 'metalnessMap', 'aoMap'] as const).forEach((slot) => {
    const texture = pbr[slot]
    if (!texture) return
    texture.anisotropy = maxAnisotropy
    texture.generateMipmaps = true
    texture.needsUpdate = true
  })

  material.needsUpdate = true
}

function ForgePlaceholder() {
  const material = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: '#05080c',
        metalness: 0.96,
        roughness: 0.2,
        clearcoat: 0.7,
        clearcoatRoughness: 0.22,
        emissive: '#ff6a1e',
        emissiveIntensity: 0.045,
        envMapIntensity: 2.1,
      }),
    []
  )
  const seamMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: '#f4b35f',
        transparent: true,
        opacity: 0.34,
        wireframe: true,
      }),
    []
  )

  return (
    <Float speed={1.15} rotationIntensity={0.18} floatIntensity={0.12}>
      <group scale={1.32} position={[0.58, -0.16, 0]} rotation={[-0.08, -0.54, 0.02]}>
        <mesh material={material} castShadow receiveShadow>
          <icosahedronGeometry args={[0.92, 2]} />
        </mesh>
        <mesh material={seamMaterial} scale={1.006}>
          <icosahedronGeometry args={[0.93, 2]} />
        </mesh>
        <mesh material={material} position={[0.02, -0.02, 0]} rotation={[0.4, 0.2, -0.12]} castShadow>
          <torusKnotGeometry args={[0.58, 0.035, 220, 18]} />
        </mesh>
      </group>
    </Float>
  )
}

function HeroModel() {
  const groupRef = useRef<THREE.Group>(null)
  const gltf = useGLTF(FORGE_MODEL_URL)
  const { gl } = useThree()
  const clone = useMemo(() => gltf.scene.clone(true), [gltf.scene])

  useEffect(() => {
    const maxAnisotropy = Math.min(gl.capabilities.getMaxAnisotropy(), 16)

    clone.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return

      child.castShadow = true
      child.receiveShadow = true
      child.frustumCulled = true
      child.geometry.computeBoundingSphere()
      child.geometry.computeBoundingBox()
      if (!child.geometry.attributes.normal) {
        child.geometry.computeVertexNormals()
      }

      if (Array.isArray(child.material)) {
        child.material = child.material.map((material) => material.clone())
      } else {
        child.material = child.material.clone()
      }

      const materials = Array.isArray(child.material) ? child.material : [child.material]
      materials.forEach((material) => {
        if (material instanceof THREE.MeshStandardMaterial || material instanceof THREE.MeshPhysicalMaterial) {
          tunePbrMaterial(material, maxAnisotropy)
        }
      })
    })
  }, [clone, gl])

  useFrame((state) => {
    if (!groupRef.current) return

    const t = state.clock.getElapsedTime()
    groupRef.current.rotation.y = -0.58 + Math.sin(t * 0.2) * 0.07
    groupRef.current.rotation.x = -0.06 + Math.sin(t * 0.3) * 0.025
    groupRef.current.position.y = -0.18 + Math.sin(t * 0.62) * 0.03
  })

  return (
    <group ref={groupRef} scale={1.68} position={[0.58, -0.18, 0]}>
      <primitive object={clone} />
    </group>
  )
}

function CameraRig() {
  const { camera, size } = useThree()
  const target = useMemo(() => new THREE.Vector3(), [])

  useEffect(() => {
    const isMobile = size.width < 768
    camera.position.set(isMobile ? 0.2 : 0.64, isMobile ? 0.2 : 0.34, isMobile ? 7.8 : 7.15)
    ;(camera as THREE.PerspectiveCamera).fov = isMobile ? 36 : 34
    ;(camera as THREE.PerspectiveCamera).near = 0.35
    ;(camera as THREE.PerspectiveCamera).far = 60
    target.set(isMobile ? 0.18 : 0.5, -0.12, 0)
    camera.lookAt(target)
    camera.updateProjectionMatrix()
  }, [camera, size.width, target])

  useFrame((state) => {
    const pointerX = state.pointer.x * 0.12
    const pointerY = state.pointer.y * 0.08
    camera.position.x = THREE.MathUtils.lerp(camera.position.x, 0.64 + pointerX, 0.035)
    camera.position.y = THREE.MathUtils.lerp(camera.position.y, 0.34 + pointerY, 0.035)
    camera.lookAt(0.5, -0.12, 0)
  })

  return null
}

function HeroScene() {
  return (
    <Canvas
      dpr={[1, 2]}
      shadows
      camera={{ position: [0.64, 0.34, 7.15], fov: 34, near: 0.35, far: 60 }}
      gl={{
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance',
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.18,
        outputColorSpace: THREE.SRGBColorSpace,
      }}
    >
      <CameraRig />
      <ambientLight intensity={0.14} color="#f4f8ff" />
      <hemisphereLight color="#fff4dc" groundColor="#120807" intensity={0.42} />
      <directionalLight
        position={[4.8, 5.2, 4.4]}
        intensity={3.1}
        color="#ffe3b6"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-bias={-0.00018}
      />
      <spotLight
        position={[-3.4, 3.2, 4.6]}
        intensity={42}
        angle={0.48}
        penumbra={0.85}
        color="#f97316"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />
      <spotLight position={[4.4, 2.8, -3.8]} intensity={22} angle={0.34} penumbra={0.9} color="#8fd8ff" />
      <pointLight position={[-3.8, -0.7, 2.4]} intensity={6.4} color="#ff8a2a" />
      <pointLight position={[3.2, 1.1, -2.8]} intensity={8.6} color="#ffd27a" />
      <SceneErrorBoundary fallback={<ForgePlaceholder />}>
        <Suspense fallback={<ForgePlaceholder />}>
          <HeroModel />
          <Environment preset="studio" environmentIntensity={1.35} background={false} />
        </Suspense>
      </SceneErrorBoundary>
      <ContactShadows
        position={[0.62, -1.92, 0]}
        opacity={0.58}
        scale={7.2}
        blur={2.3}
        far={5}
        resolution={1024}
        color="#030201"
      />
      <OrbitControls
        enablePan={false}
        enableZoom={false}
        autoRotate
        autoRotateSpeed={0.18}
        minPolarAngle={1.1}
        maxPolarAngle={1.82}
      />
    </Canvas>
  )
}

export function LandingPage() {
  useForgeAssetPreload()

  const { scrollYProgress } = useScroll()
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 24, mass: 0.25 })
  const heroY = useTransform(progress, [0, 1], ['0%', '-6%'])

  return (
    <main className={`of-root min-h-screen overflow-hidden text-white ${jakarta.variable} ${instrument.variable}`}>
      <motion.div
        className="fixed left-0 right-0 top-0 z-[80] h-[2px] origin-left bg-gradient-to-r from-[#f8c77a] via-[#e8792c] to-[#8b2e13]"
        style={{ scaleX: progress }}
      />

      <div className="fixed inset-0 -z-20">
        <Image
          src={HERO_BACKGROUND_URL}
          alt=""
          fill
          priority
          fetchPriority="high"
          sizes="100vw"
          className="of-bg-image object-cover"
        />
        <div className="absolute inset-0 of-bg-grade" />
      </div>

      <section className="relative min-h-screen px-5 py-5 sm:px-8 lg:px-12">
        <motion.header
          initial={{ opacity: 0, y: -18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
          className="of-nav mx-auto flex max-w-[1480px] items-center justify-between px-4 py-3.5 sm:px-5"
        >
          <Link href="/" className="flex items-center gap-3">
            <span className="of-mark" />
            <span className="font-instrument text-2xl font-semibold leading-none tracking-[-0.02em] sm:text-3xl">
              OpenForge
            </span>
          </Link>
          <nav className="hidden items-center gap-8 text-[14px] font-medium text-zinc-200/78 lg:flex">
            {navItems.map((item) => (
              <Link key={item.label} href={item.href} className="transition hover:text-[#f6b15f]">
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-2 sm:gap-3">
            <Link href="/dashboard" className="of-ghost hidden px-4 py-2.5 text-sm sm:inline-flex">
              Sign In
            </Link>
            <Link href="/create" className="of-cta px-4 py-2.5 text-sm font-semibold sm:px-5">
              Get Started
            </Link>
          </div>
        </motion.header>

        <div className="of-hero mx-auto grid min-h-[calc(100vh-84px)] max-w-[1480px] items-center gap-7 pb-16 pt-9 lg:grid-cols-[0.88fr_1.12fr] lg:pb-20 lg:pt-6">
          <motion.div
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.85, delay: 0.08 }}
            className="relative z-20 max-w-[680px] self-center"
            style={{ y: heroY }}
          >
            <p className="of-kicker inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold uppercase tracking-[0.18em]">
              <Sparkles className="h-4 w-4" />
              Build together. Ship together. Grow together.
            </p>
            <h1 className="mt-7 font-instrument text-[clamp(3.2rem,8vw,7.7rem)] font-semibold leading-[0.9] tracking-[-0.04em] text-white">
              Where Ideas Become Open and <span className="of-highlight">Impactful</span>
            </h1>
            <p className="mt-7 max-w-[560px] text-lg leading-8 text-zinc-200/84 sm:text-xl">
              OpenForge turns raw ideas into structured open source projects, finds the right collaborators, and
              helps teams build in public with momentum.
            </p>
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.75, delay: 0.22 }}
              className="mt-9 flex flex-wrap items-center gap-3"
            >
              <Link href="/create" className="of-cta group inline-flex items-center gap-2 px-6 py-3.5 text-base font-semibold sm:px-7">
                Start Building
                <ArrowRight className="h-5 w-5 transition group-hover:translate-x-1" />
              </Link>
              <Link href="/explore" className="of-ghost inline-flex px-6 py-3.5 text-base font-semibold sm:px-7">
                Explore Projects
              </Link>
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.05, delay: 0.16 }}
            className="of-object-wrap relative z-10 min-h-[380px] lg:min-h-[690px]"
          >
            <div className="pointer-events-none absolute inset-x-[6%] bottom-[12%] h-[18%] bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0.78),transparent_68%)] blur-xl" />
            <div className="absolute inset-0">
              <HeroScene />
            </div>
          </motion.div>
        </div>
      </section>

      <section id="how-it-works" className="scroll-mt-6 relative z-10 border-t border-white/[0.08] bg-[#050506]/82 px-5 py-12 backdrop-blur-sm sm:px-8 lg:px-12">
        <div className="mx-auto grid max-w-[1480px] gap-5 md:grid-cols-2 xl:grid-cols-4">
          {featureItems.map((item) => (
            <motion.article
              key={item.title}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.35 }}
              transition={{ duration: 0.55 }}
              className="of-feature"
            >
              <item.icon className="h-6 w-6 text-[#f5a14d]" />
              <h2 className="mt-5 font-instrument text-2xl font-semibold tracking-[-0.02em] text-zinc-50">
                {item.title}
              </h2>
              <p className="mt-3 text-sm leading-6 text-zinc-400">{item.desc}</p>
            </motion.article>
          ))}
        </div>
      </section>

      <section id="about" className="scroll-mt-6 relative z-10 bg-[#080706] px-5 py-16 sm:px-8 lg:px-12">
        <div className="mx-auto grid max-w-[1480px] gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#f4ad60]/75">Trusted Build Velocity</p>
            <h2 className="mt-4 max-w-[860px] font-instrument text-4xl font-semibold leading-tight tracking-[-0.03em] text-white md:text-6xl">
              Launch open-source products with the discipline of a serious team from day one.
            </h2>
          </div>
          <Link href="/create" className="of-cta inline-flex items-center justify-center gap-2 px-7 py-4 text-base font-semibold">
            Forge Your First Repo
            <ArrowRight className="h-5 w-5" />
          </Link>
        </div>
      </section>
    </main>
  )
}

useGLTF.preload(FORGE_MODEL_URL)
