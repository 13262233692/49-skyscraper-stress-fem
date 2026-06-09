import { Wind, AlertTriangle, Radio } from 'lucide-react';
import { useStore } from '@/store/useStore';

export default function StatusBar() {
  const windSpeed = useStore((s) => s.windSpeed);
  const stats = useStore((s) => s.stats);
  const stressVersion = useStore((s) => s.stressVersion);
  const fps = useStore((s) => s.fps);
  const isResonance = useStore((s) => s.isResonance);
  const resonanceFactor = useStore((s) => s.resonanceFactor);
  const turbulenceFreq = useStore((s) => s.turbulenceFreq);
  const modalFreq = useStore((s) => s.modalFreq);

  const maxVonMises = stats?.maxStress ?? 0;
  const yieldThreshold = stats ? stats.maxStress * 0.85 : 0;
  const isYieldWarning = stats ? maxVonMises > yieldThreshold && maxVonMises > 0 : false;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-2 bg-black/60 backdrop-blur-md border-b border-white/10"
         style={{ fontFamily: "'Source Sans 3', sans-serif" }}>
      <div className="flex items-center gap-3">
        <Wind className="w-5 h-5" style={{ color: '#00D4FF' }} />
        <span className="text-lg tracking-widest font-bold" style={{ fontFamily: "'Orbitron', sans-serif", color: '#00D4FF' }}>
          WIND-STRESS FEM
        </span>
      </div>

      <div className="flex items-center gap-6 text-sm text-white/80">
        <div className="flex items-center gap-2">
          <span className="text-white/50">Wind:</span>
          <span className="font-mono" style={{ color: '#00D4FF' }}>{windSpeed.toFixed(1)} m/s</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-white/50">Max Von Mises:</span>
          <span className="font-mono" style={{ color: stats ? '#00D4FF' : '#ffffff40' }}>
            {stats ? maxVonMises.toFixed(2) : '—'} MPa
          </span>
        </div>

        {isResonance && (
          <div className="flex items-center gap-1.5 animate-pulse">
            <Radio className="w-4 h-4" style={{ color: '#FF2D55' }} />
            <span className="font-semibold text-xs uppercase tracking-wider" style={{ color: '#FF2D55' }}>
              RESONANCE {resonanceFactor.toFixed(0)}x
            </span>
          </div>
        )}

        {isYieldWarning && !isResonance && (
          <div className="flex items-center gap-1.5 animate-pulse">
            <AlertTriangle className="w-4 h-4" style={{ color: '#FF2D55' }} />
            <span className="font-semibold text-xs uppercase tracking-wider" style={{ color: '#FF2D55' }}>
              Yield Warning
            </span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-4 text-xs text-white/50">
        <div className="flex items-center gap-1.5">
          <span>f_turb:</span>
          <span className="font-mono" style={{ color: isResonance ? '#FF2D55' : '#00D4FF' }}>
            {turbulenceFreq.toFixed(3)} Hz
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span>f_modal:</span>
          <span className="font-mono" style={{ color: '#00D4FF' }}>{modalFreq.toFixed(3)} Hz</span>
        </div>
        <div className="flex items-center gap-2">
          <span>FPS</span>
          <span className="font-mono text-sm" style={{ color: fps >= 30 ? '#00D4FF' : '#FF2D55' }}>{fps}</span>
        </div>
      </div>
    </div>
  );
}
