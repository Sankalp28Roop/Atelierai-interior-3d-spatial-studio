/**
 * Hindi & Multilingual Architectural Translator & Prompt Generator
 * Translates Hindi (Devanagari) and Hinglish into English architectural prompts.
 */

export interface TranslationResult {
  isHindi: boolean;
  detectedLanguage: 'Hindi (Devanagari)' | 'Hinglish (Romanized Hindi)' | 'English';
  englishTranslation: string;
  enhanced2DPrompt: string;
  enhanced3DPrompt: string;
  recommendedIntent: 'GENERATE_2D' | 'GENERATE_3D';
}

// Check if string contains Devanagari script (Hindi, Marathi, etc.)
export function isDevanagari(text: string): boolean {
  return /[\u0900-\u097F]/.test(text);
}

// Common Romanized Hindi / Hinglish keywords in design context
const HINGLISH_INDICATORS = [
  'kamra', 'kamre', 'ghar', 'makan', 'banao', 'chahiye', 'kijiye',
  'jisme', 'jismein', 'aur', 'wali', 'wala', 'wale', 'lakdi', 'safed',
  'neela', 'kala', 'peela', 'roshni', 'bistar', 'kursi', 'mez', 'rasoi',
  'baithak', 'dost', 'sundar', 'bada', 'chota', 'deewar', 'chhat', 'farsh'
];

export function isHinglish(text: string): boolean {
  const lower = text.toLowerCase();
  const words = lower.split(/\s+/);
  return words.some(w => HINGLISH_INDICATORS.includes(w));
}

// Hindi Devanagari & Hinglish vocabulary mapping to English architectural concepts
const HINDI_ARCHITECTURAL_DICTIONARY: Record<string, string> = {
  // Rooms & Spaces
  'लिविंग रूम': 'living room layout',
  'बैठक': 'formal living room lounge',
  'बेडरूम': 'master bedroom suite',
  'शयन कक्ष': 'serene bedroom',
  'किचन': 'modular kitchen layout',
  'रसोई': 'modern culinary kitchen',
  'रसोईघर': 'contemporary kitchen with island',
  'बाथरूम': 'luxury bathroom with glass shower',
  'स्नानघर': 'modern spa bathroom',
  'डाइनिंग रूम': 'dining room area with 6-seater table',
  'भोजन कक्ष': 'dining room area',
  'बालकनी': 'lush balcony garden with outdoor seating',
  'अपार्टमेंट': 'small luxury apartment floor plan',
  'घर': 'modern residence interior',
  'मकान': 'contemporary home interior',
  'फ्लैट': 'compact luxury flat interior layout',
  'कटअवे': 'isometric cutaway dollhouse view, no roof',
  'फ्लोर प्लान': 'rectangular floor plan layout',

  // Furniture Objects
  'सोफा': 'lounge sofa with plush cushions',
  'कुर्सी': 'sculptural designer accent chair',
  'मेज': 'coffee table with solid wood frame',
  'टेबल': 'minimalist oak coffee table',
  'डाइनिंग टेबल': 'dining table with solid wood surface',
  'बेड': 'low-profile platform bed with upholstered headboard',
  'बिस्तर': 'king-size bed with crisp linen bedding',
  'अलमारी': 'floor-to-ceiling built-in wardrobe with dark accents',
  'लैंप': 'architectural pendant lamp with warm illumination',
  'झूमर': 'modern minimalist chandelier',
  'आईना': 'backlit circular vanity mirror',
  'शीशा': 'frameless round wall mirror',

  // Materials & Finishes
  'लकड़ी': 'warm quarter-sawn natural oak woodwork',
  'लकड़ी का काम': 'bespoke fluted white oak woodwork and paneling',
  'मार्बल': 'polished Calacatta marble with delicate veining',
  'संगमरमर': 'honed white marble surfaces',
  'कांच': 'fluted tempered glass',
  'ग्लास': 'frosted glass partition',
  'कपड़ा': 'tactile bouclé and textured linen fabric',
  'लेदर': 'cognac aniline leather upholstery',
  'चमड़ा': 'rich grain distressed leather',
  'कंक्रीट': 'architectural smooth poured concrete',
  'ईंट': 'warm exposed brickwork',

  // Lighting & Atmosphere
  'लाइटिंग': 'ambient 2700K recessed warm lighting and cove LEDs',
  'रोशनी': 'natural soft morning sunlight and layered warm lighting',
  'वार्म लाइटिंग': 'cozy warm ambient illumination with directional spotlights',
  'उजाला': 'diffused natural daylight through sheer curtains',
  'खिड़की': 'large floor-to-ceiling panoramic window',

  // Styles & Qualities
  'आधुनिक': 'clean modern minimalist design',
  'लक्जरी': 'refined luxury aesthetic with premium finishes',
  'सुंदर': 'harmonious, aesthetically balanced architectural composition',
  'छोटा': 'space-efficient compact layout with smart integrated storage',
  'बड़ा': 'expansive open-concept layout with high ceilings',
  'भारतीय': 'modern Indian contemporary home aesthetic with warm tones',
  'पारंपरिक': 'rich artisanal craftsmanship with heritage accents',
};

