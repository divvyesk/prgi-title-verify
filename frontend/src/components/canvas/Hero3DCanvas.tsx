import React, { useRef, useMemo, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, Text } from '@react-three/drei';
import * as THREE from 'three';

interface SceneProps {
  title?: string;
  verdict?: 'APPROVED' | 'MANUAL_REVIEW' | 'REJECTED' | null;
  isScanning?: boolean;
}

interface TextLayerProps {
  text: string;
  fontSize: number;
  position: [number, number, number];
  rotation?: [number, number, number];
  faceColor: string;
  bevelColor: string;
  extrusionColor: string;
  emissiveColor: string;
  emissiveIntensity?: number;
}

// Pure 3D Extruded Beveled Word (replicates multi-layer bevel & depth from screenshot without any backplate)
function Extruded3DWord({
  text,
  fontSize,
  position,
  rotation = [0, 0, 0],
  faceColor,
  bevelColor,
  extrusionColor,
  emissiveColor,
  emissiveIntensity = 0.2
}: TextLayerProps) {
  // Extrusion depth slices (gives physical 3D block thickness)
  const depthSlices = [-0.04, -0.03, -0.02, -0.01, 0.0];

  return (
    <group position={position} rotation={rotation}>
      {/* 1. Deep 3D Extrusion Core (Solid mass) */}
      {depthSlices.map((zOffset, i) => (
        <Text
          key={`ext-${i}`}
          position={[0, 0, zOffset]}
          fontSize={fontSize}
          maxWidth={4.4}
          textAlign="center"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.032}
          outlineColor={extrusionColor}
          letterSpacing={0.04}
        >
          {text}
          <meshStandardMaterial
            color={extrusionColor}
            roughness={0.45}
            metalness={0.35}
          />
        </Text>
      ))}

      {/* 2. Golden Chamfer / Bevel Outline Layer */}
      <Text
        position={[0, 0, 0.012]}
        fontSize={fontSize}
        maxWidth={4.4}
        textAlign="center"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.024}
        outlineColor={bevelColor}
        letterSpacing={0.04}
      >
        {text}
        <meshStandardMaterial
          color={bevelColor}
          roughness={0.2}
          metalness={0.65}
          emissive={emissiveColor}
          emissiveIntensity={emissiveIntensity * 0.5}
        />
      </Text>

      {/* 3. Glossy Front Face (Lustrous top lacquer) */}
      <Text
        position={[0, 0, 0.022]}
        fontSize={fontSize}
        maxWidth={4.4}
        textAlign="center"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.008}
        outlineColor={bevelColor}
        letterSpacing={0.04}
      >
        {text}
        <meshStandardMaterial
          color={faceColor}
          emissive={emissiveColor}
          emissiveIntensity={emissiveIntensity}
          roughness={0.15}
          metalness={0.4}
        />
      </Text>
    </group>
  );
}

