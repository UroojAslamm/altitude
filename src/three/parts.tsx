import { ContactShadows, Environment, Lightformer } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import { forwardRef, useEffect, useMemo, useState } from 'react';
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

// The takeaway cup, modelled on the real Altitude double-wall cup: an outer sleeve that stops
// short of the base, a recessed inner cup under it, and a rolled lip.
const WALL_BOTTOM = 0.3;
const WALL_TOP = 2.1;
const lathe = (points: Array<[number, number]>, segments = 96) =>
  new THREE.LatheGeometry(points.map(([x, y]) => new THREE.Vector2(x, y)), segments);

function lipProfile() {
  const points: Array<[number, number]> = [[0.948, 2.09], [0.958, WALL_TOP]];
  for (let i = 0; i <= 12; i++) {
    const a = -Math.PI * 0.35 + (i / 12) * Math.PI * 1.35;
    points.push([0.948 + Math.cos(a) * 0.05, 2.125 + Math.sin(a) * 0.05]);
  }
  points.push([0.915, 2.1], [0.88, 1.9]);
  return points;
}

function useCupParts() {
  return useMemo(() => {
    const wall = lathe([[0.722, WALL_BOTTOM - 0.012], [0.74, WALL_BOTTOM], [0.958, WALL_TOP]]);
    const pos = wall.attributes.position!;
    const uv = wall.attributes.uv!;
    for (let i = 0; i < pos.count; i++) uv.setY(i, (pos.getY(i) - WALL_BOTTOM) / (WALL_TOP - WALL_BOTTOM));
    return {
      wall,
      base: lathe([[0, 0], [0.62, 0], [0.665, 0.012], [0.68, 0.04], [0.712, WALL_BOTTOM + 0.02]]),
      lip: lathe(lipProfile()),
    };
  }, []);
}

interface CupArt { map: THREE.CanvasTexture; bump: THREE.CanvasTexture; crema: THREE.CanvasTexture; shadow: THREE.CanvasTexture }

function paperGrain() {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 512;
  const g = c.getContext('2d')!;
  const image = g.createImageData(512, 512);
  for (let i = 0; i < image.data.length; i += 4) {
    const v = 118 + Math.random() * 20;
    image.data[i] = image.data[i + 1] = image.data[i + 2] = v;
    image.data[i + 3] = 255;
  }
  g.putImageData(image, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(5, 2);
  return t;
}

function cremaTexture() {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 512;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(256, 256, 20, 256, 256, 256);
  grad.addColorStop(0, '#7A4A25');
  grad.addColorStop(0.72, '#9A6534');
  grad.addColorStop(1, '#C49358');
  g.fillStyle = grad;
  g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 900; i++) {
    g.fillStyle = `rgba(232,196,146,${Math.random() * 0.1})`;
    g.beginPath();
    g.arc(Math.random() * 512, Math.random() * 512, 1 + Math.random() * 5, 0, Math.PI * 2);
    g.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function shadowTexture() {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(128, 128, 30, 128, 128, 128);
  grad.addColorStop(0, 'rgba(0,0,0,.72)');
  grad.addColorStop(0.55, 'rgba(0,0,0,.42)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 256, 256);
  return new THREE.CanvasTexture(c);
}

/** Printed wall: paper white, the arched wordmark and symbol at u = 0.5, the glue seam at u = 0. */
function drawWall(img: HTMLImageElement) {
  const W = 3072;
  const H = 1064;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#FCFBF8';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = 'rgba(70,58,44,.16)';
  ctx.fillRect(0, 0, 5, H);
  ctx.fillStyle = 'rgba(70,58,44,.06)';
  ctx.fillRect(5, 0, 26, H);

  // Letters sit on a shallow arc, as they do on the real cup.
  const word = 'ALTITUDE';
  const radius = 1500;
  ctx.fillStyle = '#2B3F91';
  ctx.font = '700 142px "Barlow Condensed", sans-serif';
  ctx.textAlign = 'center';
  const tracking = 11;
  const widths = [...word].map((ch) => ctx.measureText(ch).width + tracking);
  const total = widths.reduce((a, b) => a + b, 0);
  let x = -total / 2;
  [...word].forEach((ch, i) => {
    const a = (x + widths[i]! / 2) / radius;
    ctx.save();
    ctx.translate(W / 2 + Math.sin(a) * radius, 450 + radius - Math.cos(a) * radius);
    ctx.rotate(a);
    ctx.fillText(ch, 0, 0);
    ctx.restore();
    x += widths[i]!;
  });
  const w = 410;
  ctx.drawImage(img, W / 2 - w / 2, 492, w, (w * img.height) / img.width);

  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

// One shared copy: the tracker can show up to eight small cups in the queue.
let cupArt: Promise<CupArt> | null = null;
function loadCupArt() {
  cupArt ??= (async () => {
    const img = new Image();
    img.src = '/brand/logo-mark.svg';
    await Promise.all([img.decode(), document.fonts.load('700 142px "Barlow Condensed"')]);
    return { map: drawWall(img), bump: paperGrain(), crema: cremaTexture(), shadow: shadowTexture() };
  })();
  return cupArt;
}

function useCupArt() {
  const invalidate = useThree((s) => s.invalidate);
  const [art, setArt] = useState<CupArt | null>(null);
  useEffect(() => {
    let cancelled = false;
    loadCupArt().then((a) => {
      if (cancelled) return;
      setArt(a);
      invalidate();
    }).catch(() => undefined);
    return () => { cancelled = true; };
  }, [invalidate]);
  return art;
}

const PAPER = { roughness: 0.82, metalness: 0, envMapIntensity: 0.55, side: THREE.DoubleSide };

export const PaperCup = forwardRef<THREE.Group, JSX.IntrinsicElements['group']>(function PaperCup(props, ref) {
  const { wall, base, lip } = useCupParts();
  const art = useCupArt();
  return (
    <group ref={ref} {...props}>
      {art && (
        <mesh position={[0, 0.004, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[2.7, 2.7]} />
          <meshBasicMaterial map={art.shadow} transparent depthWrite={false} />
        </mesh>
      )}
      <group rotation={[0, Math.PI, 0]}>
        <mesh geometry={wall}>
          <meshStandardMaterial key={art ? 'art' : 'plain'} {...PAPER} map={art?.map ?? null} bumpMap={art?.bump ?? null} bumpScale={0.35} color={art ? '#FFFFFF' : '#F2EFE8'} />
        </mesh>
        <mesh geometry={base}><meshStandardMaterial {...PAPER} color="#E9E6DF" /></mesh>
        <mesh geometry={lip}><meshStandardMaterial {...PAPER} color="#FBFAF6" /></mesh>
      </group>
      <mesh position={[0, 1.95, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.89, 64]} />
        <meshStandardMaterial key={art ? 'crema' : 'plain'} map={art?.crema ?? null} color={art ? '#C9B8A4' : '#7A4A25'} roughness={0.62} envMapIntensity={0.2} />
      </mesh>
    </group>
  );
});

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
