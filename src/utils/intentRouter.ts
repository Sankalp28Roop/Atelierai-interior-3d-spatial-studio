/**
 * Intelligent Intent Router for AtelierAI Interior Studio
 * 
 * Rules:
 * 1. If the user mentions spatial / architectural concepts ('layout', 'room', 'interior', 'interior design',
 *    'view', 'photo', 'scene', 'kitchen', 'bedroom', 'living room', 'apartment', etc.) WITHOUT isolating
 *    a solitary furniture item, classify as 'GENERATE_2D' (even if "3D", "model", or "render" is mentioned,
 *    e.g., "3D interior design layout" -> 2D conceptual room scene).
 * 2. If the user specifies a solitary furniture piece (e.g., "minimalist oak coffee table", "art-deco armchair",
 *    "velvet sofa", "pendant lamp") OR explicitly requests a solitary 3D furniture model/asset,
 *    classify as 'GENERATE_3D'.
 */

export type IntentType = 'GENERATE_2D' | 'GENERATE_3D';

export interface IntentAnalysisResult {
  intent: IntentType;
  confidence: number;
  reason: string;
  detectedEntities: {
    roomKeywords: string[];
    objectKeywords: string[];
    explicit3DKeywords: string[];
    styleKeywords: string[];
  };
}

const ROOM_KEYWORDS = [
  'layout',
  'interior design',
  'interior layout',
  'interior',
  'room layout',
  'room',
  'living room',
  'bedroom',
  'kitchen',
  'bathroom',
  'dining room',
  'dining area',
  'scene',
  'view',
  'photo',
  'panoramic',
  'studio apartment',
  'apartment',
  'hallway',
  'corridor',
  'foyer',
  'loft',
  'balcony',
  'patio',
  'terrace',
  'home office',
  'workspace',
  'lounge area',
  'master suite',
  'floor plan',
  'floorplan',
  'walk-in closet',
  'open plan',
  'concept',
  'house',
  'home',
  'residence',
  'wall',
  'walls',
  'flooring',
  'ceiling',
  'spatial',
  'space',
  'isometric',
  'cutaway',
  'dollhouse',
  'top-down',
  'no roof',
  'angled view',
  'architectural visualization',
  'compact home',
  'stairs',
  'staircase',
];

const SOLITARY_FURNITURE_OBJECTS = [
  'chair',
  'armchair',
  'lounge chair',
  'accent chair',
  'sofa',
  'couch',
  'sectional',
  'coffee table',
  'side table',
  'end table',
  'dining table',
  'desk',
  'credenza',
  'sideboard',
  'wardrobe',
  'closet unit',
  'nightstand',
  'bedside table',
  'bed frame',
  'bookshelf',
  'bookcase',
  'floor lamp',
  'table lamp',
  'sconce',
  'chandelier',
  'pendant light',
  'pendant lamp',
  'barstool',
  'stool',
  'ottoman',
  'bench',
  'cabinet',
  'dresser',
  'mirror',
  'console table',
  'vase',
  'planter pot',
];

const EXPLICIT_3D_KEYWORDS = [
  '3d',
  '3-d',
  'glb',
  'gltf',
  'obj',
  'mesh',
  'quad',
  'topology',
  'wireframe',
  'downloadable',
  'spin',
  'orbit',
  'standalone',
  'solitary',
  'individual piece',
  'single piece',
  'asset',
];

// Spatial phrases that contain "3d" or "render" but mean a 2D architectural / spatial scene
const SPATIAL_3D_PHRASES = [
  '3d isometric',
  '3d cutaway',
  '3d dollhouse',
  '3d room',
  '3d layout',
  '3d floor plan',
  '3d interior',
  '3d apartment',
  '3d render',
  '3d architectural',
  '3d house',
  '3d home',
  '3d kitchen',
  '3d bedroom',
  '3d living room',
  'isometric cutaway',
  'isometric view',
  'dollhouse view',
  'cutaway view',
  'floor plan',
];

const STYLE_KEYWORDS = [
  'japandi',
  'scandinavian',
  'minimalist',
  'bauhaus',
  'art deco',
  'mid-century modern',
  'industrial',
  'brutalist',
  'biophilic',
  'contemporary',
  'wabi-sabi',
  'bohemian',
  'mediterranean',
  'coastal',
  'rustic',
  'modern luxury',
  'luxury',
];

