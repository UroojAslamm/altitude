import { Canvas, useFrame, useThree } from '@react-three/fiber';
import Lenis from 'lenis';
import { useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from 'react';
import * as THREE from 'three';
import { Logo } from '@/components/brand';
import { PaperCup, Shield, Studio } from './parts';
import { disable3d, isMobile } from './support';

const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const ease = (t: number) => t * t * (3 - 2 * t);
const span = (p: number, a: number, b: number) => ease(clamp((p - a) / (b - a)));

interface Stop { p: number; pos: [number, number, number]; look: [number, number, number] }
const PATH: Stop[] = [
  { p: 0, pos: [0, 2.4, 6.2], look: [0, 1.15, 0] },
  { p: 0.22, pos: [0, 3.1, 5.2], look: [0, 1.4, 0] },
  { p: 0.48, pos: [0, 13, 11], look: [0, 14.3, 0] },
  { p: 0.72, pos: [0, 14, 9.5], look: [0, 14.5, 0] },
  { p: 0.92, pos: [0, 25, 44], look: [0, 23, -6] },
  { p: 1, pos: [0, 33, 40], look: [0, 30, -6] },
];

function sample(p: number, pos: THREE.Vector3, look: THREE.Vector3) {
  let i = 0;
  while (i < PATH.length - 2 && p > PATH[i + 1]!.p) i++;
  const a = PATH[i]!;
  const b = PATH[i + 1]!;
  const t = ease(clamp((p - a.p) / (b.p - a.p)));
  pos.set(...a.pos).lerp(new THREE.Vector3(...b.pos), t);
  look.set(...a.look).lerp(new THREE.Vector3(...b.look), t);
}

const SKY = [new THREE.Color('#0B0908'), new THREE.Color('#14110F'), new THREE.Color('#5A3212'), new THREE.Color('#E9B878')];

function CameraRig({ progress }: { progress: RefObject<number> }) {
  const { camera, scene } = useThree();
  const pos = useMemo(() => new THREE.Vector3(), []);
  const look = useMemo(() => new THREE.Vector3(), []);
  const bg = useMemo(() => new THREE.Color(), []);
  const budget = useRef({ total: 0, frames: 0 });

  useFrame((_, delta) => {
    const p = progress.current ?? 0;
    sample(p, pos, look);
    camera.position.copy(pos);
    camera.lookAt(look);
    const s = p < 0.72 ? 0 : (p - 0.72) / 0.28;
    const seg = Math.min(2, Math.floor(s * 3));
    bg.copy(SKY[seg]!).lerp(SKY[seg + 1]!, s * 3 - seg);
    scene.background = bg;

    // Frame budget: 40 ms average for 3 s of rendered time falls back to 2D for the session.
    if (delta < 0.25) {
      const b = budget.current;
      b.total += delta;
      b.frames += 1;
      if (b.total > 3) {
        if (b.total / b.frames > 0.04) {
          disable3d();
          window.dispatchEvent(new Event('ascend-3d-slow'));
        }
        b.total = 0;
        b.frames = 0;
      }
    }
  });
  return null;
}

function OakSlab() {
  return (
    <mesh position={[0, -0.14, 0]} receiveShadow>
      <boxGeometry args={[7, 0.28, 4.4]} />
      <meshPhysicalMaterial color="#3B2717" roughness={0.5} clearcoat={0.35} clearcoatRoughness={0.4} envMapIntensity={0.5} />
    </mesh>
  );
}

function RingLight() {
  return (
    <group position={[0, 4.2, 0]} rotation={[Math.PI / 2, 0, 0]}>
      <mesh><torusGeometry args={[1.9, 0.09, 16, 96]} /><meshPhysicalMaterial color="#14110F" metalness={0.9} roughness={0.3} /></mesh>
      <mesh position={[0, 0, 0.06]}><torusGeometry args={[1.88, 0.045, 12, 96]} /><meshBasicMaterial color="#FFEFD0" toneMapped={false} /></mesh>
    </group>
  );
}

function Shafts() {
  const texture = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = 4;
    c.height = 256;
    const g = c.getContext('2d')!;
    const grad = g.createLinearGradient(0, 0, 0, 256);
    grad.addColorStop(0, 'rgba(255,225,170,.34)');
    grad.addColorStop(1, 'rgba(255,225,170,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 4, 256);
    return new THREE.CanvasTexture(c);
  }, []);
  return (
    <group position={[0, 2.2, -0.8]}>
      {[-1.4, 0, 1.4].map((x) => (
        <mesh key={x} position={[x, 0, 0]} rotation={[0, 0, x * -0.07]}>
          <planeGeometry args={[1, 4]} />
          <meshBasicMaterial map={texture} transparent depthWrite={false} blending={THREE.AdditiveBlending} />
        </mesh>
      ))}
    </group>
  );
}

