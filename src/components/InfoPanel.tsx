import { Crosshair, Info, MousePointer } from 'lucide-react';
import { useStore } from '@/store/useStore';

function computeVonMises(sx: number, sy: number, sz: number, txy: number, tyz: number, txz: number) {
  return Math.sqrt(
    0.5 * ((sx - sy) ** 2 + (sy - sz) ** 2 + (sz - sx) ** 2) + 3 * (txy ** 2 + tyz ** 2 + txz ** 2)
  );
}

function vonMisesColor(value: number, min: number, max: number) {
  if (max === min) return '#00D4FF';
  const t = Math.min(1, Math.max(0, (value - min) / (max - min)));
  if (t < 0.5) {
    const r = Math.round(0 + t * 2 * 255);
    const g = Math.round(212 + t * 2 * (255 - 212));
    const b = Math.round(255);
    return `rgb(${r},${g},${b})`;
  } else {
    const r = 255;
    const g = Math.round(255 - (t - 0.5) * 2 * (255 - 45));
    const b = Math.round(255 - (t - 0.5) * 2 * 255);
    return `rgb(${r},${g},${b})`;
  }
}

function StatRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex justify-between text-xs">
      <span className="text-white/40">{label}</span>
      <span className="font-mono" style={{ color: '#00D4FF' }}>{value}</span>
    </div>
  );
}

export default function InfoPanel() {
  const showInfoPanel = useStore((s) => s.showInfoPanel);
  const hoveredNodeIndex = useStore((s) => s.hoveredNodeIndex);
  const positions = useStore((s) => s.positions);
  const stressComponents = useStore((s) => s.stressComponents);
  const stats = useStore((s) => s.stats);

  if (!showInfoPanel) return null;

  const hasNode = hoveredNodeIndex !== null && positions !== null && stressComponents !== null;
  const nodeIdx = hoveredNodeIndex ?? 0;

  let nodeX = 0, nodeY = 0, nodeZ = 0;
  let sx = 0, sy = 0, sz = 0, txy = 0, tyz = 0, txz = 0;
  let vonMises = 0;

  if (hasNode) {
    nodeX = positions![nodeIdx * 3];
    nodeY = positions![nodeIdx * 3 + 1];
    nodeZ = positions![nodeIdx * 3 + 2];
    sx = stressComponents![nodeIdx * 6];
    sy = stressComponents![nodeIdx * 6 + 1];
    sz = stressComponents![nodeIdx * 6 + 2];
    txy = stressComponents![nodeIdx * 6 + 3];
    tyz = stressComponents![nodeIdx * 6 + 4];
    txz = stressComponents![nodeIdx * 6 + 5];
    vonMises = computeVonMises(sx, sy, sz, txy, tyz, txz);
  }

  const stressMin = stats?.minStress ?? 0;
  const stressMax = stats?.maxStress ?? 1;

  return (
    <div className="fixed right-4 top-14 z-40 w-72 bg-black/50 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden"
         style={{ fontFamily: "'Source Sans 3', sans-serif" }}>
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-white/5">
        <Info className="w-3.5 h-3.5" style={{ color: '#00D4FF' }} />
        <span className="text-xs uppercase tracking-wider" style={{ fontFamily: "'Orbitron', sans-serif", color: 'rgba(255,255,255,0.7)' }}>
          Node Inspector
        </span>
      </div>

      <div className="px-4 py-3 space-y-3">
        {hasNode ? (
          <>
            <div className="flex items-center gap-2 mb-2">
              <Crosshair className="w-4 h-4" style={{ color: '#00D4FF' }} />
              <span className="text-sm font-mono" style={{ color: '#00D4FF' }}>Node {nodeIdx}</span>
            </div>

            <div>
              <div className="text-xs text-white/40 uppercase tracking-wider mb-1">Position</div>
              <div className="grid grid-cols-3 gap-2">
                <div className="text-center">
                  <div className="text-[10px] text-white/30">X</div>
                  <div className="font-mono text-xs" style={{ color: '#00D4FF' }}>{nodeX.toFixed(3)}</div>
                </div>
                <div className="text-center">
                  <div className="text-[10px] text-white/30">Y</div>
                  <div className="font-mono text-xs" style={{ color: '#00D4FF' }}>{nodeY.toFixed(3)}</div>
                </div>
                <div className="text-center">
                  <div className="text-[10px] text-white/30">Z</div>
                  <div className="font-mono text-xs" style={{ color: '#00D4FF' }}>{nodeZ.toFixed(3)}</div>
                </div>
              </div>
            </div>

            <div>
              <div className="text-xs text-white/40 uppercase tracking-wider mb-1">Stress Tensor</div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-white/40">σx</span>
                  <span className="font-mono text-white/70">{sx.toFixed(4)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-white/40">τxy</span>
                  <span className="font-mono text-white/70">{txy.toFixed(4)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-white/40">σy</span>
                  <span className="font-mono text-white/70">{sy.toFixed(4)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-white/40">τyz</span>
                  <span className="font-mono text-white/70">{tyz.toFixed(4)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-white/40">σz</span>
                  <span className="font-mono text-white/70">{sz.toFixed(4)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-white/40">τxz</span>
                  <span className="font-mono text-white/70">{txz.toFixed(4)}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-white/5">
              <span className="text-xs text-white/40">Von Mises</span>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: vonMisesColor(vonMises, stressMin, stressMax) }} />
                <span className="font-mono text-sm font-semibold" style={{ color: vonMisesColor(vonMises, stressMin, stressMax) }}>
                  {vonMises.toFixed(4)}
                </span>
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-6 text-center gap-2">
            <MousePointer className="w-6 h-6 text-white/20" />
            <span className="text-xs text-white/30">Hover over mesh to inspect</span>
          </div>
        )}
      </div>

      {stats && (
        <div className="border-t border-white/5 px-4 py-3 space-y-1.5">
          <div className="text-xs text-white/40 uppercase tracking-wider mb-2" style={{ fontFamily: "'Orbitron', sans-serif" }}>
            Mesh Stats
          </div>
          <StatRow label="Total Nodes" value={stats.totalNodes.toLocaleString()} />
          <StatRow label="Total Elements" value={stats.totalElements.toLocaleString()} />
          <StatRow label="Surface Faces" value={stats.surfaceFaces.toLocaleString()} />
          <StatRow label="Surface Vertices" value={stats.surfaceVertices.toLocaleString()} />
        </div>
      )}
    </div>
  );
}
