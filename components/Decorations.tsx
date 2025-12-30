import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { DECORATION_COUNT } from '../constants';

const Decorations: React.FC = () => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const particles = useMemo(() => {
    const temp = [];
    for (let i = 0; i < DECORATION_COUNT; i++) {
      const x = (Math.random() - 0.5) * 50;
      const y = Math.random() * 20; // High up
      const z = (Math.random() - 0.5) * 30 - 10;
      temp.push({
        pos: new THREE.Vector3(x, y, z),
        rotSpeed: Math.random() * 0.02,
        scale: Math.random() * 0.5 + 0.2,
        phase: Math.random() * Math.PI * 2
      });
    }
    return temp;
  }, []);

  useFrame((state) => {
    if (!meshRef.current) return;
    const time = state.clock.getElapsedTime();

    particles.forEach((p, i) => {
      // Bobbing motion
      const y = p.pos.y + Math.sin(time + p.phase) * 0.5;
      dummy.position.set(p.pos.x, y, p.pos.z);
      
      // Rotation
      dummy.rotation.x += p.rotSpeed;
      dummy.rotation.y += p.rotSpeed;
      
      dummy.scale.setScalar(p.scale);
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, DECORATION_COUNT]}>
      <icosahedronGeometry args={[1, 0]} />
      <meshPhysicalMaterial 
        color="#E0B0FF" // Pale purple
        roughness={0}
        metalness={1}
        clearcoat={1}
        clearcoatRoughness={0}
      />
    </instancedMesh>
  );
};

export default Decorations;
