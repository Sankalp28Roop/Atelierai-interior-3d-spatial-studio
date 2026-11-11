import React, { useState } from 'react';
import { Maximize2, Download, Compass, Check, Copy, Box, Image as ImageIcon, Sparkles, Bookmark, BookmarkCheck, Orbit, Layers, Ruler, Loader2, Globe } from 'lucide-react';
import { ImageWithFallback } from './ImageWithFallback';
import { Depth3DCanvas } from './Depth3DCanvas';
import { ArchitecturalSpatialStudio } from './ArchitecturalSpatialStudio';
import { Panorama360Viewer } from './Panorama360Viewer';
import { ModelViewerContainer } from './ModelViewerContainer';
import { useAuth } from '../contexts/AuthContext';
import { saveDesignToFirestore } from '../services/firebase';

interface SceneImageViewerProps {
  url: string;
  prompt: string;
  styleName?: string;
  source?: string;
  onOpenLightbox?: (url: string, prompt: string, styleName?: string) => void;
  onOpenDollhouseStudio?: () => void;
  onOpenAuth?: (tab?: 'login' | 'signup') => void;
}

export const SceneImageViewer: React.FC<SceneImageViewerProps> = ({
  url,
  prompt,
  styleName = 'Conceptual Interior Layout',
  source = 'modelslab',
  onOpenLightbox,
  onOpenDollhouseStudio,
  onOpenAuth,
}) => {
  // Always sanitize url so any pollinations or rate-limited URL never leaks through
  const safeImageUrl = (url && (url.includes('pollinations') || url.includes('enter.pollinations.ai')))
    ? '/src/assets/images/scene_industrial_loft_kitchen_1794277382447.jpg'
    : url;

  const { user } = useAuth();
  const [copied, setCopied] = useState(false);
  const [savedToFirestore, setSavedToFirestore] = useState(false);
  // View mode: 'image', 'spatial_bim', 'panorama360', 'depth3d', or 'meshy_mesh'
  const [viewMode, setViewMode] = useState<'image' | 'spatial_bim' | 'panorama360' | 'depth3d' | 'meshy_mesh'>('panorama360');

  // Meshy AI conversion state
  const [isConvertingMeshy, setIsConvertingMeshy] = useState(false);
  const [meshyProgress, setMeshyProgress] = useState<number>(0);
  const [meshyStage, setMeshyStage] = useState<string>('');
  const [meshyGlbUrl, setMeshyGlbUrl] = useState<string | null>(null);
  const [meshyError, setMeshyError] = useState<string | null>(null);

  const handleGenerateMeshyMesh = async () => {
    setIsConvertingMeshy(true);
    setMeshyError(null);
    setMeshyProgress(10);
    setMeshyStage('Submitting image to Meshy Image-to-3D pipeline...');

    try {
      const res = await fetch('/api/chat/image-to-3d', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl: url.startsWith('/') ? `${window.location.origin}${url}` : url,
          prompt,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to initialize Meshy 3D generation');
      }

      const taskId = data.taskId;
      // Start polling status
      pollMeshyStatus(taskId);
    } catch (err: any) {
      console.error('Meshy generation failed:', err);
      setMeshyError(err.message || 'Generation failed. Check your Meshy API Key.');
      setIsConvertingMeshy(false);
    }
  };

  const pollMeshyStatus = async (taskId: string) => {
    let attempts = 0;
    const interval = setInterval(async () => {
      attempts++;
      try {
        const res = await fetch(`/api/chat/status-3d/${taskId}`);
        const data = await res.json();

        if (data.status === 'SUCCEEDED' && data.url) {
          clearInterval(interval);
          setMeshyGlbUrl(data.url);
          setIsConvertingMeshy(false);
          setViewMode('meshy_mesh');
        } else if (data.status === 'FAILED') {
          clearInterval(interval);
          setMeshyError(data.error || 'Meshy 3D generation failed.');
          setIsConvertingMeshy(false);
        } else {
          setMeshyProgress(data.progress || Math.min(95, 20 + attempts * 5));
          setMeshyStage(data.stage || 'Reconstructing 3D neural mesh topology...');
        }
      } catch (err: any) {
        if (attempts > 60) {
          clearInterval(interval);
          setMeshyError('Status poll timed out. Please try again.');
          setIsConvertingMeshy(false);
        }
      }
    }, 3000);
  };

  const isDollhouseScene =
    url.includes('isometric_apartment_dollhouse') ||
    prompt.toLowerCase().includes('dollhouse') ||
    prompt.toLowerCase().includes('isometric') ||
    prompt.toLowerCase().includes('layout') ||
    prompt.toLowerCase().includes('apartment') ||
    prompt.toLowerCase().includes('staircase') ||
    styleName.toLowerCase().includes('dollhouse') ||
    styleName.toLowerCase().includes('apartment') ||
    styleName.toLowerCase().includes('isometric');

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = url;
    a.download = `atelier-${styleName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.jpg`;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleSaveToPortfolio = async () => {
    if (!user) {
      onOpenAuth?.('signup');
      return;
    }
    try {
      const designId = `design_${Date.now()}`;
      await saveDesignToFirestore(user.uid, {
        id: designId,
        prompt,
        type: '2D',
        mediaUrl: url,
        title: styleName,
        source,
        createdAt: new Date().toISOString(),
      });
      setSavedToFirestore(true);
      setTimeout(() => setSavedToFirestore(false), 2500);
    } catch (e) {
      console.warn('Could not save design:', e);
    }
  };

  return (
    <div className="relative group rounded-2xl overflow-hidden border border-stone-800 bg-stone-900 shadow-xl transition-all">
      {/* Top Overlay Bar */}
      <div className="flex items-center justify-between p-3 border-b border-stone-800/80 bg-stone-950/90 backdrop-blur-md gap-2">
        {/* Title & Scene Category */}
        <div className="flex items-center gap-2 text-xs text-stone-200 min-w-0">
          <Compass className="w-3.5 h-3.5 text-amber-500 shrink-0" />
          <span className="font-medium truncate max-w-[180px] sm:max-w-[240px]">{styleName}</span>
        </div>

        {/* View Mode Switcher: 360° VR Sphere vs 3D BIM vs 2D Photo vs 3D Depth */}
        <div className="flex items-center bg-stone-800/90 p-0.5 rounded-xl border border-stone-700/60 text-xs">
          <button
            onClick={() => setViewMode('panorama360')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-medium transition-all ${
              viewMode === 'panorama360'
                ? 'bg-amber-500 text-stone-950 shadow-sm font-semibold'
                : 'text-amber-300 hover:text-amber-200'
            }`}
            title="360° Interior VR Sphere - Look around left, right, up & down in 360°"
          >
            <Globe className={`w-3.5 h-3.5 ${viewMode === 'panorama360' ? 'text-stone-950' : 'text-amber-400'}`} />
            <span>360° VR Tour</span>
            <span className={`text-[9px] px-1 rounded uppercase tracking-wider font-mono font-bold ${
              viewMode === 'panorama360' ? 'bg-stone-900 text-amber-300' : 'bg-emerald-500/20 text-emerald-300'
            }`}>
              Free
            </span>
          </button>

          <button
            onClick={() => setViewMode('spatial_bim')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-medium transition-all ${
              viewMode === 'spatial_bim'
                ? 'bg-amber-500 text-stone-950 shadow-sm font-semibold'
                : 'text-stone-300 hover:text-amber-300'
            }`}
            title="Interactive 3D Architectural CAD Spatial Walkthrough with dimensions and utilities"
          >
            <Ruler className={`w-3.5 h-3.5 ${viewMode === 'spatial_bim' ? 'text-stone-950' : 'text-amber-400'}`} />
            <span>3D BIM</span>
          </button>

          {meshyGlbUrl && (
            <button
              onClick={() => setViewMode('meshy_mesh')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-medium transition-all ${
                viewMode === 'meshy_mesh'
                  ? 'bg-amber-500 text-stone-950 shadow-sm font-semibold'
                  : 'text-amber-400 hover:text-amber-300'
              }`}
              title="Inspect generated Meshy 3D .glb mesh"
            >
              <Box className="w-3.5 h-3.5" />
              <span>360° Mesh</span>
              <span className="text-[9px] bg-stone-900 text-amber-300 px-1 rounded uppercase font-mono font-bold">
                GLB
              </span>
            </button>
          )}

          <button
            onClick={() => setViewMode('image')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-medium transition-all ${
              viewMode === 'image'
                ? 'bg-stone-900 text-stone-100 shadow-sm border border-stone-700/80'
                : 'text-stone-400 hover:text-stone-200'
            }`}
            title="View photorealistic 2D render"
          >
            <ImageIcon className="w-3.5 h-3.5 text-stone-400" />
            <span className="hidden sm:inline">2D Photo</span>
          </button>

          <button
            onClick={() => setViewMode('depth3d')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-medium transition-all ${
              viewMode === 'depth3d'
                ? 'bg-stone-900 text-stone-100 shadow-sm border border-stone-700/80'
                : 'text-stone-400 hover:text-stone-200'
            }`}
            title="Inspect design in 3D Depth Orbit"
          >
            <Orbit className="w-3.5 h-3.5 text-stone-400" />
            <span className="hidden sm:inline">3D Depth</span>
          </button>
        </div>

        {/* Quick Action Tools */}
        <div className="flex items-center gap-1 text-stone-400">
          <button
            onClick={handleCopyPrompt}
            title="Copy prompt"
            className="p-1.5 hover:text-stone-100 hover:bg-stone-800 rounded-lg transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>

          <button
            onClick={handleSaveToPortfolio}
            title={savedToFirestore ? 'Saved to Portfolio' : user ? 'Save to My Designs' : 'Sign in to save design'}
            className="p-1.5 hover:text-amber-400 hover:bg-stone-800 rounded-lg transition-colors"
          >
            {savedToFirestore ? (
              <BookmarkCheck className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Bookmark className="w-3.5 h-3.5 text-stone-400 hover:text-amber-400" />
            )}
          </button>

          <button
            onClick={handleDownload}
            title="Download full render"
            className="p-1.5 hover:text-stone-100 hover:bg-stone-800 rounded-lg transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
          </button>

          {onOpenLightbox && (
            <button
              onClick={() => onOpenLightbox(url, prompt, styleName)}
              title="Expand image in lightbox"
              className="p-1.5 hover:text-amber-400 hover:bg-stone-800 rounded-lg transition-colors"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area: 360 VR Sphere OR 3D BIM Studio OR Meshy 360 Mesh OR 3D Depth OR 2D Photo */}
      {viewMode === 'panorama360' ? (
        <div className="w-full relative">
          <Panorama360Viewer prompt={prompt} height="540px" styleName={styleName} />
        </div>
      ) : viewMode === 'meshy_mesh' && meshyGlbUrl ? (
        <div className="w-full relative">
          <ModelViewerContainer
            src={meshyGlbUrl}
            title={`${styleName} - 360° Mesh`}
            height="500px"
          />
        </div>
      ) : viewMode === 'spatial_bim' ? (
        <div className="w-full relative">
          <ArchitecturalSpatialStudio height="540px" promptTitle={prompt} />
        </div>
      ) : viewMode === 'depth3d' ? (
        <div className="w-full relative">
          <Depth3DCanvas imageUrl={safeImageUrl} height="500px" title={styleName} />
        </div>
      ) : (
        <div className="relative overflow-hidden group/img">
          <div
            className="cursor-zoom-in overflow-hidden"
            onClick={() => onOpenLightbox && onOpenLightbox(safeImageUrl, prompt, styleName)}
          >
            <ImageWithFallback
              src={safeImageUrl}
              alt={prompt}
              fallbackTitle={styleName}
              className="w-full h-auto max-h-[500px] object-cover group-hover/img:scale-[1.01] transition-transform duration-500 ease-out"
            />
          </div>

          {/* Floating Pill: Generate 360° 3D Mesh with Meshy AI */}
          <div className="absolute bottom-3 right-3 z-10 flex items-center gap-2">
            <button
              onClick={handleGenerateMeshyMesh}
              disabled={isConvertingMeshy}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold shadow-2xl transition-all ${
                isConvertingMeshy
                  ? 'bg-stone-900 border border-amber-500/50 text-amber-300'
                  : 'bg-amber-500 text-stone-950 hover:bg-amber-400'
              }`}
            >
              {isConvertingMeshy ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
                  <span>Converting: {meshyProgress}% ({meshyStage})</span>
                </>
              ) : (
                <>
                  <Box className="w-4 h-4 text-stone-950" />
                  <span>Generate 360° 3D Mesh with Meshy</span>
                  <Sparkles className="w-3.5 h-3.5 text-stone-950" />
                </>
              )}
            </button>
          </div>

          {meshyError && (
            <div className="absolute top-3 left-3 right-3 z-20 bg-rose-950/90 border border-rose-800 text-rose-200 text-xs px-3 py-2 rounded-xl backdrop-blur-md">
              {meshyError}
            </div>
          )}
        </div>
      )}

      {/* Bottom Scene Metadata */}
      <div className="p-3.5 bg-stone-950/95 border-t border-stone-800/80 flex flex-col gap-1.5">
        <p className="text-xs text-stone-300 font-normal leading-relaxed line-clamp-2">
          {prompt}
        </p>
        <div className="flex items-center justify-between text-[11px] text-stone-500 pt-1 border-t border-stone-800/50">
          <div className="flex items-center gap-2">
            <span className="capitalize">{source.replace('_', ' ')}</span>
            <span>·</span>
            <span>
              {viewMode === 'spatial_bim'
                ? 'Architectural 3D BIM Studio with Dimensions'
                : viewMode === 'depth3d'
                ? '3D Spatial Depth Perspective'
                : 'Photorealistic Architectural Concept'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {viewMode === 'image' ? (
              <button
                onClick={() => setViewMode('spatial_bim')}
                className="text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1 text-[11px]"
              >
                <Ruler className="w-3 h-3" />
                Inspect in 3D BIM
              </button>
            ) : (
              <button
                onClick={() => setViewMode('image')}
                className="text-stone-400 hover:text-stone-200 font-medium flex items-center gap-1 text-[11px]"
              >
                <ImageIcon className="w-3 h-3" />
                View 2D Render
              </button>
            )}

            {onOpenDollhouseStudio && (
              <button
                onClick={onOpenDollhouseStudio}
                className="text-stone-400 hover:text-stone-200 font-medium flex items-center gap-1 text-[11px]"
              >
                <Maximize2 className="w-3 h-3" />
                Full Studio
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
