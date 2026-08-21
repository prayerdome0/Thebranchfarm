"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

interface SoundContextValue {
  enabled: boolean;
  toggleSound: () => void;
  playTap: () => void;
}

const SoundContext = createContext<SoundContextValue | null>(null);

export function SoundProvider({ children }: { children: ReactNode }) {
  const [enabled, setEnabled] = useState(false);
  const audioRef = useRef<AudioContext | null>(null);
  const ambientRef = useRef<{ noise: AudioBufferSourceNode; timer: number } | null>(null);

  const stopAmbient = useCallback(() => {
    try {
      if (ambientRef.current) {
        try { ambientRef.current.noise.stop(); } catch {}
        try { window.clearInterval(ambientRef.current.timer); } catch {}
        ambientRef.current = null;
      }
    } catch {}
    try { audioRef.current?.close(); } catch {}
    audioRef.current = null;
  }, []);

  const startAmbient = useCallback(() => {
    try {
      if (typeof window === "undefined") return;
      const AudioContextClass = window.AudioContext ||
        (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) return;
    const context = new AudioContextClass();
    audioRef.current = context;

    // Low-volume filtered noise creates a soft breeze. It is generated locally and only
    // starts after a user gesture, so there is no surprise autoplay or third-party tracking.
    const duration = 4;
    const buffer = context.createBuffer(1, context.sampleRate * duration, context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1;
    const noise = context.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;
    const filter = context.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 480;
    const gain = context.createGain();
    gain.gain.value = 0.012;
    noise.connect(filter).connect(gain).connect(context.destination);
    noise.start();

    const bird = () => {
      if (context.state === "closed") return;
      const oscillator = context.createOscillator();
      const birdGain = context.createGain();
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(1450 + Math.random() * 450, context.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(2200, context.currentTime + 0.12);
      birdGain.gain.setValueAtTime(0, context.currentTime);
      birdGain.gain.linearRampToValueAtTime(0.018, context.currentTime + 0.02);
      birdGain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.22);
      oscillator.connect(birdGain).connect(context.destination);
      oscillator.start();
      oscillator.stop(context.currentTime + 0.24);
    };
    const timer = window.setInterval(bird, 7000);
    window.setTimeout(bird, 900);
    ambientRef.current = { noise, timer };
    } catch {}
  }, []);

  const toggleSound = useCallback(() => {
    setEnabled((current) => {
      if (current) stopAmbient();
      else startAmbient();
      return !current;
    });
  }, [startAmbient, stopAmbient]);

  const playTap = useCallback(() => {
    const context = audioRef.current;
    if (!enabled || !context || context.state === "closed") return;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.frequency.value = 520;
    gain.gain.setValueAtTime(0.015, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.05);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.06);
  }, [enabled]);

  useEffect(() => stopAmbient, [stopAmbient]);
  const value = useMemo(() => ({ enabled, toggleSound, playTap }), [enabled, toggleSound, playTap]);
  return <SoundContext.Provider value={value}>{children}</SoundContext.Provider>;
}

export function useSound() {
  const context = useContext(SoundContext);
  if (!context) throw new Error("useSound must be used inside SoundProvider");
  return context;
}
