import React, { useEffect, useRef, useState } from 'react';
import { FilesetResolver, HandLandmarker, DrawingUtils } from '@mediapipe/tasks-vision';
import { SceneControlRef, FireworkState } from '../types';
import * as THREE from 'three';
import { GESTURE_SMOOTHING } from '../constants';

interface GestureControllerProps {
  controlRef: React.MutableRefObject<SceneControlRef>;
  currentState: React.MutableRefObject<FireworkState>;
}

const GestureController: React.FC<GestureControllerProps> = ({ controlRef, currentState }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0); // Trigger retry
  
  const lastVideoTime = useRef(-1);
  const requestRef = useRef<number>(0);
  
  // Smoothing Refs for Logic
  // Using a Vector3 to store smooth [x, y, scale]
  const smoothedState = useRef(new THREE.Vector3(0.5, 0.5, 0.2)); 

  // State Tracking
  const wasGrabbingRef = useRef(false);
  const lastFireworkTime = useRef(0);
  const FIREWORK_COOLDOWN = 800; 

  useEffect(() => {
    let handLandmarker: HandLandmarker | null = null;
    let localStream: MediaStream | null = null;
    let runningMode: 'IMAGE' | 'VIDEO' = 'VIDEO';

    const setup = async () => {
      setLoading(true);
      setErrorMsg(null);

      // 1. CHECK CAMERA PERMISSION FIRST
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
           throw new Error("API_UNSUPPORTED");
        }
        
        localStream = await navigator.mediaDevices.getUserMedia({ 
            video: { width: 320, height: 240 } 
        });
      } catch (err: any) {
        console.error("Camera Init Failed:", err);
        setLoading(false);
        if (err.message === "API_UNSUPPORTED") {
            setErrorMsg("Browser does not support Camera API.");
        } else {
            setErrorMsg("Camera Access Denied. Check browser permissions.");
        }
        return; // Stop here if no camera
      }

      // 2. LOAD WASM (Network Dependent Step A)
      let vision: any = null;
      try {
        // Use jsdelivr to match the version in index.html (0.10.8)
        // Mismatching versions between JS and WASM causes crash.
        vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.8/wasm"
        );
      } catch (err) {
         console.error("WASM Load Failed:", err);
         setLoading(false);
         // Cleanup Stream
         if (localStream) localStream.getTracks().forEach(track => track.stop());
         setErrorMsg("AI Core Failed (Network Blocked?).");
         return;
      }

      // 3. LOAD MODEL (Network Dependent Step B)
      try {
        // Official Google Storage Link
        // If this fails, user is likely behind a firewall blocking Google Services (e.g. China without VPN)
        handLandmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
            delegate: "GPU"
          },
          runningMode: runningMode,
          numHands: 1,
          minHandDetectionConfidence: 0.5,
          minHandPresenceConfidence: 0.5,
          minTrackingConfidence: 0.5
        });
        
        // 4. START VIDEO
        if (videoRef.current && localStream) {
          videoRef.current.srcObject = localStream;
          videoRef.current.addEventListener('loadeddata', predict);
        }
        setLoading(false);

      } catch (err) {
        console.error("Model Load Failed:", err);
        setLoading(false);
        // Clean up stream since we can't use it without the model
        if (localStream) {
            localStream.getTracks().forEach(track => track.stop());
        }
        // Specific error message for model failure
        setErrorMsg("Model Load Failed. (VPN required in some regions?)");
      }
    };

    const predict = async () => {
      if (!handLandmarker || !videoRef.current || !canvasRef.current) return;
      
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) return;

      if (video.currentTime !== lastVideoTime.current) {
        lastVideoTime.current = video.currentTime;
        const results = handLandmarker.detectForVideo(video, performance.now());

        ctx.save();
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const drawingUtils = new DrawingUtils(ctx);

        // --- Defaults ---
        let currentGesture: 'GRAB' | 'PINCH' | 'OPEN' | 'NONE' = 'NONE';
        let confidence = 0;
        
        // Debug metrics
        let debugSpeed = 0;
        let debugHeight = 0;

        if (results.landmarks && results.landmarks.length > 0) {
          const landmarks = results.landmarks[0]; 
          const handedness = results.handedness[0];
          confidence = handedness ? handedness[0].score : 0;
          controlRef.current.confidence = confidence;

          // Visual Feedback
          drawingUtils.drawConnectors(landmarks, HandLandmarker.HAND_CONNECTIONS, { color: "#FF69B4", lineWidth: 2 });
          drawingUtils.drawLandmarks(landmarks, { color: "#00FFFF", lineWidth: 1, radius: 2 });

          const wrist = landmarks[0];
          const thumbTip = landmarks[4];
          const indexTip = landmarks[8];
          const middleMCP = landmarks[9]; 
          const middleTip = landmarks[12];
          const ringTip = landmarks[16];
          const pinkyTip = landmarks[20];

          const dist = (p1: any, p2: any) => Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));

          // --- 1. GESTURE CLASSIFICATION ---
          
          // A. GRAB Detection: Fingers curled towards wrist
          const palmLen = dist(wrist, middleMCP) || 0.01;
          const tipsAvgDist = (dist(wrist, indexTip) + dist(wrist, middleTip) + dist(wrist, ringTip) + dist(wrist, pinkyTip)) / 4;
          const grabRatio = tipsAvgDist / palmLen;
          const isGrab = grabRatio < 1.4;

          // B. PINCH Detection: Thumb and Index tip very close
          const pinchDist = dist(thumbTip, indexTip);
          const isPinch = !isGrab && pinchDist < 0.08; // 0.08 is threshold for pinch, exclusive of Grab

          if (isGrab) {
            currentGesture = 'GRAB';
          } else if (isPinch) {
            currentGesture = 'PINCH';
          } else {
            currentGesture = 'OPEN';
          }

          // --- 2. SMOOTHING INPUTS ---
          const rawScale = dist(wrist, middleTip);
          const alpha = 0.1; 
          smoothedState.current.x = THREE.MathUtils.lerp(smoothedState.current.x, wrist.x, alpha);
          smoothedState.current.y = THREE.MathUtils.lerp(smoothedState.current.y, wrist.y, alpha);
          smoothedState.current.z = THREE.MathUtils.lerp(smoothedState.current.z, rawScale, alpha);

          const sY = smoothedState.current.y;
          const sScale = smoothedState.current.z;

          // --- 3. CURSOR UPDATE (WIDENED RANGE) ---
          const targetX = (1 - indexTip.x) * 50 - 25; 
          const targetY = (1 - indexTip.y) * 30 - 15; 
          
          controlRef.current.cursorPos.x += (targetX - controlRef.current.cursorPos.x) * 0.2;
          controlRef.current.cursorPos.y += (targetY - controlRef.current.cursorPos.y) * 0.2;

          // --- 4. LOGIC MAPPING ---
          
          if (currentGesture === 'GRAB') {
             if (!wasGrabbingRef.current) {
                const now = Date.now();
                if (now - lastFireworkTime.current > FIREWORK_COOLDOWN) {
                  controlRef.current.triggerFirework();
                  lastFireworkTime.current = now;
                }
             }
          }
          else if (currentGesture === 'PINCH') {
             // Handled in Ocean.tsx
          } 
          else {
             // === OPEN: VIEW & OCEAN CONTROL ===
             const NEUTRAL_SCALE = 0.22;
             const scaleDiff = sScale - NEUTRAL_SCALE;
             
             let targetSpeed = 1.0;
             if (scaleDiff > 0) {
                 targetSpeed = 1.0 + (scaleDiff * 35.0); 
             } else {
                 targetSpeed = 1.0 + (scaleDiff * 40.0);
             }
             targetSpeed = Math.max(-4.0, Math.min(12.0, targetSpeed));
             controlRef.current.setOceanSpeed(targetSpeed);
             debugSpeed = targetSpeed;

             const heightInput = 1.0 - sY;
             const targetHeight = 0.2 + (heightInput * heightInput) * 3.0; 
             controlRef.current.setWaveHeight(targetHeight);
             debugHeight = targetHeight;
          }
          
          wasGrabbingRef.current = (currentGesture === 'GRAB');

        } else {
          currentGesture = 'NONE';
          controlRef.current.confidence = 0;
          controlRef.current.setOceanSpeed(1.0);  
          controlRef.current.setWaveHeight(0.8);  
          wasGrabbingRef.current = false;
        }

        controlRef.current.gestureMode = currentGesture;

        // --- DRAW DEBUG HUD ---
        ctx.save();
        ctx.scale(-1, 1); 
        ctx.translate(-canvas.width, 0);
        
        // bg
        ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
        ctx.fillRect(10, 10, 240, 110);
        
        let borderColor = "#555";
        if (currentGesture === 'OPEN') borderColor = "#00FFFF";
        else if (currentGesture === 'GRAB') borderColor = "#FF00FF";
        else if (currentGesture === 'PINCH') borderColor = "#FFD700";

        ctx.strokeStyle = borderColor;
        ctx.lineWidth = 2;
        ctx.strokeRect(10, 10, 240, 110);

        ctx.font = "bold 12px monospace";
        ctx.fillStyle = "#FFF";
        ctx.fillText(`MODE: ${currentGesture}`, 20, 30);
        
        if (currentGesture === 'OPEN') {
            ctx.fillStyle = "#00FFFF";
            ctx.fillText("MOVE HAND TO LOOK AROUND", 20, 50);
            ctx.fillStyle = "#AAA"; ctx.fillText(`SPEED : ${debugSpeed.toFixed(1)}x`, 20, 70);
            drawBar(ctx, 120, 62, debugSpeed, 10, "#00FFFF");
            ctx.fillStyle = "#AAA"; ctx.fillText(`WAVES : ${debugHeight.toFixed(1)}`, 20, 90);
            drawBar(ctx, 120, 82, debugHeight, 3.0, "#FF69B4");
        } 
        else if (currentGesture === 'PINCH') {
            ctx.fillStyle = "#FFD700";
            ctx.fillText("PINCH: SEARCH TREASURE", 20, 60);
            ctx.fillText("Move to find Gold", 20, 80);
        }
        else if (currentGesture === 'GRAB') {
             ctx.fillStyle = "#FF00FF";
             ctx.fillText("GRAB: LAUNCH FIREWORK", 20, 60);
             ctx.fillText("Make it bloom!", 20, 80);
        }
        else {
            ctx.fillStyle = "#888";
            ctx.fillText("RAISE HAND TO START", 20, 60);
        }

        ctx.restore();
        ctx.restore();
      }
      
      requestRef.current = requestAnimationFrame(predict);
    };

    setup();

    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      if (handLandmarker) handLandmarker.close();
      if (localStream) {
         localStream.getTracks().forEach(track => track.stop());
      } else if (videoRef.current && videoRef.current.srcObject) {
         (videoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
      }
    };
  }, [controlRef, currentState, retryCount]); // Depend on retryCount to re-run setup

  return (
    <div className="absolute bottom-4 right-4 w-64 h-48 bg-black/40 backdrop-blur-md border border-pink-500/30 rounded-xl overflow-hidden shadow-[0_0_15px_rgba(255,105,180,0.3)] z-50">
      {loading && !errorMsg && <div className="absolute inset-0 flex items-center justify-center text-pink-300 text-xs animate-pulse">Initializing AI...</div>}
      
      {errorMsg && (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center bg-red-900/95 z-10">
          <p className="text-white text-xs font-bold mb-1">⚠ LOAD FAILED</p>
          <p className="text-white/80 text-[10px] leading-tight mb-3">{errorMsg}</p>
          
          <div className="flex gap-2">
              <button 
                onClick={() => setRetryCount(c => c + 1)}
                className="px-3 py-1 bg-white/10 hover:bg-white/20 border border-white/20 rounded text-[10px] text-white transition-colors"
              >
                RETRY
              </button>
          </div>
        </div>
      )}
      
      <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover transform -scale-x-100 opacity-40" autoPlay playsInline muted />
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full transform -scale-x-100" width={320} height={240} />
    </div>
  );
};

function drawBar(ctx: CanvasRenderingContext2D, x: number, y: number, val: number, max: number, color: string) {
    const w = 100;
    const h = 6;
    ctx.fillStyle = "#333";
    ctx.fillRect(x, y, w, h);
    const pct = Math.max(0, Math.min(1, val / max));
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w * pct, h);
}

export default GestureController;