'use client';

import { useEffect, useRef } from 'react';

export function POSClickSound() {
  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    // Initialize AudioContext on first user interaction to comply with browser autoplay policies
    const initAudio = () => {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      if (audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume();
      }
    };

    const playClick = () => {
      initAudio();
      
      if (!audioContextRef.current) return;
      
      const ctx = audioContextRef.current;
      const t = ctx.currentTime;
      
      // Create oscillator for the "click" tone
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      // High frequency drop for a "sharp" sound
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, t);
      osc.frequency.exponentialRampToValueAtTime(100, t + 0.08);
      
      // Short envelope
      gain.gain.setValueAtTime(0.15, t); // Volume
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start(t);
      osc.stop(t + 0.08);
    };

    window.addEventListener('click', playClick);
    
    // Also listen for touchstart for better responsiveness on touch devices
    // However, click usually fires after touch, so we might get double sounds.
    // Let's stick to click for now as it covers most interactions.
    
    return () => {
      window.removeEventListener('click', playClick);
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
    };
  }, []);

  return null;
}
