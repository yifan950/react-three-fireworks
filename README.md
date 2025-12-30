# Happy New Year 2026 🎆

A high-performance interactive 3D experience celebrating the New Year. Explore a flowing ocean of memory, uncover hidden golden treasures, and light up the sky with fireworks using nothing but your hands.

**👉 Experience it live here:** [https://happy-new-year-2026-a-gift-from-yifan.netlify.app/](https://happy-new-year-2026-a-gift-from-yifan.netlify.app/)

## ✨ Features

- **🌊 GPU-Instanced Ocean**: Simulating 15,000+ interactive particles that react to wave physics and input.
- **✋ AI Gesture Control**: Powered by Google MediaPipe.
  - **Open Hand**: Pan camera & control wave speed.
  - **Fist (Grab)**: Launch fireworks.
  - **Pinch**: Search mode to reveal hidden treasures.
- **🎆 Physics Engine**: Custom pooling system for high-frequency firework bursts without garbage collection stutter.
- **⚡ Tech Stack**: Built with **React 19**, **TypeScript**, and **@react-three/fiber**.


## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`
