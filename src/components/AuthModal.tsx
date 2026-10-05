import React, { useState } from 'react';
import {
  X,
  Mail,
  Lock,
  User as UserIcon,
  Sparkles,
  AlertCircle,
  Loader2,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const AuthModal: React.FC = () => {
  const {
    isAuthModalOpen,
    authModalMode,
    closeAuthModal,
    openLoginModal,
    openSignupModal,
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
  } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);

  if (!isAuthModalOpen) return null;

  const isLogin = authModalMode === 'login';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!email || !password) {
      setErrorMsg('Please provide both email and password.');
      return;
    }

    if (!isLogin && password.length < 6) {
      setErrorMsg('Password must be at least 6 characters long.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (isLogin) {
        await signInWithEmail(email.trim(), password);
      } else {
        await signUpWithEmail(email.trim(), password, name.trim() || undefined);
      }
    } catch (err: any) {
      console.error('[Auth Error]:', err);
      let message = err.message || 'Authentication failed. Please verify credentials.';
      if (message.includes('auth/invalid-credential') || message.includes('auth/wrong-password')) {
        message = 'Invalid email or password. Please try again.';
      } else if (message.includes('auth/email-already-in-use')) {
        message = 'An account with this email already exists. Please log in.';
      } else if (message.includes('auth/weak-password')) {
        message = 'Password is too weak. Please use at least 6 characters.';
      } else if (message.includes('auth/user-not-found')) {
        message = 'No account found with this email. Please sign up first.';
      }
      setErrorMsg(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setErrorMsg('');
    setIsGoogleSubmitting(true);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      console.error('[Google Auth Error]:', err);
      if (!err.message?.includes('popup-closed-by-user')) {
        setErrorMsg(err.message || 'Google Sign-In failed. Please try again.');
      }
    } finally {
      setIsGoogleSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn"
    >
      <div className="relative w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 sm:p-7 shadow-2xl space-y-5">
        {/* Close Button */}
        <button
          type="button"
          onClick={closeAuthModal}
          className="absolute top-4 right-4 p-1.5 rounded-lg border border-slate-800 bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-slate-100 transition cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-amber-400" />
            </div>
            <h2 className="text-lg font-bold text-slate-100">
              {isLogin ? 'Welcome Back to SAZ' : 'Create Your SAZ Account'}
            </h2>
          </div>
          <p className="text-xs text-slate-400">
            {isLogin
              ? 'Sign in to access your private cloud projects and AI conversations.'
              : 'Sign up to create an isolated workspace and store persistent projects.'}
          </p>
        </div>

        {/* Error Notification */}
        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-800/60 flex items-start gap-2.5 text-xs text-rose-300">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">{errorMsg}</div>
          </div>
        )}

        {/* 1. Google One-Click Login */}
        <div>
          <button
            type="button"
            disabled={isGoogleSubmitting || isSubmitting}
            onClick={handleGoogleSignIn}
            className="w-full min-h-[44px] px-4 py-2.5 rounded-xl border border-slate-700 bg-slate-950 hover:bg-slate-800 text-slate-200 hover:text-white font-medium text-xs sm:text-sm flex items-center justify-center gap-2.5 transition shadow-sm cursor-pointer disabled:opacity-50"
          >
            {isGoogleSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                <span>Connecting with Google...</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Continue with Google</span>
              </>
            )}
          </button>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-slate-800" />
          <span className="text-[11px] font-mono text-slate-500 uppercase">Or with Email</span>
          <div className="flex-1 h-px bg-slate-800" />
        </div>

        {/* 2. Email / Password Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {!isLogin && (
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Full Name / Developer Alias
              </label>
              <div className="relative">
                <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Alex Turing"
                  className="w-full min-h-[42px] pl-10 pr-3.5 rounded-xl border border-slate-800 bg-slate-950 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="developer@example.com"
                className="w-full min-h-[42px] pl-10 pr-3.5 rounded-xl border border-slate-800 bg-slate-950 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Password</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full min-h-[42px] pl-10 pr-3.5 rounded-xl border border-slate-800 bg-slate-950 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || isGoogleSubmitting}
            className="w-full min-h-[44px] px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition shadow-md cursor-pointer disabled:opacity-50 mt-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                <span>Processing...</span>
              </>
            ) : (
              <>
                <span>{isLogin ? 'Sign In to Workspace' : 'Create Isolated Workspace'}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Security Notice */}
        <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center gap-2 text-[11px] text-slate-400">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span>Passwords are encrypted by Firebase Auth. Zero manual password storage.</span>
        </div>

        {/* Switch Login / Signup Mode */}
        <div className="text-center pt-1 border-t border-slate-800/60">
          {isLogin ? (
            <p className="text-xs text-slate-400">
              Don't have an account yet?{' '}
              <button
                type="button"
                onClick={openSignupModal}
                className="text-amber-400 hover:underline font-semibold cursor-pointer"
              >
                Sign Up
              </button>
            </p>
          ) : (
            <p className="text-xs text-slate-400">
              Already have an account?{' '}
              <button
                type="button"
                onClick={openLoginModal}
                className="text-amber-400 hover:underline font-semibold cursor-pointer"
              >
                Sign In
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
