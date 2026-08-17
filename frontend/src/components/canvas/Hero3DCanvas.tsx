import React, { useRef, useMemo, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Text, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

interface SceneProps {
  title?: string;
  verdict?: 'APPROVED' | 'MANUAL_REVIEW' | 'REJECTED' | null;
  isScanning?: boolean;
}

// Organic 3D Neon Butterfly Wing Curve (Matching Hot Pink / Cyan reference images)
function createButterflyWingCurve(isRightWing = false, scale = 1): THREE.CatmullRomCurve3 {
  const dir = isRightWing ? 1 : -1;
  const points = [
    new THREE.Vector3(0.01 * dir * scale, 0.03 * scale, 0),
    // Upper large wing loop
    new THREE.Vector3(0.24 * dir * scale, 0.44 * scale, 0.03 * scale),
    new THREE.Vector3(0.60 * dir * scale, 0.86 * scale, 0.05 * scale),
    new THREE.Vector3(0.75 * dir * scale, 0.62 * scale, 0.04 * scale),
    new THREE.Vector3(0.44 * dir * scale, 0.30 * scale, 0.02 * scale),
    new THREE.Vector3(0.18 * dir * scale, 0.09 * scale, 0.01 * scale),
    // Lower secondary wing loop
    new THREE.Vector3(0.48 * dir * scale, -0.16 * scale, 0.02 * scale),
    new THREE.Vector3(0.58 * dir * scale, -0.50 * scale, 0.03 * scale),
    new THREE.Vector3(0.34 * dir * scale, -0.64 * scale, 0.02 * scale),
    new THREE.Vector3(0.12 * dir * scale, -0.26 * scale, 0.01 * scale),
    new THREE.Vector3(0.01 * dir * scale, -0.03 * scale, 0),
  ];
  return new THREE.CatmullRomCurve3(points, true);
}

// 3D Pure Neon Butterfly (Vivid Saturated Tubes with Crisp Contrast on Light Background)
function PureNeonButterfly({
  position,
  rotation = [0, 0, 0],
  scale = 1,
  color = '#E60067',
  glowColor = '#FF007F',
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
      const flutter = Math.sin(t * flutterSpeed + wingAngleOffset) * 0.22;
      leftWingRef.current.rotation.y = flutter;
      rightWingRef.current.rotation.y = -flutter;
    }
    if (groupRef.current) {
      // Gentle spatial hover
      groupRef.current.position.y = position[1] + Math.sin(t * 1.6 + wingAngleOffset) * 0.05;
      groupRef.current.rotation.z = rotation[2] + Math.cos(t * 1.2 + wingAngleOffset) * 0.05;
    }
  });

  return (
    <group ref={groupRef} position={position} rotation={rotation}>
      {/* 1. Center Glowing Body Tube with Dark Contrast Chassis */}
      <mesh position={[0, 0, -0.01]}>
        <capsuleGeometry args={[0.032 * scale, 0.46 * scale, 12, 16]} />
        <meshStandardMaterial color="#1C1917" roughness={0.4} />
      </mesh>
      <mesh position={[0, 0, 0.01]}>
        <capsuleGeometry args={[0.024 * scale, 0.42 * scale, 12, 16]} />
        <meshBasicMaterial color="#FFFFFF" toneMapped={false} />
      </mesh>

      {/* 2. Left Wing Neon Tubes */}
      <group ref={leftWingRef}>
        {/* Deep Contrast Drop Outline (Makes Neon Pop Crisp on Beige) */}
        <mesh position={[0, -0.015, -0.02]}>
          <tubeGeometry args={[leftCurve, 64, 0.046 * scale, 8, true]} />
          <meshBasicMaterial color="#292524" transparent opacity={0.45} />
        </mesh>

        {/* Outer Radiant Saturated Neon Tube */}
        <mesh>
          <tubeGeometry args={[leftCurve, 64, 0.040 * scale, 12, true]} />
          <meshStandardMaterial
            color={color}
            emissive={glowColor}
            emissiveIntensity={6.5}
            roughness={0.05}
            toneMapped={false}
          />
        </mesh>

        {/* Inner White-Hot Gas Core Filament */}
        <mesh position={[0, 0, 0.01]}>
          <tubeGeometry args={[leftCurve, 64, 0.016 * scale, 8, true]} />
          <meshBasicMaterial color="#FFFFFF" toneMapped={false} />
        </mesh>
      </group>

      {/* 3. Right Wing Neon Tubes */}
      <group ref={rightWingRef}>
        {/* Deep Contrast Drop Outline */}
        <mesh position={[0, -0.015, -0.02]}>
          <tubeGeometry args={[rightCurve, 64, 0.046 * scale, 8, true]} />
          <meshBasicMaterial color="#292524" transparent opacity={0.45} />
        </mesh>

        {/* Outer Radiant Saturated Neon Tube */}
        <mesh>
          <tubeGeometry args={[rightCurve, 64, 0.040 * scale, 12, true]} />
          <meshStandardMaterial
            color={color}
            emissive={glowColor}
            emissiveIntensity={6.5}
            roughness={0.05}
            toneMapped={false}
          />
        </mesh>

        {/* Inner White-Hot Gas Core Filament */}
        <mesh position={[0, 0, 0.01]}>
          <tubeGeometry args={[rightCurve, 64, 0.016 * scale, 8, true]} />
          <meshBasicMaterial color="#FFFFFF" toneMapped={false} />
        </mesh>
      </group>

      {/* Local Specular Point Light */}
      <pointLight color={glowColor} intensity={3.5} distance={2.5} />
    </group>
  );
}

