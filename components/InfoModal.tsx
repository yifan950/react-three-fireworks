import React from 'react';
import { AppState } from '../types';

interface InfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: AppState;
}

const InfoModal: React.FC<InfoModalProps> = ({ isOpen, onClose, mode }) => {
  if (!isOpen) return null;

  const isMouseMode = mode === AppState.MAIN_NO_CAM;

  return (
    <div className="absolute inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-[fadeIn_0.3s_ease-out]">
      <div className="relative w-full max-w-3xl bg-[#0a0508]/90 border border-pink-500/30 rounded-3xl overflow-hidden shadow-[0_0_50px_rgba(236,72,153,0.2)] flex flex-col md:flex-row">
        
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-all"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
        </button>

        {/* Left: Visual/Decorative */}
        <div className="w-full md:w-1/3 bg-gradient-to-br from-pink-900/40 to-purple-900/40 p-8 flex flex-col justify-center items-center text-center relative overflow-hidden">
           <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-20"></div>
           <div className="w-32 h-32 rounded-full bg-gradient-to-tr from-pink-500 to-yellow-400 blur-[40px] opacity-60 absolute top-10 left-10 animate-pulse"></div>
           
           <p className="text-pink-200/60 font-mono text-xs tracking-widest relative z-10 mt-20 md:mt-0">
             {isMouseMode ? "MOUSE CONTROL" : "GESTURE CONTROL"}
           </p>
        </div>

        {/* Right: Content */}
        <div className="w-full md:w-2/3 p-8 md:p-10 text-left">
          
          {/* --- GOAL SECTION --- */}
          <div className="mb-6 border-b border-white/10 pb-6">
            <h2 className="flex items-center gap-3 text-2xl font-bold text-yellow-100 mb-2">
               <span className="text-2xl filter drop-shadow-lg">🏆</span> 
               <span>Target: Find the Treasure</span>
            </h2>
            <p className="text-white/70 text-sm leading-relaxed">
              Hidden beneath the dark waves are glowing golden artifacts. 
              Search for them to trigger the <span className="text-yellow-300 font-semibold">Grand Finale Fireworks</span>.
            </p>
          </div>
          
          {isMouseMode ? (
            /* --- MOUSE MODE CONTENT --- */
            <div className="space-y-4 animate-[fadeIn_0.5s_ease-out]">
              <h3 className="text-sm font-bold text-pink-400 uppercase tracking-wider mb-3">Controls</h3>
              
              <div className="space-y-3">
                <div className="bg-white/5 p-3 rounded-xl border border-white/10 flex gap-3 items-start">
                  <div className="bg-pink-500/20 text-pink-300 px-2 py-0.5 rounded text-[10px] font-mono whitespace-nowrap mt-0.5">MOVEMENT</div>
                  <p className="text-white/80 text-xs">
                    Move mouse to pan camera. Waves react to cursor.
                  </p>
                </div>

                <div className="bg-white/5 p-3 rounded-xl border border-white/10 flex gap-3 items-start">
                   <div className="bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded text-[10px] font-mono whitespace-nowrap mt-0.5">L-CLICK</div>
                   <p className="text-white/80 text-xs">
                    Launch Fireworks or <strong className="text-white">Collect Treasure</strong> (when hovering).
                   </p>
                </div>

                <div className="bg-white/5 p-3 rounded-xl border border-white/10 flex gap-3 items-start border-yellow-500/30">
                   <div className="bg-yellow-500/20 text-yellow-300 px-2 py-0.5 rounded text-[10px] font-mono whitespace-nowrap mt-0.5">R-CLICK</div>
                   <p className="text-white/80 text-xs">
                    Hold to <strong className="text-yellow-200">Search</strong>. Reveals hidden gold from afar.
                   </p>
                </div>
              </div>
            </div>
          ) : (
            /* --- GESTURE MODE CONTENT --- */
            <div className="space-y-4 animate-[fadeIn_0.5s_ease-out]">
              <h3 className="text-sm font-bold text-purple-400 uppercase tracking-wider mb-3">Hand Gestures</h3>
              
              <div className="space-y-3">
                 <div className="bg-white/5 p-3 rounded-xl border border-white/10 flex gap-3 items-start">
                    <div className="bg-white/10 text-white px-2 py-0.5 rounded text-[10px] font-mono whitespace-nowrap mt-0.5">✋ OPEN</div>
                    <p className="text-white/80 text-xs">
                      Move hand to look around.
                    </p>
                </div>

                <div className="bg-white/5 p-3 rounded-xl border border-white/10 flex gap-3 items-start">
                    <div className="bg-pink-500/20 text-pink-300 px-2 py-0.5 rounded text-[10px] font-mono whitespace-nowrap mt-0.5">✊ FIST</div>
                    <p className="text-white/80 text-xs">
                      Launch Fireworks.
                    </p>
                </div>

                <div className="bg-white/5 p-3 rounded-xl border border-white/10 flex gap-3 items-start border-yellow-500/30">
                    <div className="bg-yellow-500/20 text-yellow-300 px-2 py-0.5 rounded text-[10px] font-mono whitespace-nowrap mt-0.5">👌 PINCH</div>
                    <p className="text-white/80 text-xs">
                      <strong className="text-yellow-200">Search Mode</strong>. Reveals hidden treasures.
                    </p>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default InfoModal;