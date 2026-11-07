import { Lightformer, RoundedBox } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type RefObject } from 'react';
import * as THREE from 'three';
import { isMobile } from './support';

// The espresso machine on the landing page. Everything here is procedural: no model or HDR downloads.
// The beans are a pure function of scroll, so nothing moves on its own.

/** Top of the drip tray, where the cup stands. */
export const TRAY_Y = 0.44;
export const CUP_SCALE = 0.9;
const SPOUT_Y = 3.14;
const BEANS_FROM = 0.03;
const BEANS_TO = 0.24;
const BEAN_FALL = 0.05;

/** One turn during the pour, ending with the logo facing the camera. */
export const cupAngle = (p: number) => (Math.min(p, 0.22) / 0.22) * Math.PI * 2;

function random(seed: number) {
  let s = seed;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A roasted bean: long oval, one flat face, and the S-shaped crease down that face. */
function beanGeometry() {
  const g = new THREE.SphereGeometry(1, 18, 12);
  const pos = g.attributes.position!;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const nx = x * 0.72;
    let nz = z * 0.62;
    if (z > 0) {
      nz *= 0.55;
      const crease = Math.exp(-((nx - 0.16 * Math.sin(y * 2.6)) ** 2) / 0.016);
      nz -= 0.24 * crease * (1 - y * y);
    }
    pos.setXYZ(i, nx * 0.13, y * 0.13, nz * 0.13);
  }
  g.computeVertexNormals();
  return g;
}

const ROAST = ['#2E190E', '#3A2112', '#472A17', '#54321C'].map((c) => new THREE.Color(c));

function BeanMaterial() {
  return <meshPhysicalMaterial color="#FFFFFF" roughness={0.44} clearcoat={0.4} clearcoatRoughness={0.45} envMapIntensity={0.7} />;
}

