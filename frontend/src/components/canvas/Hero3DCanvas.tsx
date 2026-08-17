import React, { useRef, useMemo, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, Text, OrbitControls } from '@react-three/drei';
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

// Pure 3D Extruded Beveled Word
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
  const depthSlices = [-0.04, -0.03, -0.02, -0.01, 0.0];

  return (
    <group position={position} rotation={rotation}>
      {/* 1. Deep 3D Extrusion Core */}
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

      {/* 3. Glossy Front Face */}
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
          roughness={0.12}
          metalness={0.35}
          emissive={emissiveColor}
          emissiveIntensity={emissiveIntensity}
        />
      </Text>
    </group>
  );
}

// Aesthetic 3D Background Shapes Framing the 3D Text (Warm Beige / Sand / Amber)
function AestheticBackgroundShapes({ accentColor }: { accentColor: string }) {
  const bgGroupRef = useRef<THREE.Group>(null);
  const cube1Ref = useRef<THREE.Mesh>(null);
  const cube2Ref = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (bgGroupRef.current) {
      bgGroupRef.current.rotation.y = t * 0.1;
      bgGroupRef.current.rotation.z = Math.sin(t * 0.15) * 0.05;
    }
    if (cube1Ref.current) {
      cube1Ref.current.rotation.x = t * 0.2;
      cube1Ref.current.rotation.y = t * 0.25;
    }
    if (cube2Ref.current) {
      cube2Ref.current.rotation.y = -t * 0.18;
      cube2Ref.current.rotation.z = t * 0.22;
    }
    if (ringRef.current) {
      ringRef.current.rotation.x = Math.sin(t * 0.2) * 0.25 + 0.8;
      ringRef.current.rotation.y = -t * 0.12;
    }
  });

  return (
    <group ref={bgGroupRef} position={[0, 0, -1.0]}>
      {/* 1. Large Frosted Sand Cube (Rear Right) */}
      <mesh ref={cube1Ref} position={[1.4, 0.4, -0.6]}>
        <boxGeometry args={[1.2, 1.2, 1.2]} />
        <meshStandardMaterial
          color="#E8DFC8"
          roughness={0.35}
          metalness={0.2}
          transparent
          opacity={0.65}
        />
      </mesh>

      {/* 2. Secondary Warm Amber Cube (Rear Left) */}
      <mesh ref={cube2Ref} position={[-1.5, -0.3, -0.4]}>
        <boxGeometry args={[0.9, 0.9, 0.9]} />
        <meshStandardMaterial
          color="#D97706"
          roughness={0.3}
          metalness={0.3}
          transparent
          opacity={0.45}
        />
      </mesh>

      {/* 3. Golden Orbital Torus Ring (Encircling Background) */}
      <mesh ref={ringRef} position={[0, 0, -0.2]}>
        <torusGeometry args={[2.1, 0.04, 24, 64]} />
        <meshStandardMaterial
          color={accentColor}
          emissive={accentColor}
          emissiveIntensity={0.4}
          roughness={0.2}
          metalness={0.7}
          transparent
          opacity={0.5}
        />
      </mesh>

      {/* 4. Soft Sand Sphere (Top Left) */}
      <mesh position={[-1.2, 0.9, -0.8]}>
        <sphereGeometry args={[0.35, 32, 32]} />
        <meshStandardMaterial
          color="#DDD1BF"
          roughness={0.25}
          metalness={0.3}
          transparent
          opacity={0.7}
        />
      </mesh>

      {/* 5. Honey Gold Sphere (Bottom Right) */}
      <mesh position={[1.3, -0.8, -0.5]}>
        <sphereGeometry args={[0.28, 32, 32]} />
        <meshStandardMaterial
          color="#F59E0B"
          roughness={0.2}
          metalness={0.5}
          transparent
          opacity={0.6}
        />
      </mesh>
    </group>
  );
}

