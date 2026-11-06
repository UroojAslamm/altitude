import { Component, type ReactNode } from 'react';
import { env } from '@/lib/supabase';

let disabledForSession = false;

/** Called when frame times stay too slow. */
export function disable3d() {
  disabledForSession = true;
}

export function can3d() {
  if (!env.enable3d || disabledForSession) return false;
  if (typeof window === 'undefined') return false;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
  if ((navigator.hardwareConcurrency ?? 8) < 4) return false;
  try {
    return Boolean(document.createElement('canvas').getContext('webgl2'));
  } catch {
    return false;
  }
}

export const isMobile = () => window.matchMedia('(max-width: 1023px)').matches;

export class ThreeBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  override state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  override render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
