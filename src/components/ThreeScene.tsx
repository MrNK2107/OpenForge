"use client";

import dynamic from 'next/dynamic'
import { Suspense } from 'react'

// Dynamically import the Three.js scene with SSR disabled
const ThreeSceneContent = dynamic(() => 
  import('./ThreeSceneContent').then(mod => mod.ThreeSceneContent), 
  { ssr: false }
)

// Main 3D scene wrapper
export function ThreeScene() {
  return (
    <div className="fixed inset-0 -z-10">
      <Suspense fallback={null}>
        <ThreeSceneContent />
      </Suspense>
    </div>
  )
}