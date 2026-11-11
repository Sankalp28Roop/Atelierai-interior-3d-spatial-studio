import React, { useState, useRef, useEffect } from 'react';
import {
  RotateCcw,
  Play,
  Pause,
  Download,
  Maximize2,
  Minimize2,
  Box,
  Sun,
  Layers,
  Sparkles,
} from 'lucide-react';

interface ModelViewerContainerProps {
  src: string;
  alt?: string;
  title?: string;
  dimensions?: string;
  height?: string;
  onExpandFullscreen?: (src: string, title?: string) => void;
  className?: string;
}

export const ModelViewerContainer: React.FC<ModelViewerContainerProps> = ({
  src,
  alt = '3D Furniture Model',
  title = 'Interactive 3D Furniture Asset',
  dimensions,
  height = '300px',
  onExpandFullscreen,
  className = '',
}) => {
  // Guard against empty or invalid model URL
  if (!src || typeof src !== 'string' || src.trim() === '') {
    return (
      <div
        className={`w-full rounded-2xl border border-stone-800 bg-stone-900/80 p-8 flex flex-col items-center justify-center text-stone-400 ${className}`}
        style={{ height }}
      >
        <Box className="w-8 h-8 text-amber-500/50 mb-2 animate-pulse" />
        <p className="text-xs font-medium text-stone-300">Loading 3D mesh model...</p>
      </div>
    );
  }

  const modelViewerRef = useRef<any>(null);
  const [autoRotate, setAutoRotate] = useState(true);
  const [isLoaded, setIsLoaded] = useState(false);
  const [exposure, setExposure] = useState<number>(1.0);
  const [shadowIntensity, setShadowIntensity] = useState<number>(1.0);
  const [environment, setEnvironment] = useState<'neutral' | 'warm' | 'dramatic'>('neutral');

  useEffect(() => {
    const el = modelViewerRef.current;
    if (!el) return;

    const handleLoad = () => setIsLoaded(true);
    const handleError = (e: any) => {
      console.warn('model-viewer load event:', e);
      setIsLoaded(true); // dismiss spinner
    };

    el.addEventListener('load', handleLoad);
    el.addEventListener('error', handleError);

    return () => {
      el.removeEventListener('load', handleLoad);
      el.removeEventListener('error', handleError);
    };
  }, [src]);

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
    if (!src) return;
    const a = document.createElement('a');
    a.href = src;
    a.download = `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.glb`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const cycleLighting = () => {
    if (environment === 'neutral') {
      setEnvironment('warm');
      setExposure(1.2);
    } else if (environment === 'warm') {
      setEnvironment('dramatic');
      setExposure(0.8);
    } else {
      setEnvironment('neutral');
      setExposure(1.0);
    }
  };

  return (
    <div
      className={`relative w-full rounded-2xl border border-stone-800 bg-gradient-to-b from-stone-900/90 to-stone-950/90 overflow-hidden shadow-xl backdrop-blur-sm group ${className}`}
    >
      {/* Top Controls Bar */}
      <div className="absolute top-3 left-3 right-3 z-10 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-2 pointer-events-auto bg-stone-950/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-stone-800/80 text-xs text-stone-300">
          <Box className="w-3.5 h-3.5 text-amber-500" />
          <span className="font-medium truncate max-w-[180px] sm:max-w-[260px]">{title}</span>
          <span className="text-stone-500 text-[10px] uppercase font-mono">GLB Mesh</span>
        </div>

        <div className="flex items-center gap-1.5 pointer-events-auto bg-stone-950/80 backdrop-blur-md p-1 rounded-xl border border-stone-800/80">
          <button
            onClick={toggleAutoRotate}
            title={autoRotate ? 'Pause rotation' : 'Start auto-rotation'}
            className="p-1.5 text-stone-400 hover:text-stone-100 hover:bg-stone-800 rounded-lg transition-colors"
          >
            {autoRotate ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          </button>

          <button
            onClick={handleResetCamera}
            title="Reset camera view"
            className="p-1.5 text-stone-400 hover:text-stone-100 hover:bg-stone-800 rounded-lg transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={cycleLighting}
            title={`Lighting: ${environment}`}
            className="p-1.5 text-stone-400 hover:text-amber-400 hover:bg-stone-800 rounded-lg transition-colors"
          >
            <Sun className="w-3.5 h-3.5" />
          </button>

          {onExpandFullscreen && (
            <button
              onClick={() => onExpandFullscreen(src, title)}
              title="Expand 3D viewport"
              className="p-1.5 text-stone-400 hover:text-stone-100 hover:bg-stone-800 rounded-lg transition-colors"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            onClick={handleDownload}
            title="Download .GLB 3D File"
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-stone-900 bg-amber-500 hover:bg-amber-400 rounded-lg transition-colors shadow-sm ml-0.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">GLB</span>
          </button>
        </div>
      </div>

      {/* Loading Overlay */}
      {!isLoaded && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-stone-950/70 z-0 pointer-events-none">
          <div className="w-8 h-8 border-2 border-amber-500/20 border-t-amber-500 rounded-full animate-spin mb-2" />
          <p className="text-xs text-stone-400 font-medium">Parsing 3D geometry & shaders...</p>
        </div>
      )}

      {/* Google <model-viewer> web component element */}
      <model-viewer
        ref={modelViewerRef}
        src={src && (src.includes('.glb') || src.includes('.gltf') || src.startsWith('http')) ? src : '/models/sheen_chair.glb'}
        alt={alt}
        auto-rotate={autoRotate ? '' : undefined}
        camera-controls=""
        shadow-intensity={shadowIntensity}
        shadow-softness="0.8"
        exposure={exposure}
        loading="eager"
        style={{
          width: '100%',
          height: height,
          minHeight: '400px',
          display: 'block',
          backgroundColor: 'transparent',
        }}
      />

      {/* Interactive Helper Footer */}
      <div className="px-4 py-2 bg-stone-950/80 border-t border-stone-800/80 flex items-center justify-between text-[11px] text-stone-400">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 text-stone-400">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Interactive 3D Orbit
          </span>
          {dimensions && (
            <>
              <span className="hidden sm:inline text-stone-600">·</span>
              <span className="hidden sm:inline text-amber-400 font-mono text-[10px]">{dimensions}</span>
            </>
          )}
          <span className="hidden md:inline text-stone-600">·</span>
          <span className="hidden md:inline text-stone-500">Drag to rotate · Scroll to zoom</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-stone-400 capitalize">Lighting: {environment}</span>
          <button
            onClick={handleDownload}
            className="text-amber-400 hover:text-amber-300 font-medium flex items-center gap-1"
          >
            <Download className="w-3 h-3" />
            Export Asset
          </button>
        </div>
      </div>
    </div>
  );
};
