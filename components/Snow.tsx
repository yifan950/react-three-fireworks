import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const Snow: React.FC<{ count?: number }> = ({ count = 2000 }) => {
  const mesh = useRef<THREE.Points>(null);
  
  // Generate a soft circular texture programmatically to avoid external assets
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const context = canvas.getContext('2d');
    if (context) {
      const gradient = context.createRadialGradient(16, 16, 0, 16, 16, 16);
      gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
      gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
      context.fillStyle = gradient;
      context.fillRect(0, 0, 32, 32);
    }
    const tex = new THREE.CanvasTexture(canvas);
    return tex;
  }, []);

  const particles = useMemo(() => {
    const temp = [];
    for (let i = 0; i < count; i++) {
      const x = (Math.random() - 0.5) * 100;
      const y = Math.random() * 50 - 10;
      const z = (Math.random() - 0.5) * 80 - 20;
      const speed = 0.02 + Math.random() * 0.05;
      const factor = Math.random() * 100; // For sine wave offset
      const scale = 0.5 + Math.random() * 1.5;

      temp.push({ x, y, z, speed, factor, scale });
    }
    return temp;
  }, [count]);

  const positions = useMemo(() => new Float32Array(count * 3), [count]);
  const scales = useMemo(() => new Float32Array(count), [count]);

  useFrame((state) => {
    if (!mesh.current) return;
    
    // Animate positions
    particles.forEach((p, i) => {
      // Fall down
      p.y -= p.speed;
      
      // Reset if below floor
      if (p.y < -15) {
        p.y = 35;
        p.x = (Math.random() - 0.5) * 100;
        p.z = (Math.random() - 0.5) * 80 - 20;
      }

      // Gentle horizontal sway
      const t = state.clock.getElapsedTime();
      const sway = Math.sin(t * 0.5 + p.factor) * 0.02;

      // Update arrays
      positions[i * 3] = p.x + sway;
      positions[i * 3 + 1] = p.y;
      positions[i * 3 + 2] = p.z;
      
      // Update Scale in geometry if needed, though we use uniform size mostly
      // Here we just keep static random scale assigned at init
      scales[i] = p.scale;
    });

    mesh.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={mesh}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={positions.length / 3}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        map={texture}
        size={0.4}
        color="white"
        transparent
        opacity={0.8}
        depthWrite={false}
        sizeAttenuation={true}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
};

export default Snow;