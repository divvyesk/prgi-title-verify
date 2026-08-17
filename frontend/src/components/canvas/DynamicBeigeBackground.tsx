import React, { useRef, useMemo, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface ParticleData {
  baseX: number;
  baseY: number;
  baseZ: number;
  vx: number;
  vy: number;
  vz: number;
  speed: number;
  color: THREE.Color;
}

function InteractiveConstellation() {
  const count = 140;
  const pointsRef = useRef<THREE.Points>(null);
  const linesRef = useRef<THREE.LineSegments>(null);
  const mouseLightRef = useRef<THREE.PointLight>(null);

  // Initialize particle states and base coordinates
  const { particles, positions, colors } = useMemo(() => {
    const pData: ParticleData[] = [];
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);

    const palette = [
      new THREE.Color('#D97706'), // Warm Gold / Amber
      new THREE.Color('#B45309'), // Deep Amber
      new THREE.Color('#CFC0A8'), // Sand beige
      new THREE.Color('#E2D7C5'), // Warm parchment
      new THREE.Color('#059669'), // Soft emerald dust
    ];

    for (let i = 0; i < count; i++) {
      const x = (Math.random() - 0.5) * 24;
      const y = (Math.random() - 0.5) * 18;
      const z = (Math.random() - 0.5) * 10;

      pos[i * 3] = x;
      pos[i * 3 + 1] = y;
      pos[i * 3 + 2] = z;

      const chosenColor = palette[Math.floor(Math.random() * palette.length)];
      col[i * 3] = chosenColor.r;
      col[i * 3 + 1] = chosenColor.g;
      col[i * 3 + 2] = chosenColor.b;

      pData.push({
        baseX: x,
        baseY: y,
        baseZ: z,
        vx: (Math.random() - 0.5) * 0.006,
        vy: (Math.random() - 0.5) * 0.006,
        vz: (Math.random() - 0.5) * 0.004,
        speed: 0.3 + Math.random() * 0.7,
        color: chosenColor
      });
    }

    return { particles: pData, positions: pos, colors: col };
  }, [count]);

  // Buffer for connecting proximity lines
  const maxLineConnections = 300;
  const linePositions = useMemo(() => new Float32Array(maxLineConnections * 6), [maxLineConnections]);

  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    // Normalized mouse coordinates (-1 to 1 in viewport converted to 3D space)
    const mouseX = state.pointer.x * 10;
    const mouseY = state.pointer.y * 7;

    // Smoothly interpolate mouse light to cursor position
    if (mouseLightRef.current) {
      mouseLightRef.current.position.x = THREE.MathUtils.lerp(mouseLightRef.current.position.x, mouseX, 0.08);
      mouseLightRef.current.position.y = THREE.MathUtils.lerp(mouseLightRef.current.position.y, mouseY, 0.08);
      mouseLightRef.current.position.z = 2.5;
    }

    if (pointsRef.current) {
      const positionAttr = pointsRef.current.geometry.attributes.position as THREE.BufferAttribute;
      const posArray = positionAttr.array as Float32Array;

      let lineIndex = 0;

      for (let i = 0; i < count; i++) {
        const p = particles[i];

        // Natural organic floating motion
        const floatX = Math.sin(time * 0.4 * p.speed + i) * 0.6;
        const floatY = Math.cos(time * 0.3 * p.speed + i * 1.5) * 0.6;

        let curX = p.baseX + floatX;
        let curY = p.baseY + floatY;
        let curZ = p.baseZ;

        // Dynamic mouse interactivity: magnetic repulsion & gentle vortex around cursor
        const dx = curX - mouseX;
        const dy = curY - mouseY;
        const distToMouse = Math.sqrt(dx * dx + dy * dy);

        if (distToMouse < 4.5) {
          const force = (1 - distToMouse / 4.5) * 1.8;
          curX += (dx / distToMouse) * force;
          curY += (dy / distToMouse) * force;
          curZ += Math.sin(time * 2 + i) * 0.4 * force;
        }

        posArray[i * 3] = curX;
        posArray[i * 3 + 1] = curY;
        posArray[i * 3 + 2] = curZ;

        // Connect nearby particles within mouse aura
        if (distToMouse < 5.0 && lineIndex < maxLineConnections) {
          for (let j = i + 1; j < count; j++) {
            const jx = posArray[j * 3];
            const jy = posArray[j * 3 + 1];
            const jz = posArray[j * 3 + 2];

            const pDist = Math.hypot(curX - jx, curY - jy, curZ - jz);
            if (pDist < 2.4 && lineIndex < maxLineConnections) {
              linePositions[lineIndex * 6] = curX;
              linePositions[lineIndex * 6 + 1] = curY;
              linePositions[lineIndex * 6 + 2] = curZ;
              linePositions[lineIndex * 6 + 3] = jx;
              linePositions[lineIndex * 6 + 4] = jy;
              linePositions[lineIndex * 6 + 5] = jz;
              lineIndex++;
            }
          }
        }
      }

      positionAttr.needsUpdate = true;

      // Update constellation line geometry
      if (linesRef.current) {
        const lineAttr = linesRef.current.geometry.attributes.position as THREE.BufferAttribute;
        lineAttr.needsUpdate = true;
        linesRef.current.geometry.setDrawRange(0, lineIndex * 2);
      }
    }
  });

  return (
    <>
      <pointLight ref={mouseLightRef} intensity={2.5} distance={10} color="#D97706" />

      {/* Floating Constellation Nodes */}
      <points ref={pointsRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" count={count} args={[positions, 3]} />
          <bufferAttribute attach="attributes-color" count={count} args={[colors, 3]} />
        </bufferGeometry>
        <pointsMaterial
          size={0.09}
          vertexColors
          transparent
          opacity={0.55}
          sizeAttenuation
        />
      </points>

      {/* Dynamic Connecting Laser Lines */}
      <lineSegments ref={linesRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={maxLineConnections * 2}
            args={[linePositions, 3]}
          />
        </bufferGeometry>
        <lineBasicMaterial
          color="#D97706"
          transparent
          opacity={0.22}
          blending={THREE.AdditiveBlending}
        />
      </lineSegments>
    </>
  );
}

export const DynamicBeigeBackground: React.FC = () => {
  const [mousePos, setMousePos] = useState({ x: 50, y: 50 });
  const [isHovering, setIsHovering] = useState(false);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth) * 100;
      const y = (e.clientY / window.innerHeight) * 100;
      setMousePos({ x, y });
      setIsHovering(true);
    };

    const handleMouseLeave = () => {
      setIsHovering(false);
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    document.body.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      document.body.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {/* Dynamic Cursor Spotlight Aura (Follows Mouse with Warm Radial Sheen) */}
      <div
        className="absolute w-[650px] h-[650px] rounded-full blur-3xl pointer-events-none transition-all duration-300 ease-out mix-blend-multiply"
        style={{
          left: `${mousePos.x}%`,
          top: `${mousePos.y}%`,
          transform: 'translate(-50%, -50%)',
          background: isHovering
            ? 'radial-gradient(circle, rgba(251, 191, 36, 0.18) 0%, rgba(217, 119, 6, 0.08) 40%, transparent 70%)'
            : 'radial-gradient(circle, rgba(251, 191, 36, 0.1) 0%, transparent 70%)',
        }}
      />

      {/* Ambient Parallax Orbs */}
      <div
        className="absolute w-[500px] h-[500px] bg-gradient-to-b from-amber-100/35 via-orange-50/15 to-transparent rounded-full blur-3xl pointer-events-none transition-transform duration-700 ease-out"
        style={{
          top: '5%',
          left: '15%',
          transform: `translate(${(mousePos.x - 50) * -0.15}px, ${(mousePos.y - 50) * -0.15}px)`,
        }}
      />
      <div
        className="absolute w-[550px] h-[550px] bg-gradient-to-tl from-emerald-100/25 via-stone-100/15 to-transparent rounded-full blur-3xl pointer-events-none transition-transform duration-700 ease-out"
        style={{
          bottom: '5%',
          right: '10%',
          transform: `translate(${(mousePos.x - 50) * 0.15}px, ${(mousePos.y - 50) * 0.15}px)`,
        }}
      />

      {/* Warm dot mesh grid overlay */}
      <div className="absolute inset-0 bg-warm-mesh opacity-50 pointer-events-none" />

      {/* Dynamic 3D Interactive Constellation Canvas */}
      <Canvas
        camera={{ position: [0, 0, 7], fov: 60 }}
        gl={{ alpha: true, antialias: true }}
        className="pointer-events-none"
      >
        <InteractiveConstellation />
      </Canvas>
    </div>
  );
};