function StatutarySeal3D({ title = 'Times India', verdict, isScanning }: SceneProps) {
  const groupRef = useRef<THREE.Group>(null);
  const scanLaserRef = useRef<THREE.Group>(null);

  // Split title into 2 high-impact rows (e.g. "HOME" / "STAY" style)
  const { line1, line2 } = useMemo(() => {
    const raw = (title || 'TIMES INDIA').toUpperCase().trim();
    if (!raw) return { line1: 'PRGI', line2: 'TITLEGUARD' };

    const words = raw.split(/\s+/);
    if (words.length === 1) {
      return { line1: words[0], line2: '' };
    }
    if (words.length === 2) {
      return { line1: words[0], line2: words[1] };
    }
    // For 3+ words, split evenly
    const mid = Math.ceil(words.length / 2);
    return {
      line1: words.slice(0, mid).join(' '),
      line2: words.slice(mid).join(' ')
    };
  }, [title]);

  // Dynamic typography sizing based on character length
  const { fontSize1, fontSize2, yPos1, yPos2 } = useMemo(() => {
    if (!line2) {
      const len = line1.length;
      const size = len > 20 ? 0.44 : len > 12 ? 0.58 : 0.76;
      return { fontSize1: size, fontSize2: 0, yPos1: 0, yPos2: 0 };
    }

    const maxLen = Math.max(line1.length, line2.length);
    let size = 0.62;
    if (maxLen > 24) size = 0.34;
    else if (maxLen > 16) size = 0.44;
    else if (maxLen > 10) size = 0.52;

    return {
      fontSize1: size,
      fontSize2: size * 0.95,
      yPos1: size * 0.65,
      yPos2: -size * 0.65
    };
  }, [line1, line2]);

  // Dynamic Palette matching screenshot aesthetic & statutory verdict
  const theme = useMemo(() => {
    if (verdict === 'APPROVED') {
      return {
        // Line 1: Icy Mint Face
        line1Face: '#F0FDF4',
        line1Bevel: '#34D399',
        line1Extrude: '#065F46',
        // Line 2: Radiant Jade Face
        line2Face: '#6EE7B7',
        line2Bevel: '#10B981',
        line2Extrude: '#047857',
        // Lighting
        emissive: '#10B981',
        laserColor: '#34D399'
      };
    }
    if (verdict === 'REJECTED') {
      return {
        // Line 1: Soft Porcelain Rose
        line1Face: '#FFF1F2',
        line1Bevel: '#F87171',
        line1Extrude: '#881337',
        // Line 2: Crimson Ruby Face
        line2Face: '#FCA5A5',
        line2Bevel: '#EF4444',
        line2Extrude: '#B91C1C',
        // Lighting
        emissive: '#EF4444',
        laserColor: '#F87171'
      };
    }
    if (verdict === 'MANUAL_REVIEW') {
      return {
        // Line 1: Pale Honey Cream
        line1Face: '#FFFBEB',
        line1Bevel: '#FBBF24',
        line1Extrude: '#78350F',
        // Line 2: Warm Amber Gold
        line2Face: '#FCD34D',
        line2Bevel: '#F59E0B',
        line2Extrude: '#92400E',
        // Lighting
        emissive: '#F59E0B',
        laserColor: '#FBBF24'
      };
    }

    // Default: Screenshot Look (Cream White "HOME" + Warm Honey Gold "STAY" with Caramel/Chocolate Extrusion)
    return {
      line1Face: '#FFFFFF',
      line1Bevel: '#F59E0B',
      line1Extrude: '#451A03',
      line2Face: '#FBBF24',
      line2Bevel: '#D97706',
      line2Extrude: '#78350F',
      emissive: '#F59E0B',
      laserColor: '#D97706'
    };
  }, [verdict]);

  // Frame animation: continuous 360 rotation + interactive mouse parallax tilt + vertical laser scan
  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    const targetTiltX = -state.pointer.y * 0.3 + Math.sin(t * 0.3) * 0.04;
    const targetTiltZ = state.pointer.x * 0.2;

    if (groupRef.current) {
      groupRef.current.rotation.y = t * 0.45 + state.pointer.x * 0.35; // Continuous spin + mouse sway
      groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, targetTiltX, 0.06);
      groupRef.current.rotation.z = THREE.MathUtils.lerp(groupRef.current.rotation.z, targetTiltZ, 0.06);
    }

    if (scanLaserRef.current) {
      scanLaserRef.current.position.y = Math.sin(t * 1.3) * 0.95;
      scanLaserRef.current.rotation.z = Math.sin(t * 0.6) * 0.02;
    }
  });

  return (
    <group position={[0, 0, 0]}>
      <Float speed={1.1} rotationIntensity={0.12} floatIntensity={0.2}>
        <group ref={groupRef}>
          {/* ============================================================ */}
          {/* FRONT FACE PURE 3D EXTRUDED TEXT (Facing user at 0 deg)      */}
          {/* ============================================================ */}
          <group position={[0, 0, 0.03]}>
            {/* Top Line ("HOME" style) */}
            <Extruded3DWord
              text={line1}
              fontSize={fontSize1}
              position={[0, yPos1, 0]}
              faceColor={theme.line1Face}
              bevelColor={theme.line1Bevel}
              extrusionColor={theme.line1Extrude}
              emissiveColor={theme.emissive}
              emissiveIntensity={isScanning ? 0.7 : verdict ? 0.4 : 0.15}
            />

            {/* Bottom Line ("STAY" style) */}
            {line2 && (
              <Extruded3DWord
                text={line2}
                fontSize={fontSize2}
                position={[0, yPos2, 0]}
                faceColor={theme.line2Face}
                bevelColor={theme.line2Bevel}
                extrusionColor={theme.line2Extrude}
                emissiveColor={theme.emissive}
                emissiveIntensity={isScanning ? 0.8 : verdict ? 0.5 : 0.2}
              />
            )}
          </group>

          {/* ============================================================ */}
          {/* REVERSE FACE PURE 3D EXTRUDED TEXT (Rotated 180 deg for 360) */}
          {/* ============================================================ */}
          <group position={[0, 0, -0.03]} rotation={[0, Math.PI, 0]}>
            <Extruded3DWord
              text={line1}
              fontSize={fontSize1}
              position={[0, yPos1, 0]}
              faceColor={theme.line1Face}
              bevelColor={theme.line1Bevel}
              extrusionColor={theme.line1Extrude}
              emissiveColor={theme.emissive}
              emissiveIntensity={isScanning ? 0.7 : verdict ? 0.4 : 0.15}
            />

            {line2 && (
              <Extruded3DWord
                text={line2}
                fontSize={fontSize2}
                position={[0, yPos2, 0]}
                faceColor={theme.line2Face}
                bevelColor={theme.line2Bevel}
                extrusionColor={theme.line2Extrude}
                emissiveColor={theme.emissive}
                emissiveIntensity={isScanning ? 0.8 : verdict ? 0.5 : 0.2}
              />
            )}
          </group>
        </group>
      </Float>

      {/* ============================================================ */}
      {/* SILKY-SMOOTH STATUTORY LASER SCANNER                         */}
      {/* ============================================================ */}
      {isScanning && (
        <group ref={scanLaserRef} position={[0, 0, 0.1]}>
          {/* Laser Sweep Plane */}
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <planeGeometry args={[4.8, 0.55]} />
            <meshBasicMaterial
              color={theme.laserColor}
              transparent
              opacity={0.4}
              side={THREE.DoubleSide}
            />
          </mesh>

          {/* Laser Core Filament */}
          <mesh rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.014, 0.014, 4.9, 16]} />
            <meshBasicMaterial color="#FFFFFF" />
          </mesh>

          {/* Dynamic Laser Point Light */}
          <pointLight color={theme.laserColor} intensity={2.8} distance={3.2} />
        </group>
      )}
    </group>
  );
}

