import { ContactShadows, Environment, Lightformer } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import { useEffect, useMemo, useState } from 'react';
import * as THREE from 'three';
import { isMobile } from './support';

/** Procedural studio: warm key from top left, cool navy rim, amber kicker. No HDR downloads. */
export function Studio({ intensity = 1 }: { intensity?: number }) {
  return (
    <>
      <ambientLight intensity={0.25} />
      <directionalLight position={[-4, 6, 4]} intensity={1.6 * intensity} color="#FFE3B8" />
      <Environment resolution={128} frames={1}>
        <color attach="background" args={['#0B0908']} />
        <Lightformer form="rect" intensity={5 * intensity} color="#FFD9A0" position={[-4, 5, 3]} scale={[6, 4, 1]} />
        <Lightformer form="rect" intensity={2.4 * intensity} color="#3A4BB0" position={[5, 1, -3]} scale={[3, 7, 1]} />
        <Lightformer form="ring" intensity={2.4 * intensity} color="#F5B14A" position={[0, -3, 3]} scale={3} />
        <Lightformer form="rect" intensity={1.2 * intensity} color="#FBF7EF" position={[0, 6, -2]} scale={[8, 1, 1]} />
      </Environment>
    </>
  );
}

const CUP_PROFILE: Array<[number, number]> = [
  [0, 0], [0.62, 0], [0.66, 0.03], [0.7, 0.2], [0.92, 2.0], [0.97, 2.05], [0.97, 2.14], [0.92, 2.16], [0.88, 2.12], [0.86, 2.0],
];

export function useCupGeometry() {
  return useMemo(() => {
    const points = CUP_PROFILE.map(([x, y]) => new THREE.Vector2(x, y));
    const g = new THREE.LatheGeometry(points, 64);
    // Lathe v follows point index. Remap it to height so art keeps its proportions.
    const pos = g.attributes.position!;
    const uv = g.attributes.uv!;
    for (let i = 0; i < pos.count; i++) uv.setY(i, pos.getY(i) / 2.16);
    return g;
  }, []);
}

/** Canvas texture for the cup wall: white paper with the navy wordmark and traced symbol. */
export function useCupTexture() {
  const invalidate = useThree((s) => s.invalidate);
  const [texture, setTexture] = useState<THREE.CanvasTexture | null>(null);
  useEffect(() => {
    let cancelled = false;
    const canvas = document.createElement('canvas');
    canvas.width = 2048;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d')!;
    const img = new Image();
    img.src = '/brand/logo-mark.svg';
    Promise.all([img.decode(), document.fonts.load('700 120px "Barlow Condensed"')]).then(() => {
      if (cancelled) return;
      ctx.fillStyle = '#FBFAF6';
      ctx.fillRect(0, 0, 2048, 1024);
      // Art sits at u = 0.5, the far side of the lathe. PaperCup turns it to face front.
      ctx.save();
      ctx.translate(1024, 470);
      ctx.fillStyle = '#2E3C93';
      ctx.font = '700 130px "Barlow Condensed", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('ALTITUDE', 0, -80);
      const w = 300;
      ctx.drawImage(img, -w / 2, -50, w, (w * img.height) / img.width);
      ctx.restore();
      const t = new THREE.CanvasTexture(canvas);
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = 4;
      setTexture(t);
      invalidate();
    }).catch(() => undefined);
    return () => { cancelled = true; };
  }, [invalidate]);
  return texture;
}

export function PaperCup(props: JSX.IntrinsicElements['group']) {
  const geometry = useCupGeometry();
  const texture = useCupTexture();
  return (
    <group {...props}>
      <mesh geometry={geometry} castShadow rotation={[0, Math.PI, 0]}>
        <meshPhysicalMaterial key={texture ? 'art' : 'plain'} map={texture} color={texture ? '#FFFFFF' : '#F4EFE6'} roughness={0.42} clearcoat={0.5} clearcoatRoughness={0.35} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 2.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.86, 48]} />
        <meshPhysicalMaterial color="#3A2212" roughness={0.18} clearcoat={1} />
      </mesh>
    </group>
  );
}

export function shieldShape() {
  const s = new THREE.Shape();
  s.moveTo(-1, 1.15);
  s.lineTo(1, 1.15);
  s.quadraticCurveTo(1.12, 1.15, 1.12, 1.02);
  s.lineTo(1.12, 0.05);
  s.bezierCurveTo(1.12, -0.7, 0.45, -1.1, 0, -1.4);
  s.bezierCurveTo(-0.45, -1.1, -1.12, -0.7, -1.12, 0.05);
  s.lineTo(-1.12, 1.02);
  s.quadraticCurveTo(-1.12, 1.15, -1, 1.15);
  return s;
}

export const METALS = {
  base_camp: { color: '#B9874A', metalness: 1, roughness: 0.32 },
  ridge: { color: '#AEB7CF', metalness: 1, roughness: 0.22 },
  summit: { color: '#E9C46A', metalness: 1, roughness: 0.16 },
  peak: { color: '#14110F', metalness: 0.9, roughness: 0.12 },
} as const;

export function Shield({ metal, rim = '#E9C46A', mark = true, ...props }: {
  metal: keyof typeof METALS; rim?: string; mark?: boolean;
} & JSX.IntrinsicElements['group']) {
  const body = useMemo(() => new THREE.ExtrudeGeometry(shieldShape(), { depth: 0.16, bevelEnabled: true, bevelSize: 0.05, bevelThickness: 0.05, bevelSegments: 3, curveSegments: 24 }), []);
  const edge = useMemo(() => {
    const g = new THREE.ExtrudeGeometry(shieldShape(), { depth: 0.1, bevelEnabled: true, bevelSize: 0.1, bevelThickness: 0.04, bevelSegments: 2, curveSegments: 24 });
    g.translate(0, 0, -0.03);
    return g;
  }, []);
  const invalidate = useThree((s) => s.invalidate);
  const [texture, setTexture] = useState<THREE.Texture | null>(null);
  useEffect(() => {
    if (!mark) return;
    new THREE.TextureLoader().load('/brand/logo-mark-cream.svg', (t) => {
      t.colorSpace = THREE.SRGBColorSpace;
      setTexture(t);
      invalidate();
    });
  }, [mark, invalidate]);
  const m = METALS[metal];
  return (
    <group {...props}>
      <mesh geometry={edge}><meshPhysicalMaterial color={rim} metalness={1} roughness={0.14} clearcoat={1} /></mesh>
      <mesh geometry={body}><meshPhysicalMaterial {...m} clearcoat={1} clearcoatRoughness={0.12} /></mesh>
      {texture && (
        <mesh position={[0, -0.02, 0.23]}>
          <planeGeometry args={[1.15, 0.98]} />
          <meshBasicMaterial map={texture} transparent toneMapped={false} />
        </mesh>
      )}
    </group>
  );
}

export function SoftShadow(props: { y?: number; scale?: number }) {
  if (isMobile()) return null;
  return <ContactShadows position={[0, props.y ?? 0, 0]} opacity={0.6} scale={props.scale ?? 6} blur={2.4} far={3} frames={1} />;
}
