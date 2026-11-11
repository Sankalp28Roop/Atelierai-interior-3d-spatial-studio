import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import {
  RotateCcw,
  Compass,
  Maximize2,
  ZoomIn,
  ZoomOut,
  Sparkles,
  Eye,
  Layers,
  Sun,
  Loader2,
} from 'lucide-react';

interface PanoramaViewerProps {
  prompt: string;
  height?: string;
  styleName?: string;
}

export const Panorama360Viewer: React.FC<PanoramaViewerProps> = ({
  prompt,
  height = '540px',
  styleName = '360° Interior VR Panorama',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [fov, setFov] = useState(75);
  const [isAutoRotating, setIsAutoRotating] = useState(true);

  // References for Three.js
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sphereMeshRef = useRef<THREE.Mesh | null>(null);
  const reqAnimIdRef = useRef<number | null>(null);

  // Mouse & Touch Pan/Tilt Coordinates (Spherical Lat/Lon)
  const isDraggingRef = useRef(false);
  const onPointerDownPointerXRef = useRef(0);
  const onPointerDownPointerYRef = useRef(0);
  const onPointerDownLonRef = useRef(0);
  const onPointerDownLatRef = useRef(0);
  const lonRef = useRef(0);
  const latRef = useRef(0);
  const phiRef = useRef(0);
  const thetaRef = useRef(0);

  // Build high-resolution equirectangular panorama URL routed through proxy to guarantee WebGL loading
  const cleanPrompt = encodeURIComponent(
    `360 degree panoramic equirectangular photo of ${prompt}, interior architectural design, 8k resolution, photorealistic, seamless full spherical VR projection, cinematic interior lighting, masterpiece`
  );
  const rawPanoramaUrl = `https://image.pollinations.ai/prompt/${cleanPrompt}?width=2048&height=1024&nologo=true&model=flux`;
  const panoramaUrl = `/api/proxy-image?url=${encodeURIComponent(rawPanoramaUrl)}`;

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    setIsLoading(true);

    const width = container.clientWidth || 800;
    const heightPx = container.clientHeight || parseInt(height, 10) || 540;

    // 1. Scene & Camera
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(fov, width / heightPx, 0.1, 1000);
    camera.position.set(0, 0, 0); // Camera sits in the center of the room
    cameraRef.current = camera;

    // 2. Renderer
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, heightPx);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    rendererRef.current = renderer;

    // 3. Inverted 3D Sphere for 360 Interior Panoramic Projection
    const geometry = new THREE.SphereGeometry(50, 64, 40);
    // Invert geometry normals so the texture renders on the inside of the room
    geometry.scale(-1, 1, 1);

    const textureLoader = new THREE.TextureLoader();
    textureLoader.setCrossOrigin('anonymous');

    textureLoader.load(
      panoramaUrl,
      (texture) => {
        texture.minFilter = THREE.LinearFilter;
        texture.generateMipmaps = false;

        const material = new THREE.MeshBasicMaterial({ map: texture });
        const sphere = new THREE.Mesh(geometry, material);
        scene.add(sphere);
        sphereMeshRef.current = sphere;
        setIsLoading(false);
      },
      undefined,
      (err) => {
        console.warn('360 texture load error:', err);
        setIsLoading(false);
      }
    );

    // 4. Render loop
    const renderLoop = () => {
      reqAnimIdRef.current = requestAnimationFrame(renderLoop);

      if (isAutoRotating && !isDraggingRef.current) {
        lonRef.current += 0.08; // Gentle ambient rotation
      }

      // Calculate spherical camera direction
      latRef.current = Math.max(-85, Math.min(85, latRef.current));
      phiRef.current = THREE.MathUtils.degToRad(90 - latRef.current);
      thetaRef.current = THREE.MathUtils.degToRad(lonRef.current);

      const target = new THREE.Vector3();
      target.x = 500 * Math.sin(phiRef.current) * Math.cos(thetaRef.current);
      target.y = 500 * Math.cos(phiRef.current);
      target.z = 500 * Math.sin(phiRef.current) * Math.sin(thetaRef.current);

      camera.lookAt(target);
      renderer.render(scene, camera);
    };

    reqAnimIdRef.current = requestAnimationFrame(renderLoop);

    // Resize handler
    const handleResize = () => {
      if (!container || !renderer || !camera) return;
      const w = container.clientWidth;
      const h = container.clientHeight || parseInt(height, 10) || 540;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);
    setTimeout(handleResize, 100);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (reqAnimIdRef.current) cancelAnimationFrame(reqAnimIdRef.current);
      renderer.dispose();
      geometry.dispose();
    };
  }, [panoramaUrl, height]);

  // Pointer interactions for 360 look-around
  const handlePointerDown = (e: React.PointerEvent) => {
    isDraggingRef.current = true;
    onPointerDownPointerXRef.current = e.clientX;
    onPointerDownPointerYRef.current = e.clientY;
    onPointerDownLonRef.current = lonRef.current;
    onPointerDownLatRef.current = latRef.current;
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;
    lonRef.current =
      (onPointerDownPointerXRef.current - e.clientX) * 0.18 + onPointerDownLonRef.current;
    latRef.current =
      (e.clientY - onPointerDownPointerYRef.current) * 0.18 + onPointerDownLatRef.current;
  };

  const handlePointerUp = () => {
    isDraggingRef.current = false;
  };

  const handleWheel = (e: React.WheelEvent) => {
    const newFov = Math.max(35, Math.min(100, fov + e.deltaY * 0.05));
    setFov(newFov);
    if (cameraRef.current) {
      cameraRef.current.fov = newFov;
      cameraRef.current.updateProjectionMatrix();
    }
  };

  const handleReset = () => {
    lonRef.current = 0;
    latRef.current = 0;
    setFov(75);
    if (cameraRef.current) {
      cameraRef.current.fov = 75;
      cameraRef.current.updateProjectionMatrix();
    }
  };

  return (
    <div
      ref={containerRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onWheel={handleWheel}
      className="relative w-full rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 shadow-2xl select-none"
      style={{ height }}
    >
      <canvas ref={canvasRef} className="w-full h-full block cursor-move active:cursor-grabbing" />

      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-sm z-20">
          <Loader2 className="w-8 h-8 text-amber-400 animate-spin mb-3" />
          <p className="text-xs text-slate-200 font-semibold font-mono tracking-wide">
            Synthesizing 360° Equirectangular Spatial Sphere...
          </p>
          <p className="text-[11px] text-slate-400 mt-1">Generating walls, ceiling, floor, and interior lighting</p>
        </div>
      )}

      {/* TOP LEFT: Status Banner */}
      <div className="absolute top-4 left-4 z-20 flex items-center gap-2 pointer-events-none">
        <div className="bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-700/80 shadow-xl flex items-center gap-2 text-xs text-slate-200">
          <Compass className="w-4 h-4 text-amber-400 animate-spin" style={{ animationDuration: '8s' }} />
          <span className="font-semibold text-amber-300">360° Interior VR Sphere</span>
          <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-1.5 py-0.5 rounded-full font-mono font-bold">
            Live Free
          </span>
        </div>
      </div>

      {/* BOTTOM CONTROLS BAR */}
      <div className="absolute bottom-4 left-4 right-4 z-20 flex items-center justify-between pointer-events-none">
        <div className="pointer-events-auto bg-slate-900/90 backdrop-blur-md px-3.5 py-2 rounded-xl border border-slate-700/80 text-xs text-slate-300 shadow-xl flex items-center gap-3">
          <span>Click & drag 360° in any direction</span>
          <span className="text-slate-600">•</span>
          <button
            onClick={handleReset}
            className="flex items-center gap-1 text-amber-400 hover:text-amber-300 font-medium"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset View</span>
          </button>
        </div>

        <div className="pointer-events-auto flex items-center gap-2 bg-slate-900/90 backdrop-blur-md p-1.5 rounded-xl border border-slate-700/80 shadow-xl text-xs">
          <button
            onClick={() => setIsAutoRotating(!isAutoRotating)}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
              isAutoRotating ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {isAutoRotating ? 'Auto-Orbit On' : 'Auto-Orbit Off'}
          </button>

          <div className="flex items-center gap-1 px-1 border-l border-slate-700">
            <button
              onClick={() => {
                const nextFov = Math.min(100, fov + 8);
                setFov(nextFov);
                if (cameraRef.current) {
                  cameraRef.current.fov = nextFov;
                  cameraRef.current.updateProjectionMatrix();
                }
              }}
              className="p-1.5 text-slate-400 hover:text-slate-100 rounded"
              title="Zoom out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => {
                const nextFov = Math.max(35, fov - 8);
                setFov(nextFov);
                if (cameraRef.current) {
                  cameraRef.current.fov = nextFov;
                  cameraRef.current.updateProjectionMatrix();
                }
              }}
              className="p-1.5 text-slate-400 hover:text-slate-100 rounded"
              title="Zoom in"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

