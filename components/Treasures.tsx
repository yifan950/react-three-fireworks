import React, { useRef, useMemo, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';
import { SceneControlRef } from '../types';
import { COLORS } from '../constants';

interface TreasuresProps {
  controlRef: React.MutableRefObject<SceneControlRef>;
}

interface TreasureData {
  position: THREE.Vector3;
  id: number;
  active: boolean;
  scale: number;
  revealedAmount: number; // 0 to 1
}

const Treasures: React.FC<TreasuresProps> = ({ controlRef }) => {
  const groupRef = useRef<THREE.Group>(null);
  const [score, setScore] = useState(0);
  
  // Initialize Treasures
  const treasures = useMemo(() => {
    const arr: TreasureData[] = [];
    for (let i = 0; i < 8; i++) {
      arr.push({
        id: i,
        position: new THREE.Vector3(
          (Math.random() - 0.5) * 60, // X
          0 + Math.random() * 4,      // Y: HIGHER now (0 to 4), floating above waves
          (Math.random() - 0.5) * 50 - 20 // Z
        ),
        active: true,
        scale: 0.5 + Math.random() * 0.5,
        revealedAmount: 0.1, // Start slightly visible
      });
    }
    return arr;
  }, []);

  // Refs for meshes to avoid React re-renders on every frame
  const meshRefs = useRef<(THREE.Mesh | null)[]>([]);

  useFrame((state, delta) => {
    if (!controlRef.current) return;

    const { gestureMode, cursorPos } = controlRef.current;
    const time = state.clock.getElapsedTime();

    // Map Cursor to World Space (Matching Ocean.tsx logic)
    const cursorWorldX = cursorPos.x * 5.0;
    const cursorWorldZ = (cursorPos.y - 2.5) * -5.0;
    // We ignore Y for distance check to make it forgiving (2D projection search)
    
    treasures.forEach((t, i) => {
      const mesh = meshRefs.current[i];
      if (!mesh || !t.active) {
        if (mesh) mesh.visible = false;
        return;
      }

      // 1. Calculate Distance (2D plane)
      const dist = Math.sqrt(
        Math.pow(t.position.x - cursorWorldX, 2) + 
        Math.pow(t.position.z - cursorWorldZ, 2)
      );

      // 2. Reveal Logic
      const isSearchMode = gestureMode === 'PINCH';
      const isGrabMode = gestureMode === 'GRAB';
      const searchRadius = 15.0; 

      let targetReveal = 0.2; // Base visibility (Ghost)

      if (dist < searchRadius) {
        // Linear increase based on proximity
        const proximity = 1 - (dist / searchRadius);
        
        // Boost significantly if interacting (PINCH is strongest for searching)
        let boost = 0.6;
        if (isSearchMode) boost = 1.2;
        else if (isGrabMode) boost = 1.0;

        targetReveal = Math.max(0.2, proximity * boost);
      }

      t.revealedAmount = THREE.MathUtils.lerp(t.revealedAmount, targetReveal, 0.1);

      // 3. Collection Logic
      // Rules:
      // A. "Touch": Very close (< 4.0)
      // B. "Grab": Close (< 8.0) AND grabbing
      // C. "Pinch/Search": Close (< 10.0) AND pinching - Primary mechanic
      
      const touchRadius = 4.0;
      const grabRadius = 8.0;
      const searchActionRadius = 10.0;

      const collectedByTouch = dist < touchRadius;
      const collectedByGrab = dist < grabRadius && isGrabMode;
      const collectedBySearch = dist < searchActionRadius && isSearchMode;

      if (collectedByTouch || collectedByGrab || collectedBySearch) {
        // COLLECTED!
        t.active = false;
        controlRef.current.triggerTreasureSequence(); 
        setScore(s => s + 1);
        
        // Respawn
        setTimeout(() => {
            t.position.set(
                (Math.random() - 0.5) * 60,
                0 + Math.random() * 4,
                (Math.random() - 0.5) * 50 - 20
            );
            t.active = true;
            t.revealedAmount = 0.1;
        }, 3000); 
      }

      // 4. Update Visuals
      mesh.visible = true;
      
      // Floating motion
      const floatY = Math.sin(time * 1.5 + t.id) * 0.8;
      mesh.position.set(t.position.x, t.position.y + floatY, t.position.z);
      
      // Rotate
      mesh.rotation.x = time * 0.8;
      mesh.rotation.y = time * 0.5;

      // Scale pulse
      // If highly revealed, pulse faster
      const pulseSpeed = t.revealedAmount > 0.5 ? 8 : 2;
      const pulseAmp = t.revealedAmount > 0.5 ? 0.3 : 0.05;
      const targetScale = t.scale * (1 + Math.sin(time * pulseSpeed) * pulseAmp);
      mesh.scale.setScalar(targetScale);

      // Material appearance
      const mat = mesh.material as THREE.MeshStandardMaterial;
      if (mat) {
        // Always translucent visible
        mat.opacity = THREE.MathUtils.clamp(t.revealedAmount + 0.1, 0.2, 1.0);
        // Emission drives the "glow"
        mat.emissiveIntensity = t.revealedAmount * 4.0 + 0.5; 
        
        // Color Shift: White/Ghost -> Gold
        if (t.revealedAmount > 0.5) {
             mat.color.set(COLORS.gold);
             mat.emissive.set(COLORS.gold);
        } else {
             mat.color.setHex(0x88CCFF); // Ghostly Blue
             mat.emissive.setHex(0x004488);
        }
      }
    });
  });

  return (
    <group ref={groupRef}>
      {treasures.map((t, i) => (
        <mesh 
            key={t.id} 
            ref={(el) => { meshRefs.current[i] = el; }}
        >
          <octahedronGeometry args={[1.2, 0]} />
          <meshStandardMaterial 
            transparent
            opacity={0.3}
            roughness={0.1}
            metalness={0.8}
            toneMapped={false}
          />
        </mesh>
      ))}
      
      {/* 3D Score */}
      <group position={[0, 15, -40]}>
         <Text
            fontSize={4}
            color="#FFD700"
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.1}
            outlineColor="#d97706"
         >
            {score > 0 ? `GOLD COLLECTED: ${score}` : ""}
         </Text>
      </group>
    </group>
  );
};

export default Treasures;