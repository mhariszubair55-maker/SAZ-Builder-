import React, { useState, useEffect } from 'react';
import {
  X,
  Smartphone,
  Monitor,
  Code2,
  Eye,
  GitBranch,
  Download,
  Check,
  Pencil,
  Copy,
  Trash2,
  Plus,
  Settings as SettingsIcon,
  RotateCw,
  Bot,
  ShieldAlert,
  Terminal,
  Github,
  FolderArchive,
  UploadCloud,
} from 'lucide-react';
import { useBuilder } from '../context/BuilderContext';
import { PromptComposer } from './PromptComposer';
import { ProjectFileSystem } from './ProjectFileSystem';
import { LivePreviewEngine } from './LivePreviewEngine';
import { CodingAgentPanel } from './CodingAgentPanel';
import { ProjectTerminal } from './ProjectTerminal';
import { downloadProjectZip } from '../utils/zipExport';

export const ProjectStudioModal: React.FC = () => {
  const {
    activeStudioProject,
    closeStudio,
    renameProject,
    duplicateProject,
    deleteProject,
    updateProjectSettings,
    settings: workspaceSettings,
    activeAgentSession,
    projectErrors,
    openExportModal,
  } = useBuilder();

  const [activeTab, setActiveTab] = useState<'preview' | 'code' | 'agent' | 'terminal' | 'settings' | 'architecture'>('preview');
  const [viewportMode, setViewportMode] = useState<'mobile' | 'desktop'>('desktop');
  const [copiedIdNotice, setCopiedIdNotice] = useState(false);

  // In-header project rename state
  const [isRenamingTitle, setIsRenamingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');

  // Project deletion confirm state
  const [confirmDeleteProject, setConfirmDeleteProject] = useState(false);

  // New Env Var state for Project Settings
  const [newEnvKey, setNewEnvKey] = useState('');
  const [newEnvVal, setNewEnvVal] = useState('');

  // Preview reload key
  const [previewKey, setPreviewKey] = useState(0);

  const activeErrorsCount = projectErrors.filter((e) => !e.resolved).length;

  useEffect(() => {
    if (activeStudioProject) {
      setTitleDraft(activeStudioProject.name);
      setViewportMode(
        activeStudioProject.settings?.mobileFirst || workspaceSettings.mobilePreviewDefault
          ? 'mobile'
          : 'desktop'
      );
    }
  }, [activeStudioProject?.id]);

  if (!activeStudioProject) return null;

  const handleTitleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (titleDraft.trim()) {
      renameProject(activeStudioProject.id, titleDraft.trim());
      setIsRenamingTitle(false);
    }
  };

  const handleCopyProjectId = () => {
    navigator.clipboard.writeText(activeStudioProject.id);
    setCopiedIdNotice(true);
    setTimeout(() => setCopiedIdNotice(false), 1800);
  };

  const handleAddEnvVar = (e: React.FormEvent) => {
    e.preventDefault();
    const k = newEnvKey.trim().toUpperCase().replace(/[^A-Z0-9_]/g, '_');
    if (!k) return;
    const current = activeStudioProject.settings?.envVariables || {};
    updateProjectSettings(activeStudioProject.id, {
      envVariables: { ...current, [k]: newEnvVal.trim() },
    });
    setNewEnvKey('');
    setNewEnvVal('');
  };

  const handleRemoveEnvVar = (keyToRemove: string) => {
    const current = { ...(activeStudioProject.settings?.envVariables || {}) };
    delete current[keyToRemove];
    updateProjectSettings(activeStudioProject.id, { envVariables: current });
  };

  const handleExportBundle = () => {
    const bundle = JSON.stringify(activeStudioProject, null, 2);
    const blob = new Blob([bundle], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeStudioProject.slug}-saz-bundle.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col justify-end md:justify-center md:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={`Studio workspace for ${activeStudioProject.name}`}
    >
      <div className="w-full h-[94vh] md:h-[92vh] max-w-7xl mx-auto bg-slate-950 border border-slate-800 rounded-t-3xl md:rounded-2xl flex flex-col overflow-hidden shadow-2xl">
        {/* Top Studio Bar */}
        <header className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-6 py-3.5 border-b border-slate-800 bg-slate-900/80">
          <div className="min-w-0 flex items-center gap-3">
            {isRenamingTitle ? (
              <form onSubmit={handleTitleSubmit} className="flex items-center gap-2">
                <input
                  type="text"
                  value={titleDraft}
                  onChange={(e) => setTitleDraft(e.target.value)}
                  autoFocus
                  className="min-h-[36px] px-3 py-1 rounded-lg border border-amber-500 bg-slate-950 text-slate-100 text-sm font-bold focus:outline-none"
                />
                <button
                  type="submit"
                  className="min-h-[36px] px-3 py-1 rounded-lg bg-amber-500 text-slate-950 font-semibold text-xs flex items-center gap-1 cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Save</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTitleDraft(activeStudioProject.name);
                    setIsRenamingTitle(false);
                  }}
                  className="min-h-[36px] px-2.5 py-1 rounded-lg border border-slate-700 text-slate-400 text-xs"
                >
                  Cancel
                </button>
              </form>
            ) : (
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="text-base sm:text-lg font-bold text-slate-100 truncate">
                    {activeStudioProject.name}
                  </h2>
                  <button
                    type="button"
                    onClick={() => setIsRenamingTitle(true)}
                    title="Rename this project"
                    className="min-h-[32px] min-w-[32px] p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-amber-400 transition-colors flex items-center justify-center cursor-pointer"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={handleCopyProjectId}
                    title="Click to copy unique project ID"
                    className="min-h-[28px] px-2 py-0.5 rounded bg-slate-800/80 hover:bg-slate-800 font-mono text-[11px] text-slate-400 hover:text-slate-200 transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <span>{activeStudioProject.id.slice(0, 14)}...</span>
                    {copiedIdNotice ? (
                      <Check className="w-3 h-3 text-emerald-400" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                  </button>
                </div>
                <div className="text-xs text-slate-400 flex items-center gap-1.5 truncate mt-0.5">
                  <span>{activeStudioProject.framework}</span>
                  <span aria-hidden="true">·</span>
                  <span>{activeStudioProject.status}</span>
                  <span aria-hidden="true">·</span>
                  <span>Port: {activeStudioProject.settings?.devPort || 3000}</span>
                  <span aria-hidden="true">·</span>
                  <span className="text-emerald-400 flex items-center gap-1 font-mono text-[11px]">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-pulse" />
                    <span>Cloud Storage</span>
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Mode Switcher & Actions */}
          <div className="flex items-center gap-2">
            <div className="flex items-center p-1 rounded-xl bg-slate-900 border border-slate-800">
              <button
                type="button"
                onClick={() => setActiveTab('preview')}
                className={`min-h-[36px] px-3 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer ${
                  activeTab === 'preview'
                    ? 'bg-amber-500 text-slate-950 font-semibold'
                    : 'text-slate-400 hover:text-slate-100'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Live Preview</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('code')}
                className={`min-h-[36px] px-3 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer ${
                  activeTab === 'code'
                    ? 'bg-amber-500 text-slate-950 font-semibold'
                    : 'text-slate-400 hover:text-slate-100'
                }`}
              >
                <Code2 className="w-3.5 h-3.5" />
                <span>File System ({activeStudioProject.files.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('agent')}
                className={`min-h-[36px] px-3 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer relative ${
                  activeTab === 'agent'
                    ? 'bg-amber-500 text-slate-950 font-semibold'
                    : 'text-slate-400 hover:text-slate-100'
                }`}
              >
                <Bot className="w-3.5 h-3.5" />
                <span>Coding Agent</span>
                {activeAgentSession?.pendingConfirmation && (
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping absolute top-1 right-1" />
                )}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('terminal')}
                className={`min-h-[36px] px-3 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer relative ${
                  activeTab === 'terminal'
                    ? 'bg-amber-500 text-slate-950 font-semibold'
                    : 'text-slate-400 hover:text-slate-100'
                }`}
              >
                <Terminal className="w-3.5 h-3.5" />
                <span>Terminal</span>
                {activeErrorsCount > 0 && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full font-bold bg-rose-500 text-white font-mono">
                    {activeErrorsCount}
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('settings')}
                className={`min-h-[36px] px-3 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer ${
                  activeTab === 'settings'
                    ? 'bg-amber-500 text-slate-950 font-semibold'
                    : 'text-slate-400 hover:text-slate-100'
                }`}
              >
                <SettingsIcon className="w-3.5 h-3.5" />
                <span>Project Settings</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('architecture')}
                className={`min-h-[36px] px-3 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer ${
                  activeTab === 'architecture'
                    ? 'bg-amber-500 text-slate-950 font-semibold'
                    : 'text-slate-400 hover:text-slate-100'
                }`}
              >
                <GitBranch className="w-3.5 h-3.5" />
                <span>Revisions ({activeStudioProject.promptHistory.length})</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => duplicateProject(activeStudioProject.id)}
              title="Duplicate this project"
              className="min-h-[40px] px-3 py-2 rounded-xl border border-slate-800 bg-slate-900 hover:bg-slate-800 text-xs font-medium text-slate-200 hidden sm:flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Duplicate</span>
            </button>

            <button
              type="button"
              onClick={() => downloadProjectZip(activeStudioProject)}
              title="Download project ZIP archive"
              className="min-h-[40px] px-3 py-2 rounded-xl border border-slate-800 bg-slate-900 hover:bg-slate-800 hover:border-amber-500/40 text-xs font-medium text-slate-200 hidden sm:flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer"
            >
              <FolderArchive className="w-3.5 h-3.5 text-amber-400" />
              <span>Download ZIP</span>
            </button>

            <button
              type="button"
              onClick={() => openExportModal(activeStudioProject)}
              title="Export source code and sync with GitHub"
              className="min-h-[40px] px-3.5 py-2 rounded-xl border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-xs font-semibold text-amber-300 flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer"
            >
              <Github className="w-3.5 h-3.5 text-amber-400" />
              <span>Export & GitHub</span>
            </button>

            <button
              type="button"
              onClick={closeStudio}
              aria-label="Close Studio"
              className="min-h-[40px] min-w-[40px] rounded-xl border border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-300 flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Main Studio Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {/* Global Destructive Action Alert in Studio */}
          {activeAgentSession?.pendingConfirmation && activeTab !== 'agent' && (
            <div className="p-3.5 rounded-xl border border-rose-500/40 bg-rose-950/40 flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 text-rose-300">
                <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
                <span>
                  <strong>Coding Agent paused:</strong> Confirmation required to delete{' '}
                  <code className="text-amber-300 font-mono">{activeAgentSession.pendingConfirmation.targetPath}</code>.
                </span>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('agent')}
                className="px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold cursor-pointer shrink-0 transition"
              >
                Review & Confirm
              </button>
            </div>
          )}

          {/* TAB 1: REAL LIVE PREVIEW ENGINE */}
          {activeTab === 'preview' && (
            <LivePreviewEngine
              project={activeStudioProject}
              onCodeNavigate={() => setActiveTab('code')}
              onAgentNavigate={() => setActiveTab('agent')}
              onTerminalNavigate={() => setActiveTab('terminal')}
            />
          )}

          {/* TAB 2: REAL PROJECT FILE SYSTEM (Explorer + Tabs + Editor) */}
          {activeTab === 'code' && (
            <ProjectFileSystem
              project={activeStudioProject}
              onPreviewRefresh={() => setPreviewKey((k) => k + 1)}
            />
          )}

          {/* TAB 3: AUTONOMOUS CODING AGENT */}
          {activeTab === 'agent' && (
            <CodingAgentPanel
              project={activeStudioProject}
              onNavigateToFile={() => setActiveTab('code')}
              onNavigateToPreview={() => setActiveTab('preview')}
            />
          )}

          {/* TAB 4: SECURE PROJECT TERMINAL & ERROR SYSTEM */}
          {activeTab === 'terminal' && (
            <ProjectTerminal
              project={activeStudioProject}
              onNavigateToCode={(filePath) => setActiveTab('code')}
              onNavigateToPreview={() => setActiveTab('preview')}
            />
          )}

          {/* TAB 3: PROJECT SETTINGS (Each project's own settings) */}
          {activeTab === 'settings' && (
            <div className="space-y-6 max-w-4xl">
              <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/40 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-semibold text-slate-100">
                    01. Project Engine Metadata & Identification
                  </h3>
                  <span className="text-xs font-mono text-slate-500">
                    ID: {activeStudioProject.id}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="studio-proj-name" className="block text-xs font-medium text-slate-300 mb-2">Project Name</label>
                    <input
                      id="studio-proj-name"
                      type="text"
                      value={activeStudioProject.name}
                      onChange={(e) => renameProject(activeStudioProject.id, e.target.value)}
                      className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-800 bg-slate-950 text-sm font-semibold text-slate-100 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label htmlFor="studio-proj-slug" className="block text-xs font-medium text-slate-300 mb-2">Unique Slug</label>
                    <input
                      id="studio-proj-slug"
                      type="text"
                      readOnly
                      value={activeStudioProject.slug}
                      className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-800 bg-slate-900 text-sm font-mono text-slate-400 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                  <div>
                    <label htmlFor="studio-proj-port" className="block text-xs font-medium text-slate-300 mb-2">Dev Port</label>
                    <input
                      id="studio-proj-port"
                      type="number"
                      value={activeStudioProject.settings?.devPort || 3000}
                      onChange={(e) =>
                        updateProjectSettings(activeStudioProject.id, {
                          devPort: parseInt(e.target.value, 10) || 3000,
                        })
                      }
                      className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-800 bg-slate-950 text-sm font-mono text-slate-100 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label htmlFor="studio-proj-version" className="block text-xs font-medium text-slate-300 mb-2">Project Version</label>
                    <input
                      id="studio-proj-version"
                      type="text"
                      value={activeStudioProject.settings?.version || '1.0.0'}
                      onChange={(e) =>
                        updateProjectSettings(activeStudioProject.id, {
                          version: e.target.value,
                        })
                      }
                      className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-800 bg-slate-950 text-sm font-mono text-slate-100 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label htmlFor="studio-proj-breakpoint" className="block text-xs font-medium text-slate-300 mb-2">Mobile Breakpoint</label>
                    <select
                      id="studio-proj-breakpoint"
                      value={activeStudioProject.settings?.responsiveBreakpoint || '390px'}
                      onChange={(e) =>
                        updateProjectSettings(activeStudioProject.id, {
                          responsiveBreakpoint: e.target.value as any,
                        })
                      }
                      className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-800 bg-slate-950 text-sm font-mono text-slate-100 focus:outline-none focus:border-amber-500"
                    >
                      <option value="375px">375px (Compact Mobile)</option>
                      <option value="390px">390px (Standard Mobile)</option>
                      <option value="430px">430px (Large Mobile)</option>
                      <option value="768px">768px (Tablet)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Environment Variables */}
              <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/40 space-y-4">
                <h3 className="text-base font-semibold text-slate-100">
                  02. Project Environment Variables
                </h3>
                <p className="text-xs text-slate-400">
                  Independent environment variables mapped to this project's runtime and virtual configuration.
                </p>

                <div className="space-y-2">
                  {Object.entries(activeStudioProject.settings?.envVariables || {}).map(([k, v]) => (
                    <div
                      key={k}
                      className="flex items-center justify-between p-3 rounded-xl border border-slate-800 bg-slate-950 font-mono text-xs"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-amber-400 font-semibold">{k}</span>
                        <span className="text-slate-500">=</span>
                        <span className="text-slate-300">{v}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveEnvVar(k)}
                        className="text-slate-500 hover:text-rose-400 p-1 cursor-pointer"
                        title="Delete variable"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                <form onSubmit={handleAddEnvVar} className="flex flex-col sm:flex-row items-center gap-2 pt-2">
                  <input
                    type="text"
                    value={newEnvKey}
                    onChange={(e) => setNewEnvKey(e.target.value)}
                    placeholder="KEY_NAME (e.g. API_URL)"
                    className="flex-1 w-full min-h-[40px] px-3.5 py-1.5 rounded-xl border border-slate-800 bg-slate-950 font-mono text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                  />
                  <input
                    type="text"
                    value={newEnvVal}
                    onChange={(e) => setNewEnvVal(e.target.value)}
                    placeholder="Value (e.g. https://api.saz.io)"
                    className="flex-1 w-full min-h-[40px] px-3.5 py-1.5 rounded-xl border border-slate-800 bg-slate-950 font-mono text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                  />
                  <button
                    type="submit"
                    className="min-h-[40px] px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs flex items-center gap-1 whitespace-nowrap cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Variable</span>
                  </button>
                </form>
              </div>

              {/* Danger Zone: Duplicate or Delete Project */}
              <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/40 space-y-4">
                <h3 className="text-base font-semibold text-slate-100">
                  03. Project Engine Lifecycle Actions
                </h3>
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => duplicateProject(activeStudioProject.id)}
                    className="min-h-[44px] px-4 py-2 rounded-xl border border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <Copy className="w-4 h-4 text-amber-400" />
                    <span>Duplicate as New Project</span>
                  </button>

                  {confirmDeleteProject ? (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => deleteProject(activeStudioProject.id)}
                        className="min-h-[44px] px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold cursor-pointer"
                      >
                        Confirm Delete Project
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteProject(false)}
                        className="min-h-[44px] px-3 py-2 rounded-xl border border-slate-700 text-slate-300 text-xs cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteProject(true)}
                      className="min-h-[44px] px-4 py-2 rounded-xl border border-rose-900/60 hover:bg-rose-950/40 text-rose-400 text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Delete This Project</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: ARCHITECTURE & REVISIONS */}
          {activeTab === 'architecture' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/40 space-y-4">
                <h3 className="text-base font-semibold text-slate-100">
                  01. Architecture & Module Topology
                </h3>
                <p className="text-sm text-slate-300 leading-relaxed">
                  {activeStudioProject.architectureNotes}
                </p>
                <div className="pt-2 border-t border-slate-800/80 text-xs text-slate-400 space-y-1.5">
                  <div>
                    <span className="text-slate-200 font-medium">Unique Project ID:</span>{' '}
                    <span className="font-mono">{activeStudioProject.id}</span>
                  </div>
                  <div>
                    <span className="text-slate-200 font-medium">Target Runtime:</span>{' '}
                    {activeStudioProject.framework}
                  </div>
                  <div>
                    <span className="text-slate-200 font-medium">Mounted Modules:</span>{' '}
                    {activeStudioProject.modules.join(' · ')}
                  </div>
                  <div>
                    <span className="text-slate-200 font-medium">Slug Identifier:</span>{' '}
                    <span className="font-mono">{activeStudioProject.slug}</span>
                  </div>
                </div>
              </div>

              <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/40 space-y-3">
                <h3 className="text-base font-semibold text-slate-100">
                  02. Prompt Synthesis Revision Log
                </h3>
                <div className="space-y-3">
                  {activeStudioProject.promptHistory.map((turn, idx) => (
                    <div
                      key={turn.id}
                      className="pb-3 border-b border-slate-800/80 last:border-b-0"
                    >
                      <div className="flex items-center justify-between text-xs text-slate-400 font-mono tabular-nums">
                        <span>Revision #{activeStudioProject.promptHistory.length - idx}</span>
                        <span>{new Date(turn.timestamp).toLocaleString()}</span>
                      </div>
                      <p className="text-sm font-medium text-slate-200 mt-1">{turn.prompt}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{turn.summary}</p>
                      {turn.plan && turn.plan.length > 0 && (
                        <div className="mt-2 p-2.5 rounded-lg bg-slate-950/80 border border-slate-800 space-y-1">
                          <div className="text-[11px] font-mono text-amber-400 font-semibold">Gemini Engineering Plan:</div>
                          <ul className="text-xs text-slate-300 space-y-0.5 list-disc list-inside">
                            {turn.plan.map((step, sIdx) => (
                              <li key={sIdx} className="text-slate-300">
                                <span>{step}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Embedded AI Iteration Prompt inside Studio */}
          <div className="pt-2">
            <PromptComposer
              compact
              defaultTargetProjectId={activeStudioProject.id}
              onComplete={() => setActiveTab('preview')}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
