import React, { useRef, useMemo, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Text, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

interface SceneProps {
  title?: string;
  verdict?: 'APPROVED' | 'MANUAL_REVIEW' | 'REJECTED' | null;
  isScanning?: boolean;
}

// Organic 3D Neon Butterfly Wing Curve (Matching warm curved neon tube reference)
function createButterflyWingCurve(isRightWing = false, scale = 1): THREE.CatmullRomCurve3 {
  const dir = isRightWing ? 1 : -1;
  const points = [
    new THREE.Vector3(0.01 * dir * scale, 0.03 * scale, 0),
    // Upper large wing loop
    new THREE.Vector3(0.22 * dir * scale, 0.40 * scale, 0.02 * scale),
    new THREE.Vector3(0.54 * dir * scale, 0.76 * scale, 0.04 * scale),
    new THREE.Vector3(0.68 * dir * scale, 0.56 * scale, 0.03 * scale),
    new THREE.Vector3(0.40 * dir * scale, 0.26 * scale, 0.02 * scale),
    new THREE.Vector3(0.16 * dir * scale, 0.08 * scale, 0.01 * scale),
    // Lower secondary wing loop
    new THREE.Vector3(0.42 * dir * scale, -0.14 * scale, 0.02 * scale),
    new THREE.Vector3(0.52 * dir * scale, -0.44 * scale, 0.03 * scale),
    new THREE.Vector3(0.30 * dir * scale, -0.56 * scale, 0.02 * scale),
    new THREE.Vector3(0.10 * dir * scale, -0.22 * scale, 0.01 * scale),
    new THREE.Vector3(0.01 * dir * scale, -0.03 * scale, 0),
  ];
  return new THREE.CatmullRomCurve3(points, true);
}

// 3D Pure Warm Beige Neon Butterfly (Seamless & Perfectly Scaled to Fit)
function PureNeonButterfly({
  position,
  rotation = [0, 0, 0],
  scale = 1,
  color = '#D4AF37',
  glowColor = '#F59E0B',
  wingAngleOffset = 0,
  flutterSpeed = 2.4
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
      // Gentle rhythmic wing flutter
      const flutter = Math.sin(t * flutterSpeed + wingAngleOffset) * 0.18;
      leftWingRef.current.rotation.y = flutter;
      rightWingRef.current.rotation.y = -flutter;
    }
    if (groupRef.current) {
      // Gentle spatial hover
      groupRef.current.position.y = position[1] + Math.sin(t * 1.5 + wingAngleOffset) * 0.03;
      groupRef.current.rotation.z = rotation[2] + Math.cos(t * 1.2 + wingAngleOffset) * 0.03;
    }
  });

  return (
    <group ref={groupRef} position={position} rotation={rotation}>
      {/* 1. Center Glowing Body Tube with Dark Contrast Chassis */}
      <mesh position={[0, 0, -0.01]}>
        <capsuleGeometry args={[0.024 * scale, 0.40 * scale, 12, 16]} />
        <meshStandardMaterial color="#2C1E14" roughness={0.4} />
      </mesh>
      <mesh position={[0, 0, 0.01]}>
        <capsuleGeometry args={[0.018 * scale, 0.36 * scale, 12, 16]} />
        <meshBasicMaterial color="#FFFDF7" toneMapped={false} />
      </mesh>

      {/* 2. Left Wing Neon Tubes */}
      <group ref={leftWingRef}>
        {/* Deep Contrast Drop Outline */}
        <mesh position={[0, -0.01, -0.015]}>
          <tubeGeometry args={[leftCurve, 48, 0.040 * scale, 8, true]} />
          <meshBasicMaterial color="#1C1917" transparent opacity={0.35} />
        </mesh>

        {/* Outer Radiant Warm Beige/Amber Neon Tube */}
        <mesh>
          <tubeGeometry args={[leftCurve, 48, 0.034 * scale, 12, true]} />
          <meshStandardMaterial
            color={color}
            emissive={glowColor}
            emissiveIntensity={6.0}
            roughness={0.05}
            toneMapped={false}
          />
        </mesh>

        {/* Inner White-Hot Warm Gas Core Filament */}
        <mesh position={[0, 0, 0.008]}>
          <tubeGeometry args={[leftCurve, 48, 0.014 * scale, 8, true]} />
          <meshBasicMaterial color="#FFFDF7" toneMapped={false} />
        </mesh>
      </group>

      {/* 3. Right Wing Neon Tubes */}
      <group ref={rightWingRef}>
        {/* Deep Contrast Drop Outline */}
        <mesh position={[0, -0.01, -0.015]}>
          <tubeGeometry args={[rightCurve, 48, 0.040 * scale, 8, true]} />
          <meshBasicMaterial color="#1C1917" transparent opacity={0.35} />
        </mesh>

        {/* Outer Radiant Warm Beige/Amber Neon Tube */}
        <mesh>
          <tubeGeometry args={[rightCurve, 48, 0.034 * scale, 12, true]} />
          <meshStandardMaterial
            color={color}
            emissive={glowColor}
            emissiveIntensity={6.0}
            roughness={0.05}
            toneMapped={false}
          />
        </mesh>

        {/* Inner White-Hot Warm Gas Core Filament */}
        <mesh position={[0, 0, 0.008]}>
          <tubeGeometry args={[rightCurve, 48, 0.014 * scale, 8, true]} />
          <meshBasicMaterial color="#FFFDF7" toneMapped={false} />
        </mesh>
      </group>

      {/* Local Specular Point Light */}
      <pointLight color={glowColor} intensity={2.5} distance={2.0} />
    </group>
  );
}

