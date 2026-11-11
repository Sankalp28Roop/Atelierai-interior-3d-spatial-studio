import React, { useState } from 'react';
import { X, Key, Sliders, ShieldCheck, ExternalLink, Save, Check } from 'lucide-react';
import { StudioSettings } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: StudioSettings;
  onSaveSettings: (newSettings: StudioSettings) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
}) => {
  const [localSettings, setLocalSettings] = useState<StudioSettings>(settings);
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSave = () => {
    onSaveSettings(localSettings);
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/80 backdrop-blur-sm p-4 animate-fade-in">
      <div className="relative w-full max-w-xl flex flex-col rounded-3xl border border-stone-800 bg-stone-900 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-800 bg-stone-950/80">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-stone-100">Studio & API Settings</h3>
              <p className="text-xs text-stone-400">Configure ModelsLab v6 & Meshy v2 Integrations</p>
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
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Resilient fallback note */}
          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
            <div>
              <p className="font-medium text-amber-200">Zero-Config Studio Engine Active</p>
              <p className="text-stone-400 mt-0.5 leading-relaxed">
                You can use AtelierAI immediately without keys! Built-in architectural rendering and real-time quad GLB furniture models are provided. Adding your personal keys below routes calls to your own live API quotas.
              </p>
            </div>
          </div>

          {/* ModelsLab Interior API Key */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-stone-200 flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-stone-400" />
                ModelsLab API Key (2D Interior Scenes)
              </label>
              <a
                href="https://modelslab.com"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-amber-400 hover:text-amber-300 flex items-center gap-0.5"
              >
                Get API Key <ExternalLink className="w-2.5 h-2.5" />
              </a>
            </div>
            <input
              type="password"
              placeholder="e.g. ml_live_..."
              value={localSettings.modelsLabKey}
              onChange={(e) =>
                setLocalSettings({ ...localSettings, modelsLabKey: e.target.value.trim() })
              }
              className="w-full px-3.5 py-2.5 rounded-xl bg-stone-950 border border-stone-800 text-xs text-stone-200 focus:outline-none focus:border-amber-500/70"
            />
            <p className="text-[11px] text-stone-500 mt-1">
              Used for <code className="text-stone-400">POST https://modelslab.com/api/v6/interior/make</code>
            </p>
          </div>

          {/* Meshy AI API Key */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-stone-200 flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-stone-400" />
                Meshy AI API Key (3D Furniture Models)
              </label>
              <a
                href="https://meshy.ai"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-amber-400 hover:text-amber-300 flex items-center gap-0.5"
              >
                Get API Key <ExternalLink className="w-2.5 h-2.5" />
              </a>
            </div>
            <input
              type="password"
              placeholder="e.g. msy_..."
              value={localSettings.meshyKey}
              onChange={(e) =>
                setLocalSettings({ ...localSettings, meshyKey: e.target.value.trim() })
              }
              className="w-full px-3.5 py-2.5 rounded-xl bg-stone-950 border border-stone-800 text-xs text-stone-200 focus:outline-none focus:border-amber-500/70"
            />
            <p className="text-[11px] text-stone-500 mt-1">
              Powers real-time 3D text-to-3d and high-fidelity 2D-to-3D mesh conversions
            </p>
          </div>

          {/* Default Negative Prompt */}
          <div>
            <label className="text-xs font-semibold text-stone-200 block mb-1.5">
              Default 2D Negative Prompt
            </label>
            <textarea
              rows={2}
              value={localSettings.defaultNegativePrompt}
              onChange={(e) =>
                setLocalSettings({ ...localSettings, defaultNegativePrompt: e.target.value })
              }
              className="w-full px-3.5 py-2.5 rounded-xl bg-stone-950 border border-stone-800 text-xs text-stone-300 focus:outline-none focus:border-amber-500/70 resize-none"
            />
          </div>

          {/* Routing Mode Preference */}
          <div>
            <label className="text-xs font-semibold text-stone-200 block mb-1.5">
              Default Prompt Routing Strategy
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'auto', label: 'Intelligent Auto' },
                { id: 'force_2d', label: 'Force 2D Scene' },
                { id: 'force_3d', label: 'Force 3D Asset' },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() =>
                    setLocalSettings({ ...localSettings, routingMode: opt.id as any })
                  }
                  className={`px-3 py-2 text-xs font-medium rounded-xl border transition-all text-center ${
                    localSettings.routingMode === opt.id
                      ? 'bg-amber-500/15 border-amber-500 text-amber-300'
                      : 'bg-stone-950 border-stone-800 text-stone-400 hover:text-stone-200'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-stone-800 bg-stone-950/80">
          <span className="text-xs text-stone-500">Settings saved locally in browser</span>
          <button
            onClick={handleSave}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-stone-900 bg-amber-500 hover:bg-amber-400 rounded-xl transition-colors shadow-sm"
          >
            {savedSuccess ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Saved!</span>
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" />
                <span>Save Settings</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
