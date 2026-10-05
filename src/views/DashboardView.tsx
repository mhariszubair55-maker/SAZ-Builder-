import React, { useState } from 'react';
import {
  ArrowUpRight,
  Plus,
  Star,
  FolderOpen,
  Layers,
  Pencil,
  Copy,
  Trash2,
  Check,
  X,
  Database,
  ShieldCheck,
  LogIn,
  Download,
  Github,
  Upload,
} from 'lucide-react';
import { useBuilder } from '../context/BuilderContext';
import { useAuth } from '../context/AuthContext';
import { PromptComposer } from '../components/PromptComposer';

export const DashboardView: React.FC = () => {
  const {
    projects,
    templates,
    setActiveView,
    openProjectInStudio,
    toggleProjectStar,
    duplicateProject,
    deleteProject,
    renameProject,
    createFromTemplate,
    openExportModal,
    openImportModal,
    downloadProjectZipArchive,
  } = useBuilder();

  const { currentUser, userProfile, openLoginModal } = useAuth();

  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renamedName, setRenamedName] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const activeProjects = projects.filter((p) => p.status !== 'Archived');
  const totalFiles = projects.reduce((acc, p) => acc + p.files.length + 1, 0);
  const totalRevisions = projects.reduce((acc, p) => acc + p.promptHistory.length, 0);
  const recentSlice = projects.slice(0, 4);
  const featuredTemplates = templates.slice(0, 3);

  const handleStartRename = (id: string, currentName: string) => {
    setRenamingId(id);
    setRenamedName(currentName);
  };

  const handleSaveRename = (id: string) => {
    if (renamedName.trim()) {
      renameProject(id, renamedName.trim());
      setRenamingId(null);
    }
  };

  return (
    <div className="space-y-8">
      {/* Cloud Persistent Storage & User Security Banner */}
      <div className="p-3.5 sm:p-4 rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center shrink-0">
            <Database className="w-4 h-4 text-amber-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-100">
                {currentUser ? 'Persistent Storage Active' : 'Persistent Storage Available'}
              </span>
              <span className="text-[10px] font-mono px-2 py-0.2 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1 font-semibold">
                <ShieldCheck className="w-3 h-3" />
                <span>Zero-Trust Firestore Database</span>
              </span>
            </div>
            <p className="text-slate-400 text-[11px] mt-0.5">
              {currentUser ? (
                <>
                  Logged in as <strong className="text-slate-200">{currentUser.email}</strong>. Each user only accesses their own projects.
                </>
              ) : (
                'Sign in to sync your projects, source files, and AI conversations to your private cloud database.'
              )}
            </p>
          </div>
        </div>

        {!currentUser && (
          <button
            type="button"
            onClick={openLoginModal}
            className="min-h-[36px] px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 self-start sm:self-auto transition cursor-pointer shadow-md shrink-0"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Sign In / Create Account</span>
          </button>
        )}
      </div>

      {/* Primary Focal Anchor: AI Prompt Box */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            <p className="text-xs text-amber-400 font-mono">
              Mobile-First Application Synthesis Engine
            </p>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-100 mt-1">
              What are you building in SAZ today?
            </h1>
          </div>
          <button
            type="button"
            onClick={() => setActiveView('new-project')}
            className="min-h-[44px] px-4 py-2 rounded-xl border border-slate-800 bg-slate-900 hover:bg-slate-800 text-xs font-medium text-slate-200 flex items-center gap-2 self-start sm:self-auto transition-colors whitespace-nowrap cursor-pointer"
          >
            <Plus className="w-4 h-4 text-amber-400" />
            <span>Guided Scaffold</span>
          </button>
        </div>

        <PromptComposer />
      </section>

      {/* Workspace Telemetry & Summary Strip */}
      <section aria-label="Workspace Metrics" className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl border border-slate-800/90 bg-slate-900/40">
          <div className="text-xs text-slate-400">Active Projects</div>
          <div className="text-2xl font-bold font-mono tabular-nums text-slate-100 mt-1">
            {activeProjects.length}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            {projects.filter((p) => p.starred).length} starred in registry
          </div>
        </div>

        <div className="p-4 rounded-2xl border border-slate-800/90 bg-slate-900/40">
          <div className="text-xs text-slate-400">Compiled Modules & Files</div>
          <div className="text-2xl font-bold font-mono tabular-nums text-slate-100 mt-1">
            {totalFiles}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Virtual FS + sandbox previews
          </div>
        </div>

        <div className="p-4 rounded-2xl border border-slate-800/90 bg-slate-900/40">
          <div className="text-xs text-slate-400">AI Prompt Revisions</div>
          <div className="text-2xl font-bold font-mono tabular-nums text-amber-400 mt-1">
            {totalRevisions}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Full snapshot history saved
          </div>
        </div>

        <div className="p-4 rounded-2xl border border-slate-800/90 bg-slate-900/40">
          <div className="text-xs text-slate-400">Architecture Templates</div>
          <div className="text-2xl font-bold font-mono tabular-nums text-emerald-400 mt-1">
            {templates.length}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Mobile & SaaS blueprints
          </div>
        </div>
      </section>

      {/* Recent Projects Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-100">
              01. Recent Projects
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Resume live studio editing, rename, duplicate, or inspect compiled virtual files
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={openImportModal}
              title="Import project from ZIP, GitHub, or JSON"
              className="min-h-[36px] px-3 py-1.5 rounded-xl border border-slate-800 bg-slate-900 hover:bg-slate-800 text-xs font-semibold text-slate-300 hover:text-white flex items-center gap-1.5 transition cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5 text-sky-400" />
              <span>Import</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveView('recent-projects')}
              className="min-h-[36px] px-3 py-1.5 text-xs font-medium text-amber-400 hover:text-amber-300 flex items-center gap-1 transition-colors whitespace-nowrap cursor-pointer"
            >
              <span>All Projects ({projects.length})</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {recentSlice.map((project) => (
            <div
              key={project.id}
              className="p-5 rounded-2xl border border-slate-800 bg-slate-900/40 hover:border-slate-700 transition-colors flex flex-col justify-between gap-4"
            >
              <div className="space-y-2">
                {/* Unboxed inline metadata */}
                <div className="flex items-center justify-between gap-2 text-xs text-slate-400">
                  <div className="truncate flex items-center gap-1.5">
                    <span className="font-mono text-[11px] text-slate-500 truncate max-w-[120px]">
                      {project.id}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="text-slate-300">{project.status}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono tabular-nums">
                      {project.files.length} files
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleProjectStar(project.id)}
                    aria-label={project.starred ? 'Remove star' : 'Star project'}
                    className="min-h-[36px] min-w-[36px] -mr-2 flex items-center justify-center text-slate-400 hover:text-amber-400 transition-colors"
                  >
                    <Star
                      className={`w-4 h-4 ${
                        project.starred ? 'fill-amber-400 text-amber-400' : ''
                      }`}
                    />
                  </button>
                </div>

                {renamingId === project.id ? (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSaveRename(project.id);
                    }}
                    className="flex items-center gap-2 pt-1"
                  >
                    <input
                      type="text"
                      value={renamedName}
                      onChange={(e) => setRenamedName(e.target.value)}
                      autoFocus
                      className="min-h-[36px] px-3 py-1 rounded-lg border border-amber-500 bg-slate-950 text-slate-100 text-sm font-bold focus:outline-none"
                    />
                    <button
                      type="submit"
                      className="min-h-[36px] px-3 py-1 rounded-lg bg-amber-500 text-slate-950 font-semibold text-xs flex items-center gap-1"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setRenamingId(null)}
                      className="min-h-[36px] px-2.5 py-1 rounded-lg border border-slate-700 text-slate-400 text-xs"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </form>
                ) : (
                  <div className="flex items-center justify-between gap-2">
                    <h3
                      onClick={() => openProjectInStudio(project.id)}
                      className="text-base font-semibold text-slate-100 truncate cursor-pointer hover:text-amber-400 transition-colors"
                    >
                      {project.name}
                    </h3>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleStartRename(project.id, project.name)}
                        title="Rename project"
                        className="p-1 rounded text-slate-500 hover:text-amber-400 transition-colors"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => duplicateProject(project.id)}
                        title="Duplicate project"
                        className="p-1 rounded text-slate-500 hover:text-slate-200 transition-colors"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}

                <p className="text-xs sm:text-sm text-slate-400 leading-relaxed line-clamp-2">
                  {project.summary}
                </p>
              </div>

              <div className="pt-3 border-t border-slate-800/70 flex items-center justify-between gap-3">
                <div className="text-xs text-slate-500 truncate">
                  <span>{project.framework}</span>
                  <span aria-hidden="true"> · </span>
                  <span className="font-mono tabular-nums">
                    {new Date(project.updatedAt).toLocaleDateString()}
                  </span>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {confirmDeleteId === project.id ? (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          deleteProject(project.id);
                          setConfirmDeleteId(null);
                        }}
                        className="min-h-[38px] px-2.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold"
                      >
                        Delete
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(null)}
                        className="min-h-[38px] px-2 py-1.5 rounded-lg border border-slate-700 text-slate-400 text-xs"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(project.id)}
                      title="Delete project"
                      className="min-h-[38px] min-w-[38px] rounded-xl border border-slate-800 bg-slate-900 hover:bg-rose-950/60 hover:border-rose-800 text-slate-400 hover:text-rose-400 flex items-center justify-center transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => downloadProjectZipArchive(project.id)}
                    title="Download project ZIP"
                    className="min-h-[38px] px-2.5 py-1.5 rounded-xl border border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-amber-400 flex items-center gap-1 text-xs transition cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-amber-400" />
                    <span className="hidden sm:inline">ZIP</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => openExportModal(project)}
                    title="Export source code and sync with GitHub"
                    className="min-h-[38px] px-2.5 py-1.5 rounded-xl border border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-amber-400 flex items-center gap-1 text-xs transition cursor-pointer"
                  >
                    <Github className="w-3.5 h-3.5 text-slate-400" />
                    <span className="hidden sm:inline">Export</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => openProjectInStudio(project.id)}
                    className="min-h-[40px] px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-slate-100 text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer"
                  >
                    <FolderOpen className="w-3.5 h-3.5" />
                    <span>Open Studio</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Starter Templates Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-100">
              02. Production Blueprints & Templates
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Pre-architected mobile and SaaS foundations ready for instant cloning
            </p>
          </div>
          <button
            type="button"
            onClick={() => setActiveView('templates')}
            className="min-h-[44px] px-3 py-2 text-xs font-medium text-amber-400 hover:text-amber-300 flex items-center gap-1 transition-colors whitespace-nowrap cursor-pointer"
          >
            <span>Browse Templates</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {featuredTemplates.map((tpl) => (
            <div
              key={tpl.id}
              className="p-5 rounded-2xl border border-slate-800 bg-slate-900/30 hover:border-slate-700 transition-colors flex flex-col justify-between gap-4"
            >
              <div className="space-y-2">
                <div className="text-xs text-slate-400">
                  <span>{tpl.category}</span>
                  <span aria-hidden="true"> · </span>
                  <span className="font-mono tabular-nums">{tpl.estimatedSetup}</span>
                </div>
                <h3 className="text-base font-semibold text-slate-100">{tpl.name}</h3>
                <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                  {tpl.summary}
                </p>
              </div>

              <div className="pt-3 border-t border-slate-800/70 flex items-center justify-between gap-2">
                <span className="text-xs text-slate-500 truncate">{tpl.framework}</span>
                <button
                  type="button"
                  onClick={() => createFromTemplate(tpl)}
                  className="min-h-[40px] px-3.5 py-2 rounded-xl border border-slate-700 hover:border-amber-500 hover:bg-amber-500/10 text-xs font-semibold text-slate-200 flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Layers className="w-3.5 h-3.5 text-amber-400" />
                  <span>Use Template</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