// Hinglish romanized mappings
const HINGLISH_DICTIONARY: Record<string, string> = {
  'kamra': 'room layout',
  'ghar': 'modern residence interior',
  'lakdi': 'natural oak woodwork',
  'lakdi ka kaam': 'fluted oak paneling and joinery',
  'roshni': 'warm ambient lighting',
  'bistar': 'plush double bed with linen bedding',
  'kursi': 'designer accent chair',
  'mez': 'wood coffee table',
  'rasoi': 'modern modular kitchen',
  'baithak': 'cozy living room lounge',
  'balkani': 'balcony with planters and seating',
  'deewar': 'accent wall with textured finish',
  'chhat': 'ceiling with recessed lighting',
  'farsh': 'light herringbone wood flooring',
  'sundar': 'aesthetic and harmonious',
  'chahiye': '',
  'banao': '',
  'kijiye': '',
  'jisme': 'featuring',
  'jismein': 'featuring',
  'aur': 'and',
  'wali': '',
  'wala': '',
};

/**
 * Translates Hindi or Hinglish text to English architectural concepts
 */
export function translateHindiToEnglish(input: string): { translation: string; detectedLanguage: 'Hindi (Devanagari)' | 'Hinglish (Romanized Hindi)' | 'English' } {
  const trimmed = input.trim();
  
  if (isDevanagari(trimmed)) {
    let result = trimmed;
    // Replace dictionary phrases in descending order of length
    const sortedKeys = Object.keys(HINDI_ARCHITECTURAL_DICTIONARY).sort((a, b) => b.length - a.length);
    for (const key of sortedKeys) {
      if (result.includes(key)) {
        result = result.split(key).join(HINDI_ARCHITECTURAL_DICTIONARY[key] + ' ');
      }
    }
    // Clean up residual Devanagari characters
    result = result.replace(/[\u0900-\u097F]/g, ' ').replace(/\s+/g, ' ').trim();
    if (!result) {
      result = 'Modern luxury interior design layout with warm ambient lighting';
    }
    return { translation: result, detectedLanguage: 'Hindi (Devanagari)' };
  }

  if (isHinglish(trimmed)) {
    let result = trimmed.toLowerCase();
    const sortedKeys = Object.keys(HINGLISH_DICTIONARY).sort((a, b) => b.length - a.length);
    for (const key of sortedKeys) {
      const regex = new RegExp(`\\b${key}\\b`, 'gi');
      result = result.replace(regex, HINGLISH_DICTIONARY[key]);
    }
    result = result.replace(/\s+/g, ' ').trim();
    return { translation: result, detectedLanguage: 'Hinglish (Romanized Hindi)' };
  }

  return { translation: trimmed, detectedLanguage: 'English' };
}

/**
 * Generates rich, photorealistic 2D and 3D architectural prompts from any raw prompt
 */
export function generateArchitecturalPrompts(rawInput: string): TranslationResult {
  const { translation, detectedLanguage } = translateHindiToEnglish(rawInput);
  const isHindi = detectedLanguage !== 'English';

  const lower = translation.toLowerCase();

  // Determine primary intent
  const isSolitaryFurniture =
    (lower.includes('chair') ||
      lower.includes('sofa') ||
      lower.includes('couch') ||
      lower.includes('table') ||
      lower.includes('lamp') ||
      lower.includes('pendant') ||
      lower.includes('stool')) &&
    !lower.includes('room') &&
    !lower.includes('layout') &&
    !lower.includes('apartment') &&
    !lower.includes('bedroom') &&
    !lower.includes('kitchen') &&
    !lower.includes('living room') &&
    !lower.includes('floor plan') &&
    !lower.includes('cutaway') &&
    !lower.includes('dollhouse');

  const recommendedIntent: 'GENERATE_2D' | 'GENERATE_3D' = isSolitaryFurniture ? 'GENERATE_3D' : 'GENERATE_2D';

  // Enhanced 2D Room Perspective Prompt
  let enhanced2D = `Photorealistic architectural interior design layout of ${translation}. Featuring bespoke fluted white oak woodwork, textured travertine and matte surfaces, balanced spatial layout, 2700K warm ambient recessed lighting, high-detail architectural visualization, 8k resolution conceptual render.`;
  if (lower.includes('cutaway') || lower.includes('dollhouse') || lower.includes('isometric') || lower.includes('floor plan') || lower.includes('apartment')) {
    enhanced2D = `Photorealistic 3D isometric cutaway dollhouse view of modern luxury ${translation}, top-down angled architectural perspective with no roof. Showing detailed rectangular floor plan with natural light wood flooring, warm evening illumination, furnished spaces, and clean modern aesthetic.`;
  }

  // Enhanced 3D Furniture Asset Prompt
  const enhanced3D = `Single isolated furniture asset: ${translation}. Designed with realistic quad topology geometry, subdivision ready, rich PBR texture maps, authentic material finishes, and precision joinery. Downloadable GLB 3D mesh model with orbital camera controls.`;

  return {
    isHindi,
    detectedLanguage,
    englishTranslation: translation,
    enhanced2DPrompt: enhanced2D,
    enhanced3DPrompt: enhanced3D,
    recommendedIntent,
  };
}
