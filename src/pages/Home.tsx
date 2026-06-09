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
  const totalTimeSteps = useStore((s) => s.totalTimeSteps);
  const setCurrentTimeStep = useStore((s) => s.setCurrentTimeStep);
  const setFps = useStore((s) => s.setFps);
  const setWorkerBusy = useStore((s) => s.setWorkerBusy);
  const bumpStressVersion = useStore((s) => s.bumpStressVersion);
  const updateStats = useStore((s) => s.updateStats);

  const workerRef = useRef<Worker | null>(null);
  const fpsRef = useRef(0);
  const frameCountRef = useRef(0);
  const lastTimeRef = useRef(performance.now());
  const pendingWindRef = useRef<{ speed: number; dir: number } | null>(null);
  const windDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const sendWindUpdate = useCallback((speed: number, dir: number) => {
    if (!workerRef.current) return;

    const isBusy = useStore.getState().workerBusy;
    if (isBusy) {
      pendingWindRef.current = { speed, dir };
      return;
    }

    setWorkerBusy(true);
    workerRef.current.postMessage({
      type: 'updateWind',
      windSpeed: speed,
      windDirection: dir,
    });
  }, [setWorkerBusy]);

  const flushPendingWind = useCallback(() => {
    if (pendingWindRef.current && workerRef.current) {
      const { speed, dir } = pendingWindRef.current;
      pendingWindRef.current = null;
      setWorkerBusy(true);
      workerRef.current.postMessage({
        type: 'updateWind',
        windSpeed: speed,
        windDirection: dir,
      });
    }
  }, [setWorkerBusy]);

  const loadDemoData = useCallback(async () => {
    setLoading(true, 0, 'generating');
    await new Promise((r) => setTimeout(r, 100));

    const buffer = generateDemoFEMData(6, 6, 40);

    if (workerRef.current) {
      workerRef.current.terminate();
    }

    const worker = new Worker(
      new URL('../workers/femParser.worker.ts', import.meta.url),
      { type: 'module' }
    );
    workerRef.current = worker;

    worker.onmessage = (e: MessageEvent) => {
      const msg = e.data;

      if (msg.type === 'progress') {
        setLoading(true, msg.progress, msg.stage);
      }

      if (msg.type === 'parsed') {
        setFEMData({
          positions: msg.positions,
          indices: msg.indices,
          stressSAB: msg.stressSAB,
          flagSAB: msg.flagSAB,
          stressComponents: msg.stressComponents,
          surfaceVertexCount: msg.surfaceVertexCount,
          useSAB: msg.useSAB,
          header: msg.header,
          stats: msg.stats,
        });
        setLoading(false, 1, 'complete');
        bumpStressVersion();
      }

      if (msg.type === 'stressUpdated') {
        if (msg.stressComponents) {
          setFEMData({ stressComponents: msg.stressComponents });
        }
        updateStats(msg.stats);
        bumpStressVersion();
        setWorkerBusy(false);
        flushPendingWind();
      }

      if (msg.type === 'error') {
        setLoading(false, 0, 'error');
        setWorkerBusy(false);
      }
    };

    worker.onerror = () => {
      setLoading(false, 0, 'error');
      setWorkerBusy(false);
    };

    worker.postMessage({ type: 'parse', buffer }, [buffer]);
  }, [setFEMData, setLoading, bumpStressVersion, updateStats, setWorkerBusy, flushPendingWind]);

  useEffect(() => {
    loadDemoData();

    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
    };
  }, [loadDemoData]);

  const windSpeed = useStore((s) => s.windSpeed);
  const windDirection = useStore((s) => s.windDirection);

  useEffect(() => {
    if (!positions) return;

    if (windDebounceRef.current) {
      clearTimeout(windDebounceRef.current);
    }

    windDebounceRef.current = setTimeout(() => {
      sendWindUpdate(windSpeed, windDirection);
    }, 80);

    return () => {
      if (windDebounceRef.current) {
        clearTimeout(windDebounceRef.current);
      }
    };
  }, [windSpeed, windDirection, positions, sendWindUpdate]);

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