function StatutarySeal3D({
  title,
  verdict,
  isScanning
}: {
  title?: string;
  verdict?: 'APPROVED' | 'MANUAL_REVIEW' | 'REJECTED' | null;
  isScanning?: boolean;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const scanLaserRef = useRef<THREE.Group>(null);

  const cleanTitle = (title || '').trim();
  const words = cleanTitle.split(/\s+/).filter(Boolean);

  let line1 = '';
  let line2 = '';

  if (words.length === 0) {
    line1 = 'PRGI';
  } else if (words.length === 1) {
    line1 = words[0];
    line2 = '';
  } else if (words.length <= 3) {
    line1 = words[0];
    line2 = words.slice(1).join(' ');
  } else {
    const mid = Math.ceil(words.length / 2);
    line1 = words.slice(0, mid).join(' ');
    line2 = words.slice(mid).join(' ');
  }

  const fontSize1 = line1.length > 14 ? 0.36 : line1.length > 9 ? 0.44 : 0.54;
  const fontSize2 = line2.length > 14 ? 0.34 : line2.length > 9 ? 0.42 : 0.52;
  const yPos1 = line2 ? 0.32 : 0;
  const yPos2 = line2 ? -0.32 : 0;

  const theme = useMemo(() => {
    if (verdict === 'APPROVED') {
      return {
        line1Face: '#ECFDF5',
        line1Bevel: '#10B981',
        line1Extrude: '#064E3B',
        line2Face: '#34D399',
        line2Bevel: '#059669',
        line2Extrude: '#065F46',
        emissive: '#10B981',
        laserColor: '#34D399',
        accentColor: '#10B981'
      };
    }
    if (verdict === 'REJECTED') {
      return {
        line1Face: '#FFF1F2',
        line1Bevel: '#EF4444',
        line1Extrude: '#881337',
        line2Face: '#FCA5A5',
        line2Bevel: '#EF4444',
        line2Extrude: '#B91C1C',
        emissive: '#EF4444',
        laserColor: '#F87171',
        accentColor: '#EF4444'
      };
    }
    if (verdict === 'MANUAL_REVIEW') {
      return {
        line1Face: '#FFFBEB',
        line1Bevel: '#FBBF24',
        line1Extrude: '#78350F',
        line2Face: '#FCD34D',
        line2Bevel: '#F59E0B',
        line2Extrude: '#92400E',
        emissive: '#F59E0B',
        laserColor: '#FBBF24',
        accentColor: '#F59E0B'
      };
    }

    // Default Beige Theme: Porcelain White & Warm Honey Gold with Caramel Extrusions
    return {
      line1Face: '#FFFFFF',
      line1Bevel: '#F59E0B',
      line1Extrude: '#451A03',
      line2Face: '#FBBF24',
      line2Bevel: '#D97706',
      line2Extrude: '#78350F',
      emissive: '#F59E0B',
      laserColor: '#D97706',
      accentColor: '#F59E0B'
    };
  }, [verdict]);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    const targetTiltX = -state.pointer.y * 0.28 + Math.sin(t * 0.3) * 0.04;
    const targetTiltZ = state.pointer.x * 0.18;

    if (groupRef.current) {
      groupRef.current.rotation.y = t * 0.42 + state.pointer.x * 0.3;
      groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, targetTiltX, 0.06);
      groupRef.current.rotation.z = THREE.MathUtils.lerp(groupRef.current.rotation.z, targetTiltZ, 0.06);
    }

    if (scanLaserRef.current) {
      scanLaserRef.current.position.y = Math.sin(t * 1.3) * 0.95;
    }
  });

  return (
    <group position={[0, 0, 0]}>
      {/* 3D Background Geometric Shapes (Aesthetic Depth behind the 3D Text) */}
      <AestheticBackgroundShapes accentColor={theme.accentColor} />

      {/* Prominent 3D Text (Primary Focal Centerpiece) */}
      <Float speed={1.1} rotationIntensity={0.1} floatIntensity={0.2}>
        <group ref={groupRef}>
          {/* Front Readable 3D Face */}
          <group position={[0, 0, 0.04]}>
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
                emissiveIntensity={isScanning ? 0.7 : verdict ? 0.4 : 0.15}
              />
            )}
          </group>

          {/* Reverse Readable Face for Silky 360 Spin */}
          <group position={[0, 0, -0.05]} rotation={[0, Math.PI, 0]}>
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
                emissiveIntensity={isScanning ? 0.7 : verdict ? 0.4 : 0.15}
              />
            )}
          </group>
        </group>
      </Float>

      {/* Silky Laser Scanning Plane */}
      {isScanning && (
        <group ref={scanLaserRef} position={[0, 0, 0]}>
          <mesh position={[0, 0, 0.05]}>
            <planeGeometry args={[3.8, 0.04]} />
            <meshBasicMaterial
              color={theme.laserColor}
              transparent
              opacity={0.9}
              blending={THREE.AdditiveBlending}
            />
          </mesh>
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
    <div className="w-full h-full min-h-[300px] relative flex items-center justify-center pointer-events-auto">
      <Canvas
        camera={{ position: [0, 0, 4.0], fov: 42 }}
        gl={{ antialias: true, alpha: true }}
      >
        <ambientLight intensity={1.4} />
        <directionalLight position={[5, 7, 6]} intensity={2.0} color="#FFFDF7" />
        <directionalLight position={[-6, -4, 4]} intensity={0.9} color="#FED7AA" />
        <directionalLight position={[0, 5, -5]} intensity={0.7} color="#DDD1BF" />
        <CursorSpecularLight color={lightColor} />
        <OrbitControls enableZoom={false} enablePan={false} maxPolarAngle={Math.PI / 1.7} minPolarAngle={Math.PI / 2.3} />
        <Suspense fallback={null}>
          <StatutarySeal3D
            title={title}
            verdict={verdict}
            isScanning={isScanning}
          />
        </Suspense>
      </Canvas>
    </div>
  );
};
