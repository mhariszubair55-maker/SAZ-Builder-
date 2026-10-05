import React, { useState, useMemo } from 'react';
import {
  Search,
  Star,
  Copy,
  Trash2,
  FolderOpen,
  Plus,
  Archive,
  CheckCircle2,
  Pencil,
  Check,
  X,
  Download,
  Github,
  Upload,
} from 'lucide-react';
import { useBuilder } from '../context/BuilderContext';
import { ProjectStatus } from '../types/saz';

type FilterTab = 'All' | 'Active' | 'Draft' | 'Archived' | 'Starred';

export const RecentProjectsView: React.FC = () => {
  const {
    projects,
    openProjectInStudio,
    toggleProjectStar,
    duplicateProject,
    deleteProject,
    renameProject,
    updateProjectStatus,
    setActiveView,
    openExportModal,
    openImportModal,
    downloadProjectZipArchive,
  } = useBuilder();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState<FilterTab>('All');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Rename state
  const [renamingProjectId, setRenamingProjectId] = useState<string | null>(null);
  const [renamedName, setRenamedName] = useState('');

  // Copy ID feedback
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filteredProjects = useMemo(() => {
    return projects.filter((p) => {
      if (filterTab === 'Starred' && !p.starred) return false;
      if (
        (filterTab === 'Active' || filterTab === 'Draft' || filterTab === 'Archived') &&
        p.status !== filterTab
      ) {
        return false;
      }

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        p.name.toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q) ||
        p.summary.toLowerCase().includes(q) ||
        p.framework.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
      );
    });
  }, [projects, filterTab, searchQuery]);

  const filterTabs: FilterTab[] = ['All', 'Active', 'Draft', 'Starred', 'Archived'];

  const cycleStatus = (current: ProjectStatus): ProjectStatus => {
    if (current === 'Active') return 'Draft';
    if (current === 'Draft') return 'Archived';
    return 'Active';
  };

  const handleStartRename = (id: string, currentName: string) => {
    setRenamingProjectId(id);
    setRenamedName(currentName);
  };

  const handleSaveRename = (id: string) => {
    if (renamedName.trim()) {
      renameProject(id, renamedName.trim());
      setRenamingProjectId(null);
    }
  };

  const handleCopyId = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <p className="text-xs text-amber-400 font-mono">Workspace Project Engine</p>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-100 mt-1">
            Projects Registry
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Create, open, rename, duplicate and manage independent files and settings across all projects.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={openImportModal}
            className="min-h-[44px] px-3.5 py-2.5 rounded-xl border border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-200 hover:text-white font-semibold text-xs sm:text-sm flex items-center gap-2 transition-colors whitespace-nowrap cursor-pointer"
          >
            <Upload className="w-4 h-4 text-sky-400" />
            <span>Import Project</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveView('new-project')}
            className="min-h-[44px] px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs sm:text-sm flex items-center gap-2 transition-colors whitespace-nowrap cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Project</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Segmented Filter Controls */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-900 border border-slate-800 overflow-x-auto">
          {filterTabs.map((tab) => {
            const active = filterTab === tab;
            return (
              <button
                key={tab}
                type="button"
                onClick={() => setFilterTab(tab)}
                className={`min-h-[38px] px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                  active
                    ? 'bg-slate-800 text-amber-400 font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tab}
              </button>
            );
          })}
        </div>

        {/* Live Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, unique ID, or framework..."
            className="w-full min-h-[44px] pl-10 pr-4 py-2 rounded-xl border border-slate-800 bg-slate-900/60 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500"
          />
        </div>
      </div>

      {/* Project List / Empty State */}
      {filteredProjects.length === 0 ? (
        <div className="p-10 rounded-2xl border border-slate-800 bg-slate-900/30 text-center space-y-4">
          <h2 className="text-base font-semibold text-slate-200">
            No matching projects in this view
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto">
            Synthesize a new application with the AI Prompt Box or clear your current search filters.
          </p>
          <div className="flex items-center justify-center gap-3 pt-2">
            {searchQuery || filterTab !== 'All' ? (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setFilterTab('All');
                }}
                className="min-h-[44px] px-4 py-2 rounded-xl border border-slate-700 text-xs font-medium text-slate-200 hover:bg-slate-800 transition-colors"
              >
                Reset Filters
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => setActiveView('new-project')}
              className="min-h-[44px] px-4 py-2 rounded-xl bg-amber-500 text-slate-950 text-xs font-semibold hover:bg-amber-400 transition-colors"
            >
              + Create First Project
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredProjects.map((project) => (
            <div
              key={project.id}
              className="p-5 rounded-2xl border border-slate-800 bg-slate-900/40 hover:border-slate-700 transition-colors flex flex-col lg:flex-row lg:items-center justify-between gap-4"
            >
              <div className="space-y-1.5 min-w-0 flex-1">
                {/* Clean unboxed metadata with unique ID copy */}
                <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-400">
                  <span className="text-amber-400 font-medium">{project.status}</span>
                  <span aria-hidden="true">·</span>
                  <button
                    type="button"
                    onClick={() => handleCopyId(project.id)}
                    title="Click to copy unique project ID"
                    className="font-mono text-[11px] text-slate-400 hover:text-amber-400 flex items-center gap-1"
                  >
                    <span>{project.id}</span>
                    {copiedId === project.id ? (
                      <Check className="w-3 h-3 text-emerald-400" />
                    ) : (
                      <Copy className="w-3 h-3 text-slate-500" />
                    )}
                  </button>
                  <span aria-hidden="true">·</span>
                  <span>{project.framework}</span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono tabular-nums">
                    {project.files.length} files
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono tabular-nums">
                    Port: {project.settings?.devPort || 3000}
                  </span>
                </div>

                {/* Project Name or Inline Rename Form */}
                {renamingProjectId === project.id ? (
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
                      className="min-h-[40px] px-3.5 py-1.5 rounded-xl border border-amber-500 bg-slate-950 text-slate-100 text-sm font-bold focus:outline-none"
                    />
                    <button
                      type="submit"
                      className="min-h-[40px] px-3.5 py-1.5 rounded-xl bg-amber-500 text-slate-950 font-semibold text-xs flex items-center gap-1"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Save</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setRenamingProjectId(null)}
                      className="min-h-[40px] px-3 py-1.5 rounded-xl border border-slate-700 text-slate-300 text-xs"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </form>
                ) : (
                  <div className="flex items-center gap-2">
                    <h3
                      onClick={() => openProjectInStudio(project.id)}
                      className="text-base sm:text-lg font-semibold text-slate-100 truncate cursor-pointer hover:text-amber-400 transition-colors"
                    >
                      {project.name}
                    </h3>
                    <button
                      type="button"
                      onClick={() => handleStartRename(project.id, project.name)}
                      title="Rename project"
                      className="p-1 rounded text-slate-500 hover:text-amber-400 transition-colors"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                  {project.summary}
                </p>

                <div className="text-xs text-slate-500 pt-1">
                  <span>Modules: {project.modules.join(' · ')}</span>
                  <span aria-hidden="true"> · </span>
                  <span className="font-mono tabular-nums">
                    Updated {new Date(project.updatedAt).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Interactive Action Controls */}
              <div className="flex flex-wrap items-center gap-2 shrink-0 pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-800/70">
                <button
                  type="button"
                  onClick={() => toggleProjectStar(project.id)}
                  title={project.starred ? 'Remove star' : 'Star project'}
                  className="min-h-[44px] min-w-[44px] rounded-xl border border-slate-800 bg-slate-900 hover:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-amber-400 transition-colors"
                >
                  <Star
                    className={`w-4 h-4 ${
                      project.starred ? 'fill-amber-400 text-amber-400' : ''
                    }`}
                  />
                </button>

                <button
                  type="button"
                  onClick={() => handleStartRename(project.id, project.name)}
                  title="Rename project"
                  className="min-h-[44px] px-3 py-2 rounded-xl border border-slate-800 bg-slate-900 hover:bg-slate-800 text-xs font-medium text-slate-300 flex items-center gap-1.5 transition-colors whitespace-nowrap"
                >
                  <Pencil className="w-3.5 h-3.5 text-slate-400" />
                  <span>Rename</span>
                </button>

                <button
                  type="button"
                  onClick={() => downloadProjectZipArchive(project.id)}
                  title="Download project ZIP"
                  className="min-h-[44px] px-3 py-2 rounded-xl border border-slate-800 bg-slate-900 hover:bg-slate-800 text-xs font-medium text-slate-300 hover:text-amber-400 flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-amber-400" />
                  <span>ZIP</span>
                </button>

                <button
                  type="button"
                  onClick={() => openExportModal(project)}
                  title="Export source code and sync with GitHub"
                  className="min-h-[44px] px-3 py-2 rounded-xl border border-slate-800 bg-slate-900 hover:bg-slate-800 text-xs font-medium text-slate-300 hover:text-amber-400 flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer"
                >
                  <Github className="w-3.5 h-3.5 text-slate-400" />
                  <span>Export & GitHub</span>
                </button>

                <button
                  type="button"
                  onClick={() => duplicateProject(project.id)}
                  title="Duplicate project with new unique ID and independent files"
                  className="min-h-[44px] px-3 py-2 rounded-xl border border-slate-800 bg-slate-900 hover:bg-slate-800 text-xs font-medium text-slate-300 flex items-center gap-1.5 transition-colors whitespace-nowrap"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Duplicate</span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    updateProjectStatus(project.id, cycleStatus(project.status))
                  }
                  title="Cycle status (Active / Draft / Archived)"
                  className="min-h-[44px] px-3 py-2 rounded-xl border border-slate-800 bg-slate-900 hover:bg-slate-800 text-xs font-medium text-slate-300 flex items-center gap-1.5 transition-colors whitespace-nowrap"
                >
                  {project.status === 'Archived' ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Archive className="w-3.5 h-3.5 text-slate-400" />
                  )}
                  <span>Set {cycleStatus(project.status)}</span>
                </button>

                {confirmDeleteId === project.id ? (
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        deleteProject(project.id);
                        setConfirmDeleteId(null);
                      }}
                      className="min-h-[44px] px-3 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold transition-colors whitespace-nowrap"
                    >
                      Confirm Delete
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(null)}
                      className="min-h-[44px] px-2.5 py-2 rounded-xl border border-slate-700 text-slate-400 text-xs"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteId(project.id)}
                    title="Delete project"
                    className="min-h-[44px] min-w-[44px] rounded-xl border border-slate-800 bg-slate-900 hover:bg-rose-950/60 hover:border-rose-800 text-slate-400 hover:text-rose-400 flex items-center justify-center transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => openProjectInStudio(project.id)}
                  className="min-h-[44px] px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer"
                >
                  <FolderOpen className="w-3.5 h-3.5" />
                  <span>Open Studio</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
