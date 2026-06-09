import { create } from 'zustand';

interface FEMDataState {
  positions: Float32Array | null;
  indices: Uint32Array | null;
  stressComponents: Float32Array | null;
  header: { magic: string; version: number; nodeCount: number; elemCount: number; stressCount: number } | null;
  stats: {
    totalNodes: number;
    totalElements: number;
    surfaceFaces: number;
    surfaceVertices: number;
    minStress: number;
    maxStress: number;
  } | null;
}

interface RenderState {
  renderMode: 'solid' | 'wireframe' | 'solid+wireframe';
  colorMode: number;
  stressRange: [number, number];
  autoStressRange: boolean;
}

interface WindState {
  windSpeed: number;
  windDirection: number;
}

interface AnimationState {
  currentTimeStep: number;
  totalTimeSteps: number;
  isPlaying: boolean;
  playbackSpeed: number;
}

interface UIState {
  isLoading: boolean;
  loadingProgress: number;
  loadingStage: string;
  hoveredNodeIndex: number | null;
  showControlPanel: boolean;
  showInfoPanel: boolean;
  fps: number;
}

interface AppState extends FEMDataState, RenderState, WindState, AnimationState, UIState {
  setFEMData: (data: Partial<FEMDataState>) => void;
  setRenderMode: (mode: RenderState['renderMode']) => void;
  setColorMode: (mode: number) => void;
  setStressRange: (range: [number, number]) => void;
  setAutoStressRange: (auto: boolean) => void;
  setWindSpeed: (speed: number) => void;
  setWindDirection: (dir: number) => void;
  setCurrentTimeStep: (step: number) => void;
  setPlaying: (playing: boolean) => void;
  setPlaybackSpeed: (speed: number) => void;
  setLoading: (loading: boolean, progress?: number, stage?: string) => void;
  setHoveredNode: (index: number | null) => void;
  toggleControlPanel: () => void;
  toggleInfoPanel: () => void;
  setFps: (fps: number) => void;
  reset: () => void;
}

const initialState = {
  positions: null as Float32Array | null,
  indices: null as Uint32Array | null,
  stressComponents: null as Float32Array | null,
  header: null as FEMDataState['header'],
  stats: null as FEMDataState['stats'],
  renderMode: 'solid' as RenderState['renderMode'],
  colorMode: 0,
  stressRange: [0, 1] as [number, number],
  autoStressRange: true,
  windSpeed: 35,
  windDirection: 0,
  currentTimeStep: 0,
  totalTimeSteps: 10,
  isPlaying: false,
  playbackSpeed: 1,
  isLoading: false,
  loadingProgress: 0,
  loadingStage: '',
  hoveredNodeIndex: null as number | null,
  showControlPanel: true,
  showInfoPanel: true,
  fps: 0,
};

export const useStore = create<AppState>()((set) => ({
  ...initialState,

  setFEMData: (data) => set((state) => ({ ...state, ...data })),

  setRenderMode: (mode) => set({ renderMode: mode }),

  setColorMode: (mode) => set({ colorMode: mode }),

  setStressRange: (range) => set({ stressRange: range }),

  setAutoStressRange: (auto) => set({ autoStressRange: auto }),

  setWindSpeed: (speed) => set({ windSpeed: speed }),

  setWindDirection: (dir) => set({ windDirection: dir }),

  setCurrentTimeStep: (step) => set({ currentTimeStep: step }),

  setPlaying: (playing) => set({ isPlaying: playing }),

  setPlaybackSpeed: (speed) => set({ playbackSpeed: speed }),

  setLoading: (loading, progress, stage) =>
    set({
      isLoading: loading,
      ...(progress !== undefined ? { loadingProgress: progress } : {}),
      ...(stage !== undefined ? { loadingStage: stage } : {}),
    }),

  setHoveredNode: (index) => set({ hoveredNodeIndex: index }),

  toggleControlPanel: () => set((state) => ({ showControlPanel: !state.showControlPanel })),

  toggleInfoPanel: () => set((state) => ({ showInfoPanel: !state.showInfoPanel })),

  setFps: (fps) => set({ fps }),

  reset: () => set({ ...initialState }),
}));
