import React, { useState } from 'react';
import {
  X,
  Sparkles,
  Languages,
  ArrowRight,
  Copy,
  Check,
  Send,
  Wand2,
  Compass,
  Box,
  RefreshCw,
} from 'lucide-react';

interface PromptGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyPrompt: (enhancedPrompt: string, targetType?: '2D' | '3D') => void;
}

export const PromptGeneratorModal: React.FC<PromptGeneratorModalProps> = ({
  isOpen,
  onClose,
  onApplyPrompt,
}) => {
  const [userInput, setUserInput] = useState('');
  const [targetType, setTargetType] = useState<'auto' | '2D' | '3D'>('auto');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  const [generatedData, setGeneratedData] = useState<{
    originalPrompt: string;
    detectedLanguage: string;
    englishTranslation: string;
    enhancedPrompt: string;
    intent: 'GENERATE_2D' | 'GENERATE_3D';
    variations: string[];
    source?: string;
  } | null>(null);

  if (!isOpen) return null;

  const handleGenerate = async (textToUse?: string) => {
    const text = (textToUse || userInput).trim();
    if (!text) return;

    setIsGenerating(true);
    try {
      const res = await fetch('/api/chat/enhance-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: text, targetType }),
      });

      if (!res.ok) throw new Error('Failed to generate enhanced prompt');
      const data = await res.json();
      setGeneratedData(data);
    } catch (err: any) {
      console.error('Prompt generation failed:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  const handleUsePrompt = (prompt: string, intent: 'GENERATE_2D' | 'GENERATE_3D') => {
    onApplyPrompt(prompt, intent === 'GENERATE_3D' ? '3D' : '2D');
    onClose();
  };

  const HINDI_PRESETS = [
    {
      label: 'लक्जरी अपार्टमेंट कटअवे',
      full: 'एक आधुनिक लक्जरी अपार्टमेंट का 3D आइसोमेट्रिक कटअवे डॉलहाउस व्यू जिसमें लिविंग रूम, बेडरूम, और किचन हो',
      type: '2D' as const,
    },
    {
      label: 'जापानी ओक लिविंग रूम',
      full: 'जापानी मिनिमलिस्ट लिविंग रूम जिसमें ओक की दीवार और वार्म एंबियंट लाइटिंग हो',
      type: '2D' as const,
    },
    {
      label: 'वेलवेट लाउंज कुर्सी (3D)',
      full: 'एमराल्ड ग्रीन वेलवेट अपहोल्स्ट्री और ब्रास लेग्स वाली आधुनिक लाउंज कुर्सी',
      type: '3D' as const,
    },
    {
      label: 'इंडस्ट्रियल किचन आइलैंड',
      full: 'कंक्रीट वाटरफॉल आइलैंड और ब्लैक कैबिनेट्स वाली आधुनिक इंडस्ट्रियल किचन',
      type: '2D' as const,
    },
    {
      label: 'लेदर लाउंज सोफा (3D)',
      full: 'कॉग्नेक लेदर अपहोल्स्ट्री और सॉलिड ओक फ्रेम वाला मिड-सेंचुरी लाउंज सोफा',
      type: '3D' as const,
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/80 backdrop-blur-sm p-4 animate-fade-in">
      <div className="relative w-full max-w-2xl flex flex-col rounded-3xl border border-stone-800 bg-stone-900 shadow-2xl overflow-hidden max-h-[88vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-800 bg-stone-950/80">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Wand2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-stone-100 flex items-center gap-2">
                <span>AI Prompt Generator</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400">
                  हिंदी & English
                </span>
              </h3>
              <p className="text-xs text-stone-400">
                Write in Hindi, Hinglish, or rough notes — generates ultra-realistic architectural prompts
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-stone-400 hover:text-stone-100 hover:bg-stone-800 rounded-xl transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* Quick presets strip */}
          <div>
            <div className="flex items-center justify-between text-xs text-stone-400 mb-2">
              <span className="flex items-center gap-1 text-stone-300 font-medium">
                <Languages className="w-3.5 h-3.5 text-amber-400" />
                हिंदी सैंपल (Hindi Quick Samples):
              </span>
              <span className="text-[11px] text-stone-500">Auto-translates & enhances</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {HINDI_PRESETS.map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setUserInput(p.full);
                    setTargetType(p.type);
                    handleGenerate(p.full);
                  }}
                  className="px-2.5 py-1 text-xs rounded-xl bg-stone-950 border border-stone-800 hover:border-amber-500/50 hover:text-stone-100 transition-colors text-stone-300 text-left"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* User Input Area */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-stone-200">
                Describe your design idea or concept:
              </label>
              <div className="flex items-center gap-1 text-[11px]">
                <button
                  type="button"
                  onClick={() => setTargetType('auto')}
                  className={`px-2 py-0.5 rounded-lg border transition-colors ${
                    targetType === 'auto'
                      ? 'bg-amber-500/20 border-amber-500/40 text-amber-300 font-medium'
                      : 'border-stone-800 text-stone-400'
                  }`}
                >
                  Auto
                </button>
                <button
                  type="button"
                  onClick={() => setTargetType('2D')}
                  className={`px-2 py-0.5 rounded-lg border transition-colors ${
                    targetType === '2D'
                      ? 'bg-stone-800 border-stone-700 text-stone-100 font-medium'
                      : 'border-stone-800 text-stone-400'
                  }`}
                >
                  2D Room Layout
                </button>
                <button
                  type="button"
                  onClick={() => setTargetType('3D')}
                  className={`px-2 py-0.5 rounded-lg border transition-colors ${
                    targetType === '3D'
                      ? 'bg-amber-500/20 border-amber-500/40 text-amber-300 font-medium'
                      : 'border-stone-800 text-stone-400'
                  }`}
                >
                  3D Furniture Mesh
                </button>
              </div>
            </div>

            <div className="relative">
              <textarea
                rows={3}
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                placeholder="उदा. 'एक खूबसूरत जापानी लिविंग रूम जिसमें ओक की लकड़ी और सफेद सोफा हो' or 'velvet armchair with curved back'..."
                className="w-full px-4 py-3 rounded-2xl bg-stone-950 border border-stone-800 text-sm text-stone-100 placeholder-stone-500 focus:outline-none focus:border-amber-500/70 focus:ring-1 focus:ring-amber-500/50 resize-none transition-all"
              />
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-stone-500">
                Supports Hindi (Devanagari), Hinglish, or English
              </span>
              <button
                type="button"
                disabled={!userInput.trim() || isGenerating}
                onClick={() => handleGenerate()}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-stone-950 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 rounded-xl transition-colors shadow-sm"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Generating Prompt...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Generate Enhanced Prompt</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Results Area */}
          {generatedData && (
            <div className="space-y-4 pt-3 border-t border-stone-800 animate-fade-in">
              {/* Language & Translation Banner */}
              <div className="p-3 rounded-2xl bg-stone-950 border border-stone-800 flex items-start justify-between gap-3 text-xs">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-medium">
                      {generatedData.detectedLanguage}
                    </span>
                    <span className="text-stone-500">→</span>
                    <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 font-medium">
                      {generatedData.intent === 'GENERATE_3D' ? '3D Furniture Mesh' : '2D Conceptual Scene'}
                    </span>
                  </div>
                  <p className="text-stone-300 font-medium">
                    <span className="text-stone-500 font-normal">English Translation: </span>
                    "{generatedData.englishTranslation}"
                  </p>
                </div>
              </div>

              {/* Primary Recommended Prompt Card */}
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    Recommended Architectural Prompt
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleCopy(generatedData.enhancedPrompt, 0)}
                      className="p-1.5 text-stone-400 hover:text-stone-100 hover:bg-stone-800/80 rounded-lg transition-colors"
                      title="Copy prompt"
                    >
                      {copiedIdx === 0 ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        handleUsePrompt(generatedData.enhancedPrompt, generatedData.intent)
                      }
                      className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-stone-950 bg-amber-500 hover:bg-amber-400 rounded-xl transition-colors shadow-sm"
                    >
                      <span>Render in Studio</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                <p className="text-xs text-stone-200 leading-relaxed font-normal bg-stone-950/60 p-3 rounded-xl border border-stone-800/60 font-mono">
                  {generatedData.enhancedPrompt}
                </p>
              </div>

              {/* Variations */}
              {generatedData.variations && generatedData.variations.length > 0 && (
                <div className="space-y-2">
                  <span className="text-xs font-semibold text-stone-400">
                    Alternative Variations:
                  </span>
                  <div className="space-y-2">
                    {generatedData.variations.map((v, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-xl bg-stone-950 border border-stone-800 hover:border-stone-700 transition-colors flex items-start justify-between gap-3 text-xs"
                      >
                        <p className="text-stone-300 leading-relaxed flex-1 line-clamp-2">
                          {v}
                        </p>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleCopy(v, idx + 1)}
                            className="p-1.5 text-stone-400 hover:text-stone-100 rounded-lg transition-colors"
                            title="Copy variation"
                          >
                            {copiedIdx === idx + 1 ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleUsePrompt(v, generatedData.intent)}
                            className="px-2 py-1 text-[11px] font-medium text-amber-400 hover:text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded-lg transition-colors"
                          >
                            Use
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