// 3D Pure Warm Beige Neon Title Text (Ultra-Crisp Warm Gold & Amber)
function PureNeonTitle({
  title,
  verdict,
  isScanning
}: {
  title: string;
  verdict?: 'APPROVED' | 'MANUAL_REVIEW' | 'REJECTED' | null;
  isScanning?: boolean;
}) {
  const signRef = useRef<THREE.Group>(null);

  // Warm Beige, Golden Amber & Honey Palette
  const { primaryColor, glowColor, secondaryColor, secondaryGlow } = useMemo(() => {
    if (verdict === 'APPROVED') {
      return { 
        primaryColor: '#84CC16', // Olive Gold / Emerald Warmth
        glowColor: '#A3E635', 
        secondaryColor: '#D4AF37', 
        secondaryGlow: '#F59E0B' 
      };
    }
    if (verdict === 'REJECTED') {
      return { 
        primaryColor: '#E11D48', // Warm Terracotta / Rose
        glowColor: '#FB7185', 
        secondaryColor: '#D4AF37', 
        secondaryGlow: '#F59E0B' 
      };
    }
    // Default & Manual Review: Pure Warm Golden Beige & Honey Amber
    return { 
      primaryColor: '#D4AF37', // Warm Rich Gold Beige
      glowColor: '#F59E0B',    // Amber Radiant Glow
      secondaryColor: '#B45309', // Warm Deep Ochre
      secondaryGlow: '#D97706'  // Golden Glow
    };
  }, [verdict]);

  // Clean words for 2-line layout if title is multi-word
  const rawText = (title || 'Times India').toUpperCase().trim();
  const words = rawText.split(' ');
  let line1 = words.slice(0, Math.ceil(words.length / 2)).join(' ');
  let line2 = words.slice(Math.ceil(words.length / 2)).join(' ');
  if (words.length <= 1) {
    line1 = words[0];
    line2 = '';
  }

  const fontSize = words.length > 3 ? 0.38 : 0.46;

  return (
    <group ref={signRef}>
      {/* Line 1: Primary Glowing 3D Neon Text */}
      <group position={[0, line2 ? 0.28 : 0, 0]}>
        {/* Layer 0: Dark Contrast Shadow Base (Gives 3D pop on Light Beige) */}
        <Text
          position={[0, -0.015, -0.03]}
          fontSize={fontSize}
          maxWidth={3.2}
          textAlign="center"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.055}
          outlineColor="#1C1917"
          letterSpacing={0.06}
        >
          {line1}
          <meshBasicMaterial color="#1C1917" transparent opacity={0.3} />
        </Text>

        {/* Layer 1: Saturated Radiant Warm Gold Tube */}
        <Text
          position={[0, 0, 0]}
          fontSize={fontSize}
          maxWidth={3.2}
          textAlign="center"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.045}
          outlineColor={primaryColor}
          letterSpacing={0.06}
        >
          {line1}
          <meshStandardMaterial
            color={primaryColor}
            emissive={glowColor}
            emissiveIntensity={6.0}
            roughness={0.05}
            toneMapped={false}
          />
        </Text>

        {/* Layer 2: White-Hot Warm Gas Core Center Filament */}
        <Text
          position={[0, 0, 0.02]}
          fontSize={fontSize}
          maxWidth={3.2}
          textAlign="center"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.014}
          outlineColor="#FFFDF7"
          letterSpacing={0.06}
        >
          {line1}
          <meshBasicMaterial color="#FFFDF7" toneMapped={false} />
        </Text>
      </group>

      {/* Line 2: Secondary Warm Amber/Honey Glowing 3D Neon Text */}
      {line2 && (
        <group position={[0, -0.28, 0]}>
          {/* Layer 0: Dark Contrast Shadow Base */}
          <Text
            position={[0, -0.015, -0.03]}
            fontSize={fontSize * 0.94}
            maxWidth={3.2}
            textAlign="center"
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.055}
            outlineColor="#1C1917"
            letterSpacing={0.06}
          >
            {line2}
            <meshBasicMaterial color="#1C1917" transparent opacity={0.3} />
          </Text>

          {/* Layer 1: Saturated Radiant Warm Gold Tube */}
          <Text
            position={[0, 0, 0]}
            fontSize={fontSize * 0.94}
            maxWidth={3.2}
            textAlign="center"
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.045}
            outlineColor={secondaryColor}
            letterSpacing={0.06}
          >
            {line2}
            <meshStandardMaterial
              color={secondaryColor}
              emissive={secondaryGlow}
              emissiveIntensity={6.0}
              roughness={0.05}
              toneMapped={false}
            />
          </Text>

          {/* Layer 2: White-Hot Warm Gas Core Center Filament */}
          <Text
            position={[0, 0, 0.02]}
            fontSize={fontSize * 0.94}
            maxWidth={3.2}
            textAlign="center"
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.014}
            outlineColor="#FFFDF7"
            letterSpacing={0.06}
          >
            {line2}
            <meshBasicMaterial color="#FFFDF7" toneMapped={false} />
          </Text>
        </group>
      )}

      {/* Subtitle Minimal Neon Caption */}
      <Text
        position={[0, line2 ? -0.74 : -0.54, 0.01]}
        fontSize={0.11}
        letterSpacing={0.14}
        textAlign="center"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.012}
        outlineColor={primaryColor}
      >
        ✦ PRGI STATUTORY CLEARANCE ✦
        <meshStandardMaterial
          color="#1C1917"
          emissive={primaryColor}
          emissiveIntensity={4.0}
          toneMapped={false}
        />
      </Text>

      {/* Front & Ambient Warm Glow Lights */}
      <pointLight position={[0, 0.15, 0.7]} color={glowColor} intensity={3.5} distance={4.5} />
      <pointLight position={[0, -0.25, 0.7]} color={secondaryGlow} intensity={3.0} distance={4.5} />

      {/* Laser Scanning Line during verification */}
      {isScanning && (
        <group position={[0, 0, 0.14]}>
          <mesh>
            <planeGeometry args={[3.4, 0.035]} />
            <meshBasicMaterial color="#F59E0B" transparent opacity={0.95} toneMapped={false} />
          </mesh>
          <pointLight color="#F59E0B" intensity={4} distance={2.5} />
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
      <div className="w-full h-full min-h-[340px] sm:min-h-[420px] relative bg-transparent p-6 text-center space-y-3 flex flex-col items-center justify-center">
        <div className="text-xs font-mono uppercase tracking-widest text-[#B45309]">
          ✦ PRGI Verification Neon Specimen ✦
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
    <div className="w-full h-full min-h-[340px] sm:min-h-[420px] relative bg-transparent flex items-center justify-center pointer-events-auto select-none overflow-hidden">
      <Canvas
        camera={{ position: [0, 0, 4.8], fov: 38 }}
        gl={{ antialias: true, alpha: true, toneMapping: THREE.NoToneMapping }}
      >
        {/* Soft Natural Ambient Light */}
        <ambientLight intensity={1.3} />
        <directionalLight position={[4, 6, 5]} intensity={1.5} color="#FFFDF7" />

        {/* Orbit Controls: Rotatable by Mouse, Constrained to Viewport */}
        <OrbitControls
          enableZoom={false}
          enablePan={false}
          maxPolarAngle={Math.PI / 1.75}
          minPolarAngle={Math.PI / 2.25}
          maxAzimuthAngle={Math.PI / 4.2}
          minAzimuthAngle={-Math.PI / 4.2}
          dampingFactor={0.06}
        />

        <Suspense fallback={null}>
          <group position={[0, 0.05, 0]}>
            {/* Center Pure 3D Warm Beige Neon Title */}
            <PureNeonTitle
              title={title || 'Times India'}
              verdict={verdict}
              isScanning={isScanning}
            />

            {/* Surrounding Warm Golden Beige & Amber Butterflies (Safely Fitted Inside Viewport Bounds) */}
            {/* 1. Top-Right Warm Gold Butterfly */}
            <PureNeonButterfly
              position={[1.25, 0.58, 0.2]}
              rotation={[0.10, -0.22, 0.18]}
              scale={0.52}
              color="#D4AF37"
              glowColor="#F59E0B"
              wingAngleOffset={0}
              flutterSpeed={2.2}
            />

            {/* 2. Top-Left Champagne Honey Butterfly */}
            <PureNeonButterfly
              position={[-1.25, 0.54, 0.2]}
              rotation={[0.12, 0.25, -0.20]}
              scale={0.48}
              color="#E5C158"
              glowColor="#FBBF24"
              wingAngleOffset={1.2}
              flutterSpeed={2.6}
            />

            {/* 3. Bottom-Left Warm Ochre/Amber Butterfly */}
            <PureNeonButterfly
              position={[-1.20, -0.52, 0.22]}
              rotation={[-0.08, 0.18, 0.14]}
              scale={0.46}
              color="#B45309"
              glowColor="#D97706"
              wingAngleOffset={2.4}
              flutterSpeed={2.0}
            />

            {/* 4. Bottom-Right Radiant Golden Butterfly */}
            <PureNeonButterfly
              position={[1.22, -0.48, 0.2]}
              rotation={[-0.10, -0.20, -0.15]}
              scale={0.45}
              color="#D4AF37"
              glowColor="#F59E0B"
              wingAngleOffset={3.6}
              flutterSpeed={2.4}
            />

            {/* 5. Center-Top Floating Mini Champagne Butterfly */}
            <PureNeonButterfly
              position={[0.0, 0.76, 0.15]}
              rotation={[0.04, 0.08, -0.06]}
              scale={0.38}
              color="#E5C158"
              glowColor="#FBBF24"
              wingAngleOffset={4.8}
              flutterSpeed={2.8}
            />
          </group>
        </Suspense>
      </Canvas>
    </div>
  );
};
