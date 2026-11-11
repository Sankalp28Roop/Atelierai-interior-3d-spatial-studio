import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import {
  RotateCcw,
  Play,
  Pause,
  Compass,
  Maximize2,
  Minimize2,
  Zap,
  Droplets,
  Wind,
  Sun,
  Moon,
  Layers,
  Map as MapIcon,
  Ruler,
  Info,
  Check,
} from 'lucide-react';

interface ArchitecturalStudioProps {
  height?: string;
  onClose?: () => void;
  promptTitle?: string;
}

interface RoomSpecification {
  id: string;
  name: string;
  floor: 'Ground Floor' | 'Upper Floor';
  dimensions: string; // Length x Breadth x Height
  area: string;
  cameraPos: { x: number; y: number; z: number };
  targetLook: { x: number; y: number; z: number };
  description: string;
}

// 1. Modern Kitchen Cutaway Layout (Matches kitchen / luxury prompts)
const KITCHEN_ROOM_SPECS: RoomSpecification[] = [
  {
    id: 'kitchen_island',
    name: 'Monolithic Marble Kitchen Island',
    floor: 'Ground Floor',
    dimensions: '3.6m (L) × 1.2m (W) × 0.95m (H)',
    area: '14.8 sq.m (159 sq.ft)',
    cameraPos: { x: 3.2, y: 2.8, z: 3.2 },
    targetLook: { x: 0, y: 0.6, z: 0.2 },
    description: 'Central waterfall black quartz island with undermount sink, brass induction elements, and breakfast bar seating.',
  },
  {
    id: 'cabinetry_wall',
    name: 'Matte Black Cabinetry Wall',
    floor: 'Ground Floor',
    dimensions: '5.2m (L) × 0.7m (W) × 2.6m (H)',
    area: '12.4 sq.m (133 sq.ft)',
    cameraPos: { x: 0.2, y: 2.6, z: 4.0 },
    targetLook: { x: 0, y: 1.2, z: -2.8 },
    description: 'Floor-to-ceiling handleless black timber storage with integrated espresso bar, dual convection ovens, and concealed fridge.',
  },
  {
    id: 'dining_lounge',
    name: 'Integrated Dining Nook',
    floor: 'Ground Floor',
    dimensions: '4.0m (L) × 3.5m (W) × 2.6m (H)',
    area: '14.0 sq.m (151 sq.ft)',
    cameraPos: { x: -3.8, y: 3.0, z: 2.2 },
    targetLook: { x: -2.2, y: 0.8, z: -0.5 },
    description: 'Bespoke dining banquette with smoked oak table, brass pendant cluster, and recessed perimeter ceiling LED profile.',
  },
  {
    id: 'pantry_bar',
    name: 'Butler’s Pantry & Wine Bar',
    floor: 'Ground Floor',
    dimensions: '3.2m (L) × 2.4m (W) × 2.6m (H)',
    area: '7.7 sq.m (83 sq.ft)',
    cameraPos: { x: 3.8, y: 2.9, z: -2.2 },
    targetLook: { x: 2.4, y: 1.0, z: -1.2 },
    description: 'Secondary prep station with dual temperature wine cellar, fluted glass splashback, and under-cabinet strip illumination.',
  },
];

// 2. Haveli / Traditional Indian Courtyard Layout
const HAVELI_ROOM_SPECS: RoomSpecification[] = [
  {
    id: 'courtyard',
    name: 'Central Courtyard & Stone Well',
    floor: 'Ground Floor',
    dimensions: '4.8m (L) × 4.2m (W) × 2.8m (H)',
    area: '20.1 sq.m (216 sq.ft)',
    cameraPos: { x: 3.5, y: 3.8, z: 4.2 },
    targetLook: { x: 0, y: 0.5, z: 0 },
    description: 'Open-to-sky sandstone courtyard with carved pillars, brass pulley well, clay chulha, and Tulsi plant planter.',
  },
  {
    id: 'royal_lounge',
    name: 'Royal Baithak (Living Veranda)',
    floor: 'Ground Floor',
    dimensions: '5.2m (L) × 4.0m (W) × 2.8m (H)',
    area: '20.8 sq.m (224 sq.ft)',
    cameraPos: { x: 4.8, y: 2.9, z: 2.2 },
    targetLook: { x: 2.0, y: 0.8, z: 0.5 },
    description: 'Low wooden takht seating with silk cushions, brass floor lamps, arched jharokha niches, and sandstone flooring.',
  },
  {
    id: 'haveli_rasoi',
    name: 'Traditional Rasoi (Kitchen)',
    floor: 'Ground Floor',
    dimensions: '3.6m (L) × 3.2m (W) × 2.6m (H)',
    area: '11.5 sq.m (124 sq.ft)',
    cameraPos: { x: -4.5, y: 3.2, z: 3.0 },
    targetLook: { x: -2.8, y: 0.8, z: 1.2 },
    description: 'Clay chulha nook with brass cookware racks, spice cubbies, terracotta pots, and natural courtyard ventilation.',
  },
  {
    id: 'haveli_bedroom',
    name: 'First Floor Heritage Suite',
    floor: 'Upper Floor',
    dimensions: '4.6m (L) × 4.0m (W) × 2.7m (H)',
    area: '18.4 sq.m (198 sq.ft)',
    cameraPos: { x: -4.2, y: 5.5, z: -3.5 },
    targetLook: { x: -2.6, y: 3.2, z: -1.8 },
    description: 'Upper haveli bed chamber with carved wooden four-poster bed, ornate jharokha balcony looking out to the desert horizon.',
  },
];

// 3. Default Multi-Room Architectural Villa
const DEFAULT_ROOM_SPECS: RoomSpecification[] = [
  {
    id: 'living',
    name: 'Living Room Lounge',
    floor: 'Ground Floor',
    dimensions: '5.2m (L) × 4.0m (W) × 2.6m (H)',
    area: '20.8 sq.m (224 sq.ft)',
    cameraPos: { x: 4.8, y: 2.9, z: 2.2 },
    targetLook: { x: 2.0, y: 0.8, z: 0.5 },
    description: 'Formal seating area with solid wood sectional, linen upholstery, low coffee table, and natural daylight orientation.',
  },
  {
    id: 'kitchen',
    name: 'Modular Kitchen & Pantry',
    floor: 'Ground Floor',
    dimensions: '3.6m (L) × 3.2m (W) × 2.6m (H)',
    area: '11.5 sq.m (124 sq.ft)',
    cameraPos: { x: -4.5, y: 3.2, z: 3.0 },
    targetLook: { x: -2.8, y: 0.8, z: 1.2 },
    description: 'Contemporary culinary prep layout with quartz countertops, integrated sink, and direct courtyard ventilation.',
  },
  {
    id: 'dining',
    name: 'Dining Gallery',
    floor: 'Ground Floor',
    dimensions: '3.8m (L) × 3.2m (W) × 2.6m (H)',
    area: '12.1 sq.m (130 sq.ft)',
    cameraPos: { x: -3.2, y: 3.5, z: -2.8 },
    targetLook: { x: -1.6, y: 0.7, z: -0.6 },
    description: 'Six-seater oak dining setting adjacent to courtyard veranda with hanging brass pendant lighting.',
  },
  {
    id: 'master',
    name: 'Master Bedroom Suite',
    floor: 'Upper Floor',
    dimensions: '4.6m (L) × 4.0m (W) × 2.7m (H)',
    area: '18.4 sq.m (198 sq.ft)',
    cameraPos: { x: -4.2, y: 5.5, z: -3.5 },
    targetLook: { x: -2.6, y: 3.2, z: -1.8 },
    description: 'Private upper retreat with king-size timber bed, dual nightstands, wardrobe closet, and ensuite bath access.',
  },
];

export const ArchitecturalSpatialStudio: React.FC<ArchitecturalStudioProps> = ({
  height = '620px',
  onClose,
  promptTitle = 'Architectural Spatial BIM Inspection',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Dynamic Room Specifications matching the active prompt theme
  const promptLower = (promptTitle || '').toLowerCase();
  const isKitchenTheme = promptLower.includes('kitchen') || promptLower.includes('dining') || promptLower.includes('cabinet') || promptLower.includes('island');
  const isHaveliTheme = promptLower.includes('haveli') || promptLower.includes('rajasthani') || promptLower.includes('indian') || promptLower.includes('courtyard') || promptLower.includes('sandstone');

  const currentRoomSpecs = isKitchenTheme
    ? KITCHEN_ROOM_SPECS
    : isHaveliTheme
    ? HAVELI_ROOM_SPECS
    : DEFAULT_ROOM_SPECS;

  // Studio Interactive States
  const [activeRoom, setActiveRoom] = useState<RoomSpecification>(currentRoomSpecs[0]);
  const [utilityMode, setUtilityMode] = useState<'none' | 'electricity' | 'water' | 'ac'>('electricity');
  const [lighting, setLighting] = useState<'daylight' | 'evening' | 'night'>('evening');
  const [floorMode, setFloorMode] = useState<'both' | 'exploded' | 'ground' | 'upper'>('both');
  const [isPlayingTour, setIsPlayingTour] = useState(false);
  const [tourIndex, setTourIndex] = useState(0);

  // Keep active room in sync when promptTitle changes
  useEffect(() => {
    setActiveRoom(currentRoomSpecs[0]);
  }, [promptTitle]);

  // References for Three.js
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const houseGroupRef = useRef<THREE.Group | null>(null);
  const upperFloorRef = useRef<THREE.Group | null>(null);
  const utilityLinesGroupRef = useRef<THREE.Group | null>(null);
  const reqAnimIdRef = useRef<number | null>(null);

    // Drag and camera positioning - optimized default framing for full container view
  const isDraggingRef = useRef(false);
  const lastMouseRef = useRef({ x: 0, y: 0 });
  const cameraAngleRef = useRef({ theta: Math.PI / 4, phi: Math.PI / 3.4, radius: 10.5 });
  const cameraTargetRef = useRef(new THREE.Vector3(0, 0.4, 0));

  // Initialize Three.js Scene
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const width = container.clientWidth || 800;
    const heightPx = container.clientHeight || parseInt(height, 10) || 620;

    // 1. Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0f172a); // Deep slate architectural blue
    sceneRef.current = scene;

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(45, width / heightPx, 0.1, 100);
    cameraRef.current = camera;
    updateCameraPosition();

    // 3. Renderer
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, heightPx);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;

    // 4. Lights
    const ambientLight = new THREE.AmbientLight(0xdbeafe, 0.9);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xfffaed, 2.0);
    sunLight.position.set(16, 22, 14);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 0.5;
    sunLight.shadow.camera.far = 60;
    sunLight.shadow.bias = -0.0004;
    scene.add(sunLight);

    // Warm Interior Accent Lamps
    const interiorWarmLight1 = new THREE.PointLight(0xffa94d, 2.5, 9);
    interiorWarmLight1.position.set(2, 2.2, 0);
    scene.add(interiorWarmLight1);

    const interiorWarmLight2 = new THREE.PointLight(0xffc078, 2.2, 8);
    interiorWarmLight2.position.set(-2, 2.2, 1);
    scene.add(interiorWarmLight2);

    // 5. Build Comprehensive Cutaway BIM Geometry
    const houseGroup = new THREE.Group();
    scene.add(houseGroup);
    houseGroupRef.current = houseGroup;

    // Materials
    const wallExteriorMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.6 }); // Slate 700
    const wallInteriorMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.8 }); // White plaster
    const floorWoodMat = new THREE.MeshStandardMaterial({ color: 0x92400e, roughness: 0.5 }); // Polished teakwood
    const kitchenTileMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.3 }); // Ceramic quartz
    const grassLawnMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.9 }); // Dark diorama ground
    const glassRailMat = new THREE.MeshPhysicalMaterial({ color: 0xffffff, transmission: 0.9, opacity: 0.4, transparent: true, roughness: 0.1 });

    // Ground Floor Foundation
    const foundation = new THREE.Mesh(new THREE.BoxGeometry(11, 0.3, 9), wallExteriorMat);
    foundation.position.set(0, -0.15, 0);
    foundation.receiveShadow = true;
    houseGroup.add(foundation);

    // Parquet Floor Plane
    const floorPlane = new THREE.Mesh(new THREE.PlaneGeometry(10.8, 8.8), floorWoodMat);
    floorPlane.rotation.x = -Math.PI / 2;
    floorPlane.position.set(0, 0.01, 0);
    floorPlane.receiveShadow = true;
    houseGroup.add(floorPlane);

    // Exterior Boundary Cutaway Walls (Solid architectural cross-sections)
    const wallH = 2.4;
    const wallThick = 0.28;

    // Back Solid Wall
    const backWall = new THREE.Mesh(new THREE.BoxGeometry(10.8, wallH, wallThick), wallInteriorMat);
    backWall.position.set(0, wallH / 2, -4.4 + wallThick / 2);
    backWall.castShadow = true;
    houseGroup.add(backWall);

    // Left Wall
    const leftWall = new THREE.Mesh(new THREE.BoxGeometry(wallThick, wallH, 8.8), wallInteriorMat);
    leftWall.position.set(-5.4 + wallThick / 2, wallH / 2, 0);
    leftWall.castShadow = true;
    houseGroup.add(leftWall);

    // Partial Front & Right Cutaway Walls (Allows viewing into rooms like the reference video)
    const rightHalfWall = new THREE.Mesh(new THREE.BoxGeometry(wallThick, wallH * 0.4, 8.8), wallExteriorMat);
    rightHalfWall.position.set(5.4 - wallThick / 2, (wallH * 0.4) / 2, 0);
    houseGroup.add(rightHalfWall);

    // Central Courtyard Boundary (Sunken Veranda)
    const courtyardBorder = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.15, 3.6), kitchenTileMat);
    courtyardBorder.position.set(0, 0.08, 0);
    houseGroup.add(courtyardBorder);

    // Interior Partition Walls
    // Wall separating Kitchen/Dining from Living
    const partition1 = new THREE.Mesh(new THREE.BoxGeometry(wallThick, wallH, 3.8), wallInteriorMat);
    partition1.position.set(-1.8, wallH / 2, -2.5);
    partition1.castShadow = true;
    houseGroup.add(partition1);

    // Living Room Sectional Sofa (L-Shape)
    const sofaMain = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.45, 0.85), new THREE.MeshStandardMaterial({ color: 0xd97706 }));
    sofaMain.position.set(2.4, 0.25, 0.5);
    houseGroup.add(sofaMain);

    const sofaReturn = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.45, 1.4), new THREE.MeshStandardMaterial({ color: 0xd97706 }));
    sofaReturn.position.set(1.6, 0.25, 1.6);
    houseGroup.add(sofaReturn);

    // Coffee Table
    const coffeeTable = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.35, 0.65), floorWoodMat);
    coffeeTable.position.set(2.4, 0.18, 1.5);
    houseGroup.add(coffeeTable);

    // Dining Table with 6 Chairs
    const diningTable = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.75, 1.0), floorWoodMat);
    diningTable.position.set(-1.8, 0.38, -0.6);
    houseGroup.add(diningTable);

    // Kitchen Counter Island
    const kitchenIsland = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.88, 0.75), wallExteriorMat);
    kitchenIsland.position.set(-3.6, 0.44, 2.0);
    houseGroup.add(kitchenIsland);

    // 6. Utility Infrastructure Glowing Path Lines (Electricity, Water, HVAC)
    const utilityGroup = new THREE.Group();
    scene.add(utilityGroup);
    utilityLinesGroupRef.current = utilityGroup;

    buildUtilityOverlays(utilityGroup, utilityMode);

    // 7. Animation Loop
    const renderLoop = () => {
      reqAnimIdRef.current = requestAnimationFrame(renderLoop);
      updateCameraPosition();
      renderer.render(scene, camera);
    };

    reqAnimIdRef.current = requestAnimationFrame(renderLoop);

    // Resize Handler
    const handleResize = () => {
      if (!container || !renderer || !camera) return;
      const w = container.clientWidth || 800;
      const h = container.clientHeight || parseInt(height, 10) || 620;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);
    // Double trigger on mount to ensure full-screen flex containers catch exact height
    setTimeout(handleResize, 50);
    setTimeout(handleResize, 300);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (reqAnimIdRef.current) cancelAnimationFrame(reqAnimIdRef.current);
      renderer.dispose();
    };
  }, [height]);

  // Utility lines builder (Glowing circuit conduit paths matching reference video)
  const buildUtilityOverlays = (group: THREE.Group, mode: string) => {
    // Clear existing lines
    while (group.children.length > 0) {
      group.remove(group.children[0]);
    }

    if (mode === 'none') return;

    let color = 0x38bdf8; // Blue for water
    if (mode === 'electricity') color = 0x34d399; // Emerald cyan for electricity
    if (mode === 'ac') color = 0xfbbf24; // Amber for HVAC airflow

    const mat = new THREE.LineBasicMaterial({ color, linewidth: 2.5 });

    // Electrical Circuit Conduit / Utility Routing
    const points: THREE.Vector3[] = [
      new THREE.Vector3(-4.8, 2.4, 3.8),
      new THREE.Vector3(-4.8, 2.4, -3.8),
      new THREE.Vector3(4.8, 2.4, -3.8),
      new THREE.Vector3(4.8, 2.4, 3.8),
      new THREE.Vector3(1.8, 2.4, 3.8),
      new THREE.Vector3(1.8, 2.4, 0.0),
      new THREE.Vector3(-1.8, 2.4, 0.0),
      new THREE.Vector3(-1.8, 2.4, 3.8),
    ];

    const geo = new THREE.BufferGeometry().setFromPoints(points);
    const line = new THREE.Line(geo, mat);
    group.add(line);

    // Glowing Ceiling Light Nodes along conduits
    [
      [-3.6, 2.4, 2.0],
      [-1.8, 2.4, -0.6],
      [2.4, 2.4, 1.0],
      [2.4, 2.4, -2.5],
      [-3.0, 2.4, -2.5],
    ].forEach(([x, y, z]) => {
      const nodeMesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.12, 16, 16),
        new THREE.MeshBasicMaterial({ color })
      );
      nodeMesh.position.set(x, y, z);
      group.add(nodeMesh);
    });
  };

  // Switch utilities
  useEffect(() => {
    if (utilityLinesGroupRef.current) {
      buildUtilityOverlays(utilityLinesGroupRef.current, utilityMode);
    }
  }, [utilityMode]);

  // Camera Orbit Computation
  const updateCameraPosition = () => {
    if (!cameraRef.current) return;
    const { theta, phi, radius } = cameraAngleRef.current;
    const target = cameraTargetRef.current;

    cameraRef.current.position.x = target.x + radius * Math.sin(phi) * Math.sin(theta);
    cameraRef.current.position.y = target.y + radius * Math.cos(phi);
    cameraRef.current.position.z = target.z + radius * Math.sin(phi) * Math.cos(theta);

    cameraRef.current.lookAt(target);
  };

  // Fly Camera to selected room with smooth transition
  const handleSelectRoom = (room: RoomSpecification) => {
    setActiveRoom(room);
    setIsPlayingTour(false);

    // Target look point
    cameraTargetRef.current.set(room.targetLook.x, room.targetLook.y, room.targetLook.z);
    cameraAngleRef.current.radius = 8.5; // Zoom into room
  };

  // Reset to full architectural aerial view
  const handleResetAerialView = () => {
    cameraTargetRef.current.set(0, 0.4, 0);
    cameraAngleRef.current = { theta: Math.PI / 4, phi: Math.PI / 3.4, radius: 10.5 };
  };

  // Auto-walkthrough video tour mode
  useEffect(() => {
    if (!isPlayingTour) return;

    const interval = setInterval(() => {
      setTourIndex((prev) => {
        const next = (prev + 1) % currentRoomSpecs.length;
        handleSelectRoom(currentRoomSpecs[next]);
        return next;
      });
    }, 4500);

    return () => clearInterval(interval);
  }, [isPlayingTour, currentRoomSpecs]);

  // Mouse drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    isDraggingRef.current = true;
    lastMouseRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current) return;
    const dx = (e.clientX - lastMouseRef.current.x) * 0.008;
    const dy = (e.clientY - lastMouseRef.current.y) * 0.008;

    cameraAngleRef.current.theta += dx;
    cameraAngleRef.current.phi = Math.max(0.15, Math.min(Math.PI / 2.1, cameraAngleRef.current.phi - dy));

    lastMouseRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  const handleWheel = (e: React.WheelEvent) => {
    cameraAngleRef.current.radius = Math.max(5.5, Math.min(22, cameraAngleRef.current.radius + e.deltaY * 0.01));
  };

  return (
    <div
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onWheel={handleWheel}
      className="relative w-full rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 shadow-2xl select-none"
      style={{ height }}
    >
      <canvas ref={canvasRef} className="w-full h-full block cursor-grab active:cursor-grabbing" />

      {/* TOP LEFT: Utilities & Infrastructure Switcher (Matching reference video) */}
      <div className="absolute top-4 left-4 z-20 flex flex-col gap-2">
        <div className="bg-slate-900/90 backdrop-blur-md px-3 py-2 rounded-2xl border border-slate-700/80 shadow-xl flex items-center gap-1.5 text-xs">
          <span className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider mr-1 flex items-center gap-1">
            <Zap className="w-3.5 h-3.5 text-emerald-400" /> Utilities
          </span>
          <button
            onClick={() => setUtilityMode('electricity')}
            className={`px-2.5 py-1 rounded-xl transition-all ${
              utilityMode === 'electricity'
                ? 'bg-emerald-500 text-slate-950 font-bold shadow'
                : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800'
            }`}
          >
            Electricity
          </button>
          <button
            onClick={() => setUtilityMode('water')}
            className={`px-2.5 py-1 rounded-xl transition-all ${
              utilityMode === 'water'
                ? 'bg-sky-500 text-slate-950 font-bold shadow'
                : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800'
            }`}
          >
            Water
          </button>
          <button
            onClick={() => setUtilityMode('ac')}
            className={`px-2.5 py-1 rounded-xl transition-all ${
              utilityMode === 'ac'
                ? 'bg-amber-500 text-slate-950 font-bold shadow'
                : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800'
            }`}
          >
            Airflow / AC
          </button>
          <button
            onClick={() => setUtilityMode('none')}
            className={`px-2 py-1 rounded-xl transition-all ${
              utilityMode === 'none' ? 'bg-slate-800 text-slate-200' : 'text-slate-400'
            }`}
          >
            Off
          </button>
        </div>

        {/* Guided Video Walkthrough Button */}
        <button
          onClick={() => setIsPlayingTour(!isPlayingTour)}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-2xl border text-xs font-semibold shadow-xl transition-all w-fit backdrop-blur-md ${
            isPlayingTour
              ? 'bg-rose-500 text-slate-950 border-rose-400 font-bold'
              : 'bg-amber-500/90 hover:bg-amber-400 text-slate-950 border-amber-300'
          }`}
        >
          {isPlayingTour ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
          <span>{isPlayingTour ? 'Pause Walkthrough Tour' : 'Play Guided Walkthrough Tour'}</span>
        </button>
      </div>

      {/* TOP RIGHT: Architectural 2D Floor Plan Blueprint Mini-Map (Exact match to reference video) */}
      <div className="absolute top-4 right-4 z-20 flex flex-col items-end gap-2">
        <div className="bg-slate-900/90 backdrop-blur-md p-3 rounded-2xl border border-slate-700/80 shadow-2xl w-48 sm:w-56">
          <div className="flex items-center justify-between text-xs text-slate-300 font-semibold mb-2 pb-1.5 border-b border-slate-800">
            <span className="flex items-center gap-1.5">
              <MapIcon className="w-3.5 h-3.5 text-amber-400" />
              <span>BIM Floor Plan</span>
            </span>
            <span className="text-[10px] text-slate-500 font-mono">1:100 Scale</span>
          </div>

          {/* 2D Schematic Clickable Blueprint Map */}
          <div className="grid grid-cols-2 gap-1.5 bg-slate-950/80 p-2 rounded-xl border border-slate-800/80">
            {currentRoomSpecs.map((room) => (
              <button
                key={room.id}
                onClick={() => handleSelectRoom(room)}
                className={`p-1.5 rounded-lg text-left transition-all text-[10px] flex flex-col justify-between border ${
                  activeRoom.id === room.id
                    ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold'
                    : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                }`}
              >
                <span className="truncate">{room.name}</span>
                <span className="text-[9px] text-slate-500 font-mono">{room.area.split(' ')[0]} m²</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* BOTTOM LEFT: Detailed Room Dimensions Specification Box (Length, Breadth, Height) */}
      <div className="absolute bottom-4 left-4 z-20 max-w-sm bg-slate-900/95 backdrop-blur-md p-4 rounded-2xl border border-slate-700/90 shadow-2xl text-slate-200">
        <div className="flex items-center justify-between gap-3 mb-1.5">
          <h4 className="text-sm font-bold text-amber-400 font-display flex items-center gap-1.5">
            <Ruler className="w-4 h-4 text-amber-400" />
            <span>{activeRoom.name}</span>
          </h4>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono font-medium">
            {activeRoom.floor}
          </span>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed mb-3">{activeRoom.description}</p>

        {/* Dimension Callouts: Length x Breadth x Height */}
        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800 text-xs">
          <div className="bg-slate-950/70 p-2 rounded-xl border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Dimensions (L × W × H)</span>
            <span className="font-mono text-emerald-400 font-semibold text-[11px]">{activeRoom.dimensions}</span>
          </div>

          <div className="bg-slate-950/70 p-2 rounded-xl border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Total Usable Area</span>
            <span className="font-mono text-amber-400 font-semibold text-[11px]">{activeRoom.area}</span>
          </div>
        </div>
      </div>

      {/* BOTTOM RIGHT: Navigation Reset */}
      <div className="absolute bottom-4 right-4 z-20 flex items-center gap-2">
        <button
          onClick={handleResetAerialView}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900/90 backdrop-blur-md border border-slate-700/80 text-xs font-semibold text-slate-300 hover:text-amber-400 hover:bg-slate-800 transition-all shadow-xl"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Full Aerial Orbit</span>
        </button>
      </div>
    </div>
  );
};

