"use client";

import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  type RefObject,
} from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";

type PointerRef = RefObject<{ x: number; y: number }>;

/** Small deterministic PRNG so the scene looks the same on every load. */
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function useDotTexture() {
  return useMemo(() => {
    const c = document.createElement("canvas");
    c.width = c.height = 64;
    const ctx = c.getContext("2d");
    if (ctx) {
      const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
      g.addColorStop(0, "rgba(255,255,255,1)");
      g.addColorStop(0.4, "rgba(255,255,255,0.55)");
      g.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 64, 64);
    }
    return new THREE.CanvasTexture(c);
  }, []);
}

/** One shared particle field: cyan on the left fading to emerald on the right. */
function ParticleField({ pointer }: { pointer: PointerRef }) {
  const group = useRef<THREE.Group>(null);
  const dot = useDotTexture();

  const geometry = useMemo(() => {
    const rand = mulberry32(7);
    const n = 1000;
    const pos = new Float32Array(n * 3);
    const col = new Float32Array(n * 3);
    const cyan = new THREE.Color("#0EA5E9");
    const green = new THREE.Color("#CC310E");
    const amber = new THREE.Color("#F59E0B");
    const c = new THREE.Color();
    for (let i = 0; i < n; i++) {
      const x = (rand() - 0.5) * 18;
      const y = (rand() - 0.5) * 10;
      const z = (rand() - 0.5) * 6 - 1;
      pos.set([x, y, z], i * 3);
      c.copy(cyan).lerp(green, THREE.MathUtils.clamp((x + 9) / 18, 0, 1));
      if (rand() > 0.94) c.copy(amber);
      col.set([c.r, c.g, c.b], i * 3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("color", new THREE.BufferAttribute(col, 3));
    return g;
  }, []);

  useFrame((state, delta) => {
    const g = group.current;
    if (!g) return;
    const k = 1 - Math.pow(0.001, delta);
    g.rotation.y += (pointer.current.x * 0.18 - g.rotation.y) * k;
    g.rotation.x += (-pointer.current.y * 0.1 - g.rotation.x) * k;
    g.position.y = Math.sin(state.clock.elapsedTime * 0.2) * 0.12;
  });

  return (
    <group ref={group}>
      <points geometry={geometry}>
        <pointsMaterial
          size={0.09}
          map={dot}
          vertexColors
          transparent
          opacity={0.85}
          depthWrite={false}
          alphaTest={0.01}
          sizeAttenuation
        />
      </points>
    </group>
  );
}

const ORBITS = [
  { rot: [Math.PI / 2.6, 0, 0], speed: 1.5, phase: 0 },
  { rot: [Math.PI / 2.6, 0, Math.PI / 3], speed: 1.15, phase: 2 },
  { rot: [Math.PI / 2.6, 0, -Math.PI / 3], speed: 0.9, phase: 4 },
] as const;
const ORBIT_RADIUS = 1.15;

/** Physics: a Bohr atom with three electron orbits. */
function BohrAtom({ pointer }: { pointer: PointerRef }) {
  const group = useRef<THREE.Group>(null);
  const electrons = useRef<(THREE.Mesh | null)[]>([]);

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    ORBITS.forEach((o, i) => {
      const e = electrons.current[i];
      if (!e) return;
      const a = t * o.speed + o.phase;
      e.position.set(Math.cos(a) * ORBIT_RADIUS, Math.sin(a) * ORBIT_RADIUS, 0);
    });
    const g = group.current;
    if (!g) return;
    const k = 1 - Math.pow(0.001, delta);
    g.rotation.y += (pointer.current.x * 0.5 + t * 0.15 - g.rotation.y) * k * 0.4;
    g.rotation.x += (-pointer.current.y * 0.3 - g.rotation.x) * k;
  });

  return (
    <group ref={group}>
      <mesh>
        <sphereGeometry args={[0.24, 24, 24]} />
        <meshBasicMaterial color="#0284C7" />
      </mesh>
      <mesh>
        <sphereGeometry args={[0.38, 24, 24]} />
        <meshBasicMaterial color="#0EA5E9" transparent opacity={0.16} />
      </mesh>
      {ORBITS.map((o, i) => (
        <group key={i} rotation={[o.rot[0], o.rot[1], o.rot[2]]}>
          <mesh>
            <torusGeometry args={[ORBIT_RADIUS, 0.008, 8, 96]} />
            <meshBasicMaterial color="#0EA5E9" transparent opacity={0.55} />
          </mesh>
          <mesh
            ref={(el) => {
              electrons.current[i] = el;
            }}
          >
            <sphereGeometry args={[0.075, 16, 16]} />
            <meshBasicMaterial color="#CC310E" />
          </mesh>
        </group>
      ))}
    </group>
  );
}

const N = 3;
const SPACING = 0.72;

