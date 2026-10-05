import React, { useState, useMemo } from 'react';
import { Layers, Sparkles, Search, Eye, X } from 'lucide-react';
import { useBuilder } from '../context/BuilderContext';
import { TemplateBlueprint, Project } from '../types/saz';
import { LivePreviewEngine } from '../components/LivePreviewEngine';
import { createDefaultProjectSettings } from '../data/seedData';

export const TemplatesView: React.FC = () => {
  const {
    templates,
    createFromTemplate,
    setPrefilledPrompt,
    setActiveView,
  } = useBuilder();

  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [inspectTemplate, setInspectTemplate] = useState<TemplateBlueprint | null>(null);

  const categories = [
    'All',
    'Mobile & Touch',
    'SaaS & Operations',
    'FinTech & Ledger',
    'Commerce & Booking',
    'Developer Tools',
  ];

  const filteredTemplates = useMemo(() => {
    return templates.filter((tpl) => {
      if (selectedCategory !== 'All' && tpl.category !== selectedCategory) {
        return false;
      }
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        tpl.name.toLowerCase().includes(q) ||
        tpl.summary.toLowerCase().includes(q) ||
        tpl.framework.toLowerCase().includes(q)
      );
    });
  }, [templates, selectedCategory, searchQuery]);

  const handleCustomizeInPrompt = (tpl: TemplateBlueprint) => {
    setPrefilledPrompt(tpl.defaultPrompt);
    setActiveView('dashboard');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-slate-800 pb-5">
        <p className="text-xs text-amber-400 font-mono">Curated Starter Architecture</p>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-100 mt-1">
          Application Templates
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Clone production-grade mobile PWAs, financial ledgers, and operational consoles or customize their prompt specifications.
        </p>
      </div>

      {/* Category & Search Controls */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-900 border border-slate-800 overflow-x-auto">
          {categories.map((cat) => {
            const active = selectedCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`min-h-[38px] px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                  active
                    ? 'bg-slate-800 text-amber-400 font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>

        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter blueprints..."
            className="w-full min-h-[44px] pl-10 pr-4 py-2 rounded-xl border border-slate-800 bg-slate-900/60 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500"
          />
        </div>
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredTemplates.map((tpl) => (
          <div
            key={tpl.id}
            className="p-6 rounded-2xl border border-slate-800 bg-slate-900/40 hover:border-slate-700 transition-colors flex flex-col justify-between gap-5"
          >
            <div className="space-y-2.5">
              {/* Unboxed metadata */}
              <div className="text-xs text-slate-400">
                <span className="text-amber-400 font-medium">{tpl.category}</span>
                <span aria-hidden="true"> · </span>
                <span>{tpl.framework}</span>
                <span aria-hidden="true"> · </span>
                <span className="font-mono tabular-nums">{tpl.estimatedSetup}</span>
              </div>

              <h2 className="text-lg font-bold text-slate-100">{tpl.name}</h2>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                {tpl.summary}
              </p>
              <p className="text-xs text-slate-400 leading-relaxed pt-1">
                {tpl.architectureNotes}
              </p>
            </div>

            <div className="space-y-3 pt-3 border-t border-slate-800/80">
              <div className="text-xs text-slate-500">
                Modules: {tpl.modules.join(' · ')}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => createFromTemplate(tpl)}
                  className="min-h-[44px] px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs flex items-center gap-1.5 transition-colors whitespace-nowrap"
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Use Template</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleCustomizeInPrompt(tpl)}
                  className="min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-200 font-medium text-xs flex items-center gap-1.5 transition-colors whitespace-nowrap"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>Customize in Prompt Box</span>
                </button>

                <button
                  type="button"
                  onClick={() => setInspectTemplate(tpl)}
                  className="min-h-[44px] px-3 py-2 rounded-xl border border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-300 font-medium text-xs flex items-center gap-1.5 transition-colors whitespace-nowrap"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Preview</span>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Template Live Preview Drawer */}
      {inspectTemplate && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-4xl bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden flex flex-col max-h-[88vh]">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-900/60">
              <div>
                <h3 className="text-base font-bold text-slate-100">
                  {inspectTemplate.name}
                </h3>
                <p className="text-xs text-slate-400">
                  {inspectTemplate.category} · {inspectTemplate.framework}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const tpl = inspectTemplate;
                    setInspectTemplate(null);
                    createFromTemplate(tpl);
                  }}
                  className="min-h-[40px] px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-semibold transition-colors"
                >
                  Clone into Workspace
                </button>
                <button
                  type="button"
                  onClick={() => setInspectTemplate(null)}
                  className="min-h-[40px] min-w-[40px] rounded-xl border border-slate-800 bg-slate-900 flex items-center justify-center text-slate-300"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="p-4 flex-1 overflow-y-auto">
              <LivePreviewEngine
                project={{
                  id: inspectTemplate.id,
                  name: inspectTemplate.name,
                  slug: inspectTemplate.id,
                  summary: inspectTemplate.summary,
                  category: inspectTemplate.category,
                  framework: inspectTemplate.framework,
                  modules: inspectTemplate.modules,
                  status: 'Active',
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                  architectureNotes: inspectTemplate.architectureNotes,
                  previewHtml: inspectTemplate.previewHtml,
                  files: inspectTemplate.files,
                  folders: ['src'],
                  settings: createDefaultProjectSettings(inspectTemplate.settings),
                  promptHistory: [],
                }}
                initialMode={inspectTemplate.category === 'Mobile & Touch' ? 'mobile' : 'desktop'}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
