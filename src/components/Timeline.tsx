import { Play, Pause, SkipBack, SkipForward } from 'lucide-react';
import { useStore } from '@/store/useStore';

export default function Timeline() {
  const currentTimeStep = useStore((s) => s.currentTimeStep);
  const totalTimeSteps = useStore((s) => s.totalTimeSteps);
  const isPlaying = useStore((s) => s.isPlaying);
  const playbackSpeed = useStore((s) => s.playbackSpeed);

  const setCurrentTimeStep = useStore((s) => s.setCurrentTimeStep);
  const setPlaying = useStore((s) => s.setPlaying);
  const setPlaybackSpeed = useStore((s) => s.setPlaybackSpeed);

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 flex items-center gap-4 px-6 py-2.5 bg-black/60 backdrop-blur-md border-t border-white/10"
         style={{ fontFamily: "'Source Sans 3', sans-serif" }}>
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => setCurrentTimeStep(Math.max(0, currentTimeStep - 1))}
          className="flex items-center justify-center w-8 h-8 rounded-lg border border-white/10 hover:border-white/30 transition-colors"
        >
          <SkipBack className="w-4 h-4 text-white/60" />
        </button>

        <button
          onClick={() => setPlaying(!isPlaying)}
          className="flex items-center justify-center w-9 h-9 rounded-lg border transition-colors"
          style={{
            borderColor: isPlaying ? '#00D4FF' : 'rgba(255,255,255,0.1)',
            backgroundColor: isPlaying ? 'rgba(0,212,255,0.15)' : 'transparent',
          }}
        >
          {isPlaying ? (
            <Pause className="w-4 h-4" style={{ color: '#00D4FF' }} />
          ) : (
            <Play className="w-4 h-4" style={{ color: '#00D4FF' }} />
          )}
        </button>

        <button
          onClick={() => setCurrentTimeStep(Math.min(totalTimeSteps, currentTimeStep + 1))}
          className="flex items-center justify-center w-8 h-8 rounded-lg border border-white/10 hover:border-white/30 transition-colors"
        >
          <SkipForward className="w-4 h-4 text-white/60" />
        </button>
      </div>

      <div className="flex-1 flex items-center gap-3">
        <input
          type="range"
          min={0}
          max={totalTimeSteps}
          step={1}
          value={currentTimeStep}
          onChange={(e) => setCurrentTimeStep(parseInt(e.target.value, 10))}
          className="flex-1 h-1.5 rounded-full appearance-none cursor-pointer bg-white/10
            [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5
            [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-0
            [&::-webkit-slider-thumb]:cursor-pointer"
          style={{ accentColor: '#00D4FF' }}
        />
      </div>

      <div className="font-mono text-xs text-white/50 whitespace-nowrap">
        <span style={{ color: '#00D4FF' }}>{currentTimeStep}</span>
        <span className="mx-1">/</span>
        <span>{totalTimeSteps}</span>
      </div>

      <div className="flex gap-1">
        {[0.5, 1, 2].map((speed) => (
          <button
            key={speed}
            onClick={() => setPlaybackSpeed(speed)}
            className="px-2 py-1 text-xs rounded border transition-colors"
            style={{
              borderColor: playbackSpeed === speed ? '#00D4FF' : 'rgba(255,255,255,0.1)',
              color: playbackSpeed === speed ? '#00D4FF' : 'rgba(255,255,255,0.4)',
              backgroundColor: playbackSpeed === speed ? 'rgba(0,212,255,0.1)' : 'transparent',
            }}
          >
            {speed}x
          </button>
        ))}
      </div>
    </div>
  );
}
