'use client';

import { Component, type ReactNode } from 'react';

/**
 * Keeps the landing page alive if a 3D asset fails to load (e.g. the large
 * hero .glb is not checked into git, or the drei HDR CDN is unreachable).
 * Renders `fallback` instead of crashing the whole page.
 */
export class SceneErrorBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    console.warn('[OpenForge] 3D scene asset failed to load, showing fallback.', error);
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
