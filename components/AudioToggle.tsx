import React, { useEffect, useRef, useState } from 'react';
import { BG_MUSIC_URL } from '../constants';

type AudioStatus = 'loading' | 'playing' | 'muted' | 'blocked';

const AudioToggle: React.FC = () => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [status, setStatus] = useState<AudioStatus>('loading');
  const [isMuted, setIsMuted] = useState(false);

  useEffect(() => {
    // 1. Initialize Audio Object
    const audio = new Audio(BG_MUSIC_URL);
    audio.loop = true;
    audio.volume = 0.4; // Moderate volume
    audioRef.current = audio;

    // 2. Define Unlock Function (for browser autoplay policies)
    const unlockAudio = () => {
      if (audio.paused) {
        audio.play()
          .then(() => {
            // Respect the mute state if user toggled it while blocked
            setStatus(audio.muted ? 'muted' : 'playing');
          })
          .catch((e) => console.warn("Audio unlock failed:", e));
      }
      // Remove listeners once unlocked
      document.removeEventListener('click', unlockAudio);
      document.removeEventListener('touchstart', unlockAudio);
      document.removeEventListener('keydown', unlockAudio);
    };

    // 3. Attempt Initial Autoplay
    const attemptAutoplay = async () => {
      try {
        await audio.play();
        setStatus('playing');
      } catch (err) {
        console.warn("Autoplay blocked by browser. Waiting for interaction.", err);
        setStatus('blocked');
        
        // Add global listeners to catch the FIRST user interaction anywhere on the page
        document.addEventListener('click', unlockAudio);
        document.addEventListener('touchstart', unlockAudio);
        document.addEventListener('keydown', unlockAudio);
      }
    };

    attemptAutoplay();

    // Cleanup
    return () => {
      audio.pause();
      audioRef.current = null;
      document.removeEventListener('click', unlockAudio);
      document.removeEventListener('touchstart', unlockAudio);
      document.removeEventListener('keydown', unlockAudio);
    };
  }, []);

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio) return;

    // If currently blocked or paused, interaction with this button should resume it
    if (status === 'blocked' || audio.paused) {
      audio.play()
        .then(() => {
           // We are toggling, so if we were muted, unmute. If unmuted, mute.
           // Exception: If we were blocked, we probably want to start unmuted unless specifically set.
           const newMuteState = status === 'blocked' ? false : !isMuted;
           audio.muted = newMuteState;
           setIsMuted(newMuteState);
           setStatus(newMuteState ? 'muted' : 'playing');
        })
        .catch(e => console.error("Play failed on toggle:", e));
      return;
    }

    // Normal toggle behavior
    const nextMuteState = !isMuted;
    audio.muted = nextMuteState;
    setIsMuted(nextMuteState);
    setStatus(nextMuteState ? 'muted' : 'playing');
  };

  // Helper for status text
  const getStatusText = () => {
    switch (status) {
      case 'blocked': return 'TAP TO UNMUTE';
      case 'muted': return 'MUTED';
      case 'playing': return 'PLAYING';
      default: return 'LOADING...';
    }
  };

  return (
    <button 
      onClick={toggle}
      className={`absolute top-6 right-6 z-50 flex items-center gap-3 px-4 py-2 rounded-full backdrop-blur-md border transition-all duration-300 group
        ${status === 'blocked' ? 'bg-pink-500/20 border-pink-500 animate-pulse' : 'bg-black/20 hover:bg-white/10 border-white/20'}
      `}
    >
      <div className="flex flex-col items-end">
        <span className={`text-[10px] font-mono tracking-widest ${status === 'blocked' ? 'text-pink-300' : 'text-white/50'}`}>
          AUDIO
        </span>
        <span className={`text-xs font-bold tracking-wider ${status === 'playing' ? 'text-pink-400' : 'text-white'}`}>
          {getStatusText()}
        </span>
      </div>

      <div className={`p-2 rounded-full border border-white/10 ${isMuted || status === 'blocked' ? 'text-white/70' : 'text-pink-400 bg-pink-500/10'}`}>
        {isMuted || status === 'blocked' ? (
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><line x1="23" y1="9" x2="17" y2="15"></line><line x1="17" y1="9" x2="23" y2="15"></line></svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>
        )}
      </div>
    </button>
  );
};

export default AudioToggle;