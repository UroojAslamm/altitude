import { OrbitControls } from '@react-three/drei';
import { Canvas, useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { OrderStatus } from '@/lib/types';
import { PaperCup, SoftShadow, Studio, useCupGeometry } from './parts';
import { isMobile } from './support';

interface Props { status: OrderStatus; accent: string; ahead: number; preparingAt?: string | null }

function targetLevel(status: OrderStatus, preparingAt?: string | null) {
  if (status === 'placed') return 0.1;
  if (status === 'preparing') {
    const elapsed = preparingAt ? (Date.now() - new Date(preparingAt).getTime()) / 1000 : 0;
    return 0.25 + 0.6 * Math.min(1, elapsed / 180);
  }
  return 1;
}

function Liquid({ level, accent }: { level: number; accent: string }) {
  const ref = useRef<THREE.Group>(null);
  const current = useRef(0.02);
  const geometry = useMemo(() => {
    const pts = [[0, 0.08], [0.66, 0.08], [0.88, 1.96], [0, 1.96]].map(([x, y]) => new THREE.Vector2(x!, y!));
    return new THREE.LatheGeometry(pts, 48);
  }, []);
  const clip = useMemo(() => new THREE.Plane(new THREE.Vector3(0, -1, 0), 0.1), []);

  // Runs only while easing to a new status; frames are on demand, so nothing loops.
  useFrame((state, delta) => {
    const gap = level - current.current;
    if (Math.abs(gap) < 0.002) return;
    current.current += gap * Math.min(1, delta * 4);
    clip.constant = 0.08 + current.current * 1.88 - 1.0;
    state.invalidate();
  });

  return (
    <group ref={ref}>
      <mesh geometry={geometry}>
        <meshPhysicalMaterial color={accent} roughness={0.12} clearcoat={1} clippingPlanes={[clip]} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

function GlassCup({ ready }: { ready: boolean }) {
  const geometry = useCupGeometry();
  return (
    <mesh geometry={geometry}>
      <meshPhysicalMaterial color="#FFF7E8" roughness={0.06} metalness={0} transparent opacity={0.22} clearcoat={1}
        emissive={ready ? '#FFD58A' : '#000000'} emissiveIntensity={ready ? 0.35 : 0} side={THREE.DoubleSide} depthWrite={false} />
    </mesh>
  );
}

/** Drag to rotate. Liquid height follows the order status. */
export default function CupTracker({ status, accent, ahead, preparingAt }: Props) {
  const visible = Math.min(ahead, 8);
  const mobile = isMobile();
  return (
    <div className="relative h-72 w-full max-w-md touch-pan-y" role="img" aria-label={`Cup, ${status}`}>
      <Canvas
        frameloop="demand" dpr={[1, 1.5]} camera={{ position: [0, 1.9, 5.4], fov: 38 }}
        gl={{ alpha: true, antialias: true, localClippingEnabled: true } as never}
        onCreated={({ gl }) => { gl.localClippingEnabled = true; }}
      >
        <Studio />
        <group position={[0, -0.2, 0]}>
          <group position={[0, -0.8, 0]}>
            <GlassCup ready={status === 'ready'} />
            <group position={[0, 1, 0]}><group position={[0, -1, 0]}><Liquid level={targetLevel(status, preparingAt)} accent={accent} /></group></group>
          </group>
          {Array.from({ length: visible }, (_, i) => (
            <PaperCup key={i} scale={0.3} position={[-1.8 + (i % 4) * 1.2, -0.8, -1.8 - Math.floor(i / 4) * 0.9]} />
          ))}
        </group>
        <SoftShadow y={-1} />
        {!mobile && <OrbitControls enablePan={false} enableZoom={false} minPolarAngle={1.1} maxPolarAngle={1.6} target={[0, 0.1, 0]} />}
        {mobile && <OrbitControls enablePan={false} enableZoom={false} enableRotate={false} target={[0, 0.1, 0]} />}
      </Canvas>
      {ahead > 8 && <span className="tabular absolute right-2 top-2 text-sm text-cream-300">+{ahead - 8}</span>}
    </div>
  );
}
