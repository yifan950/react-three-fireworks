import React, { useState, useRef } from 'react';
import TitleScreen from './components/TitleScreen';
import MainScene from './components/MainScene';
import GestureController from './components/GestureController';
import AudioToggle from './components/AudioToggle';
import InfoModal from './components/InfoModal';
import { AppState, SceneControlRef, FireworkState } from './types';
import * as THREE from 'three';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.TITLE);
  const [showTreasureMessage, setShowTreasureMessage] = useState(false);
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  
  // Add a key to force React to re-mount the reward banner, triggering animations every time
  const [rewardKey, setRewardKey] = useState(0);

  // Shared References for high-performance communication between logic and Canvas
  // Using useRef prevents react re-renders which is crucial for 60fps WebGL
  const fireworkStateRef = useRef<FireworkState>(FireworkState.IDLE);
  
  // Timer Refs to allow resetting
  const fwTimerRef = useRef<number | null>(null);
  const msgTimerRef = useRef<number | null>(null);
  
  const controlRef = useRef<SceneControlRef>({
    triggerFirework: () => {},
    triggerExplode: () => {},
    triggerTreasureSequence: () => {
       // Reset existing timers if active (Extension Logic)
       if (fwTimerRef.current) clearTimeout(fwTimerRef.current);
       if (msgTimerRef.current) clearTimeout(msgTimerRef.current);

       // Force UI Refresh (Animation Restart)
       setRewardKey(prev => prev + 1);

       // Signal the burst logic in Fireworks.tsx
       controlRef.current.lastRewardTime = Date.now();

       // Start Sequence
       fireworkStateRef.current = FireworkState.CONTINUOUS;
       setShowTreasureMessage(true);
       
       // Set new timeouts (20 seconds)
       fwTimerRef.current = window.setTimeout(() => {
           fireworkStateRef.current = FireworkState.IDLE;
           fwTimerRef.current = null;
       }, 20000);

       msgTimerRef.current = window.setTimeout(() => {
           setShowTreasureMessage(false);
           msgTimerRef.current = null;
       }, 18000);
    },
    setOceanFlow: () => {},
    setOceanSpeed: () => {},
    setWaveHeight: () => {},
    cursorPos: new THREE.Vector3(0, 0, 0),
    gestureMode: 'NONE',
    confidence: 0,
    lastRewardTime: 0
  });

  const handleStart = (mode: AppState) => {
    setAppState(mode);
    // Auto-open instructions on start
    setIsInfoOpen(true);
  };

  const handleReturnToMenu = () => {
    // React will unmount MainScene (and GestureController), cleaning up the Webcam automatically
    setAppState(AppState.TITLE);
    // Reset state flags if needed
    fireworkStateRef.current = FireworkState.IDLE;
    setShowTreasureMessage(false);
    setIsInfoOpen(false);
  };

  return (
    <div className="relative w-screen h-screen bg-[#050103] overflow-hidden selection:bg-pink-500/30">
      
      {appState === AppState.TITLE ? (
        <TitleScreen onStart={handleStart} />
      ) : (
        <>
          {/* Main 3D Scene */}
          <div className="absolute inset-0 z-0">
            <MainScene 
              mode={appState} 
              controlRef={controlRef} 
              fireworkStateRef={fireworkStateRef} 
            />
          </div>

          {/* 2026 Atmospheric Overlay */}
          <div className="absolute top-[12%] left-1/2 -translate-x-1/2 z-[1] pointer-events-none select-none mix-blend-plus-lighter w-full text-center">
            <h1 className="font-['Playfair_Display'] text-[15vh] md:text-[25vh] leading-none font-bold text-transparent bg-clip-text bg-gradient-to-b from-white/30 to-white/5 blur-[1px] animate-[pulse_4s_ease-in-out_infinite] drop-shadow-[0_0_40px_rgba(255,105,180,0.4)]">
              2026
            </h1>
          </div>
          
          {/* Treasure Found Overlay */}
          <div 
            className={`absolute inset-0 z-40 pointer-events-none flex flex-col items-center justify-center text-center transition-opacity duration-[2000ms] ${showTreasureMessage ? 'opacity-100' : 'opacity-0'}`}
          >
             {/* Key ensures this block re-mounts to replay animations on every hit */}
             <div key={rewardKey} className="bg-black/30 backdrop-blur-sm p-12 rounded-full shadow-[0_0_100px_rgba(255,215,0,0.2)] max-w-2xl transform translate-y-10 border border-white/5 animate-[bounce_1s_ease-out]">
                <h2 className="text-4xl md:text-5xl font-['Playfair_Display'] text-yellow-100 mb-4 drop-shadow-[0_0_15px_rgba(255,215,0,0.6)] animate-pulse">
                   Treasure Collected!
                </h2>
                
                {/* REWARD BADGE */}
                <div className="mb-6 inline-flex items-center gap-3 px-6 py-3 rounded-full bg-gradient-to-r from-purple-900/60 to-pink-900/60 border border-yellow-400/40 backdrop-blur-md shadow-[0_0_30px_rgba(255,215,0,0.2)]">
                   <span className="text-2xl filter drop-shadow-lg animate-[spin_3s_linear_infinite]">🎆</span>
                   <span className="text-yellow-300 font-bold tracking-widest text-sm md:text-lg drop-shadow-md">
                     REWARD: FIREWORK EXTENDED
                   </span>
                   <span className="text-2xl filter drop-shadow-lg animate-[spin_3s_linear_infinite_reverse]">🎆</span>
                </div>

                <p className="text-xl md:text-2xl text-white/80 font-serif leading-relaxed italic drop-shadow-md">
                   May 2026 be filled with precious memories,<br/> waiting to be discovered beneath the waves.
                </p>
             </div>
          </div>

          {/* TOP LEFT: RETURN TO MENU BUTTON */}
          <button
            onClick={handleReturnToMenu}
            className="absolute top-6 left-6 z-50 flex items-center gap-2 px-5 py-2.5 rounded-full bg-black/20 hover:bg-white/10 border border-white/20 backdrop-blur-md transition-all text-white/70 hover:text-white group hover:border-pink-500/50"
          >
            <svg className="w-4 h-4 transition-transform group-hover:-translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
            </svg>
            <span className="text-xs font-bold tracking-widest">MENU</span>
          </button>
          
          {/* INFO BUTTON (RESTORED) */}
          <button
            onClick={() => setIsInfoOpen(true)}
            className="absolute top-6 left-36 z-50 flex items-center gap-2 px-3 py-2.5 rounded-full bg-black/20 hover:bg-white/10 border border-white/20 backdrop-blur-md transition-all text-white/70 hover:text-white group hover:border-pink-500/50"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            <span className="text-xs font-bold tracking-widest hidden md:inline">HELP</span>
          </button>

          {/* TOP RIGHT: AUDIO */}
          <AudioToggle />
          
          {/* INFO MODAL (RESTORED) */}
          <InfoModal 
            isOpen={isInfoOpen} 
            onClose={() => setIsInfoOpen(false)} 
            mode={appState} 
          />
          
          <div className="absolute bottom-6 left-6 z-10 pointer-events-none">
            <p className="text-white/40 text-sm font-mono tracking-widest">
              {appState === AppState.MAIN_WITH_CAM 
                ? "✋ OPEN: VIEW | ✊ GRAB: FIRE | 👌 PINCH: SEARCH" 
                : "🖱 MOVE: VIEW | LEFT CLICK: FIRE | RIGHT CLICK: SEARCH"}
            </p>
          </div>

          {/* Gesture Logic (Non-visual mostly, except preview) */}
          {appState === AppState.MAIN_WITH_CAM && (
            <GestureController 
              controlRef={controlRef} 
              currentState={fireworkStateRef} 
            />
          )}
        </>
      )}
    </div>
  );
};

export default App;