import React, { useRef, useMemo, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

function AmbientWarmParticles() {
  const count = 100;
  const pointsRef = useRef<THREE.Points>(null);
  const mouseLightRef = useRef<THREE.PointLight>(null);

  const { positions, colors } = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);

    const palette = [
      new THREE.Color('#D97706'), // Warm Amber
      new THREE.Color('#B45309'), // Deep Amber
      new THREE.Color('#CFC0A8'), // Sand beige
      new THREE.Color('#E2D7C5'), // Warm parchment
      new THREE.Color('#10B981'), // Subtle emerald hint
    ];

    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 22;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 16;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 8;

      const chosen = palette[Math.floor(Math.random() * palette.length)];
      col[i * 3] = chosen.r;
      col[i * 3 + 1] = chosen.g;
      col[i * 3 + 2] = chosen.b;
    }

    return { positions: pos, colors: col };
  }, [count]);

  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    const mouseX = state.pointer.x * 8;
    const mouseY = state.pointer.y * 5;

    if (mouseLightRef.current) {
      mouseLightRef.current.position.x = THREE.MathUtils.lerp(mouseLightRef.current.position.x, mouseX, 0.08);
      mouseLightRef.current.position.y = THREE.MathUtils.lerp(mouseLightRef.current.position.y, mouseY, 0.08);
      mouseLightRef.current.position.z = 2.0;
    }

    if (pointsRef.current) {
      pointsRef.current.rotation.y = time * 0.02;
      pointsRef.current.rotation.x = Math.sin(time * 0.015) * 0.04;
    }
  });

  return (
    <>
      <pointLight ref={mouseLightRef} intensity={2.0} distance={10} color="#FBBF24" />
      <points ref={pointsRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" count={count} args={[positions, 3]} />
          <bufferAttribute attach="attributes-color" count={count} args={[colors, 3]} />
        </bufferGeometry>
        <pointsMaterial
          size={0.08}
          vertexColors
          transparent
          opacity={0.5}
          sizeAttenuation
        />
      </points>
    </>
  );
}

export const DynamicBeigeBackground: React.FC = () => {
  const [mousePos, setMousePos] = useState({ x: 50, y: 50 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth) * 100;
      const y = (e.clientY / window.innerHeight) * 100;
      setMousePos({ x, y });
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden bg-[#F8F6F0]">
      {/* Warm Radiant Beige Auras following Cursor */}
      <div 
        className="absolute w-[600px] h-[600px] rounded-full blur-3xl pointer-events-none transition-transform duration-700 ease-out mix-blend-multiply"
        style={{
          left: `${mousePos.x}%`,
          top: `${mousePos.y}%`,
          transform: 'translate(-50%, -50%)',
          background: 'radial-gradient(circle, rgba(251, 191, 36, 0.18) 0%, rgba(217, 119, 6, 0.06) 45%, transparent 70%)',
        }}
      />

      {/* Ambient Parallax Orbs */}
      <div
        className="absolute w-[500px] h-[500px] bg-gradient-to-b from-amber-100/40 via-orange-50/20 to-transparent rounded-full blur-3xl pointer-events-none transition-transform duration-700 ease-out"
        style={{
          top: '5%',
          left: '15%',
          transform: `translate(${(mousePos.x - 50) * -0.12}px, ${(mousePos.y - 50) * -0.12}px)`,
        }}
      />
      <div
        className="absolute w-[550px] h-[550px] bg-gradient-to-tl from-emerald-100/30 via-stone-100/20 to-transparent rounded-full blur-3xl pointer-events-none transition-transform duration-700 ease-out"
        style={{
          bottom: '5%',
          right: '10%',
          transform: `translate(${(mousePos.x - 50) * 0.12}px, ${(mousePos.y - 50) * 0.12}px)`,
        }}
      />

      {/* Warm dot mesh grid overlay */}
      <div className="absolute inset-0 bg-warm-mesh opacity-60 pointer-events-none" />

      {/* 3D Constellation Canvas */}
      <Canvas
        camera={{ position: [0, 0, 7], fov: 60 }}
        gl={{ alpha: true, antialias: true }}
        className="pointer-events-none"
      >
        <AmbientWarmParticles />
      </Canvas>
    </div>
  );
};
