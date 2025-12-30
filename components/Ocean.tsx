import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Octahedron } from '@react-three/drei';
import * as THREE from 'three';
import { SceneControlRef } from '../types';

interface OceanProps {
  flowRotation: React.MutableRefObject<number>;
  flowSpeed: React.MutableRefObject<number>;
  waveHeight: React.MutableRefObject<number>;
  controlRef: React.MutableRefObject<SceneControlRef>;
}

// Fixed Treasure Configurations
const TREASURE_DEFS = [
    { x: -30, z: -15, color: "#FF8C00", emissive: "#FFD700" }, // Left
    { x: 0, z: -20, color: "#FFD700", emissive: "#FFFF00" },   // Center
    { x: 30, z: -25, color: "#FFA500", emissive: "#FF8C00" },  // Right
];

const Ocean: React.FC<OceanProps> = ({ flowRotation, flowSpeed, waveHeight, controlRef }) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const tempColor = useMemo(() => new THREE.Color(), []);

  // Internal Physics State
  const accumulatedTime = useRef(0);
  const currentRotation = useRef(0);
  const currentHeight = useRef(1.0);
  
  // Projection helpers
  const tempV1 = useMemo(() => new THREE.Vector3(), []);
  const tempV2 = useMemo(() => new THREE.Vector3(), []);
  const vec3Ref = useRef(new THREE.Vector3());
  
  // --- TREASURE STATE ---
  // We manage 3 treasures independently via refs to avoid re-renders
  const treasuresRef = useRef(TREASURE_DEFS.map(def => ({
      ...def,
      found: false,
      foundTime: 0,
      hoverTime: 0, // For smooth hover transition
      group: React.createRef<THREE.Group>(),
      light: React.createRef<THREE.PointLight>()
  })));

  const COUNT = 15000; 

  // Instance Data (Random base positions)
  const baseData = useMemo(() => {
    const data = new Float32Array(COUNT * 4);
    let i = 0;
    for (let c = 0; c < COUNT; c++) {
      const x = (Math.random() - 0.5) * 160; 
      const z = (Math.random() * 70) - 60; 
      
      data[i] = x; 
      data[i + 1] = Math.random() * 0.8;     // Noise
      data[i + 2] = z;
      data[i + 3] = Math.random() * 0.5 + 0.8; // Scale
      i += 4;
    }
    return data;
  }, []);

  // Palette
  const colorDeep = new THREE.Color("#1e293b"); 
  const colorMid = new THREE.Color("#64748b");   
  const colorCrest = new THREE.Color("#bae6fd"); 
  const colorHighlight = new THREE.Color("#FFD700"); 

  useFrame((state, delta) => {
    if (!meshRef.current) return;

    // 1. SMOOTH INPUTS
    const rotLerp = 0.1;
    const heightLerp = 0.05;
    
    currentRotation.current += (flowRotation.current - currentRotation.current) * rotLerp;
    currentHeight.current += (waveHeight.current - currentHeight.current) * heightLerp;

    accumulatedTime.current += delta * flowSpeed.current;
    
    const time = accumulatedTime.current;
    const hMult = currentHeight.current; 
    const rot = currentRotation.current;

    const dirX = Math.cos(rot);
    const dirZ = Math.sin(rot);

    // 2. INTERACTION LOGIC
    const { gestureMode, cursorPos } = controlRef.current;
    const isCollectGesture = gestureMode === 'PINCH' || gestureMode === 'GRAB';
    
    // Cursor World Position (Z=0)
    const cursorWorldPos = vec3Ref.current.set(cursorPos.x, cursorPos.y, 0);
    
    // Pinch Deform Effect Center
    const pinchX = cursorPos.x * 5.0;
    const pinchZ = (cursorPos.y - 2.5) * -5.0; 
    const pinchRadius = 15.0; 

    // 3. WAVE SIMULATION CONSTANTS
    const amp1 = 2.0 * hMult; 
    const amp2 = 0.8 * hMult; 
    const amp3 = 0.4 * hMult; 

    const W1 = [0.12, amp1, 0.8, 1.0]; 
    const W2 = [0.35, amp2, 1.3, 0.7]; 
    const W3 = [0.80, amp3, 2.0, 0.5]; 

    // --- A. PROCESS OCEAN PARTICLES ---
    let idx = 0;
    for (let i = 0; i < COUNT; i++) {
      const bx = baseData[idx];
      const byNoise = baseData[idx + 1];
      const bz = baseData[idx + 2];
      const bScale = baseData[idx + 3];
      
      // Wave Math
      const proj = bx * dirX + bz * dirZ; 
      const phase1 = proj * W1[0] - time * W1[2];
      
      const x1 = Math.cos(phase1) * W1[1] * W1[3] * dirX;
      const z1 = Math.cos(phase1) * W1[1] * W1[3] * dirZ;
      const y1 = Math.sin(phase1) * W1[1];

      const proj2 = bx * (dirX * 0.9 - dirZ * 0.4) + bz * (dirZ * 0.9 + dirX * 0.4);
      const phase2 = proj2 * W2[0] - time * W2[2] + i * 0.001;
      const y2 = Math.sin(phase2) * W2[1];

      const phase3 = (bx + bz) * W3[0] - time * W3[2];
      const y3 = Math.cos(phase3) * W3[1];

      let finalX = bx + x1;
      let finalZ = bz + z1;
      const chaos = (byNoise - 0.5) * (hMult * 0.5); 
      let finalY = -5 + y1 + y2 + y3 + chaos; 

      // Pinch Deformation
      let pinchInfluence = 0;
      if (isCollectGesture) {
          const dx = finalX - pinchX;
          const dz = finalZ - pinchZ;
          const distSq = dx*dx + dz*dz;
          
          if (distSq < pinchRadius * pinchRadius) {
             const dist = Math.sqrt(distSq);
             const factor = Math.max(0, 1 - (dist / pinchRadius));
             const smoothFactor = factor * factor * (3 - 2 * factor);
             
             pinchInfluence = smoothFactor;
             finalY += smoothFactor * 4.0;
             finalX += dx * smoothFactor * 0.2;
             finalZ += dz * smoothFactor * 0.2;
          }
      }

      // Render Particle
      dummy.position.set(finalX, finalY, finalZ);
      
      const totalWaveHeight = y1 + y2 + y3;
      const heightNorm = totalWaveHeight / (3.5 * Math.max(1, hMult)); 
      
      let scaleDynamic = 0.35 * bScale * (1 + Math.max(0, heightNorm) * 1.5);
      dummy.scale.setScalar(scaleDynamic);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);

      // Color
      const crestThreshold = 0.4 / Math.max(1, hMult * 0.8); 
      if (heightNorm > crestThreshold) {
          tempColor.lerpColors(colorMid, colorCrest, (heightNorm - crestThreshold) * 3);
      } else {
          tempColor.lerpColors(colorDeep, colorMid, (heightNorm + 1.2) / 2);
      }
      
      if (pinchInfluence > 0.1) {
         tempColor.lerp(colorHighlight, pinchInfluence * 0.5);
      }
      meshRef.current.setColorAt(i, tempColor);
      
      idx += 4;
    }

    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;


    // --- B. PROCESS TREASURES ---
    treasuresRef.current.forEach((t) => {
        // 1. Calculate Local Position
        const bx = t.x;
        const bz = t.z;
        
        const proj = bx * dirX + bz * dirZ; 
        const phase1 = proj * W1[0] - time * W1[2];
        const y1 = Math.sin(phase1) * W1[1];
        
        const proj2 = bx * (dirX * 0.9 - dirZ * 0.4) + bz * (dirZ * 0.9 + dirX * 0.4);
        const phase2 = proj2 * W2[0] - time * W2[2];
        const y2 = Math.sin(phase2) * W2[1];

        const phase3 = (bx + bz) * W3[0] - time * W3[2];
        const y3 = Math.cos(phase3) * W3[1];
        
        const oceanHeight = -5 + y1 + y2 + y3;
        const floatY = oceanHeight + 0.3; 
        const treasureLocalPos = new THREE.Vector3(bx, floatY, bz);

        // 2. Logic: Detection using Screen Space Projection
        // This ensures "WYSIWYG" (What You See Is What You Get) hit detection
        let isHover = false;

        if (!t.found && t.group.current) {
            // Update the group matrix first so getWorldPosition is accurate for this frame
            t.group.current.position.copy(treasureLocalPos);
            t.group.current.updateMatrixWorld();
            
            // Get World Position (accounts for parent Group offset of -18)
            t.group.current.getWorldPosition(tempV1);
            
            // Project Treasure to NDC Screen Space (-1 to 1)
            tempV1.project(state.camera);
            
            // Project Cursor to NDC Screen Space
            // Note: We clone cursorWorldPos because project() mutates the vector
            tempV2.copy(cursorWorldPos).project(state.camera);
            
            // Calculate 2D Screen Distance (dx, dy)
            const dx = tempV1.x - tempV2.x;
            const dy = tempV1.y - tempV2.y;
            const distSq = dx*dx + dy*dy;
            
            // Threshold: 0.015 NDC squared (approx 6% of screen width)
            // Precise overlap
            if (distSq < 0.015) {
                isHover = true;
                
                if (isCollectGesture) {
                    t.found = true;
                    t.foundTime = time;
                    controlRef.current.triggerTreasureSequence();
                }
            }
        } else {
            // Reset logic
            if (time - t.foundTime > 20) {
                t.found = false;
            }
        }

        // Smooth Hover State
        t.hoverTime = THREE.MathUtils.lerp(t.hoverTime, isHover ? 1.0 : 0.0, 0.2);

        // 3. Visual Update
        if (t.group.current) {
            const grp = t.group.current;
            // Position was already set for matrix calculation, but we can set it again or leave it
            grp.position.copy(treasureLocalPos);

            if (t.found) {
                const elapsed = time - t.foundTime;
                // Celebrate Animation
                grp.position.y = floatY + Math.sin(elapsed * 4.0) * 0.5 + elapsed * 5.0; // Fly higher
                grp.rotation.y += delta * 15.0; // Spin Fast
                grp.rotation.z = Math.sin(elapsed * 10.0) * 0.2;
                grp.scale.setScalar(1.5 + Math.sin(elapsed * 5.0) * 0.5);
            } else {
                // Idle / Hover Animation
                grp.rotation.y += delta * (1.5 + t.hoverTime * 5.0); // Spin faster on hover
                grp.rotation.z = Math.sin(time) * 0.1;
                
                // Pulse on hover
                const breathe = 1.0 + Math.sin(time * 2.0) * 0.1 + t.hoverTime * 0.5;
                grp.scale.setScalar(breathe);
            }
        }

        // Light Update
        if (t.light.current) {
            const lt = t.light.current;
            if (t.found) {
                 lt.intensity = 80;
                 lt.distance = 50;
                 lt.color.set("#FF4500");
                 lt.position.set(bx, t.group.current!.position.y, bz);
            } else {
                 lt.intensity = 5 + t.hoverTime * 20; // Brighten on hover
                 lt.distance = 10 + t.hoverTime * 10;
                 
                 // Shift to White/Gold on hover
                 if (t.hoverTime > 0.5) {
                    lt.color.lerpColors(new THREE.Color(t.emissive), new THREE.Color("#FFFFFF"), 0.5);
                 } else {
                    lt.color.set(t.emissive);
                 }
                 lt.position.set(bx, floatY + 0.5, bz);
            }
        }
    });

  });

  return (
    <group>
        {/* Ocean Particles */}
        <instancedMesh 
            ref={meshRef} 
            args={[undefined, undefined, COUNT]} 
            frustumCulled={false} 
        >
            <sphereGeometry args={[0.25, 8, 8]} />
            <meshPhysicalMaterial 
                color="#FFFFFF"       
                emissive="#000000"    
                emissiveIntensity={0.5}
                roughness={0.1}      
                metalness={0.9}       
                reflectivity={1}
                clearcoat={1.0}
                toneMapped={false}
            />
        </instancedMesh>

        {/* 3 FIXED TREASURES */}
        {treasuresRef.current.map((t, i) => (
             <group key={i}>
                <group ref={t.group}>
                    {/* The Diamond */}
                    <mesh>
                        <octahedronGeometry args={[0.6, 0]} /> 
                        <meshStandardMaterial 
                            color={t.color}       
                            emissive={t.emissive}    
                            emissiveIntensity={2.0} 
                            toneMapped={false}
                            roughness={0.2}
                            metalness={1.0}
                        />
                    </mesh>
                    
                    {/* Hover Halo (Visual Feedback) */}
                    <mesh visible={!t.found}>
                         <ringGeometry args={[0.8, 1.0, 32]} />
                         <meshBasicMaterial 
                            color="#FFFFFF" 
                            transparent 
                            opacity={0} 
                            side={THREE.DoubleSide}
                         />
                    </mesh>

                    {/* Inner Core */}
                    <mesh>
                         <sphereGeometry args={[0.3, 16, 16]} />
                         <meshBasicMaterial color="#FFFFFF" transparent opacity={0.6} />
                    </mesh>
                </group>

                {/* Light */}
                <pointLight 
                    ref={t.light} 
                    decay={2} 
                />
             </group>
        ))}
    </group>
  );
};

export default Ocean;