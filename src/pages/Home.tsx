import { useEffect, useCallback, useRef } from 'react';
import { Scene } from '@/components/Scene';
import StatusBar from '@/components/StatusBar';
import ControlPanel from '@/components/ControlPanel';
import InfoPanel from '@/components/InfoPanel';
import Timeline from '@/components/Timeline';
import FileUploader from '@/components/FileUploader';
import { LoadingOverlay } from '@/components/LoadingOverlay';
import { useStore } from '@/store/useStore';
import { generateDemoFEMData } from '@/utils/femGenerator';

export default function Home() {
  const positions = useStore((s) => s.positions);
  const setFEMData = useStore((s) => s.setFEMData);
  const setLoading = useStore((s) => s.setLoading);
  const isLoading = useStore((s) => s.isLoading);
  const isPlaying = useStore((s) => s.isPlaying);
  const playbackSpeed = useStore((s) => s.playbackSpeed);
  const currentTimeStep = useStore((s) => s.currentTimeStep);
  const totalTimeSteps = useStore((s) => s.totalTimeSteps);
  const setCurrentTimeStep = useStore((s) => s.setCurrentTimeStep);
  const setFps = useStore((s) => s.setFps);
  const fpsRef = useRef(0);
  const frameCountRef = useRef(0);
  const lastTimeRef = useRef(performance.now());

  const loadDemoData = useCallback(async () => {
    setLoading(true, 0, 'generating');

    await new Promise((r) => setTimeout(r, 100));

    const buffer = generateDemoFEMData(6, 6, 40);

    const worker = new Worker(
      new URL('../workers/femParser.worker.ts', import.meta.url),
      { type: 'module' }
    );

    worker.onmessage = (e: MessageEvent) => {
      const msg = e.data;

      if (msg.type === 'progress') {
        setLoading(true, msg.progress, msg.stage);
      }

      if (msg.type === 'parsed') {
        setFEMData({
          positions: msg.positions,
          indices: msg.indices,
          stressComponents: msg.stressComponents,
          header: msg.header,
          stats: msg.stats,
        });
        setLoading(false, 1, 'complete');
        worker.terminate();
      }

      if (msg.type === 'error') {
        console.error('FEM parse error:', msg.message);
        setLoading(false, 0, 'error');
        worker.terminate();
      }
    };

    worker.onerror = () => {
      setLoading(false, 0, 'error');
      worker.terminate();
    };

    worker.postMessage(buffer, [buffer]);
  }, [setFEMData, setLoading]);

  useEffect(() => {
    loadDemoData();
  }, [loadDemoData]);

  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(
      () => {
        const step = useStore.getState().currentTimeStep;
        const next = step + 1;
        setCurrentTimeStep(next > totalTimeSteps ? 0 : next);
      },
      1000 / playbackSpeed
    );

    return () => clearInterval(interval);
  }, [isPlaying, playbackSpeed, totalTimeSteps, setCurrentTimeStep]);

  useEffect(() => {
    let rafId: number;

    const measure = () => {
      frameCountRef.current++;
      const now = performance.now();
      if (now - lastTimeRef.current >= 1000) {
        fpsRef.current = frameCountRef.current;
        setFps(frameCountRef.current);
        frameCountRef.current = 0;
        lastTimeRef.current = now;
      }
      rafId = requestAnimationFrame(measure);
    };

    rafId = requestAnimationFrame(measure);
    return () => cancelAnimationFrame(rafId);
  }, [setFps]);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#0A0E1A]">
      <Scene />

      <StatusBar />
      <ControlPanel />
      <InfoPanel />
      <Timeline />

      {!positions && !isLoading && <FileUploader />}
      <LoadingOverlay />
    </div>
  );
}
