import React, { useState } from 'react';
import { Check, Layers, Sparkles, Terminal } from 'lucide-react';
import { useBuilder } from '../context/BuilderContext';
import { AVAILABLE_FRAMEWORKS, AVAILABLE_MODULES } from '../data/seedData';
import { ArchitectureModule, FrameworkTarget } from '../types/saz';
import { PromptComposer } from '../components/PromptComposer';

const CATEGORIES = [
  'SaaS & Operations',
  'Mobile & Touch',
  'FinTech & Ledger',
  'Commerce & Booking',
  'Developer Tools',
];

export const NewProjectView: React.FC = () => {
  const { settings, createBlankProject, setActiveView } = useBuilder();

  const [mode, setMode] = useState<'ai' | 'manual'>('ai');
  const [name, setName] = useState('');
  const [summary, setSummary] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [framework, setFramework] = useState<FrameworkTarget>(settings.defaultFramework);
  const [modules, setModules] = useState<ArchitectureModule[]>(settings.defaultModules);
  const [validationError, setValidationError] = useState('');

  const toggleModule = (mod: ArchitectureModule) => {
    setModules((prev) =>
      prev.includes(mod) ? prev.filter((m) => m !== mod) : [...prev, mod]
    );
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setValidationError('Please enter a project name.');
      return;
    }
    createBlankProject({
      name: name.trim(),
      summary:
        summary.trim() ||
        `Modular ${framework} application architected with ${modules.join(', ')}.`,
      category,
      framework,
      modules,
    });
    setName('');
    setSummary('');
    setValidationError('');
  };

  return (
    <div className="space-y-8">
      {/* Header & Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <p className="text-xs text-amber-400 font-mono">Project Initialization</p>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-100 mt-1">
            Create New Application
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Synthesize a full working application from natural language or configure a custom stack blueprint.
          </p>
        </div>

        {/* Segmented Control */}
        <div className="flex items-center p-1 rounded-xl bg-slate-900 border border-slate-800 self-start">
          <button
            type="button"
            onClick={() => setMode('ai')}
            className={`min-h-[40px] px-4 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors whitespace-nowrap ${
              mode === 'ai'
                ? 'bg-amber-500 text-slate-950'
                : 'text-slate-400 hover:text-slate-100'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Prompt Synthesis</span>
          </button>
          <button
            type="button"
            onClick={() => setMode('manual')}
            className={`min-h-[40px] px-4 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors whitespace-nowrap ${
              mode === 'manual'
                ? 'bg-amber-500 text-slate-950'
                : 'text-slate-400 hover:text-slate-100'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Manual Blueprint</span>
          </button>
        </div>
      </div>

      {mode === 'ai' ? (
        <div className="space-y-6">
          <PromptComposer onComplete={() => setActiveView('recent-projects')} />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/30 space-y-1.5">
              <div className="text-xs font-mono text-amber-400">01. Multi-File Output</div>
              <h3 className="text-sm font-semibold text-slate-100">
                Modular Virtual Filesystem
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Every prompt generates structured TypeScript components, schema definitions, and configuration manifests.
              </p>
            </div>
            <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/30 space-y-1.5">
              <div className="text-xs font-mono text-amber-400">02. Interactive Sandbox</div>
              <h3 className="text-sm font-semibold text-slate-100">
                Mobile & Desktop Preview
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Test touch targets at 390px mobile width or full desktop canvas immediately inside SAZ Studio.
              </p>
            </div>
            <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/30 space-y-1.5">
              <div className="text-xs font-mono text-amber-400">03. Iterative Prompting</div>
              <h3 className="text-sm font-semibold text-slate-100">
                Continuous Architecture Evolution
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Refine existing projects with follow-up prompts while preserving revision history.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <form
          onSubmit={handleManualSubmit}
          className="grid grid-cols-1 lg:grid-cols-3 gap-6"
        >
          <div className="lg:col-span-2 p-6 rounded-2xl border border-slate-800 bg-slate-900/40 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="proj-name"
                  className="block text-xs font-medium text-slate-300 mb-2"
                >
                  Application Name
                </label>
                <input
                  id="proj-name"
                  type="text"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (validationError) setValidationError('');
                  }}
                  placeholder="e.g. Vertex Fleet Coordinator"
                  className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-800 bg-slate-950 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
                {validationError && (
                  <p className="text-xs text-rose-400 mt-1">{validationError}</p>
                )}
              </div>

              <div>
                <label
                  htmlFor="proj-category"
                  className="block text-xs font-medium text-slate-300 mb-2"
                >
                  Domain Category
                </label>
                <select
                  id="proj-category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-800 bg-slate-950 text-sm text-slate-100 focus:outline-none focus:border-amber-500"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label
                htmlFor="proj-summary"
                className="block text-xs font-medium text-slate-300 mb-2"
              >
                Architectural Summary & Purpose
              </label>
              <textarea
                id="proj-summary"
                rows={3}
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="Describe primary user roles, data entities, and mobile-first workflows..."
                className="w-full p-3.5 rounded-xl border border-slate-800 bg-slate-950 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 resize-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-2">
                Target Runtime Stack
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {AVAILABLE_FRAMEWORKS.map((fw) => (
                  <button
                    key={fw}
                    type="button"
                    onClick={() => setFramework(fw)}
                    className={`min-h-[44px] px-4 py-2.5 rounded-xl border text-left text-xs font-medium transition-colors ${
                      framework === fw
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
                Mounted Architecture Modules
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {AVAILABLE_MODULES.map((mod) => {
                  const active = modules.includes(mod.id);
                  return (
                    <button
                      key={mod.id}
                      type="button"
                      onClick={() => toggleModule(mod.id)}
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
          </div>

          {/* Right Column: Live Manifest Preview & Submit */}
          <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/40 flex flex-col justify-between gap-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-xs font-mono text-amber-400">
                <Terminal className="w-3.5 h-3.5" />
                <span>saz.config.json Preview</span>
              </div>
              <pre className="p-4 rounded-xl border border-slate-800 bg-slate-950 text-xs font-mono text-slate-300 overflow-x-auto leading-relaxed">
                {JSON.stringify(
                  {
                    name: name || 'untitled-app',
                    category,
                    framework,
                    modules,
                    mobileFirst: true,
                  },
                  null,
                  2
                )}
              </pre>
            </div>

            <button
              type="submit"
              className="w-full min-h-[48px] px-5 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <span>Initialize Project Scaffold</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