/** Chemistry: a rotating ball-and-stick ionic lattice. */
function Lattice({ pointer }: { pointer: PointerRef }) {
  const group = useRef<THREE.Group>(null);
  const mesh = useRef<THREE.InstancedMesh>(null);

  const { nodes, bonds } = useMemo(() => {
    const nodes: { p: [number, number, number]; parity: number }[] = [];
    for (let i = 0; i < N; i++)
      for (let j = 0; j < N; j++)
        for (let k = 0; k < N; k++)
          nodes.push({
            p: [(i - 1) * SPACING, (j - 1) * SPACING, (k - 1) * SPACING],
            parity: (i + j + k) % 2,
          });
    const seg: number[] = [];
    const at = (i: number, j: number, k: number) => (i * N + j) * N + k;
    const link = (a: number, b: number) =>
      seg.push(...nodes[a].p, ...nodes[b].p);
    for (let i = 0; i < N; i++)
      for (let j = 0; j < N; j++)
        for (let k = 0; k < N; k++) {
          if (i + 1 < N) link(at(i, j, k), at(i + 1, j, k));
          if (j + 1 < N) link(at(i, j, k), at(i, j + 1, k));
          if (k + 1 < N) link(at(i, j, k), at(i, j, k + 1));
        }
    const bonds = new THREE.BufferGeometry();
    bonds.setAttribute(
      "position",
      new THREE.BufferAttribute(new Float32Array(seg), 3),
    );
    return { nodes, bonds };
  }, []);

  useLayoutEffect(() => {
    const m = mesh.current;
    if (!m) return;
    const mat = new THREE.Matrix4();
    const green = new THREE.Color("#CC310E");
    const amber = new THREE.Color("#F59E0B");
    nodes.forEach((n, i) => {
      mat.setPosition(n.p[0], n.p[1], n.p[2]);
      m.setMatrixAt(i, mat);
      m.setColorAt(i, n.parity ? amber : green);
    });
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [nodes]);

  useFrame((state, delta) => {
    const g = group.current;
    if (!g) return;
    const t = state.clock.elapsedTime;
    const k = 1 - Math.pow(0.001, delta);
    g.rotation.y = t * 0.35 + pointer.current.x * 0.4;
    g.rotation.x += (0.45 - pointer.current.y * 0.3 - g.rotation.x) * k;
  });

  return (
    <group ref={group}>
      <lineSegments geometry={bonds}>
        <lineBasicMaterial color="#E8795A" transparent opacity={0.55} />
      </lineSegments>
      <instancedMesh ref={mesh} args={[undefined, undefined, nodes.length]}>
        <sphereGeometry args={[0.15, 20, 20]} />
        <meshLambertMaterial />
      </instancedMesh>
    </group>
  );
}

/** Chemistry: gas bubbles rising around the lattice. */
function Bubbles() {
  const dot = useDotTexture();
  const { geometry, speeds } = useMemo(() => {
    const rand = mulberry32(21);
    const n = 36;
    const pos = new Float32Array(n * 3);
    const speeds = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      pos.set(
        [(rand() - 0.5) * 3.2, (rand() - 0.5) * 6, (rand() - 0.5) * 2],
        i * 3,
      );
      speeds[i] = 0.25 + rand() * 0.5;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    return { geometry, speeds };
  }, []);

  useFrame((_, delta) => {
    const attr = geometry.getAttribute("position") as THREE.BufferAttribute;
    for (let i = 0; i < speeds.length; i++) {
      let y = attr.getY(i) + speeds[i] * delta;
      if (y > 3) y = -3;
      attr.setY(i, y);
    }
    attr.needsUpdate = true;
  });

  return (
    <points geometry={geometry}>
      <pointsMaterial
        size={0.22}
        map={dot}
        color="#F2711C"
        transparent
        opacity={0.45}
        depthWrite={false}
        alphaTest={0.01}
        sizeAttenuation
      />
    </points>
  );
}

function Scene({ pointer }: { pointer: PointerRef }) {
  const viewportWidth = useThree((s) => s.viewport.width);
  const scale = Math.min(1.15, viewportWidth / 12);
  const offset = viewportWidth * 0.27;

  return (
    <>
      <ambientLight intensity={1.1} />
      <directionalLight position={[3, 4, 5]} intensity={1.6} />
      <ParticleField pointer={pointer} />
      <group position={[-offset, 0.25, 0]} scale={scale}>
        <BohrAtom pointer={pointer} />
      </group>
      <group position={[offset, 0.25, 0]} scale={scale}>
        <Lattice pointer={pointer} />
        <Bubbles />
      </group>
    </>
  );
}

export default function HeroCanvas({ active }: { active: boolean }) {
  const pointer = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      pointer.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.current.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  return (
    <Canvas
      camera={{ position: [0, 0, 8], fov: 50 }}
      dpr={[1, 1.5]}
      frameloop={active ? "always" : "never"}
      gl={{ antialias: false, alpha: true, powerPreference: "low-power" }}
    >
      <Scene pointer={pointer} />
    </Canvas>
  );
}