function Mist() {
  const texture = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = 256;
    c.height = 256;
    const g = c.getContext('2d')!;
    const grad = g.createRadialGradient(128, 128, 10, 128, 128, 128);
    grad.addColorStop(0, 'rgba(255,214,160,.07)');
    grad.addColorStop(1, 'rgba(255,214,160,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 256, 256);
    return new THREE.CanvasTexture(c);
  }, []);
  return (
    <group>
      {[[-3, 5.5, -2, 12], [3, 7, -3, 14], [0, 8.5, -1, 11], [-2, 10, -4, 16]].map(([x, y, z, s]) => (
        <mesh key={`${x}${y}`} position={[x!, y!, z!]} scale={s!}>
          <planeGeometry />
          <meshBasicMaterial map={texture} transparent depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}

function ridgeHeight(x: number, z: number) {
  const n = Math.sin(x * 0.35) * 1.6 + Math.sin(x * 0.9 + z * 0.5) * 0.9 + Math.cos(z * 0.45 + x * 0.2) * 1.2;
  const peak = Math.exp(-((x * x) / 90 + ((z + 4) * (z + 4)) / 60)) * 14;
  return Math.max(0, peak + n * (peak / 14 + 0.25));
}

const FLAGS: Array<[number, number, string]> = [[-12, 6, '#C99A5B'], [-6, 0, '#AEB7CF'], [-2, -3, '#E9C46A'], [0, -4, '#FFD58A']];

function Range() {
  const mobile = isMobile();
  const { geometry, ridge } = useMemo(() => {
    const seg = mobile ? 48 : 80;
    const g = new THREE.PlaneGeometry(60, 40, seg, seg);
    g.rotateX(-Math.PI / 2);
    const pos = g.attributes.position!;
    for (let i = 0; i < pos.count; i++) pos.setY(i, ridgeHeight(pos.getX(i), pos.getZ(i)));
    const flat = g.toNonIndexed();
    flat.computeVertexNormals();
    const points: THREE.Vector3[] = [];
    for (let x = -24; x <= 24; x += 0.75) {
      const z = -4 + Math.sin(x * 0.3) * 2;
      points.push(new THREE.Vector3(x, ridgeHeight(x, z) + 0.05, z));
    }
    return { geometry: flat, ridge: new THREE.BufferGeometry().setFromPoints(points) };
  }, [mobile]);
  return (
    <group position={[0, 16, -6]}>
      <mesh geometry={geometry}>
        <meshPhysicalMaterial color="#1E1A17" metalness={0.2} roughness={0.46} clearcoat={0.4} clearcoatRoughness={0.4} envMapIntensity={0.45} flatShading />
      </mesh>
      <lineSegments geometry={ridge}><lineBasicMaterial color="#E9C46A" /></lineSegments>
      {FLAGS.map(([x, z, color]) => {
        const y = ridgeHeight(x, z);
        return (
          <group key={color} position={[x, y, z]}>
            <mesh position={[0, 0.8, 0]}><cylinderGeometry args={[0.035, 0.035, 1.6, 8]} /><meshPhysicalMaterial color="#E9C46A" metalness={1} roughness={0.2} /></mesh>
            <mesh position={[0, 1.65, 0]}><sphereGeometry args={[0.2, 16, 16]} /><meshBasicMaterial color={color} toneMapped={false} /></mesh>
          </group>
        );
      })}
    </group>
  );
}

function Scene({ progress }: { progress: RefObject<number> }) {
  return (
    <>
      <CameraRig progress={progress} />
      <Studio />
      <OakSlab />
      <PaperCup />
      <RingLight />
      <Shafts />
      <Mist />
      <Shield metal="peak" rim="#E9C46A" position={[0, 14, 0]} scale={1.5} />
      <pointLight position={[-2.4, 16, 3.4]} color="#FFD58A" intensity={14} distance={9} />
      <Range />
    </>
  );
}

const SECTIONS: Array<{ from: number; to: number; title: string; sub?: string }> = [
  { from: -0.1, to: 0.2, title: 'Elevate your experiences' },
  { from: 0.26, to: 0.46, title: 'Every order is a step up.' },
  { from: 0.5, to: 0.7, title: 'Earn meters. Climb tiers.' },
  { from: 0.74, to: 0.9, title: 'Base Camp. Ridge. Summit. Peak.' },
];

function Overlay({ p, features, cta }: { p: number; features: ReactNode; cta: ReactNode }) {
  const opacity = (from: number, to: number) => Math.min(span(p, from, from + 0.04), 1 - span(p, to - 0.04, to));
  return (
    <div className="pointer-events-none absolute inset-0 grid place-items-center p-6 text-center">
      {SECTIONS.map((s) => (
        <h1 key={s.title} aria-hidden={opacity(s.from, s.to) < 0.5} style={{ opacity: opacity(s.from, s.to) }}
          className="h1-gradient absolute left-1/2 top-[14%] w-[92%] max-w-4xl -translate-x-1/2 text-5xl md:text-7xl">
          {s.title}
        </h1>
      ))}
      <div className="absolute bottom-8 left-1/2 w-full -translate-x-1/2 px-6" style={{ opacity: 1 - span(p, 0.08, 0.14) }}>
        <div className="pointer-events-auto">{cta}</div>
      </div>
      <div className="absolute inset-x-0 top-1/2 mx-auto w-full max-w-5xl -translate-y-1/2 space-y-6 px-6"
        style={{ opacity: span(p, 0.93, 0.98), visibility: p > 0.92 ? 'visible' : 'hidden' }}>
        <h2 className="text-5xl text-ink-900 md:text-7xl">Start climbing</h2>
        <div className="pointer-events-auto [&_.glass]:!bg-ink-900/85">{features}</div>
        <div className="pointer-events-auto">{cta}</div>
      </div>
    </div>
  );
}

/** The Ascent: a 500vh page with a sticky canvas. The camera moves only with scroll. */
export default function Ascent({ features, cta }: { features: ReactNode; cta: ReactNode }) {
  const progress = useRef(0);
  const [p, setP] = useState(0);
  const [slow, setSlow] = useState(false);
  const invalidateRef = useRef<() => void>(() => undefined);

  useEffect(() => {
    const lenis = new Lenis({ lerp: 0.12 });
    let raf = 0;
    const loop = (t: number) => {
      lenis.raf(t);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      progress.current = clamp(window.scrollY / Math.max(max, 1));
      setP(progress.current);
      invalidateRef.current();
    };
    const onSlow = () => setSlow(true);
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('ascend-3d-slow', onSlow);
    onScroll();
    return () => {
      cancelAnimationFrame(raf);
      lenis.destroy();
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('ascend-3d-slow', onSlow);
    };
  }, []);

  if (slow) throw new Error('3D too slow on this device');

  return (
    <div style={{ height: '500vh' }} className="relative">
      <div className="sticky top-0 h-dvh overflow-hidden">
        <Canvas
          frameloop="demand"
          dpr={[1, 1.5]}
          camera={{ fov: 42, near: 0.1, far: 120, position: [0, 2.4, 6.2] }}
          onCreated={(state) => { invalidateRef.current = state.invalidate; state.invalidate(); }}
        >
          <Scene progress={progress} />
        </Canvas>
        <div className="pointer-events-none absolute left-1/2 top-5 -translate-x-1/2" style={{ opacity: 1 - span(p, 0.9, 0.95) }}><Logo size={64} /></div>
        <Overlay p={p} features={features} cta={cta} />
      </div>
    </div>
  );
}
