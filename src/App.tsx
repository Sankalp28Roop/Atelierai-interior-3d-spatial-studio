/**
 * AtelierAI - Intelligent Interior Design & 3D Spatial Studio
 * Renders photorealistic 2D room layouts (ModelsLab v6) and interactive 3D furniture models (Meshy v2 / Google model-viewer).
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Send,
  Sparkles,
  Box,
  Compass,
  Sliders,
  RotateCcw,
  Plus,
  Layers,
  ArrowRight,
  Info,
  Maximize2,
  Trash2,
  CheckCircle2,
  Home,
} from 'lucide-react';
import { ChatMessage, StudioSettings, PresetPrompt } from './types';
import { PRESET_PROMPTS } from './data/presets';
import { analyzePromptIntent, IntentAnalysisResult } from './utils/intentRouter';
import { ModelViewerContainer } from './components/ModelViewerContainer';
import { SceneImageViewer } from './components/SceneImageViewer';
import { GenerationStatusTicker } from './components/GenerationStatusTicker';
import { LightboxModal } from './components/LightboxModal';
import { Model3DStudioModal } from './components/Model3DStudioModal';
import { SettingsModal } from './components/SettingsModal';
import { PromptGeneratorModal } from './components/PromptGeneratorModal';
import { DollhouseModal } from './components/DollhouseModal';
import { AuthModal } from './components/AuthModal';
import { UserMenu } from './components/UserMenu';
import { SavedDesignsModal } from './components/SavedDesignsModal';
import { useAuth } from './contexts/AuthContext';
import { saveDesignToFirestore, UserDesignRecord } from './services/firebase';
import { isDevanagari, isHinglish, translateHindiToEnglish } from './utils/translator';

const DEFAULT_SETTINGS: StudioSettings = {
  modelsLabKey: '',
  meshyKey: '',
  defaultNegativePrompt:
    'blurry, low quality, distorted furniture, unrealistic proportions, bad architecture, deformed walls',
  autoRotate3D: true,
  wireframeMode: false,
  lightingEnvironment: 'neutral',
  routingMode: 'auto',
};

const INITIAL_MESSAGES: ChatMessage[] = [
  {
    id: 'msg-welcome',
    role: 'assistant',
    content:
      'Welcome to AtelierAI. Describe any conceptual room or space (e.g., "interior design layout", "2-storey modern house with 3 bedrooms", "Japandi living room") to generate photorealistic layouts with interactive 3D dollhouse controls, or specify a furniture piece to compile orbital 3D models.',
    timestamp: 'Just now',
    type: 'text',
  },
  {
    id: 'msg-demo-2d',
    role: 'assistant',
    content: 'Photorealistic 3D isometric cutaway dollhouse view of modern 2-storey house (3 bedrooms upstairs, living, dining, kitchen downstairs, central staircase):',
    timestamp: 'Just now',
    type: 'image2d',
    mediaUrl: '/src/assets/images/isometric_apartment_dollhouse_1794321389460.jpg',
    styleName: 'Isometric 2-Storey Modern Dollhouse Layout',
    source: 'Atelier Architectural Studio',
  },
  {
    id: 'msg-demo-3d',
    role: 'assistant',
    content: 'Interactive 3D modern accent armchair with quad topology mesh for orbital inspection and GLB export:',
    timestamp: 'Just now',
    type: '3d',
    mediaUrl: '/models/sheen_chair.glb',
    objectName: 'Sculptural Modern Accent Armchair',
    source: 'Meshy v2 Quad Engine',
  },
];

export default function App() {
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const saved = localStorage.getItem('atelier_chat_messages');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Sanitize any stale or misrouted messages
          const validModels = [
            '/models/sheen_chair.glb',
            '/models/velvet_sofa.glb',
            '/models/leather_sofa.glb',
            '/models/designer_chair.glb',
            '/models/barn_lamp.glb',
          ];

          return parsed.map((m: ChatMessage) => {
            const contentLower = (m.content || '').toLowerCase();
            // If a room / apartment / dollhouse layout prompt was incorrectly saved as a 3D model
            if (
              m.type === '3d' &&
              (contentLower.includes('dollhouse') ||
                contentLower.includes('apartment') ||
                contentLower.includes('isometric') ||
                contentLower.includes('floor plan') ||
                contentLower.includes('room layout') ||
                contentLower.includes('interior design') ||
                contentLower.includes('house') ||
                contentLower.includes('home') ||
                contentLower.includes('living room') ||
                contentLower.includes('kitchen') ||
                contentLower.includes('bedroom'))
            ) {
              return {
                ...m,
                type: 'image2d' as const,
                intent: 'GENERATE_2D' as const,
                content:
                  'Photorealistic 3D isometric cutaway dollhouse view of modern 2-storey house (3 bedrooms upstairs, living, dining, kitchen downstairs):',
                mediaUrl:
                  '/src/assets/images/isometric_apartment_dollhouse_1794321389460.jpg',
                styleName:
                  'Isometric 2-Storey Modern Dollhouse Layout',
                source: 'Atelier Architectural Studio',
              };
            }
            if (m.type === '3d') {
              const url = m.mediaUrl || '';
              const isKnownModel = validModels.some((vm) => url.endsWith(vm.replace('/models/', '')));
              if (!url || !isKnownModel) {
                return {
                  ...m,
                  mediaUrl: '/models/sheen_chair.glb',
                  objectName: m.objectName || 'Modern Upholstered Accent Armchair',
                };
              }
            }
            // Auto-heal any previous messages that were saved with the yellow pollinations rate-limit URL
            if (m.mediaUrl && m.mediaUrl.includes('image.pollinations.ai')) {
              return {
                ...m,
                mediaUrl: '/src/assets/images/scene_industrial_loft_kitchen_1794277382447.jpg',
                styleName: 'Warm Industrial Concrete Kitchen Loft',
              };
            }
            return m;
          });
        }
      } catch (e) {
        return INITIAL_MESSAGES;
      }
    }
    return INITIAL_MESSAGES;
  });

  const [inputPrompt, setInputPrompt] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'studio' | 'presets' | 'inspector'>('studio');

  // Intent live detection preview
  const [liveIntent, setLiveIntent] = useState<IntentAnalysisResult>(() =>
    analyzePromptIntent('Photorealistic 3D isometric cutaway dollhouse view of apartment')
  );

  // Settings State - always ensure routingMode defaults to 'auto' to prevent accidental 3D locks
  const [settings, setSettings] = useState<StudioSettings>(() => {
    const saved = localStorage.getItem('atelier_settings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return { ...DEFAULT_SETTINGS, ...parsed, routingMode: 'auto' };
      } catch (e) {
        return DEFAULT_SETTINGS;
      }
    }
    return DEFAULT_SETTINGS;
  });

  // Modals state
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isPromptGenOpen, setIsPromptGenOpen] = useState(false);
  const [lightboxData, setLightboxData] = useState<{
    isOpen: boolean;
    url: string;
    prompt: string;
    title?: string;
  }>({ isOpen: false, url: '', prompt: '', title: '' });

  const [studio3DData, setStudio3DData] = useState<{
    isOpen: boolean;
    url: string;
    title?: string;
  }>({ isOpen: false, url: '', title: '' });

  const [isDollhouseOpen, setIsDollhouseOpen] = useState(false);

  // Authentication & Portfolio Modals State
  const { user, userProfile } = useAuth();
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authDefaultTab, setAuthDefaultTab] = useState<'login' | 'signup'>('login');
  const [isSavedDesignsOpen, setIsSavedDesignsOpen] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);

  // Sync messages to localStorage
  useEffect(() => {
    localStorage.setItem('atelier_chat_messages', JSON.stringify(messages));
  }, [messages]);

  // Scroll to bottom on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isSubmitting]);

  // Update live intent as user types
  useEffect(() => {
    if (inputPrompt.trim().length > 2) {
      setLiveIntent(analyzePromptIntent(inputPrompt));
    }
  }, [inputPrompt]);

  const handleSaveSettings = (newSettings: StudioSettings) => {
    setSettings(newSettings);
    localStorage.setItem('atelier_settings', JSON.stringify(newSettings));
  };

  const handleClearHistory = () => {
    setMessages(INITIAL_MESSAGES);
    localStorage.removeItem('atelier_chat_messages');
  };

  /**
   * Main Dispatch: Intelligent Prompt Submission & Routing
   */
  const handleSendMessage = async (promptToSend?: string, forcedType?: '2D' | '3D') => {
    const finalPrompt = (promptToSend || inputPrompt).trim();
    if (!finalPrompt || isSubmitting) return;

    setInputPrompt('');

    // Sanitize display prompt to prevent nested quotes or double-prefixing
    const cleanPromptDisplay = finalPrompt
      .replace(/^(3D model for ["']?)+/gi, '')
      .replace(/(["']? compiled successfully with quad geometry:?)+$/gi, '')
      .trim();

    // Multilingual support: Translate Hindi or Hinglish to English
    const isHindiInput = isDevanagari(cleanPromptDisplay) || isHinglish(cleanPromptDisplay);
    const { translation: translatedEnglish } = isHindiInput
      ? translateHindiToEnglish(cleanPromptDisplay)
      : { translation: cleanPromptDisplay };

    // Determine target pipeline based on translated architectural concepts
    const analysis = analyzePromptIntent(translatedEnglish);
    let resolvedIntent: 'GENERATE_2D' | 'GENERATE_3D' = analysis.intent;

    // Architectural room layouts, apartments, dollhouse cutaways, and floor plans
    // MUST always route to 2D conceptual render (a solitary 3D mesh is physically inappropriate)
    if (analysis.intent === 'GENERATE_2D') {
      resolvedIntent = 'GENERATE_2D';
    } else if (forcedType === '2D' || settings.routingMode === 'force_2d') {
      resolvedIntent = 'GENERATE_2D';
    } else if (forcedType === '3D' || settings.routingMode === 'force_3d') {
      resolvedIntent = 'GENERATE_3D';
    }

    const userMessageId = `user_${Date.now()}`;
    const assistantMessageId = `asst_${Date.now()}`;

    // Add user message
    const userMessage: ChatMessage = {
      id: userMessageId,
      role: 'user',
      content: cleanPromptDisplay,
      timestamp: 'Just now',
      intent: resolvedIntent,
    };

    // Add placeholder assistant message in pending state
    const assistantPlaceholder: ChatMessage = {
      id: assistantMessageId,
      role: 'assistant',
      content:
        resolvedIntent === 'GENERATE_2D'
          ? 'Rendering photorealistic 2D room perspective...'
          : 'Compiling interactive 3D furniture mesh geometry...',
      timestamp: 'Generating',
      type: resolvedIntent === 'GENERATE_2D' ? 'image2d' : '3d',
      intent: resolvedIntent,
      status: 'pending',
      progress: 10,
    };

    setMessages((prev) => [...prev, userMessage, assistantPlaceholder]);
    setIsSubmitting(true);

    try {
      if (resolvedIntent === 'GENERATE_2D') {
        // Call backend 2D generation endpoint (ModelsLab Interior v6)
        const response = await fetch('/api/chat/generate-2d', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: cleanPromptDisplay,
            negativePrompt: settings.defaultNegativePrompt,
            apiKey: settings.modelsLabKey || undefined,
          }),
        });

        if (!response.ok) {
          throw new Error(`2D scene generation failed with status ${response.status}`);
        }

        const data = await response.json();

        if (user) {
          saveDesignToFirestore(user.uid, {
            id: `design_${Date.now()}`,
            prompt: cleanPromptDisplay,
            type: '2D',
            mediaUrl: data.url,
            title: data.styleName || 'Architectural 2D Perspective',
            source: data.source || 'ModelsLab v6',
            createdAt: new Date().toISOString(),
          }).catch((e) => console.warn('Could not auto-save 2D design to Firestore:', e));
        }

        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMessageId
              ? {
                  ...m,
                  status: 'success',
                  content: isHindiInput
                    ? `Conceptual 2D render for "${cleanPromptDisplay}" (Translated to English: "${translatedEnglish}"):`
                    : `Here is the conceptual 2D render for "${cleanPromptDisplay}":`,
                  mediaUrl: data.url,
                  source: data.source || 'ModelsLab v6',
                  styleName: data.styleName || 'Architectural 2D Perspective',
                  timestamp: 'Just now',
                }
              : m
          )
        );
      } else {
        // Call backend 3D generation endpoint (Meshy AI v2)
        const response = await fetch('/api/chat/generate-3d', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: cleanPromptDisplay,
            apiKey: settings.meshyKey || undefined,
          }),
        });

        if (!response.ok) {
          throw new Error(`3D mesh initialization failed with status ${response.status}`);
        }

        const initData = await response.json();

        // If backend safely redirected this multi-room scene to 2D
        if (initData.redirectType === 'image2d' || initData.type === 'image2d') {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMessageId
                ? {
                    ...m,
                    type: 'image2d',
                    intent: 'GENERATE_2D',
                    status: 'success',
                    content: `Here is the conceptual 2D render for "${cleanPromptDisplay}":`,
                    mediaUrl: initData.url,
                    source: initData.source || 'Atelier Architectural Engine',
                    styleName: initData.styleName || 'Architectural Layout Perspective',
                    timestamp: 'Just now',
                  }
                : m
            )
          );
          return;
        }

        const taskId = initData.taskId;

        // Poll task status until complete
        let isComplete = false;
        let attempts = 0;
        const maxAttempts = 60; // 60 iterations (up to ~60s)

        while (!isComplete && attempts < maxAttempts) {
          await new Promise((r) => setTimeout(r, 1200));
          attempts++;

          const pollRes = await fetch(
            `/api/chat/status-3d/${taskId}?apiKey=${encodeURIComponent(settings.meshyKey || '')}`
          );
          if (!pollRes.ok) continue;

          const pollData = await pollRes.json();

          if (pollData.status === 'SUCCEEDED') {
            isComplete = true;

            if (user) {
              saveDesignToFirestore(user.uid, {
                id: `design_${Date.now()}`,
                prompt: cleanPromptDisplay,
                type: '3D',
                mediaUrl: pollData.url,
                title: pollData.objectName || '3D Furniture Mesh',
                dimensions: pollData.dimensions,
                source: pollData.source || 'Meshy v2 Quad',
                createdAt: new Date().toISOString(),
              }).catch((e) => console.warn('Could not auto-save 3D design to Firestore:', e));
            }

            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantMessageId
                  ? {
                      ...m,
                      status: 'success',
                      content: isHindiInput
                        ? `3D model for "${cleanPromptDisplay}" (Translated to English: "${translatedEnglish}") compiled successfully with quad geometry:`
                        : `3D model for "${cleanPromptDisplay}" compiled successfully with quad geometry:`,
                      mediaUrl: pollData.url,
                      objectName: pollData.objectName || '3D Furniture Mesh',
                      dimensions: pollData.dimensions,
                      source: pollData.source || 'Meshy v2 Quad',
                      formats: pollData.formats,
                      timestamp: 'Just now',
                    }
                  : m
              )
            );
            break;
          } else if (pollData.status === 'FAILED') {
            throw new Error(pollData.error || '3D mesh compilation failed');
          } else {
            // Update live progress in status ticker
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantMessageId
                  ? {
                      ...m,
                      progress: pollData.progress,
                      stage: pollData.stage,
                    }
                  : m
              )
            );
          }
        }

        if (!isComplete) {
          throw new Error('3D task timed out during compilation');
        }
      }
    } catch (err: any) {
      console.error('Generation pipeline error:', err);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMessageId
            ? {
                ...m,
                status: 'failed',
                content: `Generation encountered an issue: ${err.message}. Please try again or adjust your prompt.`,
                timestamp: 'Failed',
              }
            : m
        )
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSelectPreset = (preset: PresetPrompt) => {
    setActiveTab('studio');
    handleSendMessage(preset.prompt, preset.type);
  };

  return (
    <div className="min-h-screen flex flex-col bg-stone-950 text-stone-100">
      {/* 
        Section 2 Top Bar Contract:
        [Brand title, one line] — [4-5 nav links, 1-2 word labels, single-line] — [1 primary action]
      */}
      <header className="sticky top-0 z-40 flex items-center justify-between gap-8 px-6 py-3.5 border-b border-stone-800/80 bg-stone-950/90 backdrop-blur-md">
        {/* Zone 1: Single text wordmark */}
        <a
          href="/"
          onClick={(e) => {
            e.preventDefault();
            setActiveTab('studio');
          }}
          className="text-lg font-bold tracking-tight text-stone-100 font-display whitespace-nowrap shrink-0 hover:text-amber-400 transition-colors"
        >
          AtelierAI
        </a>

        {/* Zone 2: clean single-line text links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-stone-400">
          <button
            onClick={() => setActiveTab('studio')}
            className={`transition-colors whitespace-nowrap shrink-0 hover:text-stone-100 ${
              activeTab === 'studio' ? 'text-amber-400 font-semibold' : ''
            }`}
          >
            Studio
          </button>
          <button
            onClick={() => setIsDollhouseOpen(true)}
            className="transition-colors whitespace-nowrap shrink-0 text-amber-400 hover:text-amber-300 flex items-center gap-1.5 font-medium bg-amber-500/10 px-3 py-1 rounded-lg border border-amber-500/30 shadow-sm"
          >
            <Home className="w-3.5 h-3.5 text-amber-400" />
            <span>3D Dollhouse</span>
            <span className="text-[9px] bg-amber-500 text-stone-950 font-bold px-1 rounded uppercase tracking-wider">
              Live
            </span>
          </button>
          <button
            onClick={() => setActiveTab('presets')}
            className={`transition-colors whitespace-nowrap shrink-0 hover:text-stone-100 ${
              activeTab === 'presets' ? 'text-amber-400 font-semibold' : ''
            }`}
          >
            Presets
          </button>
          <button
            onClick={() => setIsPromptGenOpen(true)}
            className="transition-colors whitespace-nowrap shrink-0 hover:text-stone-100 text-stone-400 flex items-center gap-1"
          >
            <Sparkles className="w-3 h-3 text-amber-400" />
            <span>Prompt AI</span>
          </button>
          <button
            onClick={() => {
              setStudio3DData({
                isOpen: true,
                url: '/models/sheen_chair.glb',
                title: 'Accent Armchair Inspection',
              });
            }}
            className="transition-colors whitespace-nowrap shrink-0 hover:text-stone-100 text-stone-400"
          >
            3D Inspector
          </button>
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="transition-colors whitespace-nowrap shrink-0 hover:text-stone-100 text-stone-400"
          >
            Settings
          </button>
          {user && (
            <button
              onClick={() => setIsSavedDesignsOpen(true)}
              className="transition-colors whitespace-nowrap shrink-0 hover:text-stone-100 text-stone-400 flex items-center gap-1"
            >
              <Layers className="w-3.5 h-3.5 text-amber-400" />
              <span>Saved</span>
            </button>
          )}
        </nav>

        {/* Zone 3: User Authentication & Primary Action */}
        <div className="flex items-center gap-3 shrink-0">
          <UserMenu
            onOpenAuth={(tab) => {
              setAuthDefaultTab(tab || 'login');
              setIsAuthOpen(true);
            }}
            onOpenSavedDesigns={() => setIsSavedDesignsOpen(true)}
          />
          <button
            onClick={handleClearHistory}
            title="Start new concept session"
            className="hidden sm:inline-block px-3.5 py-1.5 text-xs font-medium text-stone-300 bg-stone-900 border border-stone-800 rounded-xl hover:text-stone-100 hover:bg-stone-800 transition-colors whitespace-nowrap shrink-0 shadow-sm"
          >
            New Session
          </button>
        </div>
      </header>

      {/* Main Layout Container */}
      <main className="flex-1 flex overflow-hidden max-w-[1600px] w-full mx-auto">
        {/* Left Side: Curated Architectural Gallery & Router Overview */}
        <aside
          className={`w-80 border-r border-stone-800/80 bg-stone-900/40 hidden lg:flex flex-col shrink-0 ${
            activeTab === 'presets' ? 'lg:flex' : ''
          }`}
        >
          <div className="p-4 border-b border-stone-800/80 flex items-center justify-between">
            <div>
              <h2 className="text-xs font-bold text-stone-200 uppercase tracking-wider">
                Inspiration Gallery
              </h2>
              <p className="text-[11px] text-stone-500">2D Room Scenes & 3D Assets</p>
            </div>
            <span className="text-[11px] font-mono text-amber-500/90 font-medium">
              {PRESET_PROMPTS.length} Curated
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {PRESET_PROMPTS.map((preset) => (
              <div
                key={preset.id}
                onClick={() => handleSelectPreset(preset)}
                className="group relative p-3 rounded-2xl border border-stone-800 bg-stone-900/60 hover:bg-stone-800/80 hover:border-amber-500/40 transition-all cursor-pointer shadow-sm"
              >
                <div className="flex items-start justify-between mb-1.5">
                  <span className="text-xs font-semibold text-stone-200 group-hover:text-amber-300 transition-colors">
                    {preset.title}
                  </span>
                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                      preset.type === '3D'
                        ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                        : 'bg-stone-800 border-stone-700 text-stone-300'
                    }`}
                  >
                    {preset.type === '3D' ? '3D Asset' : '2D Scene'}
                  </span>
                </div>
                <p className="text-[11px] text-stone-400 leading-relaxed line-clamp-2 mb-2 font-normal">
                  {preset.prompt}
                </p>
                <div className="flex items-center justify-between text-[10px] text-stone-500 pt-1 border-t border-stone-800/50">
                  <span>{preset.category}</span>
                  <span className="text-amber-400 group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                    Render <ArrowRight className="w-2.5 h-2.5" />
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Router Strategy Card */}
          <div className="p-4 border-t border-stone-800/80 bg-stone-950/60 text-xs">
            <div className="flex items-center gap-2 text-stone-300 font-semibold mb-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Intent Router Logic</span>
            </div>
            <p className="text-[11px] text-stone-500 leading-relaxed">
              Mentions of rooms, layouts, or views route to <strong className="text-stone-400">ModelsLab 2D</strong>. Mentions of 3D, models, or single items route to <strong className="text-amber-400">Meshy 3D</strong>.
            </p>
          </div>
        </aside>

        {/* Center / Main: Interactive Chat Canvas */}
        <section className="flex-1 flex flex-col min-w-0 bg-stone-950">
          {/* Scrollable Conversation Stream */}
          <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-6 space-y-6">
            {messages.map((message) => {
              const isUser = message.role === 'user';

              return (
                <div
                  key={message.id}
                  className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} max-w-4xl mx-auto w-full`}
                >
                  {/* Sender Header / Badge */}
                  <div className="flex items-center gap-2 mb-1.5 px-1 text-xs text-stone-500">
                    <span className="font-medium text-stone-400">
                      {isUser ? 'You' : 'Atelier Studio'}
                    </span>
                    <span>·</span>
                    <span>{message.timestamp}</span>

                    {/* Metadata Intent Tag */}
                    {message.intent && (
                      <>
                        <span>·</span>
                        <span
                          className={`text-[10px] uppercase font-mono font-medium ${
                            message.intent === 'GENERATE_3D' ? 'text-amber-400' : 'text-stone-400'
                          }`}
                        >
                          {message.intent === 'GENERATE_3D' ? '3D Furniture Mesh' : '2D Conceptual Scene'}
                        </span>
                      </>
                    )}
                  </div>

                  {/* Message Bubble Content */}
                  <div
                    className={`rounded-2xl ${
                      isUser
                        ? 'bg-amber-600/15 border border-amber-500/30 text-stone-100 px-5 py-3.5 max-w-xl text-sm leading-relaxed'
                        : 'w-full space-y-3'
                    }`}
                  >
                    {/* User Text */}
                    {isUser && <p>{message.content}</p>}

                    {/* Assistant Text */}
                    {!isUser && message.content && (
                      <p className="text-sm text-stone-300 leading-relaxed max-w-2xl px-1">
                        {message.content}
                      </p>
                    )}

                    {/* Assistant Status Ticker (when pending) */}
                    {!isUser && message.status === 'pending' && (
                      <div className="w-full max-w-2xl">
                        <GenerationStatusTicker
                          intent={message.intent || 'GENERATE_2D'}
                          stage={message.stage}
                          progress={message.progress}
                          prompt={message.content}
                        />
                      </div>
                    )}

                    {/* Render 2D Scene Payload */}
                    {!isUser &&
                      message.type === 'image2d' &&
                      message.status !== 'pending' &&
                      message.mediaUrl && (
                        <div className="w-full max-w-2xl">
                          <SceneImageViewer
                            url={message.mediaUrl}
                            prompt={message.content}
                            styleName={message.styleName}
                            source={message.source}
                            onOpenLightbox={(url, prompt, styleName) =>
                              setLightboxData({ isOpen: true, url, prompt, title: styleName })
                            }
                            onOpenDollhouseStudio={() => setIsDollhouseOpen(true)}
                            onOpenAuth={(tab) => {
                              setAuthDefaultTab(tab || 'login');
                              setIsAuthOpen(true);
                            }}
                          />
                        </div>
                      )}

                    {/* Render 3D Model-Viewer Payload */}
                    {!isUser &&
                      message.type === '3d' &&
                      message.status !== 'pending' &&
                      message.mediaUrl && (
                        <div className="w-full max-w-2xl">
                          <ModelViewerContainer
                            src={message.mediaUrl}
                            title={message.objectName || '3D Furniture Asset'}
                            dimensions={message.dimensions}
                            height="340px"
                            onExpandFullscreen={(src, title) =>
                              setStudio3DData({ isOpen: true, url: src, title })
                            }
                          />
                        </div>
                      )}

                    {/* Error State */}
                    {!isUser && message.status === 'failed' && (
                      <div className="p-4 rounded-xl bg-red-950/40 border border-red-800/60 text-xs text-red-300 max-w-2xl">
                        <p>{message.content}</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            <div ref={chatEndRef} />
          </div>

          {/* Bottom Input Area */}
          <div className="border-t border-stone-800/80 bg-stone-950/95 backdrop-blur-md p-4 sm:p-5">
            <div className="max-w-4xl mx-auto space-y-3">
              {/* Live Intent Routing Indicator & Quick Presets Strip */}
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                {/* Real-time Intent Prediction & Hindi Detection */}
                <div className="flex items-center gap-2 text-stone-400">
                  <span className="text-stone-500">Intent:</span>
                  <div
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-medium transition-all ${
                      liveIntent.intent === 'GENERATE_3D'
                        ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                        : 'bg-stone-800 border-stone-700 text-stone-200'
                    }`}
                  >
                    {liveIntent.intent === 'GENERATE_3D' ? (
                      <Box className="w-3.5 h-3.5 text-amber-400" />
                    ) : (
                      <Compass className="w-3.5 h-3.5 text-stone-300" />
                    )}
                    <span>
                      {liveIntent.intent === 'GENERATE_3D'
                        ? '3D Furniture Mesh (Meshy v2)'
                        : '2D Room Layout (ModelsLab v6)'}
                    </span>
                  </div>

                  {/* Hindi Input Detection Indicator */}
                  {(isDevanagari(inputPrompt) || isHinglish(inputPrompt)) && (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[11px] font-medium animate-fade-in">
                      <span>🇮🇳</span>
                      <span>Hindi detected · Auto-translates to English</span>
                    </div>
                  )}
                </div>

                {/* Right Controls: Prompt Generator & Manual Override */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsPromptGenOpen(true)}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 hover:bg-amber-500/25 transition-colors font-medium text-[11px]"
                    title="Open AI Prompt Generator (Supports Hindi & English)"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>Prompt Generator</span>
                  </button>

                  <div className="flex items-center gap-1 p-0.5 rounded-xl bg-stone-900 border border-stone-800 text-[11px]">
                  <button
                    onClick={() => handleSaveSettings({ ...settings, routingMode: 'auto' })}
                    className={`px-2.5 py-1 rounded-lg transition-colors font-medium ${
                      settings.routingMode === 'auto'
                        ? 'bg-stone-800 text-amber-400'
                        : 'text-stone-400 hover:text-stone-200'
                    }`}
                  >
                    Auto
                  </button>
                  <button
                    onClick={() => handleSaveSettings({ ...settings, routingMode: 'force_2d' })}
                    className={`px-2.5 py-1 rounded-lg transition-colors font-medium ${
                      settings.routingMode === 'force_2d'
                        ? 'bg-stone-800 text-stone-100'
                        : 'text-stone-400 hover:text-stone-200'
                    }`}
                  >
                    Force 2D
                  </button>
                  <button
                    onClick={() => handleSaveSettings({ ...settings, routingMode: 'force_3d' })}
                    className={`px-2.5 py-1 rounded-lg transition-colors font-medium ${
                      settings.routingMode === 'force_3d'
                        ? 'bg-stone-800 text-amber-400'
                        : 'text-stone-400 hover:text-stone-200'
                    }`}
                  >
                    Force 3D
                  </button>
                </div>
              </div>
            </div>

              {/* Main Input Field Form */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="relative flex items-center"
              >
                <input
                  type="text"
                  value={inputPrompt}
                  onChange={(e) => setInputPrompt(e.target.value)}
                  placeholder="e.g. 'Japandi living room with fluted oak wall' or 'art-deco emerald velvet armchair'..."
                  disabled={isSubmitting}
                  className="w-full pl-4 pr-24 py-3.5 rounded-2xl bg-stone-900 border border-stone-800 text-sm text-stone-100 placeholder-stone-500 focus:outline-none focus:border-amber-500/70 focus:ring-1 focus:ring-amber-500/50 transition-all shadow-inner disabled:opacity-50"
                />

                <div className="absolute right-2 flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setIsPromptGenOpen(true)}
                    title="Open AI Prompt Generator (Supports Hindi & English)"
                    className="p-2 text-stone-400 hover:text-amber-400 hover:bg-stone-800 rounded-xl transition-colors"
                  >
                    <Sparkles className="w-4 h-4" />
                  </button>
                  <button
                    type="submit"
                    disabled={!inputPrompt.trim() || isSubmitting}
                    className="p-2.5 rounded-xl bg-amber-500 text-stone-950 hover:bg-amber-400 disabled:opacity-40 disabled:hover:bg-amber-500 transition-colors shadow-sm"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </form>

              {/* 3D Home Layout Design Examples */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 text-[11px] text-stone-400 scrollbar-none">
                <span className="text-amber-400/90 font-medium shrink-0 flex items-center gap-1">
                  <Compass className="w-3.5 h-3.5 text-amber-400" />
                  3D Home Layouts:
                </span>
                {[
                  {
                    label: '3D Isometric Apartment Cutaway',
                    prompt:
                      'Photorealistic 3D isometric cutaway dollhouse view of a modern small luxury apartment, top-down angled view, no roof with rectangular floor plan, light wood flooring, dark blue-grey walls, living room, kitchen, bedroom, and balcony',
                  },
                  {
                    label: '3D Modern Villa Floor Plan',
                    prompt:
                      'Photorealistic 3D architectural cutaway home layout of a contemporary luxury villa with open-plan living room, central courtyard garden, minimalist kitchen, and warm evening illumination',
                  },
                  {
                    label: '3D Japandi Studio Home',
                    prompt:
                      'Photorealistic 3D top-down isometric cutaway layout of a minimalist Japandi studio home with fluted oak wall paneling, tatami lounge nook, concealed modular kitchen, and light herringbone floors',
                  },
                  {
                    label: '3D Duplex Penthouse Cutaway',
                    prompt:
                      'Photorealistic 3D cutaway dollhouse view of a modern luxury duplex penthouse home with double-height ceiling living room, floating staircase, mezzanine bedroom, and panoramic glass terrace',
                  },
                  {
                    label: '3D Scandinavian Family Home',
                    prompt:
                      'Architectural 3D floor plan layout of a modern Scandinavian family home with master bedroom suite, natural birch woodwork, open dining area, illuminated arched alcove, and cozy fireplace',
                  },
                  {
                    label: '3D Industrial Loft Home',
                    prompt:
                      'Photorealistic 3D isometric cutaway home layout of an open-concept industrial brick and concrete loft with exposed steel beams, mezzanine workspace, and modern culinary island',
                  },
                  {
                    label: '3D Indian Compact Home',
                    prompt:
                      'Photorealistic 3D isometric cutaway dollhouse view of a clean, modern Indian compact home design with rectangular floor plan, light wood flooring, living room with white L-shaped sofa, dining area, modular kitchen, and narrow balcony',
                  },
                ].map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setInputPrompt(item.prompt);
                      handleSendMessage(item.prompt, '2D');
                    }}
                    className="whitespace-nowrap shrink-0 px-2.5 py-1 rounded-lg bg-stone-900 border border-stone-800/80 hover:border-amber-500/50 hover:text-stone-200 transition-colors"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Lightbox Modal for 2D Scene Examination */}
      <LightboxModal
        isOpen={lightboxData.isOpen}
        onClose={() => setLightboxData({ ...lightboxData, isOpen: false })}
        imageUrl={lightboxData.url}
        prompt={lightboxData.prompt}
        title={lightboxData.title}
      />

      {/* 3D Studio Modal for Full-Screen Orbital Model Inspection */}
      <Model3DStudioModal
        isOpen={studio3DData.isOpen}
        onClose={() => setStudio3DData({ ...studio3DData, isOpen: false })}
        modelUrl={studio3DData.url}
        title={studio3DData.title}
      />

      {/* AI Prompt Generator Modal (Supports Hindi & English) */}
      <PromptGeneratorModal
        isOpen={isPromptGenOpen}
        onClose={() => setIsPromptGenOpen(false)}
        onApplyPrompt={(prompt, type) => {
          setInputPrompt(prompt);
          handleSendMessage(prompt, type);
        }}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSaveSettings={handleSaveSettings}
      />

      {/* Interactive 3D Dollhouse Architecture Studio Modal */}
      <DollhouseModal
        isOpen={isDollhouseOpen}
        onClose={() => setIsDollhouseOpen(false)}
      />

      {/* User Login & Signup Authentication Modal */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        defaultTab={authDefaultTab}
      />

      {/* User Portfolio Saved Designs Modal (Firestore) */}
      <SavedDesignsModal
        isOpen={isSavedDesignsOpen}
        onClose={() => setIsSavedDesignsOpen(false)}
        onSelectDesign={(design) => {
          handleSendMessage(design.prompt, design.type);
        }}
      />
    </div>
  );
}
