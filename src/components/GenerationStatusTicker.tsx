import React, { useEffect, useState } from 'react';
import { Box, Compass, Sparkles, Layers, Cpu } from 'lucide-react';

interface GenerationStatusTickerProps {
  intent: 'GENERATE_2D' | 'GENERATE_3D';
  stage?: string;
  progress?: number;
  prompt: string;
}

export const GenerationStatusTicker: React.FC<GenerationStatusTickerProps> = ({
  intent,
  stage,
  progress: externalProgress,
  prompt,
}) => {
  const [internalProgress, setInternalProgress] = useState(10);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const is3D = intent === 'GENERATE_3D';
  const expectedTotalSeconds = is3D ? 45 : 10;

  // Simulate smooth progress if external progress is not constantly streaming
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);

    const progressInterval = setInterval(() => {
      setInternalProgress((prev) => {
        if (externalProgress !== undefined && externalProgress > prev) {
          return externalProgress;
        }
        if (prev >= 94) return 94; // cap at 94% until done
        const increment = is3D ? 1.5 : 6;
        return Math.min(94, prev + increment);
      });
    }, 500);

    return () => {
      clearInterval(timer);
      clearInterval(progressInterval);
    };
  }, [externalProgress, is3D]);

  const activeProgress = externalProgress !== undefined ? externalProgress : internalProgress;

  // Derive dynamic stage message based on progress and intent
  const currentStage = stage || (is3D
    ? activeProgress < 30
      ? 'Initializing volumetric voxelization...'
      : activeProgress < 65
      ? 'Remeshing quad topology surfaces...'
      : activeProgress < 90
      ? 'Baking PBR material maps & normals...'
      : 'Finalizing GLB mesh binary package...'
    : activeProgress < 35
    ? 'Constructing spatial perspective & room boundaries...'
    : activeProgress < 75
    ? 'Calculating global illumination & diffuse shadows...'
    : 'Synthesizing photorealistic architectural textures...');

  return (
    <div className="w-full rounded-2xl border border-stone-800 bg-stone-900/95 p-5 shadow-2xl overflow-hidden relative">
      {/* Subtle background glow */}
      <div
        className={`absolute -right-20 -top-20 w-44 h-44 rounded-full blur-3xl pointer-events-none opacity-20 ${
          is3D ? 'bg-amber-500' : 'bg-stone-400'
        }`}
      />

      {/* Header with Title and Mode */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div
            className={`w-8 h-8 rounded-xl flex items-center justify-center border ${
              is3D
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                : 'bg-stone-800 border-stone-700 text-stone-200'
            }`}
          >
            {is3D ? <Box className="w-4 h-4 animate-bounce" /> : <Compass className="w-4 h-4 animate-spin" />}
          </div>
          <div>
            <h4 className="text-sm font-semibold text-stone-100 flex items-center gap-2">
              {is3D ? 'Compiling 3D Mesh Geometry...' : 'Generating 2D Scene...'}
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-stone-800 text-stone-400 border border-stone-700">
                {is3D ? 'Meshy v2 Engine' : 'ModelsLab v6 Engine'}
              </span>
            </h4>
            <p className="text-xs text-stone-400 mt-0.5 truncate max-w-sm sm:max-w-md">
              "{prompt}"
            </p>
          </div>
        </div>

        {/* Elapsed Timer */}
        <div className="text-right">
          <span className="text-xs font-mono font-medium text-stone-300">
            {elapsedSeconds}s <span className="text-stone-500">/ ~{expectedTotalSeconds}s</span>
          </span>
          <div className="text-[10px] text-amber-500/80 font-mono mt-0.5 font-medium">
            {Math.round(activeProgress)}%
          </div>
        </div>
      </div>

      {/* High-tech Progress Bar */}
      <div className="w-full h-2 rounded-full bg-stone-800 overflow-hidden mb-3 p-[1px]">
        <div
          className={`h-full rounded-full transition-all duration-300 ${
            is3D
              ? 'bg-gradient-to-r from-amber-600 to-amber-400'
              : 'bg-gradient-to-r from-stone-400 to-amber-500'
          }`}
          style={{ width: `${Math.min(100, Math.max(5, activeProgress))}%` }}
        />
      </div>

      {/* Stage Tracker & Pipeline Steps */}
      <div className="flex items-center justify-between text-xs text-stone-400 pt-1">
        <div className="flex items-center gap-2 truncate">
          <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0 animate-pulse" />
          <span className="text-stone-300 font-medium truncate">{currentStage}</span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0 pl-2 text-[11px] text-stone-500">
          <Layers className="w-3.5 h-3.5" />
          <span>{is3D ? 'Quad Topology' : '1024×768 Render'}</span>
        </div>
      </div>
    </div>
  );
};
