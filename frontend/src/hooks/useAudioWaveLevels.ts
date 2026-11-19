import { type RefObject, useEffect, useState } from "react";

const BAR_COUNT = 12;
const IDLE_HEIGHTS = [5, 8, 12, 7, 14, 8, 11, 6, 13, 9, 10, 6] as const;
const MIN_H = 4;
const MAX_H = 14;

const mapFrequencyToBars = (bins: Uint8Array) => {
  const slice = Math.max(1, Math.floor(bins.length / BAR_COUNT));
  return Array.from({ length: BAR_COUNT }, (_, i) => {
    let sum = 0;
    for (let j = 0; j < slice; j++) sum += bins[i * slice + j] ?? 0;
    const avg = sum / slice / 255;
    return MIN_H + avg * (MAX_H - MIN_H);
  });
};

export const useAudioWaveLevels = (audioRef: RefObject<HTMLAudioElement | null>, active: boolean) => {
  const [levels, setLevels] = useState<number[]>(() => [...IDLE_HEIGHTS]);

  useEffect(() => {
    if (!active) {
      setLevels([...IDLE_HEIGHTS]);
      return;
    }

    let ctx: AudioContext | null = null;
    let analyser: AnalyserNode | null = null;
    let source: MediaElementAudioSourceNode | null = null;
    let linkedAudio: HTMLAudioElement | null = null;
    let raf = 0;
    let disposed = false;

    const detach = () => {
      source?.disconnect();
      analyser?.disconnect();
      source = null;
      analyser = null;
      linkedAudio = null;
    };

    const loop = () => {
      if (disposed) return;
      const audio = audioRef.current;
      if (!audio) {
        raf = requestAnimationFrame(loop);
        return;
      }
      if (audio !== linkedAudio) {
        detach();
        if (ctx) void ctx.close();
        ctx = new AudioContext();
        analyser = ctx.createAnalyser();
        analyser.fftSize = 64;
        analyser.smoothingTimeConstant = 0.75;
        try {
          source = ctx.createMediaElementSource(audio);
          source.connect(analyser);
          analyser.connect(ctx.destination);
          linkedAudio = audio;
        } catch {
          raf = requestAnimationFrame(loop);
          return;
        }
      }

      if (!analyser || !ctx) {
        raf = requestAnimationFrame(loop);
        return;
      }

      if (ctx.state === "suspended") void ctx.resume();

      const bins = new Uint8Array(analyser.frequencyBinCount);
      analyser.getByteFrequencyData(bins);
      setLevels(mapFrequencyToBars(bins));
      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      detach();
      if (ctx) void ctx.close();
    };
  }, [active, audioRef]);

  return levels;
};