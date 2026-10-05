import React, { useState } from 'react';
import {
  X,
  Upload,
  FolderArchive,
  Github,
  FileText,
  AlertCircle,
  CheckCircle2,
  Loader2,
  ExternalLink,
  ArrowRight,
} from 'lucide-react';
import { useBuilder } from '../context/BuilderContext';
import { extractProjectFromZip } from '../utils/zipExport';
import { pullProjectFromGitHub } from '../utils/githubService';
import type { FrameworkTarget } from '../types/saz';

interface ImportProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ImportProjectModal: React.FC<ImportProjectModalProps> = ({ isOpen, onClose }) => {
  const {
    createProject,
    updateProjectPreviewHtml,
    openProjectInStudio,
    settings: workspaceSettings,
  } = useBuilder();

  const [importMode, setImportMode] = useState<'zip' | 'github' | 'json'>('zip');

  // ZIP state
  const [zipFile, setZipFile] = useState<File | null>(null);
  const [isProcessingZip, setIsProcessingZip] = useState(false);
  const [zipError, setZipError] = useState<string | null>(null);

  // GitHub state
  const [githubUrlOrRepo, setGithubUrlOrRepo] = useState('');
  const [githubBranch, setGithubBranch] = useState('main');
  const [customProjectName, setCustomProjectName] = useState('');
  const [isPullingGithub, setIsPullingGithub] = useState(false);
  const [githubError, setGithubError] = useState<string | null>(null);

  // JSON state
  const [jsonText, setJsonText] = useState('');
  const [jsonError, setJsonError] = useState<string | null>(null);

  if (!isOpen) return null;

  // 1. Handle ZIP Import
  const handleZipFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setZipFile(file);
      setZipError(null);
    }
  };

  const handleProcessZip = async () => {
    if (!zipFile) {
      setZipError('Please select a .zip archive first.');
      return;
    }

    setIsProcessingZip(true);
    setZipError(null);

    try {
      const extracted = await extractProjectFromZip(zipFile);
      const newProj = createProject({
        name: extracted.name,
        summary: extracted.summary,
        category: 'Imported Projects',
        framework: (extracted.framework as FrameworkTarget) || 'React + TypeScript + Tailwind',
        modules: ['Responsive UI'],
        initialFiles: extracted.files,
        initialFolders: extracted.folders.length > 0 ? extracted.folders : ['src'],
      });

      if (extracted.previewHtml) {
        updateProjectPreviewHtml(newProj.id, extracted.previewHtml);
      }

      onClose();
      openProjectInStudio(newProj.id);
    } catch (err: any) {
      console.error('ZIP import error:', err);
      setZipError(err.message || 'Failed to unpack ZIP archive.');
    } finally {
      setIsProcessingZip(false);
    }
  };

  // 2. Handle GitHub Import
  const handleProcessGithub = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = githubUrlOrRepo
      .trim()
      .replace(/^https?:\/\/github\.com\//i, '')
      .replace(/\.git$/i, '')
      .replace(/\/$/, '');

    const parts = clean.split('/');
    if (parts.length < 2) {
      setGithubError('Please enter repository in "owner/repo" format or full GitHub URL.');
      return;
    }

    const [owner, repo] = parts;
    setIsPullingGithub(true);
    setGithubError(null);

    try {
      const result = await pullProjectFromGitHub({
        token: workspaceSettings.githubToken,
        owner,
        repo,
        branch: githubBranch.trim() || undefined,
      });

      const projectName =
        customProjectName.trim() ||
        repo
          .replace(/[-_]+/g, ' ')
          .split(' ')
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(' ');

      const previewHtmlFile = result.files.find((f) => f.path.toLowerCase() === 'index.html');

      const newProj = createProject({
        name: projectName,
        summary: `Imported from GitHub ${owner}/${repo} (${result.branch} branch)`,
        category: 'Developer Tools',
        framework: 'React + TypeScript + Tailwind',
        modules: ['Responsive UI', 'REST & Webhook API'],
        initialFiles: result.files,
        settings: {
          githubRepo: {
            owner,
            repo,
            branch: result.branch,
            url: `https://github.com/${owner}/${repo}`,
            lastPulledAt: result.timestamp,
          },
        },
      });

      if (previewHtmlFile) {
        updateProjectPreviewHtml(newProj.id, previewHtmlFile.content);
      }

      onClose();
      openProjectInStudio(newProj.id);
    } catch (err: any) {
      console.error('GitHub import error:', err);
      setGithubError(err.message || 'Failed to import repository from GitHub.');
    } finally {
      setIsPullingGithub(false);
    }
  };

  // 3. Handle JSON Import
  const handleProcessJson = (e: React.FormEvent) => {
    e.preventDefault();
    if (!jsonText.trim()) {
      setJsonError('Please paste or upload JSON bundle content.');
      return;
    }

    setJsonError(null);
    try {
      const parsed = JSON.parse(jsonText.trim());
      if (!parsed.name || !Array.isArray(parsed.files)) {
        throw new Error('Invalid bundle: missing "name" or "files" property in JSON.');
      }

      const newProj = createProject({
        name: `${parsed.name} (Imported)`,
        summary: parsed.summary || 'Imported SAZ project bundle',
        category: parsed.category || 'General',
        framework: parsed.framework || 'React + TypeScript + Tailwind',
        modules: parsed.modules || ['Responsive UI'],
        initialFiles: parsed.files,
        initialFolders: parsed.folders || ['src'],
        settings: parsed.settings,
      });

      if (parsed.previewHtml) {
        updateProjectPreviewHtml(newProj.id, parsed.previewHtml);
      }

      onClose();
      openProjectInStudio(newProj.id);
    } catch (err: any) {
      setJsonError(err.message || 'Failed to parse JSON bundle.');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label="Import Project"
    >
      <div className="w-full max-w-xl bg-slate-950 border border-slate-800 rounded-2xl flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <header className="px-6 py-4 border-b border-slate-800 bg-slate-900/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100">Import Project</h2>
              <p className="text-xs text-slate-400">
                Load existing code into SAZ Builder via ZIP archive, GitHub repo, or JSON.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg border border-slate-800 hover:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-slate-100 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </header>

        {/* Tab navigation */}
        <div className="px-6 pt-3 border-b border-slate-800/80 bg-slate-900/30 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setImportMode('zip')}
            className={`min-h-[38px] px-3.5 py-1.5 border-b-2 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
              importMode === 'zip'
                ? 'border-amber-400 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FolderArchive className="w-3.5 h-3.5" />
            <span>ZIP Archive</span>
          </button>

          <button
            type="button"
            onClick={() => setImportMode('github')}
            className={`min-h-[38px] px-3.5 py-1.5 border-b-2 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
              importMode === 'github'
                ? 'border-amber-400 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Github className="w-3.5 h-3.5" />
            <span>GitHub Repository</span>
          </button>

          <button
            type="button"
            onClick={() => setImportMode('json')}
            className={`min-h-[38px] px-3.5 py-1.5 border-b-2 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
              importMode === 'json'
                ? 'border-amber-400 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>JSON Bundle</span>
          </button>
        </div>

        {/* Tab content */}
        <div className="p-6 space-y-4">
          {/* TAB 1: ZIP */}
          {importMode === 'zip' && (
            <div className="space-y-4">
              <div className="p-6 rounded-2xl border-2 border-dashed border-slate-700 hover:border-amber-500/60 bg-slate-900/40 text-center space-y-3 transition-colors">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center mx-auto">
                  <FolderArchive className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-200">
                    {zipFile ? zipFile.name : 'Select or drop project ZIP file'}
                  </h4>
                  <p className="text-xs text-slate-400 mt-1">
                    Extracts HTML, CSS, JavaScript, TypeScript, configurations, and assets.
                  </p>
                </div>

                <div>
                  <label className="inline-flex min-h-[38px] px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs items-center gap-2 cursor-pointer transition">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Choose ZIP File</span>
                    <input
                      type="file"
                      accept=".zip,application/zip"
                      onChange={handleZipFileChange}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {zipError && (
                <div className="p-3 rounded-xl border border-rose-500/40 bg-rose-950/40 text-xs text-rose-300 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <div>{zipError}</div>
                </div>
              )}

              <button
                type="button"
                onClick={handleProcessZip}
                disabled={!zipFile || isProcessingZip}
                className="w-full min-h-[42px] px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-md"
              >
                {isProcessingZip ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Unpacking & Initializing Project...</span>
                  </>
                ) : (
                  <>
                    <span>Import and Open in Studio</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          )}

          {/* TAB 2: GITHUB */}
          {importMode === 'github' && (
            <form onSubmit={handleProcessGithub} className="space-y-4">
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    GitHub Repository (owner/repo or full URL)
                  </label>
                  <input
                    type="text"
                    value={githubUrlOrRepo}
                    onChange={(e) => setGithubUrlOrRepo(e.target.value)}
                    placeholder="e.g. vercel/next.js or https://github.com/facebook/react"
                    required
                    className="w-full min-h-[40px] px-3.5 py-1.5 rounded-xl border border-slate-800 bg-slate-950 font-mono text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Branch
                    </label>
                    <input
                      type="text"
                      value={githubBranch}
                      onChange={(e) => setGithubBranch(e.target.value)}
                      placeholder="main"
                      className="w-full min-h-[38px] px-3 py-1.5 rounded-xl border border-slate-800 bg-slate-950 font-mono text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Project Name (Optional)
                    </label>
                    <input
                      type="text"
                      value={customProjectName}
                      onChange={(e) => setCustomProjectName(e.target.value)}
                      placeholder="Custom Display Name"
                      className="w-full min-h-[38px] px-3 py-1.5 rounded-xl border border-slate-800 bg-slate-950 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                {workspaceSettings.githubToken ? (
                  <p className="text-[11px] text-emerald-400 flex items-center gap-1 font-mono">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Using connected GitHub account credentials for private/public repos.</span>
                  </p>
                ) : (
                  <p className="text-[11px] text-slate-500">
                    Public repositories can be imported without authentication. For private repositories, connect your token in Settings or Export modal.
                  </p>
                )}
              </div>

              {githubError && (
                <div className="p-3 rounded-xl border border-rose-500/40 bg-rose-950/40 text-xs text-rose-300 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <div>
                    <strong>Import Failed:</strong> {githubError}
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={isPullingGithub}
                className="w-full min-h-[42px] px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-md"
              >
                {isPullingGithub ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Pulling Repository from GitHub...</span>
                  </>
                ) : (
                  <>
                    <Github className="w-4 h-4" />
                    <span>Import GitHub Repository</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* TAB 3: JSON */}
          {importMode === 'json' && (
            <form onSubmit={handleProcessJson} className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-300">
                    SAZ Project Bundle JSON
                  </label>
                  <label className="text-amber-400 hover:text-amber-300 text-[11px] cursor-pointer">
                    <span>Load .json file</span>
                    <input
                      type="file"
                      accept=".json,application/json"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (event) => {
                            setJsonText(String(event.target?.result || ''));
                          };
                          reader.readAsText(file);
                        }
                      }}
                    />
                  </label>
                </div>
                <textarea
                  value={jsonText}
                  onChange={(e) => setJsonText(e.target.value)}
                  placeholder="Paste SAZ project JSON bundle here..."
                  rows={8}
                  className="w-full p-3 rounded-xl border border-slate-800 bg-slate-950 font-mono text-[11px] text-slate-200 focus:outline-none focus:border-amber-500"
                />
              </div>

              {jsonError && (
                <div className="p-3 rounded-xl border border-rose-500/40 bg-rose-950/40 text-xs text-rose-300 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <div>{jsonError}</div>
                </div>
              )}

              <button
                type="submit"
                disabled={!jsonText.trim()}
                className="w-full min-h-[42px] px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-md"
              >
                <span>Import JSON Project</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
