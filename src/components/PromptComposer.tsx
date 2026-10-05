import React, { useState, useEffect } from 'react';
import { ArrowUpRight, Layers, Loader2, Terminal, Check, RotateCcw, Sparkles } from 'lucide-react';
import { useBuilder } from '../context/BuilderContext';
import { AVAILABLE_FRAMEWORKS, AVAILABLE_MODULES, PROMPT_SUGGESTIONS } from '../data/seedData';
import { ArchitectureModule, FrameworkTarget } from '../types/saz';

interface PromptComposerProps {
  compact?: boolean;
  defaultTargetProjectId?: string;
  onComplete?: () => void;
}

export const PromptComposer: React.FC<PromptComposerProps> = ({
  compact = false,
  defaultTargetProjectId,
  onComplete,
}) => {
  const {
    settings,
    isSynthesizing,
    synthesisStatus,
    synthesizeApp,
    prefilledPrompt,
    setPrefilledPrompt,
  } = useBuilder();

  const [prompt, setPrompt] = useState('');
  const [projectName, setProjectName] = useState('');
  const [framework, setFramework] = useState<FrameworkTarget>(settings.defaultFramework);
  const [selectedModules, setSelectedModules] = useState<ArchitectureModule[]>(
    settings.defaultModules
  );
  const [showArchOptions, setShowArchOptions] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (prefilledPrompt) {
      setPrompt(prefilledPrompt);
      setPrefilledPrompt('');
    }
  }, [prefilledPrompt, setPrefilledPrompt]);

  const toggleModule = (mod: ArchitectureModule) => {
    setSelectedModules((prev) =>
      prev.includes(mod) ? prev.filter((m) => m !== mod) : [...prev, mod]
    );
  };

  const handleSynthesize = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = prompt.trim();
    if (!trimmed) {
      setErrorMsg('Describe the application workflow or interface you want to build.');
      return;
    }
    setErrorMsg('');
    await synthesizeApp({
      prompt: trimmed,
      projectName: projectName.trim() || undefined,
      framework,
      modules: selectedModules,
      targetProjectId: defaultTargetProjectId,
    });
    setPrompt('');
    setProjectName('');
    if (onComplete) onComplete();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSynthesize();
    }
  };

  const applySuggestion = (s: (typeof PROMPT_SUGGESTIONS)[number]) => {
    setPrompt(s.prompt);
    setProjectName(s.label);
    setFramework(s.framework);
    setSelectedModules(s.modules);
    setErrorMsg('');
  };

  return (
    <div className="w-full">
      <form
        onSubmit={handleSynthesize}
        className="rounded-2xl border border-slate-800 bg-slate-900/70 transition-colors focus-within:border-amber-500/70"
      >
        {/* Top bar of prompt box */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 border-b border-slate-800/80 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <Terminal className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="font-medium text-slate-200">
              {defaultTargetProjectId ? 'Iterate on Active Architecture' : 'SAZ Architecture Prompt Box'}
            </span>
            <span aria-hidden="true">·</span>
            <span className="hidden sm:inline text-slate-400">{framework}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowArchOptions((v) => !v)}
              className="min-h-[36px] px-2.5 py-1 rounded-lg bg-slate-800/90 hover:bg-slate-800 text-slate-200 font-medium text-xs flex items-center gap-1.5 transition-colors whitespace-nowrap"
            >
              <Layers className="w-3.5 h-3.5 text-amber-400" />
              <span>Stack & Modules ({selectedModules.length})</span>
            </button>
            {(prompt.length > 0 || projectName.length > 0) && (
              <button
                type="button"
                onClick={() => {
                  setPrompt('');
                  setProjectName('');
                }}
                title="Clear input"
                className="min-h-[36px] px-2 py-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Optional Project Name row when creating new project */}
        {!defaultTargetProjectId && (
          <div className="px-4 pt-3 pb-1 border-b border-slate-800/40 flex items-center gap-2">
            <span className="text-xs text-slate-500 shrink-0">Project Name:</span>
            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="e.g. Apex Task Router (or leave blank to auto-generate)"
              className="w-full bg-transparent text-xs font-semibold text-slate-200 placeholder-slate-600 focus:outline-none"
            />
          </div>
        )}

        {/* Collapsible stack & module configurator */}
        {showArchOptions && (
          <div className="p-4 border-b border-slate-800/80 bg-slate-950/60 space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-2">
                Target Runtime Framework
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                {AVAILABLE_FRAMEWORKS.map((fw) => {
                  const active = framework === fw;
                  return (
                    <button
                      key={fw}
                      type="button"
                      onClick={() => setFramework(fw)}
                      className={`min-h-[44px] px-3 py-2 rounded-xl text-left text-xs font-medium border transition-colors ${
                        active
                          ? 'bg-amber-500/15 border-amber-500/60 text-amber-200'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {fw}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-2">
                Mounted Capabilities & Architecture Modules
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {AVAILABLE_MODULES.map((mod) => {
                  const checked = selectedModules.includes(mod.id);
                  return (
                    <button
                      key={mod.id}
                      type="button"
                      onClick={() => toggleModule(mod.id)}
                      className={`min-h-[44px] p-2.5 rounded-xl text-left border transition-colors flex items-start gap-2.5 ${
                        checked
                          ? 'bg-slate-900 border-amber-500/50 text-slate-100'
                          : 'bg-slate-900/40 border-slate-800/80 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <span
                        className={`mt-0.5 w-4 h-4 rounded flex items-center justify-center shrink-0 ${
                          checked ? 'bg-amber-500 text-slate-950' : 'border border-slate-700'
                        }`}
                      >
                        {checked && <Check className="w-3 h-3 stroke-[3]" />}
                      </span>
                      <div>
                        <div className="text-xs font-semibold">{mod.label}</div>
                        <div className="text-[11px] text-slate-400 leading-snug mt-0.5">
                          {mod.description}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Textarea input */}
        <div className="p-4">
          <label htmlFor="saz-prompt-input" className="sr-only">
            Application specification prompt
          </label>
          <textarea
            id="saz-prompt-input"
            rows={compact ? 2 : 3}
            value={prompt}
            onChange={(e) => {
              setPrompt(e.target.value);
              if (errorMsg) setErrorMsg('');
            }}
            onKeyDown={handleKeyDown}
            disabled={isSynthesizing}
            placeholder={
              defaultTargetProjectId
                ? 'Describe a feature update, schema addition, or layout refinement (e.g. Add a filterable audit log table and export button)...'
                : 'Describe the app you want to build — data model, user workflows, mobile touch controls, and views...'
            }
            className="w-full bg-transparent text-slate-100 placeholder-slate-500 text-sm sm:text-base leading-relaxed resize-none focus:outline-none"
          />

          {errorMsg && (
            <p className="text-xs text-rose-400 mt-1.5" role="alert">
              {errorMsg}
            </p>
          )}

          {/* Action footer */}
          <div className="mt-3 pt-3 border-t border-slate-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="text-xs text-slate-400 flex flex-wrap items-center gap-1.5">
              <span>Modules: {selectedModules.join(' · ') || 'Standard UI'}</span>
              <span aria-hidden="true" className="hidden sm:inline">·</span>
              <span className="hidden sm:inline font-mono text-[11px] text-slate-500">
                Cmd/Ctrl + Enter
              </span>
            </div>

            <button
              type="submit"
              disabled={isSynthesizing}
              className="min-h-[44px] px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-60 text-slate-950 font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {isSynthesizing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{synthesisStatus || 'Synthesizing App...'}</span>
                </>
              ) : (
                <>
                  <span>
                    {defaultTargetProjectId ? 'Apply AI Iteration' : 'Synthesize Application'}
                  </span>
                  <ArrowUpRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </form>

      {/* Quick AI Refinements for active project */}
      {defaultTargetProjectId && (
        <div className="mt-2.5 flex flex-wrap items-center gap-2">
          <span className="text-xs font-mono text-amber-400 mr-1 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>AI Refinements:</span>
          </span>
          {[
            { label: 'Add dark mode', prompt: 'Add dark mode.' },
            { label: 'Add login', prompt: 'Add login.' },
            { label: 'Change the design', prompt: 'Change the design.' },
            { label: 'Fix the error', prompt: 'Fix the error.' },
          ].map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => {
                setPrompt(item.prompt);
                setErrorMsg('');
              }}
              disabled={isSynthesizing}
              className="min-h-[32px] px-2.5 py-1 rounded-lg border border-slate-800 bg-slate-900/60 hover:bg-slate-800 hover:border-amber-500/40 text-xs text-slate-300 hover:text-amber-300 transition-colors whitespace-nowrap flex items-center gap-1 cursor-pointer disabled:opacity-50"
            >
              <span className="text-amber-400">+</span>
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Starter Prompt Presets when not compact */}
      {!compact && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-xs text-slate-400 mr-1">Starter blueprints:</span>
          {PROMPT_SUGGESTIONS.map((s) => (
            <button
              key={s.label}
              type="button"
              onClick={() => applySuggestion(s)}
              className="min-h-[36px] px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-900/50 hover:bg-slate-800/80 hover:border-slate-700 text-xs text-slate-300 transition-colors whitespace-nowrap"
            >
              {s.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
