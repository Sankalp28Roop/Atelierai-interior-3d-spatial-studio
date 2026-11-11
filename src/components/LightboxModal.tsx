import React, { useEffect, useState } from 'react';
import { X, Download, Copy, Check, ZoomIn, ZoomOut, Compass } from 'lucide-react';
import { ImageWithFallback } from './ImageWithFallback';

interface LightboxModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  prompt: string;
  title?: string;
}

export const LightboxModal: React.FC<LightboxModalProps> = ({
  isOpen,
  onClose,
  imageUrl,
  prompt,
  title = 'Architectural Interior Concept',
}) => {
  const [zoom, setZoom] = useState(1);
  const [copied, setCopied] = useState(false);

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

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = imageUrl;
    a.download = `atelier-interior-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.jpg`;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/90 backdrop-blur-md p-4 sm:p-6 animate-fade-in">
      <div className="relative w-full max-w-5xl max-h-[92vh] flex flex-col rounded-3xl border border-stone-800 bg-stone-900 shadow-2xl overflow-hidden">
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-800 bg-stone-950/80 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500">
              <Compass className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-stone-100">{title}</h3>
              <p className="text-xs text-stone-400">High-Resolution Conceptual Render</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setZoom((z) => Math.min(2, z + 0.25))}
              title="Zoom in"
              className="p-2 text-stone-400 hover:text-stone-100 hover:bg-stone-800 rounded-xl transition-colors"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={() => setZoom((z) => Math.max(0.75, z - 0.25))}
              title="Zoom out"
              className="p-2 text-stone-400 hover:text-stone-100 hover:bg-stone-800 rounded-xl transition-colors"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <button
              onClick={handleCopyPrompt}
              title="Copy prompt"
              className="p-2 text-stone-400 hover:text-stone-100 hover:bg-stone-800 rounded-xl transition-colors"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
            <button
              onClick={handleDownload}
              title="Download full quality"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-stone-900 bg-amber-500 hover:bg-amber-400 rounded-xl transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download</span>
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

        {/* Viewport Area */}
        <div className="relative flex-1 overflow-auto flex items-center justify-center p-6 bg-stone-950/60 min-h-[360px] sm:min-h-[460px]">
          <div
            style={{ transform: `scale(${zoom})`, transition: 'transform 0.2s ease-out' }}
            className="origin-center max-w-full flex items-center justify-center"
          >
            <ImageWithFallback
              src={imageUrl}
              alt={prompt}
              fallbackTitle={title}
              className="max-h-[65vh] w-auto max-w-full object-contain rounded-2xl shadow-2xl border border-stone-800/80"
            />
          </div>
        </div>

        {/* Footer Details */}
        <div className="px-6 py-4 border-t border-stone-800 bg-stone-950/80">
          <span className="text-[11px] font-medium text-stone-400 uppercase tracking-wider block mb-1">
            Prompt Specification
          </span>
          <p className="text-xs text-stone-300 leading-relaxed font-normal">{prompt}</p>
        </div>
      </div>
    </div>
  );
};
