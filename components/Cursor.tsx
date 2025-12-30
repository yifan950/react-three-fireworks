import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';
import { SceneControlRef } from '../types';

const Cursor: React.FC<{ controlRef: React.MutableRefObject<SceneControlRef> }> = ({ controlRef }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.MeshBasicMaterial>(null);
  const textRef = useRef<THREE.Mesh>(null);

  // Reusable colors
  const colorNone = new THREE.Color('#00FFFF');
  const colorOpen = new THREE.Color('#FF00FF'); // Pink/Magenta for control
  const colorGrab = new THREE.Color('#FFFFFF'); // White flash for explode
  const colorPinch = new THREE.Color('#FFD700'); // Gold for Search

  useFrame((state) => {
    if (!meshRef.current || !materialRef.current) return;
    
    // Position Update
    const { x, y } = controlRef.current.cursorPos;
    meshRef.current.position.set(x, y, 0);

    // Visual State Update
    const mode = controlRef.current.gestureMode;
    const time = state.clock.getElapsedTime();

    if (mode === 'GRAB') {
       // Old "PINCH" visual (Pulse/Explode)
       materialRef.current.color.lerp(colorGrab, 0.3);
       meshRef.current.scale.setScalar(0.8 + Math.sin(time * 20) * 0.2); // Rapid pulse
       if (textRef.current) textRef.current.visible = false;
    } 
    else if (mode === 'PINCH') {
       // New "PINCH" visual (Search/Focus)
       materialRef.current.color.lerp(colorPinch, 0.2);
       // Small, focused ring
       meshRef.current.scale.setScalar(0.6); 
       if (textRef.current) textRef.current.visible = false;
    }
    else if (mode === 'OPEN') {
       materialRef.current.color.lerp(colorOpen, 0.1);
       meshRef.current.scale.setScalar(1.2); 
       // Show text label
       if (textRef.current) {
         textRef.current.visible = true;
         textRef.current.lookAt(0, 0, 100); // Always face camera
       }
    } 
    else {
       // NONE
       materialRef.current.color.lerp(colorNone, 0.1);
       meshRef.current.scale.setScalar(1.0 + Math.sin(time * 2) * 0.1); // Idle breathe
       if (textRef.current) textRef.current.visible = false;
    }
  });

  return (
    <group>
      <mesh ref={meshRef}>
        <ringGeometry args={[0.3, 0.4, 32]} />
        <meshBasicMaterial ref={materialRef} color="#00FFFF" toneMapped={false} transparent opacity={0.8} />
        
        <Text
          ref={textRef}
          position={[0, -0.6, 0]}
          fontSize={0.2}
          color="white"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.02}
          outlineColor="#FF00FF"
        >
          OCEAN CONTROL
        </Text>
      </mesh>
    </group>
  );
};

export default Cursor;