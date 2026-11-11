import React, { useEffect, useState } from 'react';
import {
  X,
  Layers,
  Trash2,
  Box,
  Image as ImageIcon,
  ExternalLink,
  Sparkles,
  Calendar,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { fetchUserDesigns, deleteDesignFromFirestore, UserDesignRecord } from '../services/firebase';

interface SavedDesignsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectDesign?: (design: UserDesignRecord) => void;
}

export const SavedDesignsModal: React.FC<SavedDesignsModalProps> = ({
  isOpen,
  onClose,
  onSelectDesign,
}) => {
  const { user, userProfile } = useAuth();
  const [designs, setDesigns] = useState<UserDesignRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && user) {
      setErrorMessage(null);
      loadDesigns();
    }
  }, [isOpen, user]);

  const loadDesigns = async () => {
    if (!user) return;
    setLoading(true);
    setErrorMessage(null);
    try {
      const list = await fetchUserDesigns(user.uid);
      setDesigns(list);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to load saved designs.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent, designId: string) => {
    e.stopPropagation();
    if (!user) return;
    try {
      await deleteDesignFromFirestore(user.uid, designId);
      setDesigns((prev) => prev.filter((d) => d.id !== designId));
    } catch (err: any) {
      console.warn('Failed to delete design:', err);
      setErrorMessage(err.message || 'Failed to delete design. Please try again.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/85 backdrop-blur-md p-4 animate-fade-in">
      <div className="relative w-full max-w-3xl max-h-[85vh] rounded-3xl border border-stone-800 bg-stone-900 shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-800/80 bg-stone-950/80">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-stone-100 font-display">
                Saved Designs ({designs.length})
              </h3>
              <p className="text-xs text-stone-400">
                Private collection for {userProfile?.displayName || user?.email}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-100 hover:bg-stone-800 rounded-xl transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content list */}
        <div className="flex-1 overflow-y-auto p-6">
          {errorMessage && (
            <div className="mb-4 p-3 rounded-xl bg-rose-950/40 border border-rose-800/60 text-xs text-rose-300">
              {errorMessage}
            </div>
          )}
          {loading ? (
            <div className="py-16 text-center text-stone-400">
              <div className="w-8 h-8 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin mx-auto mb-3" />
              <p className="text-xs">Loading your saved studio concepts from Firestore...</p>
            </div>
          ) : designs.length === 0 ? (
            <div className="py-16 text-center text-stone-400 max-w-sm mx-auto">
              <div className="w-12 h-12 rounded-2xl bg-stone-800/60 border border-stone-700/60 flex items-center justify-center mx-auto mb-3 text-stone-500">
                <Box className="w-6 h-6 text-amber-500/50" />
              </div>
              <h4 className="text-sm font-semibold text-stone-200 mb-1">No saved designs yet</h4>
              <p className="text-xs text-stone-500 leading-relaxed mb-4">
                Generate an interior design layout or 3D furniture mesh in the studio to save it to your private portfolio.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {designs.map((design) => (
                <div
                  key={design.id}
                  onClick={() => {
                    if (onSelectDesign) {
                      onSelectDesign(design);
                      onClose();
                    }
                  }}
                  className="group relative rounded-2xl border border-stone-800 bg-stone-950/80 hover:border-amber-500/50 p-3.5 transition-all cursor-pointer shadow-lg hover:shadow-amber-500/5 flex flex-col justify-between"
                >
                  <div>
                    {/* Media Thumbnail or Icon */}
                    <div className="relative w-full h-36 rounded-xl overflow-hidden bg-stone-900 border border-stone-800/80 mb-3 flex items-center justify-center">
                      {design.type === '2D' ? (
                        <img
                          src={design.mediaUrl}
                          alt={design.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center text-stone-400 gap-1.5">
                          <Box className="w-10 h-10 text-amber-400" />
                          <span className="text-[10px] uppercase font-mono text-stone-400">
                            3D GLB Model
                          </span>
                        </div>
                      )}

                      {/* Type Badge */}
                      <div className="absolute top-2 left-2 px-2 py-0.5 rounded-lg bg-stone-950/80 backdrop-blur-md border border-stone-700/70 text-[10px] font-mono text-amber-300 font-semibold flex items-center gap-1">
                        {design.type === '2D' ? <ImageIcon className="w-3 h-3" /> : <Box className="w-3 h-3" />}
                        <span>{design.type} Asset</span>
                      </div>

                      {/* Delete button */}
                      <button
                        onClick={(e) => handleDelete(e, design.id)}
                        className="absolute top-2 right-2 p-1.5 rounded-lg bg-stone-950/80 backdrop-blur-md border border-stone-700/70 text-stone-400 hover:text-red-400 hover:border-red-500/50 transition-colors opacity-80 group-hover:opacity-100"
                        title="Delete saved design"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <h4 className="text-xs font-semibold text-stone-200 group-hover:text-amber-300 transition-colors line-clamp-1 mb-1">
                      {design.title || 'Untitled Architectural Concept'}
                    </h4>
                    <p className="text-[11px] text-stone-400 line-clamp-2 leading-relaxed">
                      {design.prompt}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-2.5 mt-2.5 border-t border-stone-800/60 text-[10px] text-stone-500">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(design.createdAt).toLocaleDateString()}
                    </span>
                    <span className="text-amber-400 font-medium group-hover:underline flex items-center gap-1">
                      Load in Studio <ExternalLink className="w-2.5 h-2.5" />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
