import { Vector3 } from 'three';

export enum AppState {
  TITLE = 'TITLE',
  MAIN_NO_CAM = 'MAIN_NO_CAM',
  MAIN_WITH_CAM = 'MAIN_WITH_CAM',
}

export enum FireworkState {
  IDLE = 'IDLE',
  RISING = 'RISING', // The beam phase
  EXPLODING = 'EXPLODING', // The burst phase
  CONTINUOUS = 'CONTINUOUS', // 20s Grand Finale
}

// Shared ref type for controlling the scene from outside React state (perf)
export type SceneControlRef = {
  triggerFirework: () => void; // Switch to RISING
  triggerExplode: () => void; // Switch to EXPLODING
  triggerTreasureSequence: () => void; // Triggers the hidden treasure event
  setOceanFlow: (rotation: number) => void; // -1 to 1, modifies flow angle
  setOceanSpeed: (speed: number) => void; // Controls forward/reverse flow
  setWaveHeight: (height: number) => void; // Controls amplitude
  cursorPos: Vector3; // For visual cursor
  gestureMode: 'GRAB' | 'PINCH' | 'OPEN' | 'NONE'; // OPEN: Control Ocean, GRAB: Fireworks (烟花), PINCH: Search Treasure
  confidence: number; // 0 to 1
  lastRewardTime: number; // Timestamp of the last treasure found event (to trigger bursts)
};