import React, { useState, useRef, useEffect } from 'react';
import {
  User as UserIcon,
  LogOut,
  Sparkles,
  ChevronDown,
  Layers,
  Shield,
  Compass,
  Check,
  Users,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface UserMenuProps {
  onOpenAuth: (defaultTab?: 'login' | 'signup') => void;
  onOpenSavedDesigns?: () => void;
}

export const UserMenu: React.FC<UserMenuProps> = ({
  onOpenAuth,
  onOpenSavedDesigns,
}) => {
  const { user, userProfile, isGuest, logout, login } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!user) {
    return (
      <div className="flex items-center gap-2">
        <button
          onClick={() => onOpenAuth('login')}
          className="px-3 py-1.5 text-xs font-medium text-stone-300 hover:text-stone-100 hover:bg-stone-800/80 rounded-xl transition-colors"
        >
          Sign In
        </button>
        <button
          onClick={() => onOpenAuth('signup')}
          className="px-3 py-1.5 text-xs font-semibold text-stone-950 bg-amber-500 hover:bg-amber-400 rounded-xl transition-all shadow-sm flex items-center gap-1.5"
        >
          <Sparkles className="w-3 h-3 text-stone-950" />
          <span>Sign Up</span>
        </button>
      </div>
    );
  }

  const displayName = userProfile?.displayName || user.displayName || user.email?.split('@')[0] || 'Designer';
  const role = userProfile?.role || (isGuest ? 'Studio Guest' : 'Interior Designer');
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setDropdownOpen(!dropdownOpen)}
        className="flex items-center gap-2 p-1.5 pr-2.5 rounded-xl border border-stone-800 bg-stone-900/90 hover:bg-stone-800 hover:border-amber-500/40 text-stone-200 text-xs transition-all"
      >
        {/* Avatar Circle */}
        <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-amber-600 to-amber-400 text-stone-950 font-bold flex items-center justify-center text-xs shadow-sm">
          {initial}
        </div>

        {/* Name and Role text */}
        <div className="hidden sm:flex flex-col text-left leading-tight max-w-[120px]">
          <span className="font-semibold text-stone-100 truncate">{displayName}</span>
          <span className="text-[10px] text-amber-400/90 truncate">{role}</span>
        </div>

        <ChevronDown className="w-3.5 h-3.5 text-stone-500" />
      </button>

      {/* User Dropdown */}
      {dropdownOpen && (
        <div className="absolute right-0 mt-2 w-64 rounded-2xl border border-stone-800 bg-stone-900/95 backdrop-blur-xl shadow-2xl z-50 overflow-hidden animate-fade-in p-1.5">
          {/* User Profile Card */}
          <div className="p-3 bg-stone-950/80 rounded-xl border border-stone-800/80 mb-1">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-500 text-stone-950 font-bold flex items-center justify-center text-sm shadow">
                {initial}
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-xs text-stone-100 truncate">
                  {displayName}
                </div>
                <div className="text-[11px] text-stone-400 truncate">{user.email}</div>
                <span className="inline-block mt-1 text-[9px] bg-amber-500/20 text-amber-300 font-mono px-2 py-0.5 rounded-full border border-amber-500/30 font-medium">
                  {role}
                </span>
              </div>
            </div>
          </div>

          {/* Action Links */}
          <div className="space-y-0.5 text-xs">
            {onOpenSavedDesigns && (
              <button
                onClick={() => {
                  setDropdownOpen(false);
                  onOpenSavedDesigns();
                }}
                className="w-full text-left px-3 py-2 rounded-lg text-stone-300 hover:text-stone-100 hover:bg-stone-800 flex items-center gap-2 transition-colors"
              >
                <Layers className="w-3.5 h-3.5 text-amber-400" />
                <span>My Saved Designs</span>
              </button>
            )}

            <button
              onClick={() => {
                setDropdownOpen(false);
                onOpenAuth('login');
              }}
              className="w-full text-left px-3 py-2 rounded-lg text-stone-300 hover:text-stone-100 hover:bg-stone-800 flex items-center gap-2 transition-colors"
            >
              <Users className="w-3.5 h-3.5 text-blue-400" />
              <span>Switch Different User</span>
            </button>
          </div>

          <div className="my-1 border-t border-stone-800" />

          {/* Sign Out */}
          <button
            onClick={async () => {
              setDropdownOpen(false);
              await logout();
            }}
            className="w-full text-left px-3 py-2 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-950/40 flex items-center gap-2 text-xs transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      )}
    </div>
  );
};