// 3D Pure Neon Title Text (Ultra-Crisp Saturated Lettering on Seamless Transparent Canvas)
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

  const { primaryColor, glowColor, secondaryColor, secondaryGlow } = useMemo(() => {
    if (verdict === 'APPROVED') {
      return { 
        primaryColor: '#00A84D', 
        glowColor: '#00E676', 
        secondaryColor: '#0096C7', 
        secondaryGlow: '#00D2FF' 
      };
    }
    if (verdict === 'REJECTED') {
      return { 
        primaryColor: '#D8005A', 
        glowColor: '#FF007F', 
        secondaryColor: '#C2185B', 
        secondaryGlow: '#FF1493' 
      };
    }
    if (verdict === 'MANUAL_REVIEW') {
      return { 
        primaryColor: '#E67E00', 
        glowColor: '#FF9100', 
        secondaryColor: '#D8005A', 
        secondaryGlow: '#FF007F' 
      };
    }
    // Default Iconic Hot Pink & Electric Cyan Multi-Neon
    return { 
      primaryColor: '#D8005A', 
      glowColor: '#FF007F', 
      secondaryColor: '#0096C7', 
      secondaryGlow: '#00D2FF' 
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

  const fontSize = words.length > 3 ? 0.44 : 0.54;

  return (
    <group ref={signRef}>
      {/* Line 1: Primary Glowing 3D Neon Text */}
      <group position={[0, line2 ? 0.34 : 0, 0]}>
        {/* Layer 0: Dark Contrast Shadow Base (Provides Razor-Sharp Legibility on Light Beige) */}
        <Text
          position={[0, -0.02, -0.04]}
          fontSize={fontSize}
          maxWidth={4.0}
          textAlign="center"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.065}
          outlineColor="#1C1917"
          letterSpacing={0.06}
        >
          {line1}
          <meshBasicMaterial color="#1C1917" transparent opacity={0.35} />
        </Text>

        {/* Layer 1: Saturated Radiant Neon Color Tube */}
        <Text
          position={[0, 0, 0]}
          fontSize={fontSize}
          maxWidth={4.0}
          textAlign="center"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.052}
          outlineColor={primaryColor}
          letterSpacing={0.06}
        >
          {line1}
          <meshStandardMaterial
            color={primaryColor}
            emissive={glowColor}
            emissiveIntensity={6.5}
            roughness={0.0}
            toneMapped={false}
          />
        </Text>

        {/* Layer 2: White-Hot Gas Core Center Filament */}
        <Text
          position={[0, 0, 0.025]}
          fontSize={fontSize}
          maxWidth={4.0}
          textAlign="center"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.016}
          outlineColor="#FFFFFF"
          letterSpacing={0.06}
        >
          {line1}
          <meshBasicMaterial color="#FFFFFF" toneMapped={false} />
        </Text>
      </group>

      {/* Line 2: Secondary Cyan/Multi Glowing 3D Neon Text */}
      {line2 && (
        <group position={[0, -0.34, 0]}>
          {/* Layer 0: Dark Contrast Shadow Base */}
          <Text
            position={[0, -0.02, -0.04]}
            fontSize={fontSize * 0.94}
            maxWidth={4.0}
            textAlign="center"
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.065}
            outlineColor="#1C1917"
            letterSpacing={0.06}
          >
            {line2}
            <meshBasicMaterial color="#1C1917" transparent opacity={0.35} />
          </Text>

          {/* Layer 1: Saturated Radiant Neon Color Tube */}
          <Text
            position={[0, 0, 0]}
            fontSize={fontSize * 0.94}
            maxWidth={4.0}
            textAlign="center"
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.052}
            outlineColor={secondaryColor}
            letterSpacing={0.06}
          >
            {line2}
            <meshStandardMaterial
              color={secondaryColor}
              emissive={secondaryGlow}
              emissiveIntensity={6.5}
              roughness={0.0}
              toneMapped={false}
            />
          </Text>

          {/* Layer 2: White-Hot Gas Core Center Filament */}
          <Text
            position={[0, 0, 0.025]}
            fontSize={fontSize * 0.94}
            maxWidth={4.0}
            textAlign="center"
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.016}
            outlineColor="#FFFFFF"
            letterSpacing={0.06}
          >
            {line2}
            <meshBasicMaterial color="#FFFFFF" toneMapped={false} />
          </Text>
        </group>
      )}

      {/* Subtitle Minimal Neon Caption */}
      <Text
        position={[0, line2 ? -0.88 : -0.66, 0.01]}
        fontSize={0.12}
        letterSpacing={0.16}
        textAlign="center"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.014}
        outlineColor={primaryColor}
      >
        ✦ PRGI STATUTORY CLEARANCE ✦
        <meshStandardMaterial
          color="#292524"
          emissive={primaryColor}
          emissiveIntensity={4.5}
          toneMapped={false}
        />
      </Text>

      {/* Front & Ambient Glow Lights */}
      <pointLight position={[0, 0.2, 0.8]} color={glowColor} intensity={4.5} distance={5.0} />
      <pointLight position={[0, -0.3, 0.8]} color={secondaryGlow} intensity={4.0} distance={5.0} />

      {/* Laser Scanning Line during verification */}
      {isScanning && (
        <group position={[0, 0, 0.16]}>
          <mesh>
            <planeGeometry args={[4.2, 0.04]} />
            <meshBasicMaterial color="#00D2FF" transparent opacity={0.95} toneMapped={false} />
          </mesh>
          <pointLight color="#00D2FF" intensity={5} distance={3} />
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
    <div className="w-full h-full min-h-[340px] sm:min-h-[420px] relative bg-transparent flex items-center justify-center pointer-events-auto select-none">
      <Canvas
        camera={{ position: [0, 0, 4.2], fov: 45 }}
        gl={{ antialias: true, alpha: true, toneMapping: THREE.NoToneMapping }}
      >
        {/* Soft Natural Ambient Light */}
        <ambientLight intensity={1.2} />
        <directionalLight position={[4, 6, 5]} intensity={1.4} color="#FFFDF7" />

        {/* Orbit Controls: Rotatable by Mouse, Static Sign */}
        <OrbitControls
          enableZoom={false}
          enablePan={false}
          maxPolarAngle={Math.PI / 1.7}
          minPolarAngle={Math.PI / 2.3}
          maxAzimuthAngle={Math.PI / 3.2}
          minAzimuthAngle={-Math.PI / 3.2}
          dampingFactor={0.06}
        />

        <Suspense fallback={null}>
          <group position={[0, 0.1, 0]}>
            {/* Center Pure 3D Neon Title (Seamless on Transparent Canvas) */}
            <PureNeonTitle
              title={title || 'Times India'}
              verdict={verdict}
              isScanning={isScanning}
            />

            {/* Surrounding Saturated 3D Neon Butterflies (Hot Pink, Cyan, Golden Amber) */}
            {/* 1. Top-Right Radiant Hot Pink Butterfly */}
            <PureNeonButterfly
              position={[1.85, 0.88, 0.3]}
              rotation={[0.12, -0.28, 0.22]}
              scale={0.9}
              color="#D8005A"
              glowColor="#FF007F"
              wingAngleOffset={0}
              flutterSpeed={2.2}
            />

            {/* 2. Top-Left Electric Cyan Butterfly */}
            <PureNeonButterfly
              position={[-1.9, 0.82, 0.25]}
              rotation={[0.15, 0.32, -0.26]}
              scale={0.8}
              color="#0096C7"
              glowColor="#00D2FF"
              wingAngleOffset={1.2}
              flutterSpeed={2.6}
            />

            {/* 3. Bottom-Left Vibrant Magenta Butterfly */}
            <PureNeonButterfly
              position={[-1.8, -0.78, 0.35]}
              rotation={[-0.1, 0.22, 0.16]}
              scale={0.76}
              color="#C2185B"
              glowColor="#FF1493"
              wingAngleOffset={2.4}
              flutterSpeed={2.0}
            />

            {/* 4. Bottom-Right Radiant Golden Butterfly */}
            <PureNeonButterfly
              position={[1.9, -0.72, 0.28]}
              rotation={[-0.12, -0.24, -0.18]}
              scale={0.74}
              color="#E67E00"
              glowColor="#FF9100"
              wingAngleOffset={3.6}
              flutterSpeed={2.4}
            />

            {/* 5. Center-Top Floating Mini Cyan Butterfly */}
            <PureNeonButterfly
              position={[0.0, 1.15, 0.15]}
              rotation={[0.05, 0.1, -0.08]}
              scale={0.55}
              color="#0096C7"
              glowColor="#00D2FF"
              wingAngleOffset={4.8}
              flutterSpeed={2.8}
            />
          </group>
        </Suspense>
      </Canvas>
    </div>
  );
};
