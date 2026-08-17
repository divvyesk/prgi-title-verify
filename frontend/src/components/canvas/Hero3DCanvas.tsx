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

// 3D Pure Neon Butterfly (High-Intensity Uncapped Luminescence)
function PureNeonButterfly({
  position,
  rotation = [0, 0, 0],
  scale = 1,
  color = '#FF007F',
  glowColor = '#FF1493',
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
      {/* 1. Center Glowing Body Tube */}
      <mesh position={[0, 0, 0]}>
        <capsuleGeometry args={[0.028 * scale, 0.44 * scale, 12, 16]} />
        <meshBasicMaterial color="#FFFFFF" toneMapped={false} />
      </mesh>

      {/* 2. Left Wing Neon Tubes */}
      <group ref={leftWingRef}>
        {/* Outer Radiant Glow Halo Tube (Raw Uncapped Emissive) */}
        <mesh>
          <tubeGeometry args={[leftCurve, 64, 0.048 * scale, 12, true]} />
          <meshStandardMaterial
            color={color}
            emissive={glowColor}
            emissiveIntensity={8.5}
            roughness={0.0}
            toneMapped={false}
          />
        </mesh>

        {/* Inner White-Hot Gas Core Filament */}
        <mesh position={[0, 0, 0.01]}>
          <tubeGeometry args={[leftCurve, 64, 0.018 * scale, 8, true]} />
          <meshBasicMaterial color="#FFFFFF" toneMapped={false} />
        </mesh>
      </group>

      {/* 3. Right Wing Neon Tubes */}
      <group ref={rightWingRef}>
        {/* Outer Radiant Glow Halo Tube (Raw Uncapped Emissive) */}
        <mesh>
          <tubeGeometry args={[rightCurve, 64, 0.048 * scale, 12, true]} />
          <meshStandardMaterial
            color={color}
            emissive={glowColor}
            emissiveIntensity={8.5}
            roughness={0.0}
            toneMapped={false}
          />
        </mesh>

        {/* Inner White-Hot Gas Core Filament */}
        <mesh position={[0, 0, 0.01]}>
          <tubeGeometry args={[rightCurve, 64, 0.018 * scale, 8, true]} />
          <meshBasicMaterial color="#FFFFFF" toneMapped={false} />
        </mesh>
      </group>

      {/* High-Intensity Butterfly Point Light */}
      <pointLight color={glowColor} intensity={5.0} distance={3.0} />
    </group>
  );
}

// 3D Pure Neon Title Text (High-Intensity Uncapped Neon Tube Lettering)
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
        primaryColor: '#00FF88', 
        glowColor: '#39FF14', 
        secondaryColor: '#00F0FF', 
        secondaryGlow: '#00D2FF' 
      };
    }
    if (verdict === 'REJECTED') {
      return { 
        primaryColor: '#FF007F', 
        glowColor: '#FF1493', 
        secondaryColor: '#FF0055', 
        secondaryGlow: '#FF3366' 
      };
    }
    if (verdict === 'MANUAL_REVIEW') {
      return { 
        primaryColor: '#FFB800', 
        glowColor: '#FF9900', 
        secondaryColor: '#FF007F', 
        secondaryGlow: '#FF1493' 
      };
    }
    // Default Iconic Hot Pink & Electric Cyan Multi-Neon (like reference images)
    return { 
      primaryColor: '#FF007F', 
      glowColor: '#FF1493', 
      secondaryColor: '#00F0FF', 
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

  // 3D Depth slice offsets for thick volumetric neon extrusion
  const depthLayers = [-0.08, -0.05, -0.02, 0.0];

  return (
    <group ref={signRef}>
      {/* Line 1: Primary Glowing 3D Neon Text */}
      <group position={[0, line2 ? 0.34 : 0, 0]}>
        {/* Volumetric 3D Neon Extrusion Tube Slices */}
        {depthLayers.map((zOffset, idx) => (
          <Text
            key={`l1-ext-${idx}`}
            position={[0, 0, zOffset]}
            fontSize={fontSize}
            maxWidth={4.0}
            textAlign="center"
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.065}
            outlineColor={primaryColor}
            letterSpacing={0.06}
          >
            {line1}
            <meshStandardMaterial
              color={primaryColor}
              emissive={glowColor}
              emissiveIntensity={8.0}
              roughness={0.0}
              toneMapped={false}
            />
          </Text>
        ))}

        {/* Front White-Hot Gas Core Filament */}
        <Text
          position={[0, 0, 0.025]}
          fontSize={fontSize}
          maxWidth={4.0}
          textAlign="center"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.018}
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
          {depthLayers.map((zOffset, idx) => (
            <Text
              key={`l2-ext-${idx}`}
              position={[0, 0, zOffset]}
              fontSize={fontSize * 0.94}
              maxWidth={4.0}
              textAlign="center"
              anchorX="center"
              anchorY="middle"
              outlineWidth={0.065}
              outlineColor={secondaryColor}
              letterSpacing={0.06}
            >
              {line2}
              <meshStandardMaterial
                color={secondaryColor}
                emissive={secondaryGlow}
                emissiveIntensity={8.0}
                roughness={0.0}
                toneMapped={false}
              />
            </Text>
          ))}

          {/* Front White-Hot Gas Core Filament */}
          <Text
            position={[0, 0, 0.025]}
            fontSize={fontSize * 0.94}
            maxWidth={4.0}
            textAlign="center"
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.018}
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
        fontSize={0.13}
        letterSpacing={0.16}
        textAlign="center"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.016}
        outlineColor={primaryColor}
      >
        ✦ PRGI STATUTORY CLEARANCE ✦
        <meshStandardMaterial
          color="#FFFFFF"
          emissive={primaryColor}
          emissiveIntensity={5.0}
          toneMapped={false}
        />
      </Text>

      {/* High-Power Front & Back Radiance Lights */}
      <pointLight position={[0, 0.2, 0.8]} color={glowColor} intensity={7.0} distance={6.0} />
      <pointLight position={[0, -0.3, 0.8]} color={secondaryGlow} intensity={6.5} distance={6.0} />
      <pointLight position={[0, 0, -0.6]} color={glowColor} intensity={4.5} distance={4.5} />

      {/* Laser Scanning Line during verification */}
      {isScanning && (
        <group position={[0, 0, 0.16]}>
          <mesh>
            <planeGeometry args={[4.2, 0.05]} />
            <meshBasicMaterial color="#00F0FF" transparent opacity={0.95} toneMapped={false} />
          </mesh>
          <pointLight color="#00F0FF" intensity={8} distance={3} />
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
      <div className="w-full h-full min-h-[360px] sm:min-h-[420px] relative rounded-3xl bg-[#08060F] p-6 text-center space-y-3 flex flex-col items-center justify-center border border-[#1E1730] shadow-2xl">
        <div className="text-xs font-mono uppercase tracking-widest text-[#FF007F]">
          ✦ PRGI Verification Neon Specimen ✦
        </div>
        <h2 className="font-editorial text-4xl sm:text-5xl font-bold text-white tracking-tight">
          {title || 'Times India'}
        </h2>
        <div className={`text-xs font-mono font-bold uppercase px-3 py-1 rounded-full ${
          verdict === 'APPROVED' ? 'bg-emerald-950 text-emerald-300 border border-emerald-500' :
          verdict === 'REJECTED' ? 'bg-rose-950 text-rose-300 border border-rose-500' :
          'bg-amber-950 text-amber-300 border border-amber-500'
        }`}>
          {verdict || 'Scanning Admissibility'}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full min-h-[360px] sm:min-h-[420px] relative rounded-3xl overflow-hidden bg-[#07050E] border border-[#221838] shadow-2xl flex items-center justify-center pointer-events-auto select-none">
      {/* Subtle Ambient Radial Glow Backing */}
      <div className="absolute inset-0 bg-gradient-to-tr from-[#FF007F]/10 via-transparent to-[#00F0FF]/10 pointer-events-none" />

      <Canvas
        camera={{ position: [0, 0, 4.2], fov: 45 }}
        gl={{ antialias: true, alpha: false, toneMapping: THREE.NoToneMapping }}
      >
        {/* Dark Obsidian Background so Neon Explodes with Vibrancy */}
        <color attach="background" args={['#07050E']} />

        {/* Soft Ambient Light */}
        <ambientLight intensity={0.6} />

        {/* Reflective Dark Floor beneath the Neon Sign to catch specular reflections */}
        <mesh position={[0, -1.8, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[12, 12]} />
          <meshStandardMaterial
            color="#05030A"
            roughness={0.2}
            metalness={0.8}
          />
        </mesh>

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
            {/* Center Pure 3D Neon Title (No background plate) */}
            <PureNeonTitle
              title={title || 'Times India'}
              verdict={verdict}
              isScanning={isScanning}
            />

            {/* Surrounding Brilliant 3D Neon Butterflies (Hot Pink, Cyan, Golden Amber) */}
            {/* 1. Top-Right Radiant Hot Pink Butterfly */}
            <PureNeonButterfly
              position={[1.85, 0.88, 0.3]}
              rotation={[0.12, -0.28, 0.22]}
              scale={0.9}
              color="#FF007F"
              glowColor="#FF1493"
              wingAngleOffset={0}
              flutterSpeed={2.2}
            />

            {/* 2. Top-Left Electric Cyan Butterfly */}
            <PureNeonButterfly
              position={[-1.9, 0.82, 0.25]}
              rotation={[0.15, 0.32, -0.26]}
              scale={0.8}
              color="#00F0FF"
              glowColor="#00D2FF"
              wingAngleOffset={1.2}
              flutterSpeed={2.6}
            />

            {/* 3. Bottom-Left Vibrant Magenta Butterfly */}
            <PureNeonButterfly
              position={[-1.8, -0.78, 0.35]}
              rotation={[-0.1, 0.22, 0.16]}
              scale={0.76}
              color="#FF1493"
              glowColor="#FF007F"
              wingAngleOffset={2.4}
              flutterSpeed={2.0}
            />

            {/* 4. Bottom-Right Radiant Golden Butterfly */}
            <PureNeonButterfly
              position={[1.9, -0.72, 0.28]}
              rotation={[-0.12, -0.24, -0.18]}
              scale={0.74}
              color="#FFB800"
              glowColor="#FF9900"
              wingAngleOffset={3.6}
              flutterSpeed={2.4}
            />

            {/* 5. Center-Top Floating Mini Cyan Butterfly */}
            <PureNeonButterfly
              position={[0.0, 1.15, 0.15]}
              rotation={[0.05, 0.1, -0.08]}
              scale={0.55}
              color="#00F0FF"
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
