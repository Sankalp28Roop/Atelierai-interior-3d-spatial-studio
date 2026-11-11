import React, { useEffect } from 'react';
import { X, Sparkles, Compass, Layers, Ruler } from 'lucide-react';
import { ArchitecturalSpatialStudio } from './ArchitecturalSpatialStudio';

interface DollhouseModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  initialFloorMode?: 'both' | 'exploded' | 'ground' | 'upper';
}

export const DollhouseModal: React.FC<DollhouseModalProps> = ({
  isOpen,
  onClose,
  title = 'Architectural 3D Spatial BIM Studio',
  initialFloorMode = 'both',
}) => {
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/90 backdrop-blur-md p-3 sm:p-6 animate-fade-in">
      <div className="relative w-full max-w-7xl h-[92vh] flex flex-col rounded-3xl border border-stone-800 bg-stone-900 shadow-2xl overflow-hidden">
        {/* Top Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-stone-800 bg-stone-950/90 backdrop-blur-sm z-30">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Ruler className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-stone-100">{title}</h3>
                <span className="text-[10px] bg-amber-500/20 text-amber-300 font-mono px-2 py-0.5 rounded-full border border-amber-500/30 font-medium">
                  BIM Dimensional Walkthrough
                </span>
              </div>
              <p className="text-xs text-stone-400">
                Interactive spatial floor plans · Utility conduits · Detailed room dimensions (L × W × H) · Guided tour
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              title="Close 3D Studio"
              className="p-2 text-stone-400 hover:text-stone-100 hover:bg-stone-800 rounded-xl transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Full Architectural BIM Spatial Studio Viewport */}
        <div className="relative flex-1 w-full h-full overflow-hidden bg-slate-950">
          <ArchitecturalSpatialStudio height="100%" />
        </div>
      </div>
    </div>
  );
};
