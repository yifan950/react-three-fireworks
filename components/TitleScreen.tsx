import React from 'react';
import { AppState } from '../types';

interface TitleScreenProps {
  onStart: (mode: AppState) => void;
}

const TitleScreen: React.FC<TitleScreenProps> = ({ onStart }) => {
  return (
    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center p-4 overflow-hidden">
      {/* Background Ambient Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-pink-500/10 blur-[120px] rounded-full pointer-events-none animate-pulse" />

      <div className="relative bg-black/40 backdrop-blur-2xl border border-white/10 p-12 rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.5)] flex flex-col items-center text-center max-w-lg w-full transform transition-all hover:scale-[1.02] duration-700">
        
        <h1 className="text-5xl md:text-7xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-200 via-purple-200 to-indigo-200 mb-6 tracking-tight drop-shadow-[0_0_15px_rgba(255,105,180,0.5)]">
          Happy
          <br />
          New Year
          <span className="block text-6xl md:text-8xl text-pink-100 mt-4 drop-shadow-[0_0_35px_rgba(236,72,153,0.8)] animate-[pulse_3s_ease-in-out_infinite]">
            2026
          </span>
        </h1>

        <div className="w-24 h-0.5 bg-gradient-to-r from-transparent via-pink-500/50 to-transparent mb-8" />

        <p className="text-sm md:text-base text-pink-100/70 mb-10 max-w-sm mx-auto font-light leading-relaxed font-serif italic">
          A high-performance 3D experience celebrating the New Year. Explore a flowing ocean of memory, uncover treasures, and light up the sky.
        </p>

        <div className="flex flex-col gap-4 w-full relative z-10">
          {/* MOUSE MODE */}
          <button 
            onClick={() => onStart(AppState.MAIN_NO_CAM)}
            className="group relative px-8 py-4 bg-white/5 hover:bg-pink-500/20 border border-white/10 rounded-xl transition-all overflow-hidden"
          >
            <div className="absolute inset-0 w-0 bg-pink-500/10 transition-all duration-[250ms] ease-out group-hover:w-full opacity-0 group-hover:opacity-100" />
            <span className="relative flex items-center justify-center gap-3 text-white font-semibold tracking-wider group-hover:text-pink-200 transition-colors">
              <svg className="w-5 h-5 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122"></path>
              </svg>
              MOUSE MODE
            </span>
          </button>
          
          {/* GESTURE MODE */}
          <button 
            onClick={() => onStart(AppState.MAIN_WITH_CAM)}
            className="group relative px-8 py-3 bg-gradient-to-r from-pink-900/30 to-purple-900/30 border border-pink-500/30 rounded-xl transition-all hover:shadow-[0_0_25px_rgba(236,72,153,0.3)] hover:border-pink-500/50"
          >
             <span className="relative flex items-center justify-center gap-3 text-pink-100 font-semibold tracking-wider">
               <svg className="w-6 h-6 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
               <div className="flex flex-col items-start md:items-center">
                 <span>GESTURE MODE</span>
                 <span className="text-[10px] md:text-xs font-normal opacity-70 tracking-normal mt-0.5">
                   (REQUIRE CAMERA ACCESS)
                 </span>
               </div>
             </span>
          </button>
        </div>
        
        <div className="mt-8 flex flex-col items-center gap-2 opacity-60">
          <p className="text-xs text-pink-200 font-mono tracking-[0.2em] uppercase">
            Created by Yifan Liu
          </p>
        </div>
      </div>
    </div>
  );
};

export default TitleScreen;