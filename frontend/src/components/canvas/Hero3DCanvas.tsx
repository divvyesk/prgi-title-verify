import React, { useRef, useMemo, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Text, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

interface SceneProps {
  title?: string;
  verdict?: 'APPROVED' | 'MANUAL_REVIEW' | 'REJECTED' | null;
  isScanning?: boolean;
}

// Helper to create organic neon butterfly wing closed tube curve (matching reference image)
function createButterflyWingCurve(isRightWing = false, scale = 1): THREE.CatmullRomCurve3 {
  const dir = isRightWing ? 1 : -1;
  const points = [
    new THREE.Vector3(0.02 * dir * scale, 0.05 * scale, 0),
    // Upper large wing loop
    new THREE.Vector3(0.25 * dir * scale, 0.45 * scale, 0.02 * scale),
    new THREE.Vector3(0.55 * dir * scale, 0.85 * scale, 0.04 * scale),
    new THREE.Vector3(0.72 * dir * scale, 0.65 * scale, 0.03 * scale),
    new THREE.Vector3(0.42 * dir * scale, 0.32 * scale, 0.01 * scale),
    new THREE.Vector3(0.18 * dir * scale, 0.08 * scale, 0.005 * scale),
    // Lower secondary wing loop
    new THREE.Vector3(0.48 * dir * scale, -0.15 * scale, 0.02 * scale),
    new THREE.Vector3(0.58 * dir * scale, -0.48 * scale, 0.03 * scale),
    new THREE.Vector3(0.32 * dir * scale, -0.62 * scale, 0.02 * scale),
    new THREE.Vector3(0.12 * dir * scale, -0.28 * scale, 0.01 * scale),
    new THREE.Vector3(0.02 * dir * scale, -0.05 * scale, 0),
  ];
  return new THREE.CatmullRomCurve3(points, true);
}

// 3D Neon Butterfly Component (Matching Hot Pink / Cyan Neon Flex reference)
function NeonButterfly({
  position,
  rotation = [0, 0, 0],
  scale = 1,
  color = '#FF1493',
  glowColor = '#FF2E93',
  wingAngleOffset = 0,
  flutterSpeed = 2.5
}: {
  position: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
  color?: string;
  glowColor?: string;
  wingAngleOffset?: number;
  flutterSpeed?: number;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const leftWingRef = useRef<THREE.Group>(null);
  const rightWingRef = useRef<THREE.Group>(null);

  const leftCurve = useMemo(() => createButterflyWingCurve(false, scale), [scale]);
  const rightCurve = useMemo(() => createButterflyWingCurve(true, scale), [scale]);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (leftWingRef.current && rightWingRef.current) {
      // Gentle subtle breathing flutter
      const flutter = Math.sin(t * flutterSpeed + wingAngleOffset) * 0.12;
      leftWingRef.current.rotation.y = flutter;
      rightWingRef.current.rotation.y = -flutter;
    }
    if (groupRef.current) {
      // Subtle hovering bob
      groupRef.current.position.y = position[1] + Math.sin(t * 1.5 + wingAngleOffset) * 0.04;
    }
  });

  return (
    <group ref={groupRef} position={position} rotation={rotation}>
      {/* Acrylic Backing for Butterfly */}
      <mesh position={[0, 0, -0.03]}>
        <planeGeometry args={[1.6 * scale, 1.6 * scale]} />
        <meshPhysicalMaterial
          color="#1C1917"
          transparent
          opacity={0.08}
          roughness={0.15}
          transmission={0.8}
        />
      </mesh>

      {/* Center Body Tube */}
      <mesh position={[0, 0, 0.01]}>
        <capsuleGeometry args={[0.02 * scale, 0.45 * scale, 8, 16]} />
        <meshStandardMaterial
          color="#FFFFFF"
          emissive={color}
          emissiveIntensity={3.0}
          roughness={0.1}
        />
      </mesh>

      {/* Left Wing Neon Loop */}
      <group ref={leftWingRef}>
        {/* Outer Vibrant Neon Glow Tube */}
        <mesh>
          <tubeGeometry args={[leftCurve, 64, 0.032 * scale, 12, true]} />
          <meshStandardMaterial
            color={color}
            emissive={glowColor}
            emissiveIntensity={3.8}
            roughness={0.15}
            transparent
            opacity={0.96}
          />
        </mesh>
        {/* Inner White Gas Core Tube */}
        <mesh position={[0, 0, 0.008]}>
          <tubeGeometry args={[leftCurve, 64, 0.014 * scale, 8, true]} />
          <meshBasicMaterial color="#FFFFFF" />
        </mesh>
      </group>

      {/* Right Wing Neon Loop */}
      <group ref={rightWingRef}>
        {/* Outer Vibrant Neon Glow Tube */}
        <mesh>
          <tubeGeometry args={[rightCurve, 64, 0.032 * scale, 12, true]} />
          <meshStandardMaterial
            color={color}
            emissive={glowColor}
            emissiveIntensity={3.8}
            roughness={0.15}
            transparent
            opacity={0.96}
          />
        </mesh>
        {/* Inner White Gas Core Tube */}
        <mesh position={[0, 0, 0.008]}>
          <tubeGeometry args={[rightCurve, 64, 0.014 * scale, 8, true]} />
          <meshBasicMaterial color="#FFFFFF" />
        </mesh>
      </group>

      {/* Butterfly Local Point Glow */}
      <pointLight color={glowColor} intensity={1.8} distance={1.8} />
    </group>
  );
}

// 3D Neon Text Title Component (Vibrant LED flex tube sign style)
function NeonTitleSign({
  title,
  verdict,
  isScanning
}: {
  title: string;
  verdict?: 'APPROVED' | 'MANUAL_REVIEW' | 'REJECTED' | null;
  isScanning?: boolean;
}) {
  const signRef = useRef<THREE.Group>(null);

  const { neonColor, glowColor, ambientGlow } = useMemo(() => {
    if (verdict === 'APPROVED') {
      return { neonColor: '#00FF88', glowColor: '#05DF72', ambientGlow: '#00FF88' };
    }
    if (verdict === 'REJECTED') {
      return { neonColor: '#FF0055', glowColor: '#FF2E7E', ambientGlow: '#FF0055' };
    }
    if (verdict === 'MANUAL_REVIEW') {
      return { neonColor: '#FFB800', glowColor: '#FFD043', ambientGlow: '#FFB800' };
    }
    // Default Iconic Hot Pink / Cyan Multi-neon vibe
    return { neonColor: '#FF1493', glowColor: '#FF007F', ambientGlow: '#FF1493' };
  }, [verdict]);

  // Clean words for 2-line layout if title is long
  const words = (title || 'Times India').toUpperCase().trim().split(' ');
  let line1 = words.slice(0, Math.ceil(words.length / 2)).join(' ');
  let line2 = words.slice(Math.ceil(words.length / 2)).join(' ');
  if (words.length <= 1) {
    line1 = words[0];
    line2 = '';
  }

  const fontSize = words.length > 3 ? 0.38 : 0.48;

  return (
    <group ref={signRef}>
      {/* 1. Clear Transparent Acrylic Backing Plate (Matching Reference Image 1 & 2) */}
      <mesh position={[0, 0, -0.06]}>
        <planeGeometry args={[4.4, 2.6]} />
        <meshPhysicalMaterial
          color="#FAF7F0"
          transparent
          opacity={0.25}
          roughness={0.08}
          transmission={0.92}
          thickness={0.25}
          ior={1.48}
          reflectivity={0.6}
        />
      </mesh>

      {/* Chrome Mounting Standoff Screws */}
      {[
        [-1.9, 0.95, -0.04],
        [1.9, 0.95, -0.04],
        [-1.9, -0.95, -0.04],
        [1.9, -0.95, -0.04],
      ].map((pos, i) => (
        <mesh key={`screw-${i}`} position={pos as [number, number, number]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.04, 0.04, 0.05, 16]} />
          <meshStandardMaterial color="#B0A89C" metalness={0.9} roughness={0.2} />
        </mesh>
      ))}

      {/* 2. Outer Neon Tube Border / Frame */}
      <mesh position={[0, 0, -0.01]}>
        <torusGeometry args={[1.95, 0.024, 16, 64]} />
        <meshStandardMaterial
          color="#00F0FF"
          emissive="#00D2FF"
          emissiveIntensity={3.2}
          roughness={0.1}
          transparent
          opacity={0.95}
        />
      </mesh>

      {/* Inner White Tube for Border */}
      <mesh position={[0, 0, 0.005]}>
        <torusGeometry args={[1.95, 0.01, 12, 64]} />
        <meshBasicMaterial color="#FFFFFF" />
      </mesh>

      {/* 3. Main Neon Title Text (Line 1) */}
      <group position={[0, line2 ? 0.22 : 0, 0.02]}>
        {/* Deep Color Glow Outline */}
        <Text
          fontSize={fontSize}
          maxWidth={3.6}
          textAlign="center"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.045}
          outlineColor={neonColor}
          letterSpacing={0.06}
          font="https://fonts.gstatic.com/s/syne/v22/8vIS7w4qzmVxsWxjBCHSnVk.woff"
        >
          {line1}
          <meshStandardMaterial
            color={neonColor}
            emissive={glowColor}
            emissiveIntensity={4.2}
            roughness={0.1}
          />
        </Text>

        {/* White Hot Center Tube Core */}
        <Text
          position={[0, 0, 0.018]}
          fontSize={fontSize}
          maxWidth={3.6}
          textAlign="center"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.012}
          outlineColor="#FFFFFF"
          letterSpacing={0.06}
          font="https://fonts.gstatic.com/s/syne/v22/8vIS7w4qzmVxsWxjBCHSnVk.woff"
        >
          {line1}
          <meshBasicMaterial color="#FFFFFF" />
        </Text>
      </group>

      {/* 4. Main Neon Title Text (Line 2 if exists) */}
      {line2 && (
        <group position={[0, -0.28, 0.02]}>
          {/* Deep Color Glow Outline */}
          <Text
            fontSize={fontSize * 0.95}
            maxWidth={3.6}
            textAlign="center"
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.045}
            outlineColor="#00F0FF"
            letterSpacing={0.06}
            font="https://fonts.gstatic.com/s/syne/v22/8vIS7w4qzmVxsWxjBCHSnVk.woff"
          >
            {line2}
            <meshStandardMaterial
              color="#00F0FF"
              emissive="#00D2FF"
              emissiveIntensity={4.2}
              roughness={0.1}
            />
          </Text>

          {/* White Hot Center Tube Core */}
          <Text
            position={[0, 0, 0.018]}
            fontSize={fontSize * 0.95}
            maxWidth={3.6}
            textAlign="center"
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.012}
            outlineColor="#FFFFFF"
            letterSpacing={0.06}
            font="https://fonts.gstatic.com/s/syne/v22/8vIS7w4qzmVxsWxjBCHSnVk.woff"
          >
            {line2}
            <meshBasicMaterial color="#FFFFFF" />
          </Text>
        </group>
      )}

      {/* 5. Subtitle Neon Tag (PRGI Statutory Clearance) */}
      <Text
        position={[0, -0.74, 0.02]}
        fontSize={0.12}
        letterSpacing={0.14}
        textAlign="center"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.015}
        outlineColor={neonColor}
      >
        [ PRGI STATUTORY CLEARANCE SPECIMEN ]
        <meshStandardMaterial
          color="#FFFDF7"
          emissive={neonColor}
          emissiveIntensity={2.0}
        />
      </Text>

      {/* Neon Backlight Illuminators */}
      <pointLight position={[0, 0, 0.4]} color={ambientGlow} intensity={3.5} distance={4.5} />
      <pointLight position={[0, 0, -0.2]} color={glowColor} intensity={2.0} distance={3.0} />

      {/* Laser Scanning Line during verification */}
      {isScanning && (
        <group position={[0, 0, 0.12]}>
          <mesh>
            <planeGeometry args={[4.0, 0.04]} />
            <meshBasicMaterial color="#00F0FF" transparent opacity={0.9} />
          </mesh>
          <pointLight color="#00F0FF" intensity={4} distance={2} />
        </group>
      )}
    </group>
  );
}

export const Hero3DCanvas: React.FC<SceneProps> = ({ title, verdict, isScanning }) => {
  const [reducedMotion, setReducedMotion] = React.useState(false);

  React.useEffect(() => {
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mql.matches);

    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  if (reducedMotion) {
    return (
      <div className="w-full h-full min-h-[340px] relative flex flex-col items-center justify-center p-6 text-center space-y-3">
        <div className="text-xs font-mono uppercase tracking-widest text-[#78716C]">
          PRGI Verification Neon Specimen
        </div>
        <h2 className="font-editorial text-4xl sm:text-5xl font-bold text-[#1C1917] tracking-tight">
          {title || 'Times India'}
        </h2>
        <div className={`text-xs font-mono font-bold uppercase px-3 py-1 rounded-full ${
          verdict === 'APPROVED' ? 'bg-emerald-100 text-emerald-900 border border-emerald-300' :
          verdict === 'REJECTED' ? 'bg-rose-100 text-rose-900 border border-rose-300' :
          'bg-amber-100 text-amber-900 border border-amber-300'
        }`}>
          {verdict || 'Scanning Admissibility'}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full min-h-[340px] relative flex items-center justify-center pointer-events-auto select-none">
      <Canvas
        camera={{ position: [0, 0, 4.3], fov: 45 }}
        gl={{ antialias: true, alpha: true }}
      >
        {/* Soft Warm Ambient Studio Lighting */}
        <ambientLight intensity={1.2} />
        <directionalLight position={[4, 6, 5]} intensity={1.5} color="#FFFDF7" />
        <directionalLight position={[-4, -3, 3]} intensity={0.8} color="#FFE4E6" />

        {/* Orbit Controls: Rotatable by Mouse, Static Neon Sign */}
        <OrbitControls
          enableZoom={false}
          enablePan={false}
          maxPolarAngle={Math.PI / 1.7}
          minPolarAngle={Math.PI / 2.3}
          maxAzimuthAngle={Math.PI / 3.5}
          minAzimuthAngle={-Math.PI / 3.5}
          dampingFactor={0.06}
        />

        <Suspense fallback={null}>
          <group position={[0, 0, 0]}>
            {/* Center Neon Title Sign on Acrylic Plate */}
            <NeonTitleSign
              title={title || 'Times India'}
              verdict={verdict}
              isScanning={isScanning}
            />

            {/* Neon Butterflies Floating Naturally Around the Sign (Matching Reference Images) */}
            {/* 1. Top-Right Majestic Hot Pink Butterfly */}
            <NeonButterfly
              position={[2.0, 0.95, 0.25]}
              rotation={[0.1, -0.25, 0.2]}
              scale={0.85}
              color="#FF1493"
              glowColor="#FF007F"
              wingAngleOffset={0}
              flutterSpeed={2.2}
            />

            {/* 2. Top-Left Electric Cyan Butterfly */}
            <NeonButterfly
              position={[-2.05, 0.85, 0.2]}
              rotation={[0.15, 0.3, -0.25]}
              scale={0.75}
              color="#00F0FF"
              glowColor="#00D2FF"
              wingAngleOffset={1.2}
              flutterSpeed={2.6}
            />

            {/* 3. Bottom-Left Warm Amber/Pink Butterfly */}
            <NeonButterfly
              position={[-1.95, -0.85, 0.3]}
              rotation={[-0.1, 0.2, 0.15]}
              scale={0.7}
              color="#FF007F"
              glowColor="#FF2E93"
              wingAngleOffset={2.4}
              flutterSpeed={2.0}
            />

            {/* 4. Bottom-Right Vibrant Butterfly */}
            <NeonButterfly
              position={[2.05, -0.75, 0.2]}
              rotation={[-0.12, -0.22, -0.18]}
              scale={0.68}
              color="#FFB800"
              glowColor="#FFD043"
              wingAngleOffset={3.6}
              flutterSpeed={2.4}
            />
          </group>
        </Suspense>
      </Canvas>
    </div>
  );
};