function CursorSpecularLight({ color }: { color: string }) {
  const lightRef = useRef<THREE.PointLight>(null);
  useFrame((state) => {
    if (lightRef.current) {
      lightRef.current.position.x = THREE.MathUtils.lerp(lightRef.current.position.x, state.pointer.x * 4.5, 0.1);
      lightRef.current.position.y = THREE.MathUtils.lerp(lightRef.current.position.y, state.pointer.y * 3.5 + 1.5, 0.1);
      lightRef.current.position.z = 3.5;
    }
  });
  return <pointLight ref={lightRef} intensity={2.5} distance={7} color={color} />;
}

export const Hero3DCanvas: React.FC<SceneProps> = ({ title, verdict, isScanning }) => {
  const lightColor = useMemo(() => {
    if (verdict === 'APPROVED') return '#10B981';
    if (verdict === 'REJECTED') return '#EF4444';
    if (verdict === 'MANUAL_REVIEW') return '#F59E0B';
    return '#FBBF24';
  }, [verdict]);

  return (
    <div className="w-full h-full min-h-[280px] relative pointer-events-auto flex items-center justify-center">
      <Canvas
        camera={{ position: [0, 0, 4.0], fov: 42 }}
        gl={{ antialias: true, alpha: true }}
      >
        <ambientLight intensity={1.4} />
        <directionalLight position={[5, 7, 6]} intensity={2.0} color="#FFFDF7" />
        <directionalLight position={[-6, -4, 4]} intensity={0.9} color="#FED7AA" />
        <directionalLight position={[0, 5, -5]} intensity={0.7} color="#DDD1BF" />
        <CursorSpecularLight color={lightColor} />
        <Suspense fallback={null}>
          <StatutarySeal3D title={title} verdict={verdict} isScanning={isScanning} />
        </Suspense>
      </Canvas>
    </div>
  );
};
