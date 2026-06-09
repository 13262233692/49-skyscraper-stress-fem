import { useState } from 'react';
import { ChevronDown, ChevronRight, Play, Pause, Wind, Settings2, BarChart3, Clapperboard, Activity } from 'lucide-react';
import { useStore } from '@/store/useStore';

function Section({ title, icon: Icon, defaultOpen, children }: {
  title: string;
  icon: React.ElementType;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen ?? true);

  return (
    <div className="border-b border-white/5 last:border-b-0">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full px-4 py-2.5 text-xs uppercase tracking-wider text-white/70 hover:text-white/90 transition-colors"
        style={{ fontFamily: "'Orbitron', sans-serif" }}
      >
        <span className="flex items-center gap-2">
          <Icon className="w-3.5 h-3.5" style={{ color: '#00D4FF' }} />
          {title}
        </span>
        {open ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
      </button>
      {open && <div className="px-4 pb-3 space-y-3">{children}</div>}
    </div>
  );
}

function SliderRow({ label, value, min, max, step, unit, onChange }: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-white/50">
        <span style={{ fontFamily: "'Source Sans 3', sans-serif" }}>{label}</span>
        <span className="font-mono" style={{ color: '#00D4FF' }}>
          {value.toFixed(step < 1 ? 1 : 0)}{unit ?? ''}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-1.5 rounded-full appearance-none cursor-pointer bg-white/10
          [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5
          [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-0
          [&::-webkit-slider-thumb]:cursor-pointer"
        style={{ accentColor: '#00D4FF' }}
      />
    </div>
  );
}

function RadioGroup({ options, value, onChange }: {
  options: { label: string; value: string | number }[];
  value: string | number;
  onChange: (v: string | number) => void;
}) {
  return (
    <div className="space-y-1.5">
      {options.map((opt) => (
        <label key={String(opt.value)} className="flex items-center gap-2 text-xs text-white/60 cursor-pointer hover:text-white/80 transition-colors">
          <span
            className="w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center transition-colors"
            style={{ borderColor: value === opt.value ? '#00D4FF' : 'rgba(255,255,255,0.2)' }}
          >
            {value === opt.value && (
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#00D4FF' }} />
            )}
          </span>
          <input
            type="radio"
            name={String(opt.value)}
            value={String(opt.value)}
            checked={value === opt.value}
            onChange={() => onChange(opt.value)}
            className="sr-only"
          />
          {opt.label}
        </label>
      ))}
    </div>
  );
}

export default function ControlPanel() {
  const showControlPanel = useStore((s) => s.showControlPanel);
  const windSpeed = useStore((s) => s.windSpeed);
  const windDirection = useStore((s) => s.windDirection);
  const turbulenceFreq = useStore((s) => s.turbulenceFreq);
  const modalFreq = useStore((s) => s.modalFreq);
  const resonanceFactor = useStore((s) => s.resonanceFactor);
  const isResonance = useStore((s) => s.isResonance);
  const renderMode = useStore((s) => s.renderMode);
  const colorMode = useStore((s) => s.colorMode);
  const autoStressRange = useStore((s) => s.autoStressRange);
  const stressRange = useStore((s) => s.stressRange);
  const currentTimeStep = useStore((s) => s.currentTimeStep);
  const totalTimeSteps = useStore((s) => s.totalTimeSteps);
  const isPlaying = useStore((s) => s.isPlaying);
  const playbackSpeed = useStore((s) => s.playbackSpeed);
  const stats = useStore((s) => s.stats);

  const setWindSpeed = useStore((s) => s.setWindSpeed);
  const setWindDirection = useStore((s) => s.setWindDirection);
  const setTurbulenceFreq = useStore((s) => s.setTurbulenceFreq);
  const setRenderMode = useStore((s) => s.setRenderMode);
  const setColorMode = useStore((s) => s.setColorMode);
  const setAutoStressRange = useStore((s) => s.setAutoStressRange);
  const setStressRange = useStore((s) => s.setStressRange);
  const setCurrentTimeStep = useStore((s) => s.setCurrentTimeStep);
  const setPlaying = useStore((s) => s.setPlaying);
  const setPlaybackSpeed = useStore((s) => s.setPlaybackSpeed);

  const stressMin = stats?.minStress ?? 0;
  const stressMax = stats?.maxStress ?? 1;

  if (!showControlPanel) return null;

  return (
    <div className="fixed left-4 top-14 bottom-16 z-40 w-72 overflow-y-auto bg-black/50 backdrop-blur-xl border border-white/10 rounded-xl"
         style={{ fontFamily: "'Source Sans 3', sans-serif" }}>
      <Section title="Wind Parameters" icon={Wind}>
        <SliderRow label="Wind Speed" value={windSpeed} min={0} max={100} step={0.5} unit=" m/s" onChange={setWindSpeed} />
        <SliderRow label="Wind Direction" value={windDirection} min={0} max={360} step={1} unit="°" onChange={setWindDirection} />
      </Section>

      <Section title="Frequency Analysis" icon={Activity}>
        <SliderRow label="Turbulence Freq" value={turbulenceFreq} min={0.01} max={0.50} step={0.005} unit=" Hz" onChange={setTurbulenceFreq} />
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-white/50">
            <span>1st Modal Freq</span>
            <span className="font-mono" style={{ color: '#00D4FF' }}>{modalFreq.toFixed(3)} Hz</span>
          </div>
          <div className="flex justify-between text-xs text-white/50">
            <span>Resonance Factor</span>
            <span className="font-mono" style={{ color: isResonance ? '#FF2D55' : '#00D4FF' }}>
              {resonanceFactor.toFixed(1)}x
            </span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden mt-1">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${Math.min(100, (resonanceFactor / 25) * 100)}%`,
                backgroundColor: isResonance
                  ? '#FF2D55'
                  : resonanceFactor > 5 ? '#FF9500' : '#00D4FF',
              }}
            />
          </div>
        </div>
      </Section>

      <Section title="Render Settings" icon={Settings2}>
        <div className="text-xs text-white/40 uppercase tracking-wider mb-1">Render Mode</div>
        <RadioGroup
          options={[
            { label: 'Solid', value: 'solid' },
            { label: 'Wireframe', value: 'wireframe' },
            { label: 'Solid + Wireframe', value: 'solid+wireframe' },
          ]}
          value={renderMode}
          onChange={(v) => setRenderMode(v as 'solid' | 'wireframe' | 'solid+wireframe')}
        />
        <div className="text-xs text-white/40 uppercase tracking-wider mb-1 mt-3">Color Mode</div>
        <RadioGroup
          options={[
            { label: 'Stress', value: 0 },
            { label: 'Gray', value: 1 },
            { label: 'Normal', value: 2 },
          ]}
          value={colorMode}
          onChange={setColorMode}
        />
      </Section>

      <Section title="Stress Range" icon={BarChart3}>
        <label className="flex items-center gap-2 text-xs text-white/60 cursor-pointer">
          <span
            className="w-4 h-4 rounded border flex items-center justify-center transition-colors"
            style={{ borderColor: autoStressRange ? '#00D4FF' : 'rgba(255,255,255,0.2)', backgroundColor: autoStressRange ? 'rgba(0,212,255,0.15)' : 'transparent' }}
          >
            {autoStressRange && <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: '#00D4FF' }} />}
          </span>
          <input
            type="checkbox"
            checked={autoStressRange}
            onChange={(e) => setAutoStressRange(e.target.checked)}
            className="sr-only"
          />
          Auto Range
        </label>
        {!autoStressRange && (
          <>
            <SliderRow
              label="Min Stress"
              value={stressRange[0]}
              min={stressMin}
              max={stressMax}
              step={(stressMax - stressMin) / 200}
              unit=" MPa"
              onChange={(v) => setStressRange([v, stressRange[1]])}
            />
            <SliderRow
              label="Max Stress"
              value={stressRange[1]}
              min={stressMin}
              max={stressMax}
              step={(stressMax - stressMin) / 200}
              unit=" MPa"
              onChange={(v) => setStressRange([stressRange[0], v])}
            />
          </>
        )}
      </Section>

      <Section title="Animation" icon={Clapperboard}>
        <SliderRow
          label="Time Step"
          value={currentTimeStep}
          min={0}
          max={totalTimeSteps}
          step={1}
          onChange={setCurrentTimeStep}
        />
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPlaying(!isPlaying)}
            className="flex items-center justify-center w-8 h-8 rounded-lg border border-white/10 hover:border-white/30 transition-colors"
            style={{ backgroundColor: isPlaying ? 'rgba(0,212,255,0.15)' : 'transparent' }}
          >
            {isPlaying ? (
              <Pause className="w-4 h-4" style={{ color: '#00D4FF' }} />
            ) : (
              <Play className="w-4 h-4" style={{ color: '#00D4FF' }} />
            )}
          </button>
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
      </Section>
    </div>
  );
}
