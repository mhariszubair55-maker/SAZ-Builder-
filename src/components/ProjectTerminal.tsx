import React, { useState, useEffect, useRef } from 'react';
import {
  Terminal as TerminalIcon,
  Play,
  RotateCcw,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  Shield,
  Layers,
  Code2,
  Trash2,
  Loader2,
  ExternalLink,
  ChevronRight,
  Bug,
  Filter,
} from 'lucide-react';
import { useBuilder } from '../context/BuilderContext';
import { Project } from '../types/saz';
import { ProjectSystemError, TerminalOutputLine } from '../types/terminal';

interface ProjectTerminalProps {
  project: Project;
  onNavigateToCode?: (filePath: string) => void;
  onNavigateToPreview?: () => void;
}

export const ProjectTerminal: React.FC<ProjectTerminalProps> = ({
  project,
  onNavigateToCode,
  onNavigateToPreview,
}) => {
  const {
    terminalHistory,
    projectErrors,
    executeTerminalCommand,
    fixErrorWithAI,
    clearTerminal,
    clearProjectErrors,
    updateProjectFile,
  } = useBuilder();

  const [inputCmd, setInputCmd] = useState('');
  const [isExecuting, setIsExecuting] = useState(false);
  const [fixingErrorId, setFixingErrorId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'terminal' | 'errors'>('terminal');
  const [errorFilter, setErrorFilter] = useState<'all' | 'build' | 'runtime'>('all');

  // Command history for up/down arrows
  const [historyList, setHistoryList] = useState<string[]>([
    'npm run build',
    'npm run dev',
    'npm install',
  ]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);

  const terminalEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const currentHistory: TerminalOutputLine[] = terminalHistory[project.id] || [];

  // Auto-scroll to bottom of terminal
  useEffect(() => {
    if (activeTab === 'terminal') {
      terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [currentHistory, activeTab]);

  // Initial welcome message if terminal is empty
  useEffect(() => {
    if (currentHistory.length === 0) {
      handleRunCommand('help', true);
    }
  }, [project.id]);

  const handleRunCommand = async (cmdToRun?: string, silentHistory?: boolean) => {
    const raw = (cmdToRun || inputCmd).trim();
    if (!raw || isExecuting) return;

    if (!silentHistory) {
      setHistoryList((prev) => [raw, ...prev.filter((c) => c !== raw).slice(0, 30)]);
      setHistoryIndex(-1);
      setInputCmd('');
    }

    setIsExecuting(true);
    try {
      await executeTerminalCommand(project.id, raw);
    } finally {
      setIsExecuting(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const handleSimulateBuildError = async () => {
    if (isExecuting) return;
    setIsExecuting(true);
    try {
      const targetFile =
        project.files.find((f) => f.path === 'app.js') ||
        project.files.find((f) => f.path.endsWith('.js') || f.path.endsWith('.ts')) ||
        project.files[0];
      if (targetFile) {
        const brokenContent =
          targetFile.content +
          '\n\n// [Test Diagnostic Simulation] Unclosed curly bracket\nfunction simErrorTrigger() {';
        updateProjectFile(project.id, targetFile.path, brokenContent);
        // Execute npm run build which will detect the syntax error
        await executeTerminalCommand(project.id, 'npm run build');
      }
    } finally {
      setIsExecuting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleRunCommand();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (historyList.length > 0) {
        const nextIdx = Math.min(historyIndex + 1, historyList.length - 1);
        setHistoryIndex(nextIdx);
        setInputCmd(historyList[nextIdx]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex > 0) {
        const nextIdx = historyIndex - 1;
        setHistoryIndex(nextIdx);
        setInputCmd(historyList[nextIdx]);
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setInputCmd('');
      }
    }
  };

  const handleFixError = async (err: ProjectSystemError) => {
    setFixingErrorId(err.id);
    try {
      await fixErrorWithAI(project.id, err);
      // Automatically re-run build check in terminal to verify repair
      await executeTerminalCommand(project.id, 'npm run build');
    } finally {
      setFixingErrorId(null);
    }
  };

  const filteredErrors = projectErrors.filter((e) => {
    if (errorFilter === 'all') return true;
    return e.category === errorFilter;
  });

  const unresolvedCount = projectErrors.filter((e) => !e.resolved).length;

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950 overflow-hidden flex flex-col shadow-2xl">
      {/* 1. TERMINAL TOP HEADER & TOOLBAR */}
      <div className="px-4 py-3 bg-slate-900/90 border-b border-slate-800/90 flex flex-wrap items-center justify-between gap-3 select-none">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center">
            <TerminalIcon className="w-4 h-4 text-amber-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-slate-100">
                {project.slug || project.name}:~
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                <Shield className="w-3 h-3" />
                <span>Restricted Sandbox</span>
              </span>
            </div>
            <div className="text-[11px] text-slate-400 font-mono mt-0.5">
              Secure Project Environment · Node v22.14 · Vite v8.3
            </div>
          </div>
        </div>

        {/* View Switcher: Terminal vs Error System */}
        <div className="flex items-center gap-2">
          <div className="flex items-center p-1 rounded-xl bg-slate-950 border border-slate-800 text-xs">
            <button
              type="button"
              onClick={() => setActiveTab('terminal')}
              className={`min-h-[30px] px-3 py-1 rounded-lg font-mono font-medium flex items-center gap-1.5 transition cursor-pointer ${
                activeTab === 'terminal'
                  ? 'bg-amber-500 text-slate-950 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <TerminalIcon className="w-3.5 h-3.5" />
              <span>Console</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('errors')}
              className={`min-h-[30px] px-3 py-1 rounded-lg font-mono font-medium flex items-center gap-1.5 transition cursor-pointer relative ${
                activeTab === 'errors'
                  ? 'bg-amber-500 text-slate-950 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Bug className="w-3.5 h-3.5" />
              <span>Diagnostics</span>
              {unresolvedCount > 0 && (
                <span className="text-[10px] px-1.5 py-0.2 rounded-full font-bold bg-rose-500 text-white">
                  {unresolvedCount}
                </span>
              )}
            </button>
          </div>

          <button
            type="button"
            onClick={() => clearTerminal(project.id)}
            title="Clear Terminal Output"
            className="min-h-[32px] px-2.5 py-1 rounded-lg border border-slate-800 bg-slate-900 hover:bg-slate-800 text-xs font-mono text-slate-400 hover:text-slate-200 transition cursor-pointer"
          >
            Clear
          </button>
        </div>
      </div>

      {/* 2. SAFE SHORTCUT COMMAND CHIPS */}
      <div className="px-4 py-2 bg-slate-900/40 border-b border-slate-800/60 flex flex-wrap items-center gap-1.5 text-xs font-mono">
        <span className="text-[11px] text-slate-500 mr-1 flex items-center gap-1">
          <Play className="w-3 h-3 text-amber-400" />
          <span>Safe Run:</span>
        </span>
        {[
          { label: 'npm run build', cmd: 'npm run build' },
          { label: 'npm run dev', cmd: 'npm run dev' },
          { label: 'npm install', cmd: 'npm install' },
          { label: 'npm test', cmd: 'npm test' },
          { label: 'npm run lint', cmd: 'npm run lint' },
          { label: 'ls', cmd: 'ls' },
          { label: 'help', cmd: 'help' },
        ].map((item) => (
          <button
            key={item.label}
            type="button"
            disabled={isExecuting}
            onClick={() => handleRunCommand(item.cmd)}
            className="px-2.5 py-0.5 rounded-lg border border-slate-800 bg-slate-950 hover:bg-slate-800 hover:border-amber-500/40 text-[11px] text-slate-300 hover:text-amber-300 transition cursor-pointer disabled:opacity-50"
          >
            {item.label}
          </button>
        ))}

        <div className="h-3 w-px bg-slate-800 mx-1 hidden sm:block" />

        <button
          type="button"
          disabled={isExecuting}
          onClick={handleSimulateBuildError}
          title="Inject a test syntax defect to verify diagnostics & Fix with AI"
          className="px-2.5 py-0.5 rounded-lg border border-rose-900/50 bg-rose-950/30 hover:bg-rose-900/40 text-[11px] text-rose-300 hover:text-rose-200 transition cursor-pointer flex items-center gap-1 disabled:opacity-50"
        >
          <Bug className="w-3 h-3 text-rose-400" />
          <span>Simulate Error</span>
        </button>

        <button
          type="button"
          disabled={isExecuting}
          onClick={() => handleRunCommand('sudo rm -rf /')}
          title="Verify that dangerous server commands are blocked"
          className="px-2.5 py-0.5 rounded-lg border border-slate-800 bg-slate-950 hover:bg-slate-800 text-[11px] text-slate-400 hover:text-rose-300 transition cursor-pointer flex items-center gap-1 disabled:opacity-50"
        >
          <Shield className="w-3 h-3 text-emerald-400" />
          <span>Test Security Guard</span>
        </button>
      </div>

      {/* 3. MAIN TERMINAL LOGS & ERROR OUTPUT */}
      {activeTab === 'terminal' ? (
        <div className="p-4 bg-slate-950 font-mono text-xs sm:text-sm min-h-[360px] max-h-[500px] overflow-y-auto space-y-2 select-text">
          {currentHistory.length === 0 ? (
            <div className="text-slate-600 italic">No output. Run a command above to begin.</div>
          ) : (
            currentHistory.map((line) => {
              const linkedError = line.errorId
                ? projectErrors.find((e) => e.id === line.errorId)
                : null;
              const targetError = linkedError || (line.type === 'error' || line.type === 'stderr' ? projectErrors.find((e) => !e.resolved) : null);

              if (line.type === 'command') {
                return (
                  <div key={line.id} className="text-amber-400 font-bold flex items-center gap-1.5 pt-1">
                    <ChevronRight className="w-3.5 h-3.5 text-amber-500" />
                    <span>{line.text}</span>
                  </div>
                );
              }

              if (line.type === 'system') {
                return (
                  <div key={line.id} className="text-sky-400/90 whitespace-pre-wrap">
                    {line.text}
                  </div>
                );
              }

              if (line.type === 'success') {
                return (
                  <div key={line.id} className="text-emerald-400 font-semibold whitespace-pre-wrap flex items-start gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <span>{line.text}</span>
                  </div>
                );
              }

              if (line.type === 'error' || line.type === 'stderr') {
                return (
                  <div key={line.id} className="space-y-1.5">
                    <div className="text-rose-400 font-medium whitespace-pre-wrap flex items-start gap-1.5 bg-rose-950/20 p-2.5 rounded-lg border border-rose-900/30">
                      <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <div>{line.text}</div>
                        {targetError && !targetError.resolved && (
                          <div className="mt-2 pt-2 border-t border-rose-900/40 flex items-center justify-between gap-2">
                            <span className="text-[11px] text-rose-300/80">
                              {targetError.category.toUpperCase()}: {targetError.title}
                              {targetError.sourceFile ? ` (${targetError.sourceFile})` : ''}
                            </span>
                            <button
                              type="button"
                              disabled={fixingErrorId === targetError.id}
                              onClick={() => handleFixError(targetError)}
                              className="px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-md shrink-0"
                            >
                              {fixingErrorId === targetError.id ? (
                                <>
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  <span>Fixing with Gemini...</span>
                                </>
                              ) : (
                                <>
                                  <Sparkles className="w-3.5 h-3.5" />
                                  <span>⚡ Fix with AI</span>
                                </>
                              )}
                            </button>
                          </div>
                        )}
                        {targetError && targetError.resolved && (
                          <div className="mt-2 pt-1.5 border-t border-emerald-900/40 text-[11px] text-emerald-400 flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            <span>Resolved by Gemini: {targetError.resolution}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              }

              return (
                <div key={line.id} className="text-slate-300 whitespace-pre-wrap leading-relaxed">
                  {line.text}
                </div>
              );
            })
          )}
          <div ref={terminalEndRef} />
        </div>
      ) : (
        /* 4. DEDICATED ERROR SYSTEM & DIAGNOSTICS VIEW */
        <div className="p-4 bg-slate-950 min-h-[360px] max-h-[500px] overflow-y-auto space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-200">Captured Project Diagnostics</span>
              <span className="text-xs text-slate-500">
                ({unresolvedCount} unresolved / {projectErrors.length} total)
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              {(['all', 'build', 'runtime'] as const).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setErrorFilter(cat)}
                  className={`min-h-[26px] px-2.5 py-0.5 rounded text-[11px] font-mono uppercase transition cursor-pointer ${
                    errorFilter === cat
                      ? 'bg-slate-800 text-amber-400 font-bold border border-slate-700'
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  {cat}
                </button>
              ))}
              <button
                type="button"
                onClick={() => clearProjectErrors(project.id)}
                className="text-[11px] text-slate-500 hover:text-slate-300 ml-2"
              >
                Clear All
              </button>
            </div>
          </div>

          {filteredErrors.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
              <div className="text-sm font-semibold text-slate-200">Zero active errors detected</div>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                All syntax, build configurations, and runtime execution boundaries are clean and passing.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredErrors.map((err) => (
                <div
                  key={err.id}
                  className={`p-4 rounded-xl border transition-colors ${
                    err.resolved
                      ? 'border-emerald-500/30 bg-emerald-950/10'
                      : 'border-rose-500/40 bg-rose-950/20'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5">
                      <div className="mt-0.5">
                        {err.resolved ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 text-rose-400" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-[9px] font-mono font-bold uppercase px-1.5 py-0.2 rounded border ${
                              err.category === 'build'
                                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                            }`}
                          >
                            {err.category}
                          </span>
                          <h4 className="text-xs font-bold text-slate-100">{err.title}</h4>
                        </div>
                        <p className="text-xs font-mono text-rose-300/90 mt-1">{err.message}</p>
                        {err.sourceFile && (
                          <div className="text-[11px] font-mono text-slate-400 mt-1 flex items-center gap-2">
                            <span>
                              Location: {err.sourceFile}
                              {err.line ? `:${err.line}` : ''}
                            </span>
                            {onNavigateToCode && (
                              <button
                                type="button"
                                onClick={() => onNavigateToCode(err.sourceFile!)}
                                className="text-amber-400 hover:underline flex items-center gap-0.5"
                              >
                                <span>Inspect file</span>
                                <ExternalLink className="w-2.5 h-2.5" />
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action */}
                    <div>
                      {err.resolved ? (
                        <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/30">
                          Resolved
                        </span>
                      ) : (
                        <button
                          type="button"
                          disabled={fixingErrorId === err.id}
                          onClick={() => handleFixError(err)}
                          className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-lg"
                        >
                          {fixingErrorId === err.id ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              <span>Fixing...</span>
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-3.5 h-3.5" />
                              <span>Fix with AI</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>

                  {err.resolution && (
                    <div className="mt-2.5 p-2 rounded bg-slate-950/80 border border-emerald-500/20 text-xs font-mono text-emerald-300">
                      ✓ {err.resolution}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 5. INTERACTIVE TERMINAL INPUT PROMPT */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleRunCommand();
        }}
        className="p-3 bg-slate-900 border-t border-slate-800 flex items-center gap-2"
      >
        <span className="text-xs font-mono font-bold text-amber-400 select-none shrink-0">
          saz-builder:~/{project.slug || 'app'}$
        </span>
        <input
          ref={inputRef}
          type="text"
          value={inputCmd}
          onChange={(e) => setInputCmd(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isExecuting}
          placeholder="Run safe project commands (npm install, npm run build, npm run dev, help)..."
          className="flex-1 bg-transparent text-xs font-mono text-slate-100 placeholder-slate-600 focus:outline-none"
        />
        <button
          type="submit"
          disabled={isExecuting || !inputCmd.trim()}
          className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono text-xs flex items-center gap-1 transition cursor-pointer disabled:opacity-40"
        >
          {isExecuting ? <Loader2 className="w-3 h-3 animate-spin" /> : <span>Exec</span>}
        </button>
      </form>
    </div>
  );
};
