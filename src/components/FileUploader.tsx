import { useState, useRef, useCallback } from 'react';
import { Upload, FileText, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useStore } from '@/store/useStore';

export default function FileUploader() {
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileSize, setFileSize] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [parseStatus, setParseStatus] = useState<'idle' | 'parsing' | 'success' | 'error'>('idle');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isLoading = useStore((s) => s.isLoading);
  const loadingProgress = useStore((s) => s.loadingProgress);
  const loadingStage = useStore((s) => s.loadingStage);
  const positions = useStore((s) => s.positions);
  const setFEMData = useStore((s) => s.setFEMData);
  const setLoading = useStore((s) => s.setLoading);

  const parseFile = useCallback(async (file: File) => {
    setFileName(file.name);
    setFileSize(file.size);
    setError(null);
    setParseStatus('parsing');
    setLoading(true, 0, 'reading');

    try {
      const buffer = await file.arrayBuffer();
      setLoading(true, 0, 'parsing');

      const worker = new Worker(
        new URL('../workers/femParser.worker.ts', import.meta.url),
        { type: 'module' }
      );

      worker.onmessage = (e: MessageEvent) => {
        const msg = e.data;

        if (msg.type === 'progress') {
          const stageMap: Record<string, string> = {
            header: 'Parsing header',
            nodes: 'Reading nodes',
            elements: 'Reading elements',
            stress: 'Reading stress data',
            surface: 'Extracting surface',
            complete: 'Complete',
          };
          setLoading(true, msg.progress, stageMap[msg.stage] ?? msg.stage);
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
          setParseStatus('success');
          worker.terminate();
        }

        if (msg.type === 'error') {
          setError(msg.message);
          setLoading(false, 0, 'error');
          setParseStatus('error');
          worker.terminate();
        }
      };

      worker.onerror = () => {
        setError('Worker failed to initialize');
        setLoading(false, 0, 'error');
        setParseStatus('error');
        worker.terminate();
      };

      worker.postMessage({ type: 'parse', buffer }, [buffer]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to read file');
      setLoading(false, 0, 'error');
      setParseStatus('error');
    }
  }, [setFEMData, setLoading]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) parseFile(file);
  }, [parseFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) parseFile(file);
  }, [parseFile]);

  if (positions && parseStatus !== 'parsing') return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
      <div
        className="w-full max-w-md mx-4 bg-black/50 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden pointer-events-auto"
        style={{ fontFamily: "'Source Sans 3', sans-serif" }}
      >
        <div className="px-5 py-3 border-b border-white/5">
          <span className="text-xs uppercase tracking-wider" style={{ fontFamily: "'Orbitron', sans-serif", color: 'rgba(255,255,255,0.7)' }}>
            Load FEM Data
          </span>
        </div>

        <div className="p-5">
          {parseStatus === 'parsing' || isLoading ? (
            <div className="flex flex-col items-center gap-4 py-4">
              <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#00D4FF' }} />
              <div className="text-sm text-white/60">{loadingStage || 'Processing...'}</div>
              <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{ width: `${(loadingProgress * 100).toFixed(0)}%`, backgroundColor: '#00D4FF' }}
                />
              </div>
              <div className="text-xs font-mono" style={{ color: '#00D4FF' }}>
                {(loadingProgress * 100).toFixed(0)}%
              </div>
            </div>
          ) : parseStatus === 'error' ? (
            <div className="flex flex-col items-center gap-3 py-4">
              <AlertCircle className="w-8 h-8" style={{ color: '#FF2D55' }} />
              <div className="text-sm text-center" style={{ color: '#FF2D55' }}>{error}</div>
              <button
                onClick={() => { setParseStatus('idle'); setError(null); setFileName(null); }}
                className="px-4 py-1.5 text-xs rounded-lg border transition-colors"
                style={{ borderColor: 'rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.7)' }}
              >
                Try Again
              </button>
            </div>
          ) : parseStatus === 'success' ? (
            <div className="flex flex-col items-center gap-2 py-4">
              <CheckCircle2 className="w-8 h-8" style={{ color: '#00D4FF' }} />
              <div className="text-sm text-white/70">File loaded successfully</div>
            </div>
          ) : (
            <>
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                className="flex flex-col items-center justify-center gap-3 py-8 border-2 border-dashed rounded-lg cursor-pointer transition-colors"
                style={{
                  borderColor: isDragging ? '#00D4FF' : 'rgba(255,255,255,0.15)',
                  backgroundColor: isDragging ? 'rgba(0,212,255,0.05)' : 'transparent',
                }}
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="w-8 h-8 text-white/30" />
                <div className="text-sm text-white/50">
                  {isDragging ? 'Drop file here' : 'Drag & drop .fem file here'}
                </div>
                <div className="text-xs text-white/30">or click to browse</div>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept=".fem"
                onChange={handleFileInput}
                className="hidden"
              />

              {fileName && (
                <div className="flex items-center gap-2 mt-3 px-3 py-2 rounded-lg bg-white/5">
                  <FileText className="w-4 h-4 text-white/40" />
                  <span className="text-xs text-white/60 truncate flex-1">{fileName}</span>
                  <span className="text-xs text-white/30">{(fileSize / 1024 / 1024).toFixed(2)} MB</span>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