function canvasTexture(size: number, draw: (g: CanvasRenderingContext2D) => void, srgb = true) {
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  draw(c.getContext('2d')!);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

/** Fine streaks along one axis, the look of brushed steel. */
function brushedTexture() {
  const t = canvasTexture(512, (g) => {
    g.fillStyle = '#8A8A8A';
    g.fillRect(0, 0, 512, 512);
    const rand = random(7);
    for (let i = 0; i < 2600; i++) {
      const v = 95 + rand() * 90;
      g.fillStyle = `rgba(${v},${v},${v},.35)`;
      g.fillRect(rand() * 512 - 120, rand() * 512, 120 + rand() * 340, 1);
    }
  }, false);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

/** A packed layer of beans, for the bed in the cup and the mass in the hopper. */
function bedTexture() {
  const t = canvasTexture(512, (g) => {
    g.fillStyle = '#1B0F08';
    g.fillRect(0, 0, 512, 512);
    const rand = random(11);
    for (let i = 0; i < 620; i++) {
      const shade = ROAST[Math.floor(rand() * ROAST.length)]!;
      g.save();
      g.translate(rand() * 512, rand() * 512);
      g.rotate(rand() * Math.PI);
      g.fillStyle = `#${shade.getHexString()}`;
      g.beginPath();
      g.ellipse(0, 0, 17, 11, 0, 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = 'rgba(10,5,2,.85)';
      g.lineWidth = 2;
      g.beginPath();
      g.moveTo(-14, 0);
      g.quadraticCurveTo(0, 5, 14, 0);
      g.stroke();
      g.fillStyle = 'rgba(255,214,170,.1)';
      g.beginPath();
      g.ellipse(-4, -5, 7, 2.5, 0, 0, Math.PI * 2);
      g.fill();
      g.restore();
    }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

function gaugeTexture() {
  return canvasTexture(256, (g) => {
    g.fillStyle = '#F6F0E2';
    g.beginPath();
    g.arc(128, 128, 126, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = '#1C1612';
    for (let i = 0; i <= 12; i++) {
      const a = Math.PI * 0.75 + (i / 12) * Math.PI * 1.5;
      g.lineWidth = i % 3 === 0 ? 6 : 3;
      const inner = i % 3 === 0 ? 86 : 96;
      g.beginPath();
      g.moveTo(128 + Math.cos(a) * inner, 128 + Math.sin(a) * inner);
      g.lineTo(128 + Math.cos(a) * 112, 128 + Math.sin(a) * 112);
      g.stroke();
    }
    g.strokeStyle = '#B5302A';
    g.lineWidth = 9;
    g.beginPath();
    g.arc(128, 128, 112, Math.PI * 1.75, Math.PI * 2.25);
    g.stroke();
    const needle = Math.PI * 0.75 + 0.72 * Math.PI * 1.5;
    g.strokeStyle = '#1C1612';
    g.lineWidth = 6;
    g.beginPath();
    g.moveTo(128, 128);
    g.lineTo(128 + Math.cos(needle) * 94, 128 + Math.sin(needle) * 94);
    g.stroke();
    g.fillStyle = '#1C1612';
    g.beginPath();
    g.arc(128, 128, 12, 0, Math.PI * 2);
    g.fill();
    g.font = '700 30px "Barlow Condensed", sans-serif';
    g.textAlign = 'center';
    g.fillText('BAR', 128, 190);
  });
}

function useTextures() {
  return useMemo(() => {
    const brushed = brushedTexture();
    const bed = bedTexture();
    const gauge = gaugeTexture();
    return { brushed, bed, gauge };
  }, []);
}

const CHROME = { color: '#E4E6EA', metalness: 1, roughness: 0.13, envMapIntensity: 1.5 };
const BLACK = { color: '#0D0C0C', metalness: 0.2, roughness: 0.2, clearcoat: 1, clearcoatRoughness: 0.12, envMapIntensity: 0.9 };
const BRASS = { color: '#D8AE57', metalness: 1, roughness: 0.24, envMapIntensity: 1.3 };

function Steel({ map }: { map: THREE.Texture }) {
  return <meshPhysicalMaterial color="#DDE0E4" metalness={1} roughness={0.62} roughnessMap={map} bumpMap={map} bumpScale={0.05} envMapIntensity={2.1} />;
}

function Gauge({ x, map }: { x: number; map: THREE.Texture }) {
  return (
    <group position={[x, 4.42, 1.01]}>
      <mesh><torusGeometry args={[0.34, 0.05, 16, 48]} /><meshPhysicalMaterial {...CHROME} /></mesh>
      <mesh><circleGeometry args={[0.32, 48]} /><meshStandardMaterial map={map} roughness={0.5} /></mesh>
      <mesh position={[0, 0, 0.02]}><circleGeometry args={[0.32, 48]} /><meshPhysicalMaterial color="#FFFFFF" transparent opacity={0.08} roughness={0.05} /></mesh>
    </group>
  );
}

function Knob({ x }: { x: number }) {
  return (
    <group position={[x, 4.42, 1.01]} rotation={[Math.PI / 2, 0, 0]}>
      <mesh position={[0, 0.06, 0]}><cylinderGeometry args={[0.27, 0.3, 0.12, 40]} /><meshPhysicalMaterial {...BRASS} /></mesh>
      <mesh position={[0, 0.17, 0]}><cylinderGeometry args={[0.2, 0.25, 0.16, 12]} /><meshPhysicalMaterial {...BLACK} /></mesh>
      <mesh position={[0, 0.26, 0]}><cylinderGeometry args={[0.09, 0.09, 0.02, 24]} /><meshPhysicalMaterial {...BRASS} /></mesh>
    </group>
  );
}

function Brand() {
  const invalidate = useThree((s) => s.invalidate);
  const [logo, setLogo] = useState<{ map: THREE.Texture; aspect: number } | null>(null);
  useEffect(() => {
    new THREE.TextureLoader().load('/brand/logo-cream.svg', (t) => {
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = 8;
      const img = t.image as HTMLImageElement;
      setLogo({ map: t, aspect: img.width / img.height });
      invalidate();
    });
  }, [invalidate]);
  if (!logo) return null;
  const h = 0.86;
  return (
    <mesh position={[0, 4.42, 1.015]}>
      <planeGeometry args={[h * logo.aspect, h]} />
      <meshBasicMaterial map={logo.map} transparent toneMapped={false} />
    </mesh>
  );
}

function tube(points: Array<[number, number, number]>, radius: number) {
  const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)));
  return new THREE.TubeGeometry(curve, 48, radius, 14, false);
}

function Wands() {
  const steam = useMemo(() => tube([[2.2, 3.68, 0.3], [2.28, 3.25, 0.52], [2.42, 2.3, 0.72], [2.5, 1.5, 0.82]], 0.045), []);
  const water = useMemo(() => tube([[-2.2, 3.68, 0.35], [-2.2, 3.4, 0.5], [-2.2, 3.05, 0.62]], 0.075), []);
  return (
    <>
      <mesh geometry={steam}><meshPhysicalMaterial {...CHROME} /></mesh>
      <mesh position={[2.2, 3.68, 0.3]}><sphereGeometry args={[0.11, 24, 16]} /><meshPhysicalMaterial {...CHROME} /></mesh>
      <mesh position={[2.5, 1.46, 0.82]}><cylinderGeometry args={[0.055, 0.04, 0.14, 16]} /><meshPhysicalMaterial {...CHROME} /></mesh>
      <mesh geometry={water}><meshPhysicalMaterial {...CHROME} /></mesh>
      <mesh position={[-2.2, 3.68, 0.35]}><sphereGeometry args={[0.13, 24, 16]} /><meshPhysicalMaterial {...CHROME} /></mesh>
    </>
  );
}

/** The spout: a chrome group head, a brass collar, and a chute the beans drop from. */
function Spout() {
  return (
    <group>
      <mesh position={[0, 3.6, 0]}><cylinderGeometry args={[0.56, 0.6, 0.2, 48]} /><meshPhysicalMaterial {...CHROME} /></mesh>
      <mesh position={[0, 3.49, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.5, 0.045, 16, 64]} /><meshPhysicalMaterial {...BRASS} /></mesh>
      <mesh position={[0, 3.33, 0]}><cylinderGeometry args={[0.46, 0.28, 0.34, 48]} /><meshPhysicalMaterial {...CHROME} /></mesh>
      <mesh position={[0, 3.14, 0]}><cylinderGeometry args={[0.28, 0.27, 0.06, 48, 1, true]} /><meshPhysicalMaterial {...CHROME} side={THREE.DoubleSide} /></mesh>
      <mesh position={[0, 3.135, 0]} rotation={[Math.PI / 2, 0, 0]}><circleGeometry args={[0.27, 40]} /><meshBasicMaterial color="#050403" /></mesh>
    </group>
  );
}

function Grate({ map }: { map: THREE.Texture }) {
  const bars = useMemo(() => Array.from({ length: 25 }, (_, i) => -2.4 + i * 0.2), []);
  return (
    <>
      <mesh position={[0, 0.39, 0.1]}><boxGeometry args={[5.05, 0.02, 2.6]} /><meshStandardMaterial color="#080707" roughness={0.6} /></mesh>
      {bars.map((x) => (
        <mesh key={x} position={[x, 0.42, 0.1]}><boxGeometry args={[0.11, 0.04, 2.6]} /><Steel map={map} /></mesh>
      ))}
    </>
  );
}

function Hopper({ progress, bed }: { progress: RefObject<number>; bed: THREE.Texture }) {
  const geometry = useMemo(beanGeometry, []);
  const count = isMobile() ? 110 : 190;
  const ref = useRef<THREE.InstancedMesh>(null);
  const mass = useRef<THREE.Group>(null);
  const glass = useMemo(() => new THREE.LatheGeometry(
    [[0.58, 0], [0.62, 0.08], [0.9, 1.15], [0.94, 1.3]].map(([x, y]) => new THREE.Vector2(x, y)), 64,
  ), []);
  const heap = useMemo(() => {
    const g = new THREE.LatheGeometry([[0, 0.02], [0.54, 0.02], [0.78, 0.88], [0.5, 0.97], [0, 1.02]].map(([x, y]) => new THREE.Vector2(x, y)), 48);
    return g;
  }, []);
  const bedTop = useMemo(() => {
    const t = bed.clone();
    t.repeat.set(4, 2);
    t.needsUpdate = true;
    return t;
  }, [bed]);

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const rand = random(23);
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    const v = new THREE.Vector3();
    const s = new THREE.Vector3(1, 1, 1);
    // Sorted by height, so lowering the count lowers the level.
    const spots = Array.from({ length: count }, () => {
      const y = 0.1 + rand() * 0.95;
      const r = (0.56 + y * 0.28) * Math.sqrt(0.55 + rand() * 0.45);
      const a = rand() * Math.PI * 2;
      return { x: Math.cos(a) * r, y, z: Math.sin(a) * r };
    }).sort((a, b) => a.y - b.y);
    spots.forEach((p, i) => {
      e.set(rand() * 6.3, rand() * 6.3, rand() * 6.3);
      m.compose(v.set(p.x, p.y, p.z), q.setFromEuler(e), s);
      mesh.setMatrixAt(i, m);
      mesh.setColorAt(i, ROAST[Math.floor(rand() * ROAST.length)]!);
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [count]);

  useFrame(() => {
    const used = THREE.MathUtils.clamp(((progress.current ?? 0) - BEANS_FROM) / (BEANS_TO - BEANS_FROM), 0, 1);
    if (ref.current) ref.current.count = Math.ceil(count * (1 - 0.5 * used));
    if (mass.current) mass.current.scale.y = 1 - 0.5 * used;
  });

  return (
    <group position={[0, 5.3, -0.55]}>
      <mesh position={[0, -0.07, 0]}><cylinderGeometry args={[0.72, 0.78, 0.2, 48]} /><meshPhysicalMaterial {...CHROME} /></mesh>
      <group ref={mass}><mesh geometry={heap}><meshStandardMaterial map={bedTop} roughness={0.6} /></mesh></group>
      <instancedMesh ref={ref} args={[geometry, undefined, count]}><BeanMaterial /></instancedMesh>
      <mesh geometry={glass}>
        <meshPhysicalMaterial color="#F5F7FA" transparent opacity={0.16} roughness={0.04} metalness={0} clearcoat={1} envMapIntensity={2} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      <mesh position={[0, 1.34, 0]}><cylinderGeometry args={[0.98, 0.98, 0.09, 64]} /><meshPhysicalMaterial {...BLACK} /></mesh>
      <mesh position={[0, 1.43, 0]}><cylinderGeometry args={[0.1, 0.15, 0.12, 32]} /><meshPhysicalMaterial {...BRASS} /></mesh>
    </group>
  );
}

function Shadow() {
  const map = useMemo(() => canvasTexture(256, (g) => {
    const grad = g.createRadialGradient(128, 128, 30, 128, 128, 128);
    grad.addColorStop(0, 'rgba(0,0,0,.85)');
    grad.addColorStop(0.65, 'rgba(0,0,0,.6)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 256, 256);
  }, false), []);
  return (
    <mesh position={[0, 0.005, -0.5]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[8.2, 5.8]} />
      <meshBasicMaterial map={map} transparent depthWrite={false} />
    </mesh>
  );
}

export function CoffeeMachine({ progress }: { progress: RefObject<number> }) {
  const { brushed, bed, gauge } = useTextures();
  const sideGrain = useMemo(() => {
    const t = brushed.clone();
    t.repeat.set(1, 3);
    t.needsUpdate = true;
    return t;
  }, [brushed]);
  return (
    <group>
      <Shadow />
      {[[-2.5, 1.3], [2.5, 1.3], [-2.5, -2.3], [2.5, -2.3]].map(([x, z]) => (
        <mesh key={`${x}${z}`} position={[x!, 0.04, z!]}><cylinderGeometry args={[0.16, 0.19, 0.08, 24]} /><meshStandardMaterial color="#0A0908" roughness={0.7} /></mesh>
      ))}
      <RoundedBox args={[5.6, 0.32, 3.95]} radius={0.06} smoothness={4} position={[0, 0.24, -0.45]}><Steel map={sideGrain} /></RoundedBox>
      <Grate map={brushed} />
      <RoundedBox args={[5.6, 5.0, 1.45]} radius={0.1} smoothness={4} position={[0, 2.68, -2.0]}><Steel map={sideGrain} /></RoundedBox>
      <mesh position={[0, 2.05, -1.265]}><boxGeometry args={[5.0, 3.1, 0.02]} /><meshPhysicalMaterial color="#6E7176" metalness={1} roughness={0.55} roughnessMap={brushed} envMapIntensity={1.5} /></mesh>
      <RoundedBox args={[5.6, 1.45, 3.0]} radius={0.12} smoothness={4} position={[0, 4.42, -0.55]}><Steel map={brushed} /></RoundedBox>
      <RoundedBox args={[5.0, 1.0, 0.06]} radius={0.03} smoothness={3} position={[0, 4.42, 0.97]}><meshPhysicalMaterial {...BLACK} /></RoundedBox>
      <mesh position={[0, 3.72, 0.955]}><boxGeometry args={[5.6, 0.035, 0.02]} /><meshPhysicalMaterial {...BRASS} /></mesh>
      <Brand />
      <Gauge x={-1.85} map={gauge} />
      <Knob x={1.85} />
      <Spout />
      <Wands />
      <Hopper progress={progress} bed={bed} />
      <Beans progress={progress} bed={bed} />
    </group>
  );
}

/** Height of the bean bed inside the cup, in world units, as a fraction of the pour. */
const bedHeight = (f: number) => TRAY_Y + CUP_SCALE * (0.42 + 1.6 * Math.sqrt(f));

function Beans({ progress, bed }: { progress: RefObject<number>; bed: THREE.Texture }) {
  const geometry = useMemo(beanGeometry, []);
  const count = isMobile() ? 56 : 84;
  const ref = useRef<THREE.InstancedMesh>(null);
  const bedRef = useRef<THREE.Mesh>(null);
  const plan = useMemo(() => {
    const rand = random(5);
    return Array.from({ length: count }, (_, i) => {
      const f = (i + 1) / count;
      const start = BEANS_FROM + (BEANS_TO - BEAN_FALL - BEANS_FROM) * (i / count) + (rand() - 0.5) * 0.004;
      const a = rand() * Math.PI * 2;
      return {
        start, f, a, r: Math.sqrt(rand()), lift: rand() * 0.07,
        ox: (rand() - 0.5) * 0.3, oz: (rand() - 0.5) * 0.3,
        rot: new THREE.Euler(rand() * 6.3, rand() * 6.3, rand() * 6.3),
        spin: new THREE.Vector3(3 + rand() * 7, 3 + rand() * 7, 3 + rand() * 7),
      };
    });
  }, [count]);

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const rand = random(31);
    for (let i = 0; i < count; i++) mesh.setColorAt(i, ROAST[Math.floor(rand() * ROAST.length)]!);
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [count]);

  const m = useMemo(() => new THREE.Matrix4(), []);
  const q = useMemo(() => new THREE.Quaternion(), []);
  const e = useMemo(() => new THREE.Euler(), []);
  const v = useMemo(() => new THREE.Vector3(), []);
  const s = useMemo(() => new THREE.Vector3(), []);

  useFrame(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const p = progress.current ?? 0;
    plan.forEach((b, i) => {
      const t = (p - b.start) / BEAN_FALL;
      if (t <= 0) {
        mesh.setMatrixAt(i, m.compose(v.set(0, SPOUT_Y, 0), q.identity(), s.setScalar(0)));
        return;
      }
      // The pile is highest in the middle, under the spout.
      const ground = bedHeight(b.f) + b.lift + (1 - b.r * b.r) * 0.1;
      // Cup radius at the height the bean lands on.
      const radius = (0.5 + 0.24 * ((ground - TRAY_Y) / CUP_SCALE / 1.9)) * b.r;
      const tx = Math.cos(b.a) * radius;
      const tz = Math.sin(b.a) * radius;
      if (t < 1) {
        const fall = t * t;
        v.set(b.ox * 0.4 + (tx - b.ox * 0.4) * fall, SPOUT_Y + (ground - SPOUT_Y) * fall, b.oz * 0.4 + (tz - b.oz * 0.4) * fall);
        e.set(b.rot.x + b.spin.x * t, b.rot.y + b.spin.y * t, b.rot.z + b.spin.z * t);
      } else {
        // Settled beans turn with the cup. A small hop sells the landing.
        const turn = cupAngle(p) - cupAngle(b.start + BEAN_FALL);
        const c = Math.cos(turn);
        const n = Math.sin(turn);
        const hop = t < 1.4 ? Math.sin(((t - 1) / 0.4) * Math.PI) * 0.06 : 0;
        v.set(tx * c + tz * n, ground + hop, tz * c - tx * n);
        e.set(b.rot.x + b.spin.x, b.rot.y + b.spin.y + turn, b.rot.z + b.spin.z);
      }
      mesh.setMatrixAt(i, m.compose(v, q.setFromEuler(e), s.setScalar(1)));
    });
    mesh.instanceMatrix.needsUpdate = true;

    const bedMesh = bedRef.current;
    if (bedMesh) {
      const poured = THREE.MathUtils.clamp((p - BEANS_FROM - BEAN_FALL) / (BEANS_TO - BEANS_FROM - BEAN_FALL), 0, 1);
      const y = bedHeight(poured);
      bedMesh.position.y = y - 0.03;
      const r = 0.6 + 0.26 * ((y - TRAY_Y) / CUP_SCALE / 1.9);
      bedMesh.scale.setScalar(r * CUP_SCALE);
      bedMesh.rotation.z = cupAngle(p);
    }
  });

  return (
    <>
      <instancedMesh ref={ref} args={[geometry, undefined, count]} frustumCulled={false}><BeanMaterial /></instancedMesh>
      <mesh ref={bedRef} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[1, 48]} />
        <meshStandardMaterial map={bed} roughness={0.6} />
      </mesh>
    </>
  );
}

/** Tall soft boxes for the steel to reflect. Goes inside Studio. */
export function MachineLights() {
  return (
    <>
      <Lightformer form="rect" intensity={3.2} color="#FFF4E4" position={[-7, 3, 5]} rotation={[0, Math.PI / 3, 0]} scale={[2.5, 11, 1]} />
      <Lightformer form="rect" intensity={2.2} color="#F3F4FA" position={[7, 3, 5]} rotation={[0, -Math.PI / 3, 0]} scale={[2, 11, 1]} />
      <Lightformer form="rect" intensity={0.65} color="#FFEBD0" position={[0, -1, 10]} scale={[14, 15, 1]} />
      <Lightformer form="rect" intensity={1.6} color="#FFF4E4" position={[0, 9, 2]} rotation={[Math.PI / 2, 0, 0]} scale={[10, 6, 1]} />
    </>
  );
}