export function analyzePromptIntent(prompt: string): IntentAnalysisResult {
  const cleanPrompt = prompt.toLowerCase().trim();

  const foundRoomKeywords = ROOM_KEYWORDS.filter((kw) =>
    cleanPrompt.includes(kw)
  );

  const foundSpatial3DPhrases = SPATIAL_3D_PHRASES.filter((kw) =>
    cleanPrompt.includes(kw)
  );

  const found3DKeywords = EXPLICIT_3D_KEYWORDS.filter((kw) => {
    const regex = new RegExp(`\\b${kw}\\b`, 'i');
    return regex.test(cleanPrompt);
  });

  const foundObjectKeywords = SOLITARY_FURNITURE_OBJECTS.filter((kw) => {
    const regex = new RegExp(`\\b${kw}\\b`, 'i');
    return regex.test(cleanPrompt);
  });

  const foundStyleKeywords = STYLE_KEYWORDS.filter((kw) =>
    cleanPrompt.includes(kw)
  );

  // RULE 1: If room/layout/interior words OR spatial 3D phrases (isometric, dollhouse, etc.) are present:
  // e.g. "interior design layout", "3D isometric cutaway dollhouse view", "kitchen design", "living room with sofa and table"
  // It is classified as GENERATE_2D UNLESS the user explicitly asks for a solitary furniture model
  // (e.g. "3d model of a single chair" or "isolate the coffee table asset")
  const isExplicitSolitaryRequest =
    (cleanPrompt.includes('single') ||
      cleanPrompt.includes('solitary') ||
      cleanPrompt.includes('isolated') ||
      cleanPrompt.includes('piece only') ||
      cleanPrompt.includes('furniture piece only')) &&
    foundObjectKeywords.length > 0 &&
    !cleanPrompt.includes('apartment') &&
    !cleanPrompt.includes('layout') &&
    !cleanPrompt.includes('dollhouse');

  if ((foundRoomKeywords.length > 0 || foundSpatial3DPhrases.length > 0) && !isExplicitSolitaryRequest) {
    const matchedTerms = [...new Set([...foundRoomKeywords, ...foundSpatial3DPhrases])];
    return {
      intent: 'GENERATE_2D',
      confidence: 0.98,
      reason: `Interior space/room layout requested: [${matchedTerms.slice(0, 8).join(', ')}]`,
      detectedEntities: {
        roomKeywords: matchedTerms,
        objectKeywords: foundObjectKeywords,
        explicit3DKeywords: found3DKeywords,
        styleKeywords: foundStyleKeywords,
      },
    };
  }

  // RULE 2: Solitary furniture object explicitly specified without a broader room layout
  // e.g. "minimalist oak coffee table", "art-deco armchair", "leather sofa", "brass pendant lamp"
  if (foundObjectKeywords.length > 0) {
    return {
      intent: 'GENERATE_3D',
      confidence: 0.94,
      reason: `Specific individual furniture asset requested: [${foundObjectKeywords.join(', ')}]`,
      detectedEntities: {
        roomKeywords: foundRoomKeywords,
        objectKeywords: foundObjectKeywords,
        explicit3DKeywords: found3DKeywords,
        styleKeywords: foundStyleKeywords,
      },
    };
  }

  // RULE 3: Explicit 3D keywords with no room context (e.g. "3D model asset")
  if (found3DKeywords.length > 0) {
    return {
      intent: 'GENERATE_3D',
      confidence: 0.9,
      reason: `Explicit 3D asset generation requested: [${found3DKeywords.join(', ')}]`,
      detectedEntities: {
        roomKeywords: foundRoomKeywords,
        objectKeywords: foundObjectKeywords,
        explicit3DKeywords: found3DKeywords,
        styleKeywords: foundStyleKeywords,
      },
    };
  }

  // RULE 4: Fallback - general spatial prompts default to 2D scene conceptualization
  return {
    intent: 'GENERATE_2D',
    confidence: 0.85,
    reason: `General spatial aesthetic prompt interpreted as 2D conceptual scene`,
    detectedEntities: {
      roomKeywords: foundRoomKeywords,
      objectKeywords: foundObjectKeywords,
      explicit3DKeywords: found3DKeywords,
      styleKeywords: foundStyleKeywords,
    },
  };
}
