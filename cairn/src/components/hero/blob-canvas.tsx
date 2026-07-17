"use client";

import {
  Suspense,
  useEffect,
  useRef,
  type ComponentRef,
  type MutableRefObject,
} from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, MeshDistortMaterial } from "@react-three/drei";
import { MathUtils, type Group, type Mesh } from "three";

function Blob({ distort }: { distort?: MutableRefObject<number> }) {
  const drift = useRef<Group>(null);
  const mesh = useRef<Mesh>(null);
  const material = useRef<ComponentRef<typeof MeshDistortMaterial>>(null);
  const pointer = useRef({ x: 0, y: 0 });

  // Window-level so the blob notices the cursor even over the headline
  // (the canvas sits behind the text and gets no pointer events there).
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      pointer.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.current.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener("pointermove", onMove);
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  useFrame((_, delta) => {
    if (mesh.current) {
      mesh.current.rotation.y += delta * 0.08;
    }
    if (material.current && distort) {
      material.current.distort = MathUtils.damp(
        material.current.distort,
        distort.current,
        6,
        delta,
      );
    }
    if (drift.current) {
      // ~3° of lean toward the cursor, heavily damped: noticing, not following.
      const max = MathUtils.degToRad(3);
      drift.current.rotation.y = MathUtils.damp(
        drift.current.rotation.y,
        pointer.current.x * max,
        1.5,
        delta,
      );
      drift.current.rotation.x = MathUtils.damp(
        drift.current.rotation.x,
        pointer.current.y * max,
        1.5,
        delta,
      );
    }
  });

  return (
    <group ref={drift}>
      <mesh ref={mesh}>
        <icosahedronGeometry args={[1.6, 64]} />
        <MeshDistortMaterial
          ref={material}
          color="#7FB6A0"
          distort={0.4}
          speed={1.5}
          roughness={0.15}
          metalness={0.1}
          // A light inside an opaque mesh can't reach its outer surface —
          // the warm emissive is what makes the glow-from-within readable.
          emissive="#E8B04B"
          emissiveIntensity={0.05}
          envMapIntensity={0.6}
        />
      </mesh>
      {/* Inside the mesh: the blob glows from within. */}
      <pointLight color="#E8B04B" position={[0, 0, 0]} intensity={8} distance={7} decay={2} />
    </group>
  );
}

export default function BlobCanvas({
  frameloop,
  onReady,
  distort,
}: {
  frameloop: "always" | "never";
  onReady: () => void;
  distort?: MutableRefObject<number>;
}) {
  return (
    <Canvas
      dpr={[1, 1.75]}
      gl={{ antialias: false, powerPreference: "high-performance" }}
      frameloop={frameloop}
      camera={{ position: [0, 0, 5], fov: 45 }}
      onCreated={onReady}
      className="pointer-events-none"
    >
      <ambientLight intensity={0.55} />
      <Blob distort={distort} />
      {/* Own Suspense: the night HDR comes from drei's CDN and must never
          block the blob's first frame. */}
      <Suspense fallback={null}>
        <Environment preset="night" />
      </Suspense>
    </Canvas>
  );
}
