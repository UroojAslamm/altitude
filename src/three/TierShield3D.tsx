import { OrbitControls } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { useMemo } from 'react';
import * as THREE from 'three';
import type { Tier } from '@/components/ui';
import { Shield, Studio } from './parts';

const SEGMENTS = 24;

function ProgressSegments({ fraction }: { fraction: number }) {
  const geometry = useMemo(() => new THREE.BoxGeometry(0.1, 0.26, 0.08), []);
  return (
    <group>
      {Array.from({ length: SEGMENTS }, (_, i) => {
        const a = Math.PI / 2 - (i / SEGMENTS) * Math.PI * 2;
        const on = i / SEGMENTS < fraction;
        return (
          <mesh key={i} geometry={geometry} position={[Math.cos(a) * 1.95, Math.sin(a) * 1.95, 0]} rotation={[0, 0, a - Math.PI / 2]}>
            <meshPhysicalMaterial color={on ? '#E9C46A' : '#2A2420'} metalness={1} roughness={0.2} emissive={on ? '#7A4F12' : '#000000'} emissiveIntensity={0.5} />
          </mesh>
        );
      })}
    </group>
  );
}

/** Metallic shield with a ring of segments. Drag to turn it. */
export default function TierShield3D({ tier, fraction }: { tier: Tier; fraction: number }) {
  return (
    <div className="h-32 w-32 shrink-0 touch-none" role="img" aria-label={`Tier shield, ${Math.round(fraction * 100)}% to next tier`}>
      <Canvas frameloop="demand" dpr={[1, 1.5]} camera={{ position: [0, 0, 6.4], fov: 40 }} gl={{ alpha: true, antialias: true }}>
        <Studio />
        <Shield metal={tier} rim={tier === 'peak' ? '#FFD58A' : '#F0D9A0'} />
        <ProgressSegments fraction={fraction} />
        <OrbitControls enablePan={false} enableZoom={false} minPolarAngle={Math.PI / 2 - 0.5} maxPolarAngle={Math.PI / 2 + 0.5} />
      </Canvas>
    </div>
  );
}
