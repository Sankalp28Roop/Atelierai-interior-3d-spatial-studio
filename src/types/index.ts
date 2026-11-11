export type MessageRole = 'user' | 'assistant';

export type MessageType = 'text' | 'image2d' | '3d';

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: string;
  type?: MessageType;
  mediaUrl?: string;
  thumbnailUrl?: string;
  source?: string;
  styleName?: string;
  objectName?: string;
  intent?: 'GENERATE_2D' | 'GENERATE_3D';
  status?: 'pending' | 'success' | 'failed';
  stage?: string;
  progress?: number;
  taskId?: string;
  dimensions?: string;
  formats?: {
    glb?: string;
    fbx?: string;
    obj?: string;
    usdz?: string;
  };
}

export interface PresetPrompt {
  id: string;
  title: string;
  prompt: string;
  type: '2D' | '3D';
  category: string;
  thumbnail: string;
  description: string;
}

export interface StudioSettings {
  modelsLabKey: string;
  meshyKey: string;
  defaultNegativePrompt: string;
  autoRotate3D: boolean;
  wireframeMode: boolean;
  lightingEnvironment: 'studio' | 'neutral' | 'sunset' | 'warm';
  routingMode: 'auto' | 'force_2d' | 'force_3d';
}
