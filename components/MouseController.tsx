import React, { useEffect } from 'react';
import { SceneControlRef } from '../types';
import * as THREE from 'three';

interface MouseControllerProps {
  controlRef: React.MutableRefObject<SceneControlRef>;
}

const MouseController: React.FC<MouseControllerProps> = ({ controlRef }) => {
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // Map screen coordinates to World Space (approx -25 to 25 X, -15 to 15 Y)
      // This matches the coordinate system used in Ocean.tsx and GestureController.tsx
      const x = (e.clientX / window.innerWidth) * 2 - 1; // -1 to 1
      const y = -(e.clientY / window.innerHeight) * 2 + 1; // 1 to -1

      // Sensitivity multipliers to cover the scene width
      const targetX = x * 25; 
      const targetY = y * 15;

      controlRef.current.cursorPos.x = targetX;
      controlRef.current.cursorPos.y = targetY;

      // Logic: Interaction
      // If no button pressed, we are in OPEN mode (Ocean Flow)
      // We can map mouse movement speed to ocean speed if desired, 
      // but for stability, we just set a default interactive state.
      if (controlRef.current.gestureMode === 'OPEN' || controlRef.current.gestureMode === 'NONE') {
         controlRef.current.gestureMode = 'OPEN';
         
         // Simple dynamic wave height based on Y position (higher mouse = calmer waves)
         const h = 0.5 + (1 - ((y + 1) / 2)) * 1.5;
         controlRef.current.setWaveHeight(Math.max(0.2, h));
         controlRef.current.setOceanSpeed(1.5);
      }
    };

    const handleMouseDown = (e: MouseEvent) => {
      if (e.button === 0) {
        // Left Click: GRAB (Firework + Collect)
        controlRef.current.gestureMode = 'GRAB';
        controlRef.current.triggerFirework();
      } else if (e.button === 2) {
        // Right Click: PINCH (Search Mode - High Precision)
        controlRef.current.gestureMode = 'PINCH';
      }
    };

    const handleMouseUp = () => {
      controlRef.current.gestureMode = 'OPEN';
    };

    // Disable context menu for Right Click interaction
    const handleContextMenu = (e: MouseEvent) => e.preventDefault();

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('contextmenu', handleContextMenu);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [controlRef]);

  return null;
};

export default MouseController;