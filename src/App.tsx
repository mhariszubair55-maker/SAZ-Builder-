import React from 'react';
import {
  LayoutDashboard,
  PlusSquare,
  FolderClock,
  Layers,
  Settings,
  Sparkles,
  FolderOpen,
  LogIn,
  Shield,
  User as UserIcon,
  Upload,
} from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { BuilderProvider, useBuilder } from './context/BuilderContext';
import { AppView } from './types/saz';
import { DashboardView } from './views/DashboardView';
import { NewProjectView } from './views/NewProjectView';
import { RecentProjectsView } from './views/RecentProjectsView';
import { TemplatesView } from './views/TemplatesView';
import { SettingsView } from './views/SettingsView';
import { ProjectStudioModal } from './components/ProjectStudioModal';
import { AuthModal } from './components/AuthModal';
import { UserProfileModal } from './components/UserProfileModal';
import { ProjectExportModal } from './components/ProjectExportModal';
import { ImportProjectModal } from './components/ImportProjectModal';

const NAV_ITEMS: {
  id: AppView;
  label: string;
  shortLabel: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    shortLabel: 'Dashboard',
    icon: LayoutDashboard,
  },
  {
    id: 'new-project',
    label: 'New Project',
    shortLabel: 'New',
    icon: PlusSquare,
  },
  {
    id: 'recent-projects',
    label: 'Recent Projects',
    shortLabel: 'Recent',
    icon: FolderClock,
  },
  {
    id: 'templates',
    label: 'Templates',
    shortLabel: 'Templates',
    icon: Layers,
  },
  {
    id: 'settings',
    label: 'Settings',
    shortLabel: 'Settings',
    icon: Settings,
  },
];

const SAZWorkspaceShell: React.FC = () => {
  const {
    activeView,
    setActiveView,
    projects,
    settings,
    openProjectInStudio,
    isExportModalOpen,
    exportModalProject,
    closeExportModal,
    isImportModalOpen,
    openImportModal,
    closeImportModal,
  } = useBuilder();

  const {
    currentUser,
    userProfile,
    openLoginModal,
    openProfileModal,
  } = useAuth();

  const renderActiveView = () => {
    switch (activeView) {
      case 'dashboard':
        return <DashboardView />;
      case 'new-project':
        return <NewProjectView />;
      case 'recent-projects':
        return <RecentProjectsView />;
      case 'templates':
        return <TemplatesView />;
      case 'settings':
        return <SettingsView />;
      default:
        return <DashboardView />;
    }
  };

  const displayName = userProfile?.displayName || currentUser?.displayName || currentUser?.email?.split('@')[0] || 'User';
  const photoUrl =
    userProfile?.photoURL ||
    currentUser?.photoURL ||
    (currentUser ? `https://api.dicebear.com/7.x/identicon/svg?seed=${currentUser.uid}` : '');

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Bar Contract: Zone 1 (Single-element Brand) — Zone 2 (5 clean nav links) — Zone 3 (1 primary action + User Profile) */}
      <header className="sticky top-0 z-30 h-14 px-4 sm:px-6 border-b border-slate-800/90 bg-slate-950/90 backdrop-blur-md flex items-center justify-between">
        {/* Zone 1: Single text element wordmark */}
        <a
          href="#dashboard"
          onClick={(e) => {
            e.preventDefault();
            setActiveView('dashboard');
          }}
          className="font-display text-lg font-bold tracking-tight text-slate-100 whitespace-nowrap"
        >
          SAZ Builder
        </a>

        {/* Zone 2: 5 clean text navigation links */}
        <nav
          aria-label="Primary Navigation"
          className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-400"
        >
          {NAV_ITEMS.map((item) => {
            const active = activeView === item.id;
            return (
              <a
                key={item.id}
                href={`#${item.id}`}
                onClick={(e) => {
                  e.preventDefault();
                  setActiveView(item.id);
                }}
                className={`py-1 transition-colors whitespace-nowrap ${
                  active
                    ? 'text-amber-400 underline underline-offset-8 decoration-amber-400/80'
                    : 'hover:text-slate-100'
                }`}
              >
                {item.label}
              </a>
            );
          })}
        </nav>

        {/* Zone 3: Primary Action & Real User Profile */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={openImportModal}
            title="Import project from ZIP, GitHub, or JSON"
            className="min-h-[38px] px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5 text-sky-400" />
            <span className="hidden sm:inline">Import</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveView('new-project')}
            className="min-h-[38px] px-3.5 py-1.5 text-xs font-semibold text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-xl transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer shadow-sm"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Synthesize App</span>
          </button>

          {currentUser ? (
            <button
              type="button"
              onClick={openProfileModal}
              title={`Logged in as ${displayName} (${currentUser.email})`}
              className="min-h-[38px] px-2.5 py-1.5 rounded-xl border border-slate-800 bg-slate-900 hover:bg-slate-800 flex items-center gap-2 transition cursor-pointer text-xs font-medium text-slate-200"
            >
              <img
                src={photoUrl}
                alt={displayName}
                className="w-5 h-5 rounded-full object-cover border border-amber-500/40 shrink-0"
              />
              <span className="max-w-[110px] truncate hidden sm:inline">{displayName}</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
            </button>
          ) : (
            <button
              type="button"
              onClick={openLoginModal}
              className="min-h-[38px] px-3 py-1.5 rounded-xl border border-slate-700 bg-slate-900 hover:bg-slate-800 hover:border-amber-500/40 text-slate-200 hover:text-white flex items-center gap-1.5 transition cursor-pointer text-xs font-semibold"
            >
              <LogIn className="w-3.5 h-3.5 text-amber-400" />
              <span>Sign In</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Workspace Container: Desktop Sidebar + Viewport */}
      <div className="flex-1 flex">
        {/* Desktop Sidebar Navigation (260px) */}
        <aside className="hidden lg:flex w-64 shrink-0 border-r border-slate-800/90 bg-slate-950 p-4 flex-col justify-between">
          <div className="space-y-6">
            {/* Workspace Navigation */}
            <div className="space-y-1">
              <div className="px-3 py-1.5 text-xs font-medium text-slate-500">
                {settings.workspaceName} · {settings.builderHandle}
              </div>
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const active = activeView === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveView(item.id)}
                    className={`w-full min-h-[42px] px-3 py-2 rounded-xl text-xs font-medium flex items-center justify-between transition-colors ${
                      active
                        ? 'bg-slate-900 text-amber-400 font-semibold border border-slate-800'
                        : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900/50'
                    }`}
                  >
                    <span className="flex items-center gap-2.5">
                      <Icon className="w-4 h-4 shrink-0" />
                      <span>{item.label}</span>
                    </span>
                    {item.id === 'recent-projects' && (
                      <span className="font-mono tabular-nums text-[11px] text-slate-500">
                        {projects.length}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Pinned / Quick Launch Projects */}
            <div className="space-y-1.5 pt-4 border-t border-slate-800/80">
              <div className="px-3 py-1 text-xs font-medium text-slate-500">
                Quick Studio Launch
              </div>
              {projects.slice(0, 4).map((proj) => (
                <button
                  key={proj.id}
                  type="button"
                  onClick={() => openProjectInStudio(proj.id)}
                  className="w-full min-h-[38px] px-3 py-1.5 rounded-xl text-left text-xs text-slate-300 hover:text-amber-300 hover:bg-slate-900/60 flex items-center justify-between gap-2 transition-colors"
                >
                  <span className="truncate">{proj.name}</span>
                  <FolderOpen className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                </button>
              ))}
            </div>
          </div>

          {/* Quiet Sidebar Footer */}
          <div className="pt-4 border-t border-slate-800/80 px-3 text-xs text-slate-500 space-y-1">
            <div>Default Stack:</div>
            <div className="text-slate-300 font-mono text-[11px] truncate">
              {settings.defaultFramework}
            </div>
          </div>
        </aside>

        {/* Scrollable Main Content Viewport */}
        <main className="flex-1 min-w-0 px-4 sm:px-6 lg:px-10 py-6 sm:py-8 pb-24 md:pb-12">
          <div className="max-w-5xl mx-auto">{renderActiveView()}</div>
        </main>
      </div>

      {/* Mobile Fixed Bottom Tab Bar (Thumb-Zone Ergonomics, 44x44px minimum touch target) */}
      <nav
        aria-label="Mobile Bottom Navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 h-16 bg-slate-950/95 backdrop-blur-md border-t border-slate-800 grid grid-cols-5 items-center px-1"
      >
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = activeView === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveView(item.id)}
              className={`min-h-[44px] min-w-[44px] flex flex-col items-center justify-center rounded-xl transition-colors ${
                active ? 'text-amber-400' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium tracking-tight mt-1 whitespace-nowrap">
                {item.shortLabel}
              </span>
            </button>
          );
        })}
      </nav>

      {/* Interactive Live Studio Modal (Preview + Multi-file Code Editor + Revisions) */}
      <ProjectStudioModal />

      {/* User Authentication Modal (Google 1-Click + Email/Password) */}
      <AuthModal />

      {/* User Profile & Account Modal */}
      <UserProfileModal />

      {/* Project Export & GitHub Integration Modal */}
      <ProjectExportModal
        isOpen={isExportModalOpen}
        onClose={closeExportModal}
        project={exportModalProject}
      />

      {/* Project Import Modal (ZIP, GitHub, JSON) */}
      <ImportProjectModal
        isOpen={isImportModalOpen}
        onClose={closeImportModal}
      />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <BuilderProvider>
        <SAZWorkspaceShell />
      </BuilderProvider>
    </AuthProvider>
  );
}
