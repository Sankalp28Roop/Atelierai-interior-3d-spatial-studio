import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RotateCcw, ZoomIn, ZoomOut, Sparkles, Box, Compass } from 'lucide-react';

interface Depth3DCanvasProps {
  imageUrl: string;
  height?: string;
  title?: string;
}

export const Depth3DCanvas: React.FC<Depth3DCanvasProps> = ({
  imageUrl,
  height = '500px',
  title = '3D Spatial Depth Perspective',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [wireframe, setWireframe] = useState(false);
  const [depthIntensity, setDepthIntensity] = useState(1.2);

  const isDraggingRef = useRef(false);
  const lastMousePosRef = useRef({ x: 0, y: 0 });
  const rotationRef = useRef({ x: 0.25, y: -0.2 });
  const velocityRef = useRef({ x: 0, y: 0 });
  const zoomRef = useRef(1.0);
  const reqAnimRef = useRef<number | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    setIsLoading(true);

    const width = container.clientWidth || 800;
    const heightPx = parseInt(height, 10) || 500;

    // 1. Scene & Camera
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0c0a09); // Stone 950

    const camera = new THREE.PerspectiveCamera(45, width / heightPx, 0.1, 100);
    camera.position.set(0, 0, 4.5);

    // 2. Renderer
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, heightPx);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // 3. Ambient & Directional Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xfffaed, 1.5);
    dirLight.position.set(5, 5, 5);
    scene.add(dirLight);

    // 4. Load Texture and generate Depth Displacement Mesh
    let mesh: THREE.Mesh | null = null;
    const textureLoader = new THREE.TextureLoader();
    textureLoader.setCrossOrigin('anonymous');

    // Route through local proxy to prevent CORS issues or tainted canvas
    const safeUrl = imageUrl.startsWith('http')
      ? `/api/proxy-image?url=${encodeURIComponent(imageUrl)}`
      : imageUrl.startsWith('/')
      ? imageUrl
      : `/assets/images/isometric_apartment_dollhouse.png`;

    const createMeshWithTexture = (tex: THREE.Texture) => {
      tex.minFilter = THREE.LinearFilter;
      tex.generateMipmaps = false;

      // High resolution subdivided plane (16:9 standard interior aspect)
      const geometry = new THREE.PlaneGeometry(3.6, 2.7, 128, 128);

      const customMaterial = new THREE.ShaderMaterial({
        uniforms: {
          uTexture: { value: tex },
          uDepth: { value: depthIntensity * 0.4 },
          uWireframe: { value: wireframe ? 1.0 : 0.0 },
        },
        vertexShader: `
          uniform sampler2D uTexture;
          uniform float uDepth;
          varying vec2 vUv;
          varying float vElevation;
          varying float vEdgeFactor;

          void main() {
            vUv = uv;
            vec4 color = texture2D(uTexture, uv);
            
            vec2 edgeDist = min(uv, 1.0 - uv);
            float edgeFade = smoothstep(0.0, 0.08, min(edgeDist.x, edgeDist.y));
            vEdgeFactor = edgeFade;

            float luminance = dot(color.rgb, vec3(0.299, 0.587, 0.114));
            
            vec3 newPosition = position;
            float disp = (luminance - 0.45) * uDepth * edgeFade;
            newPosition.z += disp;
            vElevation = disp;

            gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
          }
        `,
        fragmentShader: `
          uniform sampler2D uTexture;
          uniform float uWireframe;
          varying vec2 vUv;
          varying float vElevation;
          varying float vEdgeFactor;

          void main() {
            vec4 texColor = texture2D(uTexture, vUv);
            
            if (uWireframe > 0.5) {
              gl_FragColor = vec4(0.95, 0.75, 0.2, 1.0);
            } else {
              // Ensure alpha is at least 0.85 so mesh never disappears
              float alpha = max(0.85, vEdgeFactor);
              gl_FragColor = vec4(texColor.rgb, alpha);
            }
          }
        `,
        side: THREE.DoubleSide,
        transparent: true,
        wireframe: wireframe,
      });

      mesh = new THREE.Mesh(geometry, customMaterial);
      scene.add(mesh);
      setIsLoading(false);
    };

    textureLoader.load(
      safeUrl,
      (texture) => {
        createMeshWithTexture(texture);
      },
      undefined,
      (err) => {
        console.warn('Depth texture load error, using local fallback:', err);
        // Fallback to local image asset
        textureLoader.load(
          '/assets/images/isometric_apartment_dollhouse.png',
          (fbTexture) => {
            createMeshWithTexture(fbTexture);
          },
          undefined,
          () => setIsLoading(false)
        );
      }
    );

    // 5. Render Loop with smooth inertia
    const render = () => {
      reqAnimRef.current = requestAnimationFrame(render);

      if (!isDraggingRef.current) {
        rotationRef.current.y += velocityRef.current.x;
        rotationRef.current.x += velocityRef.current.y;
        velocityRef.current.x *= 0.92;
        velocityRef.current.y *= 0.92;
      }

      if (mesh) {
        mesh.rotation.x = rotationRef.current.x;
        mesh.rotation.y = rotationRef.current.y;
        camera.position.z = 4.5 / zoomRef.current;
      }

      renderer.render(scene, camera);
    };

    reqAnimRef.current = requestAnimationFrame(render);

    // Resize Handler
    const handleResize = () => {
      if (!container || !renderer || !camera) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (reqAnimRef.current) cancelAnimationFrame(reqAnimRef.current);
      renderer.dispose();
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry?.dispose();
          if (obj.material) {
            if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
            else obj.material.dispose();
          }
        }
      });
    };
  }, [imageUrl, depthIntensity, wireframe, height]);

  // Mouse / Touch Interaction Handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    isDraggingRef.current = true;
    lastMousePosRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current) return;
    const deltaX = (e.clientX - lastMousePosRef.current.x) * 0.007;
    const deltaY = (e.clientY - lastMousePosRef.current.y) * 0.007;

    rotationRef.current.y += deltaX;
    rotationRef.current.x = Math.max(-0.8, Math.min(0.8, rotationRef.current.x + deltaY));

    velocityRef.current = { x: deltaX * 0.3, y: deltaY * 0.3 };
    lastMousePosRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  const handleReset = () => {
    rotationRef.current = { x: 0.25, y: -0.2 };
    velocityRef.current = { x: 0, y: 0 };
    zoomRef.current = 1.0;
  };

  return (
    <div
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      className="relative w-full rounded-2xl overflow-hidden bg-stone-950 cursor-grab active:cursor-grabbing select-none"
      style={{ height }}
    >
      <canvas ref={canvasRef} className="w-full h-full block" />

      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-stone-950/80 backdrop-blur-sm z-20">
          <Sparkles className="w-6 h-6 text-amber-400 animate-spin mb-2" />
          <p className="text-xs text-stone-300 font-medium font-mono">
            Generating 3D spatial depth displacement...
          </p>
        </div>
      )}

      {/* Floating Spatial Controls */}
      <div className="absolute top-3 left-3 z-10 flex items-center gap-2">
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-900/85 backdrop-blur-md border border-stone-800 text-[11px] text-stone-200 shadow-lg">
          <Compass className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
          <span className="font-semibold text-amber-300">3D Depth Spatial Orbit</span>
        </div>
      </div>

      {/* Bottom Floating Control Bar */}
      <div className="absolute bottom-3 left-3 right-3 z-10 flex items-center justify-between pointer-events-none">
        <div className="pointer-events-auto bg-stone-900/85 backdrop-blur-md px-3 py-1.5 rounded-xl border border-stone-800 text-[11px] text-stone-400 flex items-center gap-2">
          <span>Click & drag to orbit</span>
          <span className="text-stone-600">•</span>
          <button
            onClick={handleReset}
            className="flex items-center gap-1 text-amber-400 hover:text-amber-300 font-medium"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset</span>
          </button>
        </div>

        <div className="pointer-events-auto flex items-center gap-2 bg-stone-900/85 backdrop-blur-md px-3 py-1.5 rounded-xl border border-stone-800 text-xs">
          <button
            onClick={() => setWireframe(!wireframe)}
            className={`px-2 py-1 rounded-lg text-[10px] font-mono transition-all ${
              wireframe
                ? 'bg-amber-500 text-stone-950 font-bold'
                : 'text-stone-400 hover:text-stone-100 bg-stone-800'
            }`}
          >
            Wireframe
          </button>

          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                zoomRef.current = Math.max(0.7, zoomRef.current - 0.2);
              }}
              className="p-1 text-stone-400 hover:text-stone-100"
              title="Zoom out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => {
                zoomRef.current = Math.min(2.0, zoomRef.current + 0.2);
              }}
              className="p-1 text-stone-400 hover:text-stone-100"
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

