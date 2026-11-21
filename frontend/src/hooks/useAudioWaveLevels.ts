import { type RefObject, useCallback, useEffect, useRef, useState } from "react";

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

type WaveGraph = {
  ctx: AudioContext;
  analyser: AnalyserNode;
  source: MediaElementAudioSourceNode;
  audio: HTMLAudioElement;
};

export const useAudioWaveLevels = (audioRef: RefObject<HTMLAudioElement | null>, active: boolean) => {
  const [levels, setLevels] = useState<number[]>(() => [...IDLE_HEIGHTS]);
  const graphRef = useRef<WaveGraph | null>(null);

  const tearDownGraph = useCallback(() => {
    const graph = graphRef.current;
    if (!graph) return;
    graph.source.disconnect();
    graph.analyser.disconnect();
    void graph.ctx.close();
    graphRef.current = null;
  }, []);

  const ensureGraph = useCallback(
    (audio: HTMLAudioElement) => {
      if (graphRef.current?.audio === audio) return graphRef.current;
      tearDownGraph();
      const ctx = new AudioContext();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64;
      analyser.smoothingTimeConstant = 0.75;
      try {
        const source = ctx.createMediaElementSource(audio);
        source.connect(analyser);
        analyser.connect(ctx.destination);
        graphRef.current = { ctx, analyser, source, audio };
        return graphRef.current;
      } catch {
        void ctx.close();
        return null;
      }
    },
    [tearDownGraph],
  );

  useEffect(() => {
    if (!active) {
      setLevels([...IDLE_HEIGHTS]);
      return;
    }

    let raf = 0;
    let disposed = false;

    const loop = () => {
      if (disposed) return;
      const audio = audioRef.current;
      if (!audio) {
        setLevels([...IDLE_HEIGHTS]);
        raf = requestAnimationFrame(loop);
        return;
      }
      const graph = ensureGraph(audio);
      if (!graph) {
        raf = requestAnimationFrame(loop);
        return;
      }
      if (graph.ctx.state === "suspended") void graph.ctx.resume();

      const bins = new Uint8Array(graph.analyser.frequencyBinCount);
      graph.analyser.getByteFrequencyData(bins);
      setLevels(mapFrequencyToBars(bins));
      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
    };
  }, [active, audioRef, ensureGraph]);

  useEffect(() => () => tearDownGraph(), [tearDownGraph]);

  return levels;
};