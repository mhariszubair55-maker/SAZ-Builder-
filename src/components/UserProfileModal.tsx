import React, { useState } from 'react';
import {
  X,
  User as UserIcon,
  Mail,
  Key,
  Calendar,
  LogOut,
  FolderGit2,
  Copy,
  Check,
  Shield,
  Database,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useBuilder } from '../context/BuilderContext';

export const UserProfileModal: React.FC = () => {
  const { currentUser, userProfile, isProfileModalOpen, closeProfileModal, logout } = useAuth();
  const { projects } = useBuilder();

  const [copiedUid, setCopiedUid] = useState(false);

  if (!isProfileModalOpen || !currentUser) return null;

  const handleCopyUid = () => {
    navigator.clipboard.writeText(currentUser.uid);
    setCopiedUid(true);
    setTimeout(() => setCopiedUid(false), 2000);
  };

  const displayName = userProfile?.displayName || currentUser.displayName || 'Developer';
  const email = userProfile?.email || currentUser.email || 'N/A';
  const photoUrl =
    userProfile?.photoURL ||
    currentUser.photoURL ||
    `https://api.dicebear.com/7.x/identicon/svg?seed=${currentUser.uid}`;

  const joinedDate = userProfile?.createdAt
    ? new Date(userProfile.createdAt).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : 'Active Session';

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn"
    >
      <div className="relative w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 sm:p-7 shadow-2xl space-y-6">
        {/* Close Button */}
        <button
          type="button"
          onClick={closeProfileModal}
          className="absolute top-4 right-4 p-1.5 rounded-lg border border-slate-800 bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-slate-100 transition cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* User Identity Top Header */}
        <div className="flex items-center gap-4">
          <img
            src={photoUrl}
            alt={displayName}
            className="w-16 h-16 rounded-2xl border-2 border-amber-500/40 bg-slate-950 object-cover shadow-md"
          />
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-bold text-slate-100 truncate">{displayName}</h2>
            <div className="flex items-center gap-1.5 text-xs text-slate-400 truncate mt-0.5">
              <Mail className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <span className="truncate">{email}</span>
            </div>
            <div className="mt-1 flex items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-mono font-semibold">
                <Shield className="w-3 h-3" />
                <span>Verified Account</span>
              </span>
            </div>
          </div>
        </div>

        {/* Account Details & Metadata Card */}
        <div className="p-4 rounded-xl border border-slate-800 bg-slate-950 space-y-3 font-mono text-xs">
          <div className="flex items-center justify-between text-slate-400">
            <span className="flex items-center gap-1.5 text-slate-500">
              <Key className="w-3.5 h-3.5" />
              <span>Unique UID:</span>
            </span>
            <div className="flex items-center gap-1.5">
              <span className="text-slate-300">{currentUser.uid.slice(0, 16)}...</span>
              <button
                type="button"
                onClick={handleCopyUid}
                title="Copy UID"
                className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-amber-400 transition cursor-pointer"
              >
                {copiedUid ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between text-slate-400">
            <span className="flex items-center gap-1.5 text-slate-500">
              <Calendar className="w-3.5 h-3.5" />
              <span>Member Since:</span>
            </span>
            <span className="text-slate-200">{joinedDate}</span>
          </div>

          <div className="flex items-center justify-between text-slate-400">
            <span className="flex items-center gap-1.5 text-slate-500">
              <FolderGit2 className="w-3.5 h-3.5" />
              <span>Active Cloud Projects:</span>
            </span>
            <span className="text-amber-400 font-bold">{projects.length} Projects</span>
          </div>
        </div>

        {/* Privacy & Zero-Trust Notice */}
        <div className="p-3.5 rounded-xl border border-slate-800/80 bg-slate-950/40 text-xs space-y-1">
          <div className="flex items-center gap-2 font-semibold text-slate-200">
            <Database className="w-3.5 h-3.5 text-amber-400" />
            <span>Isolated Cloud Storage</span>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            All your projects, source files, and AI conversations are stored in Google Cloud Firestore and
            protected by strict security rules. No other user can read or modify your data.
          </p>
        </div>

        {/* Sign Out Action */}
        <div className="pt-2">
          <button
            type="button"
            onClick={logout}
            className="w-full min-h-[44px] px-4 py-2.5 rounded-xl border border-rose-900/60 bg-rose-950/20 hover:bg-rose-950/40 text-rose-300 font-semibold text-xs flex items-center justify-center gap-2 transition cursor-pointer"
          >
            <LogOut className="w-4 h-4 text-rose-400" />
            <span>Sign Out from SAZ</span>
          </button>
        </div>
      </div>
    </div>
  );
};
