import React from 'react';
import { useStore } from '@/store/useStore';

export function LoadingOverlay() {
  const isLoading = useStore(s => s.isLoading);
  const loadingProgress = useStore(s => s.loadingProgress);
  const loadingStage = useStore(s => s.loadingStage);

  if (!isLoading) return null;

  const pct = Math.round(loadingProgress * 100);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="flex w-80 flex-col items-center gap-6 rounded-2xl border border-cyan-900/30 bg-[#0d1117]/90 p-8 shadow-2xl shadow-cyan-500/10">
        <h2
          className="text-lg tracking-widest text-cyan-400 uppercase"
          style={{ fontFamily: 'Orbitron, monospace' }}
        >
          Loading FEM
        </h2>

        <div className="w-full">
          <div className="mb-2 flex justify-between text-xs text-gray-400">
            <span style={{ fontFamily: 'Orbitron, monospace' }}>{pct}%</span>
            <span className="truncate ml-4">{loadingStage}</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-gray-800">
            <div
              className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-cyan-300 transition-all duration-300 ease-out"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
