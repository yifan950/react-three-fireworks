import React, { useRef, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Environment, OrbitControls } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';

import Ocean from './Ocean';
import Fireworks from './Fireworks';
import Cursor from './Cursor';
import MouseController from './MouseController';
import { AppState, FireworkState, SceneControlRef } from '../types';

interface MainSceneProps {
  mode: AppState;
  controlRef: React.MutableRefObject<SceneControlRef>;
  fireworkStateRef: React.MutableRefObject<FireworkState>;
}

// --- UPDATED COMPONENT: CameraRig ---
// Handles camera movement for BOTH Hand Gestures and Mouse
const CameraRig: React.FC<{ 
  controlsRef: React.MutableRefObject<OrbitControlsImpl | null>; 
  sceneControlRef: React.MutableRefObject<SceneControlRef>;
  mode: AppState;
}> = ({ controlsRef, sceneControlRef, mode }) => {
  
  useFrame((state, delta) => {
    if (!controlsRef.current) return;

    const { cursorPos, confidence, gestureMode } = sceneControlRef.current;
    
    // Determine if rig should be active
    let isActive = false;
    let sensitivityX = 0.1;
    let sensitivityY = 0.08;

    if (mode === AppState.MAIN_NO_CAM) {
        // MOUSE MODE: Always active, slightly lower sensitivity for smoother feel
        isActive = true;
        sensitivityX = 0.05; // Less drift on mouse to keep it steady
        sensitivityY = 0.04;
    } else {
        // GESTURE MODE: Active only when hand is confident and open
        // Higher sensitivity because hand movement range is physically smaller
        if (confidence > 0.5 && gestureMode === 'OPEN') {
            isActive = true;
            sensitivityX = 0.1;
            sensitivityY = 0.08;
        }
    }
    
    if (isActive) {
        const { x, y } = cursorPos;

        // Target Angles calculation
        const targetAzimuth = -(x * sensitivityX); 
        
        // Polar: Tilt up/down
        const targetPolar = (Math.PI / 2.3) - (y * sensitivityY);

        // Clamp Polar angle to avoid going underground or too high
        const clampedPolar = THREE.MathUtils.clamp(targetPolar, Math.PI / 3.5, Math.PI / 2 - 0.1);

        // Smooth Interpolation (Damping)
        const damp = 3.0 * delta; 
        const currentAzimuth = controlsRef.current.getAzimuthalAngle();
        const currentPolar = controlsRef.current.getPolarAngle();

        controlsRef.current.setAzimuthalAngle(
            THREE.MathUtils.lerp(currentAzimuth, targetAzimuth, damp)
        );
        controlsRef.current.setPolarAngle(
            THREE.MathUtils.lerp(currentPolar, clampedPolar, damp)
        );
        
        controlsRef.current.update();
    }
  });

  return null;
};

const MainScene: React.FC<MainSceneProps> = ({ mode, controlRef, fireworkStateRef }) => {
  // Ocean State Refs
  const flowRotRef = useRef(0);
  const flowSpeedRef = useRef(2.0); // Default speed
  const waveHeightRef = useRef(1.0); // Default height multiplier
  
  // Ref for OrbitControls to allow manual manipulation
  const controlsRef = useRef<OrbitControlsImpl>(null);

  // Bind the control methods to the ref so GestureController can access them
  useEffect(() => {
    controlRef.current.triggerFirework = () => {
      if (fireworkStateRef.current !== FireworkState.CONTINUOUS) {
        fireworkStateRef.current = FireworkState.RISING;
      }
    };
    controlRef.current.triggerExplode = () => {
      if (fireworkStateRef.current !== FireworkState.CONTINUOUS) {
        fireworkStateRef.current = FireworkState.EXPLODING;
      }
    };
    
    // Smooth setters
    controlRef.current.setOceanFlow = (val: number) => {
      flowRotRef.current = val; 
    };
    controlRef.current.setOceanSpeed = (val: number) => {
      flowSpeedRef.current = val;
    };
    controlRef.current.setWaveHeight = (val: number) => {
      waveHeightRef.current = val;
    };

    if (!controlRef.current.cursorPos) {
      controlRef.current.cursorPos = new THREE.Vector3(0, 0, 0);
    }
  }, [controlRef, fireworkStateRef]);

  const handleClick = () => {
    // Only default click handler if NO mode is active (fallback)
    // MouseController handles clicks in MAIN_NO_CAM
    if (mode === AppState.MAIN_NO_CAM) return; 

    if (fireworkStateRef.current === FireworkState.CONTINUOUS) return;

    if (fireworkStateRef.current === FireworkState.IDLE) {
      fireworkStateRef.current = FireworkState.RISING;
    } else if (fireworkStateRef.current === FireworkState.RISING) {
      fireworkStateRef.current = FireworkState.EXPLODING;
    } else {
      fireworkStateRef.current = FireworkState.RISING;
    }
  };

  return (
    <>
      {/* Logic Controller for Mouse Mode */}
      {mode === AppState.MAIN_NO_CAM && <MouseController controlRef={controlRef} />}

      <Canvas
        shadows
        camera={{ position: [0, 4, 14], fov: 45 }} 
        dpr={[1, 1.5]} 
        onClick={handleClick}
        className="w-full h-full cursor-pointer"
        gl={{ antialias: false, toneMapping: THREE.ReinhardToneMapping, toneMappingExposure: 1.5 }}
      >
        <color attach="background" args={['#050103']} />
        
        {/* Lighting Architecture */}
        <spotLight position={[15, 20, 10]} angle={0.6} penumbra={0.5} intensity={300} color="#ff80bf" castShadow />
        <spotLight position={[-20, 10, -5]} angle={1.0} penumbra={1} intensity={200} color="#40e0d0" />
        <pointLight position={[0, -12, 10]} intensity={40} color="#ccddee" distance={40} />
        <ambientLight intensity={1.0} color="#202030" />
        
        <Environment preset="city" blur={0.6} background={false} />

        {/* 3D Content */}
        <group position={[0, -18, 0]}>
          <Ocean 
            flowRotation={flowRotRef} 
            flowSpeed={flowSpeedRef}
            waveHeight={waveHeightRef}
            controlRef={controlRef}
          />
          {/* Pass controlRef to allow timestamp detection */}
          <Fireworks fireworkState={fireworkStateRef} controlRef={controlRef} />
        </group>

        {/* Visual Cursor: Visible in BOTH Main modes now */}
        {(mode === AppState.MAIN_WITH_CAM || mode === AppState.MAIN_NO_CAM) && (
          <Cursor controlRef={controlRef} />
        )}

        {/* Camera Rig: Controls view based on input mode */}
        <CameraRig 
          controlsRef={controlsRef} 
          sceneControlRef={controlRef} 
          mode={mode} 
        />

        {/* Post Processing */}
        <EffectComposer enableNormalPass={false}>
          <Bloom luminanceThreshold={0.65} mipmapBlur intensity={1.5} radius={0.5} />
          <Vignette eskil={false} offset={0.1} darkness={1.0} />
        </EffectComposer>
        
        <OrbitControls 
          ref={controlsRef}
          // We disable manual rotation in Mouse Mode because CameraRig handles it
          enableRotate={mode !== AppState.MAIN_NO_CAM} 
          enableZoom={false} 
          enablePan={false} 
          maxPolarAngle={Math.PI / 2 - 0.05} 
          minPolarAngle={Math.PI / 3}
          enableDamping={true}
          dampingFactor={0.05}
        />
      </Canvas>
    </>
  );
};

export default MainScene;