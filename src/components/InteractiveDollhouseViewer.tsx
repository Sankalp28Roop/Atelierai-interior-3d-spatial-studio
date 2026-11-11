import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import {
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  Layers,
  Sun,
  Moon,
  Compass,
  Eye,
  Sparkles,
} from 'lucide-react';

interface InteractiveDollhouseViewerProps {
  height?: string;
  initialFloorMode?: 'both' | 'exploded' | 'ground' | 'upper';
  className?: string;
  onClose?: () => void;
  showCloseButton?: boolean;
}

type PresetView = 'isometric' | 'front' | 'top' | 'left' | 'right';

export const InteractiveDollhouseViewer: React.FC<InteractiveDollhouseViewerProps> = ({
  height = '560px',
  initialFloorMode = 'both',
  className = '',
  onClose,
  showCloseButton = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // UI State
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [activePreset, setActivePreset] = useState<PresetView>('isometric');
  const [floorMode, setFloorMode] = useState<'both' | 'exploded' | 'ground' | 'upper'>(initialFloorMode);
  const [lightingMode, setLightingMode] = useState<'warm' | 'daylight'>('warm');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isInteracting, setIsInteracting] = useState(false);
  const [hoveredRoom, setHoveredRoom] = useState<string | null>(null);

  // References for Three.js objects
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const houseGroupRef = useRef<THREE.Group | null>(null);
  const groundFloorRef = useRef<THREE.Group | null>(null);
  const upperFloorRef = useRef<THREE.Group | null>(null);
  const lightsGroupRef = useRef<THREE.Group | null>(null);

  // Animation and interaction state
  const isDraggingRef = useRef(false);
  const lastMousePosRef = useRef({ x: 0, y: 0 });
  const velocityRef = useRef({ x: 0, y: 0 });
  const touchDistanceRef = useRef<number | null>(null);
  const targetRotationRef = useRef({ x: 0.52, y: -Math.PI / 4 });
  const targetPositionRef = useRef({ y: 0 });
  const targetZoomRef = useRef(1.0);
  const currentZoomRef = useRef(1.0);
  const reqAnimIdRef = useRef<number | null>(null);
  const upperFloorTargetYRef = useRef(2.4);

  // Target preset angles
  const PRESET_ANGLES: Record<PresetView, { x: number; y: number; zoom: number; posY: number }> = {
    isometric: { x: 0.55, y: -Math.PI / 4, zoom: 1.0, posY: 0 },
    front: { x: 0.18, y: 0, zoom: 1.05, posY: 0.2 },
    top: { x: 1.42, y: 0, zoom: 1.15, posY: 0 },
    left: { x: 0.32, y: Math.PI / 2, zoom: 1.05, posY: 0.1 },
    right: { x: 0.32, y: -Math.PI / 2, zoom: 1.05, posY: 0.1 },
  };

  // Helper to create materials
  const createMaterials = useCallback(() => {
    // Generate realistic procedural textures via canvas
    const createWoodTexture = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 512;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#e5c29f';
      ctx.fillRect(0, 0, 512, 512);

      // Plank lines
      ctx.strokeStyle = '#c69c6d';
      ctx.lineWidth = 2;
      const plankHeight = 32;
      for (let y = 0; y < 512; y += plankHeight) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(512, y);
        ctx.stroke();

        // Staggered vertical joints
        const offset = (y / plankHeight) % 2 === 0 ? 0 : 64;
        for (let x = offset; x < 512; x += 128) {
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x, y + plankHeight);
          ctx.stroke();
        }
      }

      // Fine wood grain noise
      ctx.fillStyle = 'rgba(160, 110, 60, 0.06)';
      for (let i = 0; i < 400; i++) {
        const x = Math.random() * 512;
        const y = Math.random() * 512;
        ctx.fillRect(x, y, Math.random() * 80 + 20, 1);
      }

      const texture = new THREE.CanvasTexture(canvas);
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.set(4, 4);
      return texture;
    };

    const createRugTexture = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 256;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#3a4a58';
      ctx.fillRect(0, 0, 256, 256);
      ctx.strokeStyle = '#5c7080';
      ctx.lineWidth = 4;
      for (let i = 0; i < 256; i += 32) {
        ctx.strokeRect(i + 4, i + 4, 256 - i * 2, 256 - i * 2);
      }
      const texture = new THREE.CanvasTexture(canvas);
      return texture;
    };

    const woodTex = createWoodTexture();
    const rugTex = createRugTexture();

    return {
      woodFloor: new THREE.MeshStandardMaterial({
        map: woodTex,
        roughness: 0.35,
        metalness: 0.05,
      }),
      darkWall: new THREE.MeshStandardMaterial({
        color: 0x222d38, // Modern dark blue-grey slate
        roughness: 0.7,
        metalness: 0.1,
      }),
      innerWall: new THREE.MeshStandardMaterial({
        color: 0xf5f3ef, // Soft warm off-white
        roughness: 0.9,
      }),
      slabEdge: new THREE.MeshStandardMaterial({
        color: 0x182028,
        roughness: 0.6,
      }),
      glass: new THREE.MeshPhysicalMaterial({
        color: 0xe0f2fe,
        transparent: true,
        opacity: 0.45,
        roughness: 0.1,
        transmission: 0.9,
        thickness: 0.5,
      }),
      whiteSofa: new THREE.MeshStandardMaterial({
        color: 0xf4f1ea, // Cream boucle
        roughness: 0.85,
      }),
      blueCushion: new THREE.MeshStandardMaterial({
        color: 0x1e3a5f, // Deep indigo navy
        roughness: 0.8,
      }),
      woodFurniture: new THREE.MeshStandardMaterial({
        color: 0x936639, // Warm natural walnut/oak
        roughness: 0.4,
      }),
      countertop: new THREE.MeshStandardMaterial({
        color: 0xffffff, // White polished quartz
        roughness: 0.15,
        metalness: 0.05,
      }),
      cabinetDark: new THREE.MeshStandardMaterial({
        color: 0x1b2838, // Navy blue kitchen cabinets
        roughness: 0.4,
      }),
      stainless: new THREE.MeshStandardMaterial({
        color: 0xd4d4d8,
        metalness: 0.85,
        roughness: 0.25,
      }),
      bedLinen: new THREE.MeshStandardMaterial({
        color: 0xfaf8f5,
        roughness: 0.9,
      }),
      bedNavyAccent: new THREE.MeshStandardMaterial({
        color: 0x1d3557,
        roughness: 0.85,
      }),
      plantLeaf: new THREE.MeshStandardMaterial({
        color: 0x2d6a4f,
        roughness: 0.6,
      }),
      plantPot: new THREE.MeshStandardMaterial({
        color: 0x334155,
        roughness: 0.8,
      }),
      rug: new THREE.MeshStandardMaterial({
        map: rugTex,
        roughness: 0.95,
      }),
      brassMetal: new THREE.MeshStandardMaterial({
        color: 0xd4af37,
        metalness: 0.85,
        roughness: 0.3,
      }),
      metalRailing: new THREE.MeshStandardMaterial({
        color: 0x111827,
        metalness: 0.7,
        roughness: 0.3,
      }),
      deckingWood: new THREE.MeshStandardMaterial({
        color: 0x8a5a36,
        roughness: 0.6,
      }),
      warmLampGlow: new THREE.MeshBasicMaterial({
        color: 0xffd166,
      }),
    };
  }, []);

  // Build Procedural 2-Storey Dollhouse House
  const buildDollhouse = useCallback(
    (materials: ReturnType<typeof createMaterials>) => {
      const house = new THREE.Group();
      house.name = 'DollhouseRoot';

      // Dimensions
      const houseWidth = 10;
      const houseDepth = 7.5;
      const wallHeight = 2.1;
      const wallThickness = 0.18;

      // -------------------------------------------------------------
      // 1. GROUND FLOOR GROUP
      // -------------------------------------------------------------
      const groundFloor = new THREE.Group();
      groundFloor.name = 'GroundFloor';

      // Ground Floor Slab
      const groundSlabGeo = new THREE.BoxGeometry(houseWidth, 0.25, houseDepth);
      const groundSlab = new THREE.Mesh(groundSlabGeo, materials.slabEdge);
      groundSlab.position.set(0, -0.125, 0);
      groundSlab.receiveShadow = true;
      groundFloor.add(groundSlab);

      // Ground Floor Parquet Wooden Surface
      const groundFloorPlaneGeo = new THREE.PlaneGeometry(houseWidth - 0.2, houseDepth - 0.2);
      const groundFloorPlane = new THREE.Mesh(groundFloorPlaneGeo, materials.woodFloor);
      groundFloorPlane.rotation.x = -Math.PI / 2;
      groundFloorPlane.position.set(0, 0.005, 0);
      groundFloorPlane.receiveShadow = true;
      groundFloor.add(groundFloorPlane);

      // Back Exterior Wall (Ground Floor)
      const backWallGeo = new THREE.BoxGeometry(houseWidth, wallHeight, wallThickness);
      const backWall = new THREE.Mesh(backWallGeo, materials.darkWall);
      backWall.position.set(0, wallHeight / 2, -houseDepth / 2 + wallThickness / 2);
      backWall.castShadow = true;
      backWall.receiveShadow = true;
      groundFloor.add(backWall);

      // Left Exterior Wall (Ground Floor)
      const leftWallGeo = new THREE.BoxGeometry(wallThickness, wallHeight, houseDepth);
      const leftWall = new THREE.Mesh(leftWallGeo, materials.darkWall);
      leftWall.position.set(-houseWidth / 2 + wallThickness / 2, wallHeight / 2, 0);
      leftWall.castShadow = true;
      leftWall.receiveShadow = true;
      groundFloor.add(leftWall);

      // Right Exterior Wall (Ground Floor - lower cutaway for viewing)
      const rightWallGeo = new THREE.BoxGeometry(wallThickness, wallHeight * 0.45, houseDepth);
      const rightWall = new THREE.Mesh(rightWallGeo, materials.darkWall);
      rightWall.position.set(houseWidth / 2 - wallThickness / 2, (wallHeight * 0.45) / 2, 0);
      rightWall.receiveShadow = true;
      groundFloor.add(rightWall);

      // Front Cutaway Wall (Partial cutaway for open dollhouse view)
      const frontWallLeft = new THREE.Mesh(
        new THREE.BoxGeometry(3.5, 0.6, wallThickness),
        materials.darkWall
      );
      frontWallLeft.position.set(-houseWidth / 2 + 1.75, 0.3, houseDepth / 2 - wallThickness / 2);
      groundFloor.add(frontWallLeft);

      const frontWallRight = new THREE.Mesh(
        new THREE.BoxGeometry(3.5, 0.6, wallThickness),
        materials.darkWall
      );
      frontWallRight.position.set(houseWidth / 2 - 1.75, 0.3, houseDepth / 2 - wallThickness / 2);
      groundFloor.add(frontWallRight);

      // Entrance Steps at Bottom Center
      for (let i = 0; i < 3; i++) {
        const step = new THREE.Mesh(
          new THREE.BoxGeometry(2.2 + i * 0.3, 0.08, 0.4),
          materials.slabEdge
        );
        step.position.set(0, -0.04 - i * 0.08, houseDepth / 2 + 0.2 + i * 0.25);
        step.receiveShadow = true;
        groundFloor.add(step);
      }

      // Entrance Planters with Lush Green Plants
      const addPlanter = (x: number, z: number) => {
        const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.18, 0.4, 16), materials.plantPot);
        pot.position.set(x, 0.2, z);
        pot.castShadow = true;
        groundFloor.add(pot);

        const bush = new THREE.Mesh(new THREE.DodecahedronGeometry(0.3, 1), materials.plantLeaf);
        bush.position.set(x, 0.5, z);
        bush.castShadow = true;
        groundFloor.add(bush);
      };
      addPlanter(-1.5, houseDepth / 2 + 0.3);
      addPlanter(1.5, houseDepth / 2 + 0.3);

      // -------------------------------------------------------------
      // ROOM A: LIVING ROOM (Right side downstairs)
      // -------------------------------------------------------------
      const livingRoomGroup = new THREE.Group();
      livingRoomGroup.name = 'LivingRoom';

      // Blue-Grey Patterned Area Rug
      const rug = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 2.6), materials.rug);
      rug.rotation.x = -Math.PI / 2;
      rug.position.set(2.4, 0.015, 0.5);
      rug.receiveShadow = true;
      livingRoomGroup.add(rug);

      // L-Shaped Sectional Sofa (Cream boucle)
      // Main sectional bench
      const sofaMain = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.45, 0.85), materials.whiteSofa);
      sofaMain.position.set(2.5, 0.225, 1.4);
      sofaMain.castShadow = true;
      livingRoomGroup.add(sofaMain);

      // Sectional return bench
      const sofaReturn = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.45, 1.4), materials.whiteSofa);
      sofaReturn.position.set(3.8, 0.225, 0.5);
      sofaReturn.castShadow = true;
      livingRoomGroup.add(sofaReturn);

      // Sofa Backrest
      const sofaBack = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.4, 0.25), materials.whiteSofa);
      sofaBack.position.set(2.5, 0.6, 1.7);
      sofaBack.castShadow = true;
      livingRoomGroup.add(sofaBack);

      // Indigo Cushions
      for (let i = 0; i < 3; i++) {
        const cushion = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.3, 0.15), materials.blueCushion);
        cushion.position.set(1.7 + i * 0.6, 0.55, 1.55);
        cushion.rotation.x = -0.2;
        livingRoomGroup.add(cushion);
      }

      // Round Wooden Coffee Table
      const coffeeTableTop = new THREE.Mesh(
        new THREE.CylinderGeometry(0.55, 0.55, 0.06, 24),
        materials.woodFurniture
      );
      coffeeTableTop.position.set(2.4, 0.28, 0.4);
      coffeeTableTop.castShadow = true;
      livingRoomGroup.add(coffeeTableTop);

      const coffeeTableLeg = new THREE.Mesh(
        new THREE.CylinderGeometry(0.12, 0.2, 0.25, 16),
        materials.brassMetal
      );
      coffeeTableLeg.position.set(2.4, 0.125, 0.4);
      livingRoomGroup.add(coffeeTableLeg);

      // Blue Armchair
      const armchair = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.45, 0.8), materials.blueCushion);
      armchair.position.set(1.0, 0.225, 0.2);
      armchair.rotation.y = Math.PI / 4;
      armchair.castShadow = true;
      livingRoomGroup.add(armchair);

      // Wall-Mounted TV & Media Console on Back Wall
      const tvPanel = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.1, 0.06), materials.metalRailing);
      tvPanel.position.set(2.6, 1.25, -houseDepth / 2 + 0.25);
      tvPanel.castShadow = true;
      livingRoomGroup.add(tvPanel);

      const tvScreen = new THREE.Mesh(
        new THREE.BoxGeometry(2.0, 0.95, 0.02),
        new THREE.MeshBasicMaterial({ color: 0x050d1a })
      );
      tvScreen.position.set(2.6, 1.25, -houseDepth / 2 + 0.29);
      livingRoomGroup.add(tvScreen);

      const consoleUnit = new THREE.Mesh(
        new THREE.BoxGeometry(2.6, 0.35, 0.5),
        materials.woodFurniture
      );
      consoleUnit.position.set(2.6, 0.175, -houseDepth / 2 + 0.45);
      consoleUnit.castShadow = true;
      livingRoomGroup.add(consoleUnit);

      // Floor Lamp in Corner
      const lampBase = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.03, 16), materials.brassMetal);
      lampBase.position.set(4.2, 0.015, -houseDepth / 2 + 0.8);
      livingRoomGroup.add(lampBase);

      const lampPole = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.6, 8), materials.brassMetal);
      lampPole.position.set(4.2, 0.8, -houseDepth / 2 + 0.8);
      livingRoomGroup.add(lampPole);

      const lampShade = new THREE.Mesh(new THREE.ConeGeometry(0.25, 0.3, 16, 1, true), materials.innerWall);
      lampShade.position.set(4.2, 1.55, -houseDepth / 2 + 0.8);
      livingRoomGroup.add(lampShade);

      groundFloor.add(livingRoomGroup);

      // -------------------------------------------------------------
      // ROOM B: DINING AREA (Left-center downstairs)
      // -------------------------------------------------------------
      const diningGroup = new THREE.Group();
      diningGroup.name = 'DiningArea';

      // Dining Table (Seats 4)
      const diningTable = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.08, 1.1), materials.woodFurniture);
      diningTable.position.set(-1.8, 0.72, -0.6);
      diningTable.castShadow = true;
      diningGroup.add(diningTable);

      // 4 Table Legs
      [
        [-0.7, -0.45],
        [0.7, -0.45],
        [-0.7, 0.45],
        [0.7, 0.45],
      ].forEach(([dx, dz]) => {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.02, 0.7, 8), materials.brassMetal);
        leg.position.set(-1.8 + dx, 0.35, -0.6 + dz);
        diningGroup.add(leg);
      });

      // 4 Dining Chairs (Blue upholstery with wood legs)
      [
        [-1.8, -1.25, 0],
        [-1.8, 0.05, Math.PI],
        [-2.5, -0.6, Math.PI / 2],
        [-1.1, -0.6, -Math.PI / 2],
      ].forEach(([cx, cz, rot]) => {
        const chair = new THREE.Group();
        const seat = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.06, 0.42), materials.blueCushion);
        seat.position.y = 0.42;
        chair.add(seat);
        const back = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.4, 0.05), materials.blueCushion);
        back.position.set(0, 0.62, -0.18);
        chair.add(back);
        chair.position.set(cx, 0, cz);
        chair.rotation.y = rot;
        diningGroup.add(chair);
      });

      // Laptop on Dining Table
      const laptop = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.015, 0.2), materials.stainless);
      laptop.position.set(-1.7, 0.77, -0.6);
      diningGroup.add(laptop);

      groundFloor.add(diningGroup);

      // -------------------------------------------------------------
      // ROOM C: KITCHEN (Bottom-left downstairs)
      // -------------------------------------------------------------
      const kitchenGroup = new THREE.Group();
      kitchenGroup.name = 'Kitchen';

      // L-Shaped Kitchen Main Counter
      const counter1 = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.82, 0.65), materials.cabinetDark);
      counter1.position.set(-3.6, 0.41, 1.8);
      counter1.castShadow = true;
      kitchenGroup.add(counter1);

      const counter1Top = new THREE.Mesh(new THREE.BoxGeometry(2.45, 0.06, 0.7), materials.countertop);
      counter1Top.position.set(-3.6, 0.85, 1.8);
      kitchenGroup.add(counter1Top);

      // Kitchen Return Counter along Left Wall
      const counter2 = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.82, 1.6), materials.cabinetDark);
      counter2.position.set(-houseWidth / 2 + 0.45, 0.41, 0.6);
      counter2.castShadow = true;
      kitchenGroup.add(counter2);

      const counter2Top = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.06, 1.6), materials.countertop);
      counter2Top.position.set(-houseWidth / 2 + 0.45, 0.85, 0.6);
      kitchenGroup.add(counter2Top);

      // Stainless Steel Fridge
      const fridge = new THREE.Mesh(new THREE.BoxGeometry(0.75, 1.75, 0.7), materials.stainless);
      fridge.position.set(-houseWidth / 2 + 0.5, 0.875, -2.8);
      fridge.castShadow = true;
      kitchenGroup.add(fridge);

      // Black Cooktop on Counter
      const cooktop = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.02, 0.45), materials.metalRailing);
      cooktop.position.set(-3.4, 0.89, 1.8);
      kitchenGroup.add(cooktop);

      // Sink & Chrome Faucet
      const sink = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.02, 0.38), materials.stainless);
      sink.position.set(-4.3, 0.89, 1.8);
      kitchenGroup.add(sink);

      groundFloor.add(kitchenGroup);

      // -------------------------------------------------------------
      // CENTRAL STAIRCASE (Ground to First Floor)
      // -------------------------------------------------------------
      const stairsGroup = new THREE.Group();
      stairsGroup.name = 'Staircase';
      const numSteps = 11;
      const totalStairHeight = 2.4;
      const stepRise = totalStairHeight / numSteps;
      const stepRun = 0.22;
      const stairWidth = 0.85;

      for (let i = 0; i < numSteps; i++) {
        // Wooden Step Plank
        const stepMesh = new THREE.Mesh(
          new THREE.BoxGeometry(stairWidth, 0.05, stepRun),
          materials.woodFurniture
        );
        stepMesh.position.set(0.2, (i + 0.5) * stepRise, -1.8 + i * stepRun);
        stepMesh.castShadow = true;
        stairsGroup.add(stepMesh);

        // Black Minimalist Baluster
        if (i % 2 === 0) {
          const baluster = new THREE.Mesh(
            new THREE.CylinderGeometry(0.012, 0.012, 0.75, 8),
            materials.metalRailing
          );
          baluster.position.set(0.2 + stairWidth / 2 - 0.04, (i + 0.5) * stepRise + 0.38, -1.8 + i * stepRun);
          stairsGroup.add(baluster);
        }
      }

      // Continuous Slanted Handrail
      const handrailGeo = new THREE.BoxGeometry(0.04, 0.04, numSteps * stepRun * 1.1);
      const handrail = new THREE.Mesh(handrailGeo, materials.brassMetal);
      handrail.position.set(
        0.2 + stairWidth / 2 - 0.04,
        totalStairHeight / 2 + 0.42,
        -1.8 + (numSteps * stepRun) / 2
      );
      handrail.rotation.x = Math.atan2(totalStairHeight, numSteps * stepRun);
      stairsGroup.add(handrail);

      groundFloor.add(stairsGroup);

      // -------------------------------------------------------------
      // BALCONY ON RIGHT FLANK
      // -------------------------------------------------------------
      const balconyGroup = new THREE.Group();
      balconyGroup.name = 'Balcony';

      const balconyDeck = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.15, houseDepth - 1.0), materials.deckingWood);
      balconyDeck.position.set(houseWidth / 2 + 0.8, -0.075, 0);
      balconyDeck.receiveShadow = true;
      balconyGroup.add(balconyDeck);

      // Balcony Glass / Metal Railing
      const railingR = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.9, houseDepth - 1.0), materials.metalRailing);
      railingR.position.set(houseWidth / 2 + 1.55, 0.45, 0);
      balconyGroup.add(railingR);

      // Bistro Table & 2 Chairs
      const bistroTable = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.04, 16), materials.brassMetal);
      bistroTable.position.set(houseWidth / 2 + 0.8, 0.65, 0.2);
      balconyGroup.add(bistroTable);

      const bistroLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.03, 0.65, 8), materials.metalRailing);
      bistroLeg.position.set(houseWidth / 2 + 0.8, 0.325, 0.2);
      balconyGroup.add(bistroLeg);

      groundFloor.add(balconyGroup);
      house.add(groundFloor);
      groundFloorRef.current = groundFloor;

      // -------------------------------------------------------------
      // 2. UPPER FLOOR GROUP (3 Bedrooms + Bathroom)
      // -------------------------------------------------------------
      const upperFloor = new THREE.Group();
      upperFloor.name = 'UpperFloor';
      upperFloor.position.y = 2.4; // Initial position on top of ground floor

      // Upper Floor Slab with Stairwell Cutout
      // Left section
      const upperSlabLeft = new THREE.Mesh(
        new THREE.BoxGeometry(houseWidth * 0.48, 0.2, houseDepth),
        materials.slabEdge
      );
      upperSlabLeft.position.set(-houseWidth * 0.26, -0.1, 0);
      upperSlabLeft.receiveShadow = true;
      upperFloor.add(upperSlabLeft);

      // Right section
      const upperSlabRight = new THREE.Mesh(
        new THREE.BoxGeometry(houseWidth * 0.48, 0.2, houseDepth),
        materials.slabEdge
      );
      upperSlabRight.position.set(houseWidth * 0.26, -0.1, 0);
      upperSlabRight.receiveShadow = true;
      upperFloor.add(upperSlabRight);

      // Upper Floor Wooden Floor Surface
      const upperFloorSurfaceL = new THREE.Mesh(
        new THREE.PlaneGeometry(houseWidth * 0.48 - 0.2, houseDepth - 0.2),
        materials.woodFloor
      );
      upperFloorSurfaceL.rotation.x = -Math.PI / 2;
      upperFloorSurfaceL.position.set(-houseWidth * 0.26, 0.005, 0);
      upperFloorSurfaceL.receiveShadow = true;
      upperFloor.add(upperFloorSurfaceL);

      const upperFloorSurfaceR = new THREE.Mesh(
        new THREE.PlaneGeometry(houseWidth * 0.48 - 0.2, houseDepth - 0.2),
        materials.woodFloor
      );
      upperFloorSurfaceR.rotation.x = -Math.PI / 2;
      upperFloorSurfaceR.position.set(houseWidth * 0.26, 0.005, 0);
      upperFloorSurfaceR.receiveShadow = true;
      upperFloor.add(upperFloorSurfaceR);

      // Upper Back Exterior Wall
      const upperBackWall = new THREE.Mesh(
        new THREE.BoxGeometry(houseWidth, wallHeight, wallThickness),
        materials.darkWall
      );
      upperBackWall.position.set(0, wallHeight / 2, -houseDepth / 2 + wallThickness / 2);
      upperBackWall.castShadow = true;
      upperFloor.add(upperBackWall);

      // Upper Left Exterior Wall
      const upperLeftWall = new THREE.Mesh(
        new THREE.BoxGeometry(wallThickness, wallHeight, houseDepth),
        materials.darkWall
      );
      upperLeftWall.position.set(-houseWidth / 2 + wallThickness / 2, wallHeight / 2, 0);
      upperLeftWall.castShadow = true;
      upperFloor.add(upperLeftWall);

      // Interior Partitions (Cutaway height 1.6m for clear dollhouse visibility)
      const bedroomPartition = new THREE.Mesh(
        new THREE.BoxGeometry(wallThickness, 1.4, houseDepth * 0.55),
        materials.innerWall
      );
      bedroomPartition.position.set(-0.6, 0.7, -houseDepth / 4);
      upperFloor.add(bedroomPartition);

      const upperRightPartition = new THREE.Mesh(
        new THREE.BoxGeometry(wallThickness, 1.4, houseDepth * 0.45),
        materials.innerWall
      );
      upperRightPartition.position.set(2.2, 0.7, houseDepth / 4);
      upperFloor.add(upperRightPartition);

      // -------------------------------------------------------------
      // BEDROOM 1 (Master Bedroom - Top Left Upstairs)
      // -------------------------------------------------------------
      const masterBedGroup = new THREE.Group();
      masterBedGroup.name = 'MasterBedroom';

      // King Bed Frame
      const bedFrame = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.35, 2.5), materials.woodFurniture);
      bedFrame.position.set(-3.0, 0.175, -2.1);
      bedFrame.castShadow = true;
      masterBedGroup.add(bedFrame);

      // White Mattress & Duvet
      const bedMattress = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.25, 2.3), materials.bedLinen);
      bedMattress.position.set(-3.0, 0.42, -2.1);
      bedMattress.castShadow = true;
      masterBedGroup.add(bedMattress);

      // Dark Blue Folded Blanket Accent
      const bedBlanket = new THREE.Mesh(new THREE.BoxGeometry(2.12, 0.08, 0.9), materials.bedNavyAccent);
      bedBlanket.position.set(-3.0, 0.52, -1.35);
      masterBedGroup.add(bedBlanket);

      // 2 Fluffy Pillows
      const pillowL = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.12, 0.45), materials.bedLinen);
      pillowL.position.set(-3.6, 0.58, -2.9);
      masterBedGroup.add(pillowL);

      const pillowR = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.12, 0.45), materials.bedLinen);
      pillowR.position.set(-2.4, 0.58, -2.9);
      masterBedGroup.add(pillowR);

      // Bedside Nightstands & Lamps
      [-4.4, -1.6].forEach((nx) => {
        const stand = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.45, 0.5), materials.woodFurniture);
        stand.position.set(nx, 0.225, -2.9);
        masterBedGroup.add(stand);

        const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.15, 0.25, 12), materials.warmLampGlow);
        lamp.position.set(nx, 0.58, -2.9);
        masterBedGroup.add(lamp);
      });

      // Tall Dark Blue Wardrobe with Shelving
      const wardrobe = new THREE.Mesh(new THREE.BoxGeometry(0.65, 1.8, 1.6), materials.cabinetDark);
      wardrobe.position.set(-houseWidth / 2 + 0.45, 0.9, 0.4);
      wardrobe.castShadow = true;
      masterBedGroup.add(wardrobe);

      upperFloor.add(masterBedGroup);

      // -------------------------------------------------------------
      // BEDROOM 2 (Double Bedroom - Top Right Upstairs)
      // -------------------------------------------------------------
      const bed2Group = new THREE.Group();
      bed2Group.name = 'Bedroom2';

      const bed2 = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.35, 2.2), materials.woodFurniture);
      bed2.position.set(3.4, 0.175, -2.2);
      bed2.castShadow = true;
      bed2Group.add(bed2);

      const mattress2 = new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.24, 2.05), materials.bedLinen);
      mattress2.position.set(3.4, 0.42, -2.2);
      bed2Group.add(mattress2);

      // Study Desk & Chair in Bedroom 2
      const desk2 = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.06, 0.6), materials.woodFurniture);
      desk2.position.set(1.4, 0.72, -2.9);
      bed2Group.add(desk2);

      const deskChair = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.45, 0.4), materials.blueCushion);
      deskChair.position.set(1.4, 0.225, -2.3);
      bed2Group.add(deskChair);

      upperFloor.add(bed2Group);

      // -------------------------------------------------------------
      // BEDROOM 3 (Cozy Guest Room - Bottom Right Upstairs)
      // -------------------------------------------------------------
      const bed3Group = new THREE.Group();
      bed3Group.name = 'Bedroom3';

      const bed3 = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.35, 2.0), materials.woodFurniture);
      bed3.position.set(3.6, 0.175, 1.8);
      bed3.castShadow = true;
      bed3Group.add(bed3);

      const mattress3 = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.22, 1.9), materials.bedLinen);
      mattress3.position.set(3.6, 0.41, 1.8);
      bed3Group.add(mattress3);

      const throwPillow = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.15, 0.35), materials.blueCushion);
      throwPillow.position.set(3.6, 0.55, 1.1);
      bed3Group.add(throwPillow);

      upperFloor.add(bed3Group);

      // -------------------------------------------------------------
      // BATHROOM (Top Center Upstairs)
      // -------------------------------------------------------------
      const bathGroup = new THREE.Group();
      bathGroup.name = 'Bathroom';

      // Glass Walk-in Shower Enclosure
      const showerGlass = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.6, 0.05), materials.glass);
      showerGlass.position.set(0.2, 0.8, -1.8);
      bathGroup.add(showerGlass);

      // Floating Vanity with White Vessel Sink
      const vanity = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.35, 0.5), materials.woodFurniture);
      vanity.position.set(0.1, 0.65, -3.0);
      bathGroup.add(vanity);

      const sinkBowl = new THREE.Mesh(
        new THREE.CylinderGeometry(0.22, 0.18, 0.14, 16),
        materials.countertop
      );
      sinkBowl.position.set(0.1, 0.88, -3.0);
      bathGroup.add(sinkBowl);

      // Toilet Unit
      const toilet = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.45, 0.6), materials.countertop);
      toilet.position.set(-0.8, 0.225, -2.8);
      bathGroup.add(toilet);

      // Navy Round Bath Mat
      const bathMat = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.015, 16), materials.blueCushion);
      bathMat.position.set(0.1, 0.01, -2.3);
      bathGroup.add(bathMat);

      upperFloor.add(bathGroup);

      house.add(upperFloor);
      upperFloorRef.current = upperFloor;

      // Soft Ground Ambient Shadow Receiver Plane
      const shadowPlaneGeo = new THREE.PlaneGeometry(24, 20);
      const shadowCanvas = document.createElement('canvas');
      shadowCanvas.width = 256;
      shadowCanvas.height = 256;
      const sCtx = shadowCanvas.getContext('2d')!;
      const grad = sCtx.createRadialGradient(128, 128, 20, 128, 128, 120);
      grad.addColorStop(0, 'rgba(30, 41, 59, 0.38)');
      grad.addColorStop(0.5, 'rgba(40, 50, 70, 0.18)');
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      sCtx.fillStyle = grad;
      sCtx.fillRect(0, 0, 256, 256);

      const shadowTex = new THREE.CanvasTexture(shadowCanvas);
      const shadowPlaneMat = new THREE.MeshBasicMaterial({
        map: shadowTex,
        transparent: true,
        opacity: 0.8,
        depthWrite: false,
      });
      const shadowPlane = new THREE.Mesh(shadowPlaneGeo, shadowPlaneMat);
      shadowPlane.rotation.x = -Math.PI / 2;
      shadowPlane.position.y = -0.3;
      house.add(shadowPlane);

      return house;
    },
    []
  );

  // Setup Three.js Scene, Camera, Renderer, Lighting
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const width = container.clientWidth || 800;
    const heightPx = container.clientHeight || 560;

    // 1. Scene with clean light grey background
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf1f3f5);
    sceneRef.current = scene;

    // 2. Camera: Isometric Perspective
    const camera = new THREE.PerspectiveCamera(38, width / heightPx, 0.1, 1000);
    camera.position.set(16, 14, 18);
    camera.lookAt(0, 1.2, 0);
    cameraRef.current = camera;

    // 3. Renderer
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, heightPx);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    rendererRef.current = renderer;

    // 4. Lights Group
    const lightsGroup = new THREE.Group();
    lightsGroup.name = 'LightsRig';

    // Ambient Light
    const ambientLight = new THREE.AmbientLight(0xfff3e0, 0.85);
    lightsGroup.add(ambientLight);

    // Directional Sun / Studio Key Light with soft shadow
    const dirLight = new THREE.DirectionalLight(0xfffaed, 1.85);
    dirLight.position.set(15, 22, 14);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 60;
    dirLight.shadow.camera.left = -12;
    dirLight.shadow.camera.right = 12;
    dirLight.shadow.camera.top = 12;
    dirLight.shadow.camera.bottom = -12;
    dirLight.shadow.bias = -0.0005;
    lightsGroup.add(dirLight);

    // Fill Light (Cool blue tint for architectural contrast)
    const fillLight = new THREE.DirectionalLight(0xbad7f2, 0.65);
    fillLight.position.set(-14, 12, -12);
    lightsGroup.add(fillLight);

    // Warm Room Accent Point Lights (Interior ambiance)
    const livingPoint = new THREE.PointLight(0xffa94d, 1.4, 7);
    livingPoint.position.set(2.4, 1.6, 0.5);
    lightsGroup.add(livingPoint);

    const kitchenPoint = new THREE.PointLight(0xffc078, 1.1, 6);
    kitchenPoint.position.set(-3.2, 1.5, 1.2);
    lightsGroup.add(kitchenPoint);

    const masterBedPoint = new THREE.PointLight(0xffa94d, 1.2, 6);
    masterBedPoint.position.set(-3.0, 3.8, -2.1);
    lightsGroup.add(masterBedPoint);

    const bed2Point = new THREE.PointLight(0xffd8a8, 1.0, 5);
    bed2Point.position.set(3.2, 3.8, -2.0);
    lightsGroup.add(bed2Point);

    scene.add(lightsGroup);
    lightsGroupRef.current = lightsGroup;

    // 5. Build Dollhouse Model
    const materials = createMaterials();
    const house = buildDollhouse(materials);
    scene.add(house);
    houseGroupRef.current = house;

    // Set initial rotation for ideal isometric presentation
    house.rotation.y = targetRotationRef.current.y;
    house.rotation.x = targetRotationRef.current.x;

    // 6. Animation / Render Loop with Inertia
    let lastTime = performance.now();
    const renderLoop = (time: number) => {
      reqAnimIdRef.current = requestAnimationFrame(renderLoop);

      // Inertia Physics when user is NOT dragging
      if (!isDraggingRef.current) {
        if (Math.abs(velocityRef.current.x) > 0.00005) {
          targetRotationRef.current.y += velocityRef.current.x;
          velocityRef.current.x *= 0.92; // Momentum decay
        }
        if (Math.abs(velocityRef.current.y) > 0.00005) {
          targetRotationRef.current.x += velocityRef.current.y;
          // Clamp X tilt between 0.08 and 1.4 radians (never upside down)
          targetRotationRef.current.x = Math.max(0.08, Math.min(1.4, targetRotationRef.current.x));
          velocityRef.current.y *= 0.92;
        }
      }

      // Smooth Lerp towards target rotation & position
      if (houseGroupRef.current) {
        houseGroupRef.current.rotation.y +=
          (targetRotationRef.current.y - houseGroupRef.current.rotation.y) * 0.12;
        houseGroupRef.current.rotation.x +=
          (targetRotationRef.current.x - houseGroupRef.current.rotation.x) * 0.12;
        houseGroupRef.current.position.y +=
          (targetPositionRef.current.y - houseGroupRef.current.position.y) * 0.12;

        // Smooth zoom
        currentZoomRef.current += (targetZoomRef.current - currentZoomRef.current) * 0.12;
        camera.zoom = currentZoomRef.current;
        camera.updateProjectionMatrix();

        // Smooth floor separation (Exploded view animation)
        if (upperFloorRef.current) {
          upperFloorRef.current.position.y +=
            (upperFloorTargetYRef.current - upperFloorRef.current.position.y) * 0.1;
        }
      }

      renderer.render(scene, camera);
    };

    reqAnimIdRef.current = requestAnimationFrame(renderLoop);

    // Handle Resize
    const handleResize = () => {
      if (!container || !renderer || !camera) return;
      const newWidth = container.clientWidth;
      const newHeight = container.clientHeight;
      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, newHeight);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (reqAnimIdRef.current) cancelAnimationFrame(reqAnimIdRef.current);
      renderer.dispose();
      // Dispose materials, geometries & textures
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry?.dispose();
          const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
          mats.forEach((m) => {
            if (m) {
              if (m.map) m.map.dispose();
              if (m.lightMap) m.lightMap.dispose();
              if (m.bumpMap) m.bumpMap.dispose();
              if (m.normalMap) m.normalMap.dispose();
              if (m.specularMap) m.specularMap.dispose();
              if (m.envMap) m.envMap.dispose();
              m.dispose();
            }
          });
        }
      });
    };
  }, [buildDollhouse, createMaterials]);

  // Update Floor Mode
  useEffect(() => {
    if (!upperFloorRef.current || !groundFloorRef.current) return;

    switch (floorMode) {
      case 'both':
        upperFloorRef.current.visible = true;
        groundFloorRef.current.visible = true;
        upperFloorTargetYRef.current = 2.4; // Nested together
        break;
      case 'exploded':
        upperFloorRef.current.visible = true;
        groundFloorRef.current.visible = true;
        upperFloorTargetYRef.current = 4.8; // Lifted up to reveal both storeys!
        break;
      case 'ground':
        upperFloorRef.current.visible = false;
        groundFloorRef.current.visible = true;
        upperFloorTargetYRef.current = 2.4;
        break;
      case 'upper':
        upperFloorRef.current.visible = true;
        groundFloorRef.current.visible = false;
        upperFloorTargetYRef.current = 0.5; // Lowered to eye level
        break;
    }
  }, [floorMode]);

  // Update Lighting Mode
  useEffect(() => {
    if (!lightsGroupRef.current) return;
    lightsGroupRef.current.traverse((child) => {
      if (child instanceof THREE.DirectionalLight) {
        if (lightingMode === 'warm') {
          child.color.set(0xfffaed);
          child.intensity = 1.85;
        } else {
          child.color.set(0xf0f6ff);
          child.intensity = 2.2;
        }
      } else if (child instanceof THREE.AmbientLight) {
        if (lightingMode === 'warm') {
          child.color.set(0xfff3e0);
          child.intensity = 0.85;
        } else {
          child.color.set(0xffffff);
          child.intensity = 0.95;
        }
      }
    });
  }, [lightingMode]);

  // Mouse Drag Event Handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    isDraggingRef.current = true;
    lastMousePosRef.current = { x: e.clientX, y: e.clientY };
    velocityRef.current = { x: 0, y: 0 };
    setIsInteracting(true);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current) return;

    const deltaX = e.clientX - lastMousePosRef.current.x;
    const deltaY = e.clientY - lastMousePosRef.current.y;

    lastMousePosRef.current = { x: e.clientX, y: e.clientY };

    // Drag LEFT / RIGHT = rotate house left and right
    const rotSpeedY = 0.007;
    targetRotationRef.current.y += deltaX * rotSpeedY;

    // Drag UP / DOWN = tilt the house up and down & move vertically
    const rotSpeedX = 0.005;
    targetRotationRef.current.x += deltaY * rotSpeedX;
    // Clamp tilt angle
    targetRotationRef.current.x = Math.max(0.08, Math.min(1.4, targetRotationRef.current.x));

    // Drag vertical shift (lift/tilt view upward)
    targetPositionRef.current.y -= deltaY * 0.004;
    targetPositionRef.current.y = Math.max(-1.5, Math.min(2.0, targetPositionRef.current.y));

    // Track instantaneous velocity for inertia release
    velocityRef.current = {
      x: deltaX * rotSpeedY * 0.9,
      y: deltaY * rotSpeedX * 0.9,
    };
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
    setIsInteracting(false);
  };

  // Touch Drag on Mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      isDraggingRef.current = true;
      lastMousePosRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      velocityRef.current = { x: 0, y: 0 };
      touchDistanceRef.current = null;
      setIsInteracting(true);
    } else if (e.touches.length === 2) {
      // Pinch to zoom start
      isDraggingRef.current = false;
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      touchDistanceRef.current = Math.hypot(dx, dy);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1 && isDraggingRef.current) {
      const deltaX = e.touches[0].clientX - lastMousePosRef.current.x;
      const deltaY = e.touches[0].clientY - lastMousePosRef.current.y;
      lastMousePosRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };

      targetRotationRef.current.y += deltaX * 0.007;
      targetRotationRef.current.x += deltaY * 0.005;
      targetRotationRef.current.x = Math.max(0.08, Math.min(1.4, targetRotationRef.current.x));
      targetPositionRef.current.y -= deltaY * 0.004;

      velocityRef.current = {
        x: deltaX * 0.007,
        y: deltaY * 0.005,
      };
    } else if (e.touches.length === 2 && touchDistanceRef.current !== null) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const newDist = Math.hypot(dx, dy);
      const factor = newDist / touchDistanceRef.current;
      touchDistanceRef.current = newDist;

      const newZoom = Math.max(0.6, Math.min(2.2, targetZoomRef.current * factor));
      targetZoomRef.current = newZoom;
      setZoomLevel(Math.round(newZoom * 100));
    }
  };

  const handleTouchEnd = () => {
    isDraggingRef.current = false;
    touchDistanceRef.current = null;
    setIsInteracting(false);
  };

  // Scroll to Zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomDelta = -e.deltaY * 0.0012;
    const newZoom = Math.max(0.6, Math.min(2.4, targetZoomRef.current + zoomDelta));
    targetZoomRef.current = newZoom;
    setZoomLevel(Math.round(newZoom * 100));
  };

  // Double Click to Reset View
  const handleDoubleClick = () => {
    handleResetView();
  };

  // Preset Views Handler
  const handleApplyPreset = (preset: PresetView) => {
    setActivePreset(preset);
    const config = PRESET_ANGLES[preset];
    targetRotationRef.current.x = config.x;
    targetRotationRef.current.y = config.y;
    targetZoomRef.current = config.zoom;
    targetPositionRef.current.y = config.posY;
    velocityRef.current = { x: 0, y: 0 };
    setZoomLevel(Math.round(config.zoom * 100));
  };

  // Reset View to Isometric
  const handleResetView = () => {
    handleApplyPreset('isometric');
    setFloorMode('both');
  };

  // Zoom Slider Change
  const handleZoomSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setZoomLevel(Math.round(val));
    targetZoomRef.current = val / 100;
  };

  const handleZoomStep = (delta: number) => {
    const newZoom = Math.max(60, Math.min(240, zoomLevel + delta));
    setZoomLevel(newZoom);
    targetZoomRef.current = newZoom / 100;
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen?.().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.().catch(() => {});
      setIsFullscreen(false);
    }
  };

  return (
    <div
      ref={containerRef}
      className={`relative select-none overflow-hidden rounded-2xl border border-stone-300/80 bg-[#eef0f3] dark:border-stone-800 dark:bg-[#1a1f26] shadow-2xl transition-all ${className}`}
      style={{ height }}
    >
      {/* 3D WebGL Canvas */}
      <canvas
        ref={canvasRef}
        className={`w-full h-full block ${
          isInteracting ? 'cursor-grabbing' : 'cursor-grab'
        } transition-cursor`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onWheel={handleWheel}
        onDoubleClick={handleDoubleClick}
      />

      {/* Top Header Floating Controls */}
      <div className="absolute top-3 left-3 right-3 z-20 flex items-center justify-between pointer-events-none gap-2">
        {/* Left Badge: Status and Floor Mode */}
        <div className="flex items-center gap-1.5 pointer-events-auto bg-stone-900/90 dark:bg-stone-950/95 backdrop-blur-md px-3 py-1.5 rounded-xl border border-stone-700/80 text-stone-100 shadow-lg text-xs">
          <Compass className="w-3.5 h-3.5 text-amber-400" />
          <span className="font-semibold text-stone-100">3D Interactive Dollhouse</span>
          <span className="hidden sm:inline-block text-[10px] bg-amber-500/20 text-amber-300 font-mono px-1.5 py-0.5 rounded border border-amber-500/30">
            2-Storey Layout
          </span>
        </div>

        {/* Right Controls: Floor Selector & Utilities */}
        <div className="flex items-center gap-1.5 pointer-events-auto bg-stone-900/90 dark:bg-stone-950/95 backdrop-blur-md p-1.5 rounded-xl border border-stone-700/80 text-stone-100 shadow-lg">
          {/* Floor Mode Selector */}
          <div className="flex items-center bg-stone-800/90 rounded-lg p-0.5 border border-stone-700/70 text-[11px]">
            <button
              onClick={() => setFloorMode('both')}
              className={`px-2 py-1 rounded-md font-medium transition-colors ${
                floorMode === 'both' ? 'bg-amber-500 text-stone-950' : 'text-stone-300 hover:text-stone-100'
              }`}
              title="View full two-storey house"
            >
              All Floors
            </button>
            <button
              onClick={() => setFloorMode('exploded')}
              className={`px-2 py-1 rounded-md font-medium flex items-center gap-1 transition-colors ${
                floorMode === 'exploded' ? 'bg-amber-500 text-stone-950' : 'text-stone-300 hover:text-stone-100'
              }`}
              title="Separate upper floor for full internal view"
            >
              <Layers className="w-3 h-3" />
              <span>Exploded</span>
            </button>
            <button
              onClick={() => setFloorMode('ground')}
              className={`px-2 py-1 rounded-md font-medium transition-colors ${
                floorMode === 'ground' ? 'bg-amber-500 text-stone-950' : 'text-stone-300 hover:text-stone-100'
              }`}
              title="Ground floor only (Living, Kitchen, Dining)"
            >
              Ground
            </button>
            <button
              onClick={() => setFloorMode('upper')}
              className={`px-2 py-1 rounded-md font-medium transition-colors ${
                floorMode === 'upper' ? 'bg-amber-500 text-stone-950' : 'text-stone-300 hover:text-stone-100'
              }`}
              title="Upper floor only (3 Bedrooms, Bathroom)"
            >
              Upper
            </button>
          </div>

          {/* Lighting Toggle */}
          <button
            onClick={() => setLightingMode(lightingMode === 'warm' ? 'daylight' : 'warm')}
            className="p-1.5 text-stone-300 hover:text-amber-400 hover:bg-stone-800 rounded-lg transition-colors"
            title={lightingMode === 'warm' ? 'Switch to Daylight' : 'Switch to Warm Evening Light'}
          >
            {lightingMode === 'warm' ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-blue-300" />}
          </button>

          {/* Fullscreen Toggle */}
          <button
            onClick={toggleFullscreen}
            className="p-1.5 text-stone-300 hover:text-stone-100 hover:bg-stone-800 rounded-lg transition-colors"
            title="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>

          {showCloseButton && onClose && (
            <button
              onClick={onClose}
              className="p-1.5 text-stone-400 hover:text-red-400 hover:bg-stone-800 rounded-lg transition-colors ml-1"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Preset View Buttons (Top-Left under badge) */}
      <div className="absolute top-14 left-3 z-20 flex flex-col gap-1 pointer-events-auto bg-stone-900/85 backdrop-blur-md p-1 rounded-xl border border-stone-700/70 shadow-lg">
        <span className="text-[9px] uppercase tracking-wider text-stone-400 font-mono px-2 py-0.5 font-semibold">
          Views
        </span>
        {(['isometric', 'front', 'top', 'left', 'right'] as PresetView[]).map((preset) => (
          <button
            key={preset}
            onClick={() => handleApplyPreset(preset)}
            className={`px-2.5 py-1 text-left text-xs rounded-lg capitalize transition-all font-medium ${
              activePreset === preset
                ? 'bg-amber-500 text-stone-950 font-semibold shadow-sm'
                : 'text-stone-300 hover:bg-stone-800 hover:text-stone-100'
            }`}
          >
            {preset}
          </button>
        ))}
      </div>

      {/* Floor Room Legend (Floating Top-Right) */}
      <div className="absolute top-14 right-3 z-20 hidden md:flex flex-col gap-1 pointer-events-auto bg-stone-900/80 backdrop-blur-md p-2 rounded-xl border border-stone-700/60 shadow-lg text-[11px] text-stone-300 max-w-[210px]">
        <div className="flex items-center gap-1 font-semibold text-amber-400 pb-0.5 border-b border-stone-700/50">
          <Sparkles className="w-3 h-3" />
          <span>Interactive Layout Map</span>
        </div>
        <div className="space-y-0.5 text-[10px]">
          <div className="flex items-center justify-between text-stone-300">
            <span className="font-medium text-stone-200">1F Ground Floor:</span>
            <span className="text-stone-400">Living · Dining · Kitchen</span>
          </div>
          <div className="flex items-center justify-between text-stone-300">
            <span className="font-medium text-stone-200">2F Upper Floor:</span>
            <span className="text-stone-400">3 Bedrooms · Bathroom</span>
          </div>
          <div className="text-stone-400 pt-0.5">Stairs in center · Balcony right</div>
        </div>
      </div>

      {/* Bottom Floating Control Bar */}
      <div className="absolute bottom-3 left-3 right-3 z-20 flex flex-wrap items-center justify-between gap-3 pointer-events-none">
        {/* Reset View Button */}
        <div className="pointer-events-auto flex items-center gap-2">
          <button
            onClick={handleResetView}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-900/90 backdrop-blur-md border border-stone-700/80 text-stone-200 hover:text-stone-100 hover:bg-stone-800 text-xs font-medium shadow-lg transition-all active:scale-95"
            title="Reset to default isometric camera angle"
          >
            <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
            <span>Reset View</span>
          </button>
        </div>

        {/* Center Hint Text */}
        <div className="pointer-events-auto bg-stone-900/85 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-stone-700/70 text-[11px] text-stone-300 shadow-md font-medium flex items-center gap-1.5">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
          <span>Click and drag to move - Scroll to zoom - Double-click to reset</span>
        </div>

        {/* Zoom Controls & Slider */}
        <div className="pointer-events-auto flex items-center gap-2 bg-stone-900/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-stone-700/80 shadow-lg text-xs text-stone-200">
          <button
            onClick={() => handleZoomStep(-15)}
            className="p-1 hover:text-amber-400 hover:bg-stone-800 rounded transition-colors"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>

          <input
            type="range"
            min="60"
            max="220"
            value={zoomLevel}
            onChange={handleZoomSliderChange}
            className="w-20 sm:w-24 h-1.5 bg-stone-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
          />

          <button
            onClick={() => handleZoomStep(15)}
            className="p-1 hover:text-amber-400 hover:bg-stone-800 rounded transition-colors"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>

          <span className="font-mono text-[10px] text-stone-400 w-9 text-right font-medium">
            {zoomLevel}%
          </span>
        </div>
      </div>
    </div>
  );
};
