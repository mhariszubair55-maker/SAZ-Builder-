import React, { useState } from 'react';
import { Check, Download, RotateCcw } from 'lucide-react';
import { useBuilder } from '../context/BuilderContext';
import { AVAILABLE_FRAMEWORKS, AVAILABLE_MODULES } from '../data/seedData';
import { ArchitectureModule, FrameworkTarget } from '../types/saz';

export const SettingsView: React.FC = () => {
  const {
    settings,
    updateSettings,
    resetWorkspace,
    projects,
    events,
  } = useBuilder();

  const [savedBanner, setSavedBanner] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  const toggleDefaultModule = (mod: ArchitectureModule) => {
    const exists = settings.defaultModules.includes(mod);
    const next = exists
      ? settings.defaultModules.filter((m) => m !== mod)
      : [...settings.defaultModules, mod];
    updateSettings({ defaultModules: next });
    triggerSaveFeedback();
  };

  const triggerSaveFeedback = () => {
    setSavedBanner(true);
    setTimeout(() => setSavedBanner(false), 1800);
  };

  const handleExportFullWorkspace = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      settings,
      projects,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `saz-workspace-backup-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <p className="text-xs text-amber-400 font-mono">Platform Configuration</p>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-100 mt-1">
            Workspace Settings
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Configure default synthesis stacks, mobile studio behavior, code formatting, and workspace state backups.
          </p>
        </div>

        {savedBanner && (
          <div className="px-3.5 py-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 text-emerald-300 text-xs font-medium flex items-center gap-1.5 self-start sm:self-auto">
            <Check className="w-3.5 h-3.5" />
            <span>Preferences saved to workspace</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: Primary Settings */}
        <div className="lg:col-span-2 space-y-6">
          {/* 01. Workspace Identity */}
          <section className="p-6 rounded-2xl border border-slate-800 bg-slate-900/40 space-y-4">
            <h2 className="text-base font-semibold text-slate-100">
              01. Workspace Identity
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="ws-name"
                  className="block text-xs font-medium text-slate-300 mb-2"
                >
                  Workspace Title
                </label>
                <input
                  id="ws-name"
                  type="text"
                  value={settings.workspaceName}
                  onChange={(e) => {
                    updateSettings({ workspaceName: e.target.value });
                    triggerSaveFeedback();
                  }}
                  className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-800 bg-slate-950 text-sm text-slate-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label
                  htmlFor="ws-handle"
                  className="block text-xs font-medium text-slate-300 mb-2"
                >
                  Architect Handle
                </label>
                <input
                  id="ws-handle"
                  type="text"
                  value={settings.builderHandle}
                  onChange={(e) => {
                    updateSettings({ builderHandle: e.target.value });
                    triggerSaveFeedback();
                  }}
                  className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-800 bg-slate-950 text-sm font-mono text-slate-100 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>
          </section>

          {/* 02. Default Synthesis Stack */}
          <section className="p-6 rounded-2xl border border-slate-800 bg-slate-900/40 space-y-4">
            <h2 className="text-base font-semibold text-slate-100">
              02. Default AI Synthesis Blueprint
            </h2>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-2">
                Default Target Framework
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {AVAILABLE_FRAMEWORKS.map((fw: FrameworkTarget) => (
                  <button
                    key={fw}
                    type="button"
                    onClick={() => {
                      updateSettings({ defaultFramework: fw });
                      triggerSaveFeedback();
                    }}
                    className={`min-h-[44px] px-3.5 py-2 rounded-xl border text-left text-xs font-medium transition-colors ${
                      settings.defaultFramework === fw
                        ? 'bg-amber-500/15 border-amber-500/60 text-amber-200'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {fw}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-2">
                Default Architecture Modules
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {AVAILABLE_MODULES.map((mod) => {
                  const active = settings.defaultModules.includes(mod.id);
                  return (
                    <button
                      key={mod.id}
                      type="button"
                      onClick={() => toggleDefaultModule(mod.id)}
                      className={`min-h-[44px] p-3 rounded-xl border text-left transition-colors flex items-start gap-2.5 ${
                        active
                          ? 'bg-slate-950 border-amber-500/50 text-slate-100'
                          : 'bg-slate-950/50 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <span
                        className={`mt-0.5 w-4 h-4 rounded flex items-center justify-center shrink-0 ${
                          active ? 'bg-amber-500 text-slate-950' : 'border border-slate-700'
                        }`}
                      >
                        {active && <Check className="w-3 h-3 stroke-[3]" />}
                      </span>
                      <div>
                        <div className="text-xs font-semibold">{mod.label}</div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          {mod.description}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          {/* 03. Studio & Compiler Preferences */}
          <section className="p-6 rounded-2xl border border-slate-800 bg-slate-900/40 space-y-4">
            <h2 className="text-base font-semibold text-slate-100">
              03. Studio & Runtime Behavior
            </h2>

            <div className="divide-y divide-slate-800/80">
              <div className="py-3 flex items-center justify-between gap-4">
                <div>
                  <div className="text-sm font-medium text-slate-200">
                    Auto-Open Live Studio After Synthesis
                  </div>
                  <div className="text-xs text-slate-400">
                    Immediately launch the interactive preview drawer when a build completes
                  </div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={settings.autoOpenStudioOnBuild}
                  onClick={() => {
                    updateSettings({
                      autoOpenStudioOnBuild: !settings.autoOpenStudioOnBuild,
                    });
                    triggerSaveFeedback();
                  }}
                  className={`min-h-[32px] w-12 rounded-full p-1 transition-colors flex items-center ${
                    settings.autoOpenStudioOnBuild
                      ? 'bg-amber-500 justify-end'
                      : 'bg-slate-800 justify-start'
                  }`}
                >
                  <span className="w-5 h-5 rounded-full bg-slate-950 block" />
                </button>
              </div>

              <div className="py-3 flex items-center justify-between gap-4">
                <div>
                  <div className="text-sm font-medium text-slate-200">
                    Default to Mobile Viewport (390px) in Studio
                  </div>
                  <div className="text-xs text-slate-400">
                    Start sandbox previews in mobile-first frame instead of full desktop canvas
                  </div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={settings.mobilePreviewDefault}
                  onClick={() => {
                    updateSettings({
                      mobilePreviewDefault: !settings.mobilePreviewDefault,
                    });
                    triggerSaveFeedback();
                  }}
                  className={`min-h-[32px] w-12 rounded-full p-1 transition-colors flex items-center ${
                    settings.mobilePreviewDefault
                      ? 'bg-amber-500 justify-end'
                      : 'bg-slate-800 justify-start'
                  }`}
                >
                  <span className="w-5 h-5 rounded-full bg-slate-950 block" />
                </button>
              </div>

              <div className="py-3 flex items-center justify-between gap-4">
                <div>
                  <div className="text-sm font-medium text-slate-200">
                    Strict TypeScript Contract Validation
                  </div>
                  <div className="text-xs text-slate-400">
                    Enforce explicit interfaces on generated schema and API route files
                  </div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={settings.strictTypeChecking}
                  onClick={() => {
                    updateSettings({
                      strictTypeChecking: !settings.strictTypeChecking,
                    });
                    triggerSaveFeedback();
                  }}
                  className={`min-h-[32px] w-12 rounded-full p-1 transition-colors flex items-center ${
                    settings.strictTypeChecking
                      ? 'bg-amber-500 justify-end'
                      : 'bg-slate-800 justify-start'
                  }`}
                >
                  <span className="w-5 h-5 rounded-full bg-slate-950 block" />
                </button>
              </div>
            </div>
          </section>
        </div>

        {/* Right Column: Data Portability & Architecture Event Bus */}
        <div className="space-y-6">
          <section className="p-6 rounded-2xl border border-slate-800 bg-slate-900/40 space-y-4">
            <h2 className="text-base font-semibold text-slate-100">
              04. Workspace Portability
            </h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              Export all {projects.length} projects, virtual filesystems, and settings as a portable JSON snapshot or reset the workspace to factory seed state.
            </p>

            <div className="space-y-2.5 pt-2">
              <button
                type="button"
                onClick={handleExportFullWorkspace}
                className="w-full min-h-[44px] px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
              >
                <Download className="w-4 h-4 text-amber-400" />
                <span>Export Full Workspace JSON</span>
              </button>

              {confirmReset ? (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      resetWorkspace();
                      setConfirmReset(false);
                    }}
                    className="flex-1 min-h-[44px] px-3 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold transition-colors"
                  >
                    Confirm Factory Reset
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmReset(false)}
                    className="min-h-[44px] px-3 py-2 rounded-xl border border-slate-700 text-xs text-slate-300"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmReset(true)}
                  className="w-full min-h-[44px] px-4 py-2.5 rounded-xl border border-slate-800 hover:border-rose-800/80 hover:text-rose-400 text-slate-400 text-xs font-medium flex items-center justify-center gap-2 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset Workspace to Defaults</span>
                </button>
              )}
            </div>
          </section>

          <section className="p-6 rounded-2xl border border-slate-800 bg-slate-900/40 space-y-3">
            <h2 className="text-base font-semibold text-slate-100">
              05. Extensible Event Bus
            </h2>
            <p className="text-xs text-slate-400">
              Plugin-ready state dispatch log ({events.length} events recorded this session).
            </p>
            <div className="max-h-52 overflow-y-auto space-y-2 font-mono text-[11px] pr-1">
              {events.length === 0 ? (
                <div className="text-slate-500 py-2">
                  No state mutations dispatched yet. Create or edit a project to inspect events.
                </div>
              ) : (
                events.map((ev, i) => (
                  <div
                    key={`${ev.timestamp}-${i}`}
                    className="p-2.5 rounded-lg border border-slate-800 bg-slate-950 text-slate-300"
                  >
                    <div className="flex justify-between text-amber-400">
                      <span>{ev.type}</span>
                      <span className="text-slate-500 tabular-nums">
                        {new Date(ev.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
