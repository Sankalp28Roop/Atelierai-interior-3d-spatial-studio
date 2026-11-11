import React, { useEffect, useState, useRef } from 'react';
import { X, Download, RotateCcw, Play, Pause, Sun, Box, Layers, Sparkles } from 'lucide-react';

interface Model3DStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  modelUrl: string;
  title?: string;
}

export const Model3DStudioModal: React.FC<Model3DStudioModalProps> = ({
  isOpen,
  onClose,
  modelUrl,
  title = 'Interactive 3D Furniture Asset',
}) => {
  const modelViewerRef = useRef<any>(null);
  const [autoRotate, setAutoRotate] = useState(true);
  const [exposure, setExposure] = useState<number>(1.0);
  const [environment, setEnvironment] = useState<'neutral' | 'warm' | 'dramatic'>('neutral');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen || !modelUrl || typeof modelUrl !== 'string' || modelUrl.trim() === '') return null;

  const toggleAutoRotate = () => {
    const el = modelViewerRef.current;
    if (!el) return;
    const nextState = !autoRotate;
    setAutoRotate(nextState);
    if (nextState) {
      el.setAttribute('auto-rotate', '');
    } else {
      el.removeAttribute('auto-rotate');
    }
  };

  const handleResetCamera = () => {
    const el = modelViewerRef.current;
    if (!el) return;
    try {
      el.cameraOrbit = '0deg 75deg 105%';
      el.fieldOfView = 'auto';
      if (typeof el.jumpCameraToGoal === 'function') {
        el.jumpCameraToGoal();
      }
    } catch (e) {
      el.setAttribute('camera-orbit', '0deg 75deg 105%');
    }
  };

  const handleDownload = () => {
    if (!modelUrl) return;
    const a = document.createElement('a');
    a.href = modelUrl;
    a.download = `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.glb`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const cycleLighting = () => {
    if (environment === 'neutral') {
      setEnvironment('warm');
      setExposure(1.3);
    } else if (environment === 'warm') {
      setEnvironment('dramatic');
      setExposure(0.7);
    } else {
      setEnvironment('neutral');
      setExposure(1.0);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/90 backdrop-blur-md p-4 sm:p-6 animate-fade-in">
      <div className="relative w-full max-w-5xl max-h-[92vh] flex flex-col rounded-3xl border border-stone-800 bg-stone-900 shadow-2xl overflow-hidden">
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-800 bg-stone-950/80 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500">
              <Box className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-stone-100">{title}</h3>
              <p className="text-xs text-stone-400">Full Viewport 3D Orbital Inspection</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleAutoRotate}
              title={autoRotate ? 'Pause rotation' : 'Start rotation'}
              className="p-2 text-stone-400 hover:text-stone-100 hover:bg-stone-800 rounded-xl transition-colors"
            >
              {autoRotate ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </button>
            <button
              onClick={handleResetCamera}
              title="Reset camera viewpoint"
              className="p-2 text-stone-400 hover:text-stone-100 hover:bg-stone-800 rounded-xl transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              onClick={cycleLighting}
              title={`Lighting: ${environment}`}
              className="p-2 text-stone-400 hover:text-amber-400 hover:bg-stone-800 rounded-xl transition-colors"
            >
              <Sun className="w-4 h-4" />
            </button>
            <button
              onClick={handleDownload}
              title="Download GLB binary container"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-stone-900 bg-amber-500 hover:bg-amber-400 rounded-xl transition-colors ml-1"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download .GLB</span>
            </button>
            <button
              onClick={onClose}
              title="Close modal"
              className="p-2 text-stone-400 hover:text-stone-100 hover:bg-stone-800 rounded-xl transition-colors ml-2"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 3D Canvas Area */}
        <div className="relative flex-1 bg-gradient-to-b from-stone-950 to-stone-900 flex items-center justify-center min-h-[400px] sm:min-h-[500px]">
          <model-viewer
            ref={modelViewerRef}
            src={modelUrl && (modelUrl.includes('.glb') || modelUrl.includes('.gltf')) ? modelUrl : '/models/sheen_chair.glb'}
            alt={title}
            auto-rotate={autoRotate ? '' : undefined}
            camera-controls=""
            shadow-intensity="1"
            shadow-softness="0.75"
            exposure={exposure}
            style={{
              width: '100%',
              height: '560px',
              backgroundColor: 'transparent',
            }}
          />
        </div>

        {/* Studio Info Footer */}
        <div className="px-6 py-3.5 border-t border-stone-800 bg-stone-950/90 flex flex-wrap items-center justify-between gap-4 text-xs text-stone-400">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 text-stone-300">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              WebGL PBR Shading
            </span>
            <span className="text-stone-600">·</span>
            <span>Quad Mesh Topology</span>
            <span className="text-stone-600">·</span>
            <span className="capitalize">Environment: {environment}</span>
          </div>

          <div className="text-[11px] text-stone-500">
            Click & drag to orbit · Shift + drag to pan · Scroll wheel to zoom
          </div>
        </div>
      </div>
    </div>
  );
};
