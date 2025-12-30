import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { FIREWORK_COUNT, COLORS } from '../constants';
import { FireworkState, SceneControlRef } from '../types';

interface FireworksProps {
  fireworkState: React.MutableRefObject<FireworkState>;
  controlRef?: React.MutableRefObject<SceneControlRef>; 
}

type RocketData = {
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  baseColor: THREE.Color;
  active: boolean;
  type: 'MAIN' | 'SUB';
  scale: number;
};

type ParticleData = {
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  baseColor: THREE.Color;
  currentLife: number;
  decayRate: number;
  scale: number;
  baseScale: number;
  mode: 'TRAIL' | 'EXPLOSION' | 'HIDDEN';
};

const Fireworks: React.FC<FireworksProps> = ({ fireworkState }) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const tempColor = useMemo(() => new THREE.Color(), []);
  
  const prevState = useRef<FireworkState>(FireworkState.IDLE);
  const particles = useRef<ParticleData[]>([]);
  
  // --- ROCKET POOLING SYSTEM ---
  // Increased pool size to 100 to handle the 30-shot bursts + random shots without overflow
  const ROCKET_POOL_SIZE = 100;
  const rockets = useRef<RocketData[]>([]);
  
  // Salvo / Burst Queue
  const salvoQueue = useRef(0);
  const salvoTimer = useRef(0);
  const autoLaunchTimer = useRef(0);

  const GRAVITY = 0.005;   
  const DRAG = 0.96;       
  const EMISSIVE_BOOST = 3.0; 

  const LAUNCH_Y = -4; 
  const MIN_EXPLOSION_Y = 20.0; 
  const MAX_EXPLOSION_Y = 35.0;

  useEffect(() => {
    // Init Particles
    const tempParticles: ParticleData[] = [];
    for (let i = 0; i < FIREWORK_COUNT; i++) {
      tempParticles.push({
        pos: new THREE.Vector3(0, -500, 0),
        vel: new THREE.Vector3(0, 0, 0),
        baseColor: new THREE.Color(),
        currentLife: 0,
        decayRate: 0.01,
        scale: 0,
        baseScale: 1,
        mode: 'HIDDEN',
      });
    }
    particles.current = tempParticles;

    // Init Rocket Pool
    const tempRockets: RocketData[] = [];
    for(let i=0; i<ROCKET_POOL_SIZE; i++) {
      tempRockets.push({
        pos: new THREE.Vector3(),
        vel: new THREE.Vector3(),
        baseColor: new THREE.Color(),
        active: false,
        type: 'SUB', // Default
        scale: 1,
      });
    }
    rockets.current = tempRockets;
  }, []);

  // Helper: Find a free rocket in the pool
  const getFreeRocketIndex = () => {
    return rockets.current.findIndex(r => !r.active);
  };

  const spawnRocket = (x: number, z: number, isMain: boolean, parentBaseColor: THREE.Color) => {
     const idx = getFreeRocketIndex();
     if (idx === -1) return; // Pool empty
     
     const r = rockets.current[idx];
     r.active = true;
     r.type = isMain ? 'MAIN' : 'SUB';
     r.pos.set(x, LAUNCH_Y, z);
     r.baseColor.copy(parentBaseColor);
     if (!isMain) r.baseColor.offsetHSL(Math.random() * 0.1, 0, 0);

     if (isMain) {
        r.vel.set(
            (Math.random() - 0.5) * 0.15, 
            0.65 + Math.random() * 0.1, 
            (Math.random() - 0.5) * 0.1
        );
        r.scale = 2.0;
     } else {
        const angle = Math.random() * Math.PI * 2;
        r.vel.set(
            (Math.random() - 0.5) * 0.1 + Math.cos(angle) * 0.02,
            0.60 + Math.random() * 0.1,
            (Math.random() - 0.5) * 0.1 + Math.sin(angle) * 0.02
        );
        r.scale = 1.2;
     }
  };

  const launchCluster = (forceRandomLocation = false) => {
    const palette = [COLORS.pink, COLORS.gold, COLORS.silver, COLORS.ocean];
    const mainBaseColor = palette[Math.floor(Math.random() * palette.length)].clone();
    
    // Launch Center
    let launchX = (Math.random() - 0.5) * 40; 
    let launchZ = (Math.random() - 0.5) * 10 - 5;
    
    if (forceRandomLocation) {
        launchX = (Math.random() - 0.5) * 120; // Wider
        launchZ = (Math.random() - 0.5) * 60 - 10;
    }

    // 1. Main Rocket
    spawnRocket(launchX, launchZ, true, mainBaseColor);

    // 2. Sub Rockets (3 to 5)
    const subCount = 3 + Math.floor(Math.random() * 3);
    for (let i = 0; i < subCount; i++) {
       const offsetX = (Math.random() - 0.5) * 5;
       const offsetZ = (Math.random() - 0.5) * 5;
       spawnRocket(launchX + offsetX, launchZ + offsetZ, false, mainBaseColor);
    }
  };

  const explodeAllActive = () => {
    const activeRockets = rockets.current.filter(r => r.active && r.vel.y < 0.2); 
    if (activeRockets.length === 0) return;

    const particlesPerExplosion = Math.floor(FIREWORK_COUNT / (activeRockets.length + 5)); 
    let particleCursor = 0;

    activeRockets.forEach(rocket => {
       const startIdx = particleCursor;
       const endIdx = Math.min(startIdx + particlesPerExplosion, FIREWORK_COUNT);
       
       const visualY = THREE.MathUtils.clamp(rocket.pos.y, MIN_EXPLOSION_Y, MAX_EXPLOSION_Y);
       const explosionCenter = rocket.pos.clone();
       explosionCenter.y = visualY;

       const blastForce = rocket.type === 'MAIN' ? 0.6 : 0.4;
       
       for (let i = startIdx; i < endIdx; i++) {
          const p = particles.current[i];
          
          p.pos.copy(explosionCenter);
          
          const u = Math.random();
          const v = Math.random();
          const theta = 2 * Math.PI * u;
          const phi = Math.acos(2 * v - 1);
          const vol = Math.cbrt(Math.random()); 
          const speed = blastForce * (0.5 + vol * 0.5); 

          p.vel.set(
            speed * Math.sin(phi) * Math.cos(theta),
            speed * Math.sin(phi) * Math.sin(theta),
            speed * Math.cos(phi)
          );
          
          p.baseColor.copy(rocket.baseColor);
          if (Math.random() < 0.15) p.baseColor.setScalar(2.0);
          else p.baseColor.offsetHSL(Math.random() * 0.1 - 0.05, 0, Math.random() * 0.1);

          p.currentLife = 1.0;
          p.decayRate = 0.005 + Math.random() * 0.01; 
          p.baseScale = (rocket.type === 'MAIN' ? 0.45 : 0.3) * (0.5 + Math.random() * 1.0);
          p.scale = p.baseScale;
          p.mode = 'EXPLOSION';
       }
       
       particleCursor = endIdx;
       rocket.active = false; 
    });
  };

  useFrame((state, delta) => {
    if (!meshRef.current) return;
    const currentState = fireworkState.current;

    // --- 1. STATE & TRIGGER LOGIC ---
    
    // Increased reward burst to 30
    if (currentState === FireworkState.CONTINUOUS && prevState.current !== FireworkState.CONTINUOUS) {
        salvoQueue.current += 30;
        salvoTimer.current = 0;
    }
    
    if (currentState === FireworkState.RISING && prevState.current !== FireworkState.RISING) {
        launchCluster();
        fireworkState.current = FireworkState.IDLE; 
    }
    
    if (currentState === FireworkState.EXPLODING) {
        explodeAllActive();
        fireworkState.current = FireworkState.IDLE;
    }

    prevState.current = currentState;

    // --- 2. AUTOMATION ---
    if (currentState === FireworkState.CONTINUOUS) {
        autoLaunchTimer.current -= delta;
        if (autoLaunchTimer.current <= 0) {
            launchCluster(true);
            autoLaunchTimer.current = 0.5 + Math.random() * 1.0; 
        }
    }
    
    // Process Reward Queue
    if (salvoQueue.current > 0) {
        salvoTimer.current -= delta;
        if (salvoTimer.current <= 0) {
            launchCluster(true); // Fire!
            salvoQueue.current--;
            salvoTimer.current = 0.1; // Faster: 100ms delay for chaos
        }
    }

    if (rockets.current.some(r => r.active && r.vel.y < 0.1)) {
        explodeAllActive();
    }

    // --- 3. PHYSICS ---
    rockets.current.forEach((r, idx) => {
        if (!r.active) return;
        r.pos.add(r.vel);
        r.vel.y -= GRAVITY * 0.5;
        r.vel.multiplyScalar(0.98);

        const trailIdx = Math.floor(Math.random() * FIREWORK_COUNT);
        const p = particles.current[trailIdx];
        if (p.mode === 'HIDDEN' || p.currentLife < 0.2) {
            p.mode = 'TRAIL';
            p.pos.copy(r.pos);
            p.baseColor.copy(r.baseColor);
            p.scale = 0.6 * r.scale;
            p.currentLife = 0.4; 
            p.decayRate = 0.05;
        }
    });

    let i = 0;
    const len = particles.current.length;
    for (i = 0; i < len; i++) {
        const p = particles.current[i];
        if (p.mode === 'HIDDEN') {
            dummy.position.set(0, -9999, 0);
            dummy.scale.setScalar(0);
            dummy.updateMatrix();
            meshRef.current.setMatrixAt(i, dummy.matrix);
            continue;
        }

        if (p.mode === 'TRAIL') {
            p.currentLife -= p.decayRate;
            if (p.currentLife <= 0) p.mode = 'HIDDEN';
            
            dummy.position.copy(p.pos);
            dummy.scale.setScalar(p.scale * p.currentLife);
            dummy.updateMatrix();
            meshRef.current.setMatrixAt(i, dummy.matrix);
            
            tempColor.copy(p.baseColor).multiplyScalar(EMISSIVE_BOOST);
            meshRef.current.setColorAt(i, tempColor);
        }
        else if (p.mode === 'EXPLOSION') {
            p.pos.add(p.vel);
            p.vel.multiplyScalar(DRAG);
            p.vel.y -= GRAVITY;
            p.currentLife -= p.decayRate;

            if (p.currentLife <= 0) {
                p.mode = 'HIDDEN';
            } else {
                let intensity = p.currentLife > 0.7 ? 1.0 : p.currentLife / 0.7;
                dummy.position.copy(p.pos);
                dummy.scale.setScalar(p.scale * (0.2 + 0.8 * intensity));
                dummy.rotation.x += p.vel.z;
                dummy.rotation.z += p.vel.x;
                dummy.updateMatrix();
                meshRef.current.setMatrixAt(i, dummy.matrix);
                
                tempColor.copy(p.baseColor).multiplyScalar(EMISSIVE_BOOST * intensity);
                meshRef.current.setColorAt(i, tempColor);
            }
        }
    }

    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;
  });

  return (
    <instancedMesh 
      ref={meshRef} 
      args={[undefined, undefined, FIREWORK_COUNT]} 
      frustumCulled={false}
    >
      <dodecahedronGeometry args={[0.25, 0]} />
      <meshStandardMaterial 
        color="#000000"       
        emissive="#ffffff"    
        emissiveIntensity={3} 
        toneMapped={false}    
        transparent={true}
        depthWrite={false}    
        blending={THREE.AdditiveBlending} 
      />
    </instancedMesh>
  );
};

export default Fireworks;