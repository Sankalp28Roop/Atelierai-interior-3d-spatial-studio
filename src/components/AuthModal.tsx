import React, { useState } from 'react';
import {
  X,
  Mail,
  Lock,
  User as UserIcon,
  Briefcase,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'login' | 'signup';
}

const PRESET_USER_PERSONAS = [
  {
    name: 'Swaroop Sankalp',
    email: 'swaroopsankalp28@gmail.com',
    role: 'Lead Architect & Studio Director',
    badge: 'Architect',
    color: 'border-amber-500/50 bg-amber-500/10 text-amber-300',
  },
  {
    name: 'Aria Chen',
    email: 'aria.chen@atelier.design',
    role: 'Senior Interior Designer',
    badge: 'Designer',
    color: 'border-blue-500/50 bg-blue-500/10 text-blue-300',
  },
  {
    name: 'Marcus Vance',
    email: 'marcus.vance@homeluxury.com',
    role: 'Residential Property Client',
    badge: 'Client',
    color: 'border-emerald-500/50 bg-emerald-500/10 text-emerald-300',
  },
];

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  defaultTab = 'login',
}) => {
  const { login, signup, loginGoogle, loginGuest } = useAuth();
  const [tab, setTab] = useState<'login' | 'signup'>(defaultTab);

  // Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [role, setRole] = useState('Interior Designer');
  const [showPassword, setShowPassword] = useState(false);

  // Status
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsSubmitting(true);

    try {
      if (tab === 'login') {
        if (!email || !password) {
          throw new Error('Please enter both email and password.');
        }
        await login(email, password);
        setSuccessMsg('Signed in successfully!');
        setTimeout(() => onClose(), 800);
      } else {
        if (!displayName.trim()) {
          throw new Error('Please provide your name or studio name.');
        }
        if (!email || !password) {
          throw new Error('Please enter an email and password.');
        }
        if (password.length < 6) {
          throw new Error('Password should be at least 6 characters.');
        }
        await signup(email, password, displayName, role);
        setSuccessMsg('Account created successfully! Welcome to Atelier.');
        setTimeout(() => onClose(), 800);
      }
    } catch (err: any) {
      const code = err.code || '';
      if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') {
        setErrorMsg('Invalid email or password. You can also sign up or use Demo Accounts below.');
      } else if (code === 'auth/email-already-in-use') {
        setErrorMsg('An account with this email already exists. Try signing in instead.');
      } else if (code === 'auth/weak-password') {
        setErrorMsg('Please use a stronger password (at least 6 characters).');
      } else {
        setErrorMsg(err.message || 'Authentication encountered an error. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setErrorMsg(null);
    setIsSubmitting(true);
    try {
      await loginGoogle();
      setSuccessMsg('Signed in with Google!');
      setTimeout(() => onClose(), 600);
    } catch (err: any) {
      if (err.code !== 'auth/popup-closed-by-user') {
        setErrorMsg(err.message || 'Google sign in was cancelled or encountered an error.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickDemoLogin = async (persona: typeof PRESET_USER_PERSONAS[0]) => {
    setErrorMsg(null);
    setIsSubmitting(true);
    try {
      // Use persona credentials or designated guest session
      try {
        await login(persona.email, 'atelier2026!');
      } catch (e) {
        // If account doesn't exist yet, automatically create it!
        try {
          await signup(persona.email, 'atelier2026!', persona.name, persona.role);
        } catch (signupErr) {
          // Fallback to anonymous guest with that persona
          await loginGuest(persona.role);
        }
      }
      setSuccessMsg(`Switched to ${persona.name} (${persona.role})`);
      setTimeout(() => onClose(), 700);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to switch demo account.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/85 backdrop-blur-md p-4 animate-fade-in">
      <div className="relative w-full max-w-md rounded-3xl border border-stone-800 bg-stone-900 shadow-2xl overflow-hidden flex flex-col">
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-800/80 bg-stone-950/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-stone-100 font-display">
                {tab === 'login' ? 'Sign In to Atelier' : 'Create Atelier Account'}
              </h3>
              <p className="text-[11px] text-stone-400">
                Manage your interior designs & 3D projects
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

        {/* Tab Switcher */}
        <div className="px-6 pt-4 pb-2">
          <div className="grid grid-cols-2 p-1 bg-stone-950/80 rounded-xl border border-stone-800 text-xs">
            <button
              type="button"
              onClick={() => {
                setTab('login');
                setErrorMsg(null);
              }}
              className={`py-2 rounded-lg font-medium transition-all ${
                tab === 'login'
                  ? 'bg-stone-800 text-amber-300 shadow-sm border border-stone-700/60'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setTab('signup');
                setErrorMsg(null);
              }}
              className={`py-2 rounded-lg font-medium transition-all ${
                tab === 'signup'
                  ? 'bg-stone-800 text-amber-300 shadow-sm border border-stone-700/60'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              Create Account
            </button>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="px-6 py-3 space-y-3.5">
          {/* Error Banner */}
          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-950/50 border border-red-800/80 text-xs text-red-200 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Success Banner */}
          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-950/50 border border-emerald-800/80 text-xs text-emerald-200 flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Signup Specific: Display Name */}
          {tab === 'signup' && (
            <div>
              <label className="block text-xs font-medium text-stone-300 mb-1">
                Your Full Name or Studio Name
              </label>
              <div className="relative">
                <UserIcon className="absolute left-3 top-2.5 w-4 h-4 text-stone-500" />
                <input
                  type="text"
                  required
                  placeholder="e.g. Swaroop Sankalp"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-xs text-stone-100 placeholder-stone-600 focus:outline-none focus:border-amber-500/80 focus:ring-1 focus:ring-amber-500/40"
                />
              </div>
            </div>
          )}

          {/* Email Field */}
          <div>
            <label className="block text-xs font-medium text-stone-300 mb-1">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-2.5 w-4 h-4 text-stone-500" />
              <input
                type="email"
                required
                placeholder="designer@atelier.ai"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-xs text-stone-100 placeholder-stone-600 focus:outline-none focus:border-amber-500/80 focus:ring-1 focus:ring-amber-500/40"
              />
            </div>
          </div>

          {/* Password Field */}
          <div>
            <label className="block text-xs font-medium text-stone-300 mb-1">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-2.5 w-4 h-4 text-stone-500" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-9 pr-9 py-2 bg-stone-950 border border-stone-800 rounded-xl text-xs text-stone-100 placeholder-stone-600 focus:outline-none focus:border-amber-500/80 focus:ring-1 focus:ring-amber-500/40"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2.5 text-stone-500 hover:text-stone-300"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Signup Specific: User Persona Role */}
          {tab === 'signup' && (
            <div>
              <label className="block text-xs font-medium text-stone-300 mb-1">
                Your Role in Spatial Design
              </label>
              <div className="relative">
                <Briefcase className="absolute left-3 top-2.5 w-4 h-4 text-stone-500" />
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-xs text-stone-100 focus:outline-none focus:border-amber-500/80 focus:ring-1 focus:ring-amber-500/40"
                >
                  <option value="Interior Designer">Interior Designer</option>
                  <option value="Architect">Architect</option>
                  <option value="Homeowner">Homeowner / Client</option>
                  <option value="3D Visualizer">3D Visualizer / Artist</option>
                  <option value="Furniture Maker">Furniture Craftsman</option>
                </select>
              </div>
            </div>
          )}

          {/* Submit Action */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-semibold text-xs transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {isSubmitting ? (
              <div className="w-4 h-4 border-2 border-stone-950/30 border-t-stone-950 rounded-full animate-spin" />
            ) : (
              <>
                <span>{tab === 'login' ? 'Sign In to Account' : 'Complete Registration'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="px-6 py-2 flex items-center gap-3 text-[11px] text-stone-500">
          <div className="flex-1 h-px bg-stone-800" />
          <span>or continue with</span>
          <div className="flex-1 h-px bg-stone-800" />
        </div>

        {/* Google & Demo Users Selection */}
        <div className="px-6 pb-5 space-y-3">
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isSubmitting}
            className="w-full py-2 px-3 rounded-xl bg-stone-950 hover:bg-stone-800/80 border border-stone-800 text-stone-200 text-xs font-medium flex items-center justify-center gap-2 transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
              />
              <path
                fill="#FBBC05"
                d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.98 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
              />
            </svg>
            <span>Google Account</span>
          </button>

          {/* Quick Demo Switcher for Multi-User Testing */}
          <div className="pt-1">
            <span className="text-[10px] uppercase tracking-wider text-stone-500 font-mono font-medium block mb-1.5">
              Quick Switch Different Users:
            </span>
            <div className="grid grid-cols-1 gap-1.5">
              {PRESET_USER_PERSONAS.map((persona, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleQuickDemoLogin(persona)}
                  className="w-full text-left p-2 rounded-xl bg-stone-950/60 hover:bg-stone-800/70 border border-stone-800/80 hover:border-amber-500/40 flex items-center justify-between text-xs transition-all group"
                >
                  <div className="min-w-0 pr-2">
                    <div className="font-semibold text-stone-200 group-hover:text-amber-300 truncate">
                      {persona.name}
                    </div>
                    <div className="text-[10px] text-stone-500 truncate">{persona.email}</div>
                  </div>
                  <span
                    className={`text-[9px] px-2 py-0.5 rounded-full border font-mono font-medium shrink-0 ${persona.color}`}
                  >
                    {persona.badge}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
