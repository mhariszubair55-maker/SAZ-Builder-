import React, { useState } from 'react';
import {
  Bot,
  Terminal,
  Search,
  BookOpen,
  AlertTriangle,
  ListOrdered,
  Edit3,
  PlusSquare,
  Trash2,
  CheckCircle2,
  HelpCircle,
  Loader2,
  ArrowRight,
  ShieldAlert,
  ChevronDown,
  ChevronRight,
  Code2,
  RefreshCw,
  Sparkles,
  FileCode,
  X,
  ExternalLink,
} from 'lucide-react';
import { useBuilder } from '../context/BuilderContext';
import { Project } from '../types/saz';
import { AgentActionType, AgentStep } from '../types/agent';

interface CodingAgentPanelProps {
  project: Project;
  onNavigateToFile?: (filePath: string) => void;
  onNavigateToPreview?: () => void;
  compact?: boolean;
}

export const CodingAgentPanel: React.FC<CodingAgentPanelProps> = ({
  project,
  onNavigateToFile,
  onNavigateToPreview,
  compact = false,
}) => {
  const {
    activeAgentSession,
    isAgentRunning,
    runCodingAgent,
    confirmDestructiveAction,
    clearAgentSession,
  } = useBuilder();

  const [promptInput, setPromptInput] = useState('');
  const [expandedStepId, setExpandedStepId] = useState<string | null>(null);
  const [errorInput, setErrorInput] = useState('');

  const currentSession = activeAgentSession?.projectId === project.id ? activeAgentSession : null;

  const handleRunAgent = async (e?: React.FormEvent, customPrompt?: string) => {
    if (e) e.preventDefault();
    const targetPrompt = (customPrompt || promptInput).trim();
    if (!targetPrompt || isAgentRunning) return;

    try {
      await runCodingAgent({
        projectId: project.id,
        prompt: targetPrompt,
      });
      setPromptInput('');
    } catch (err: any) {
      setErrorInput(err?.message || 'Failed to execute coding agent.');
    }
  };

  const handleConfirm = async (approved: boolean) => {
    if (!currentSession?.pendingConfirmation) return;
    await confirmDestructiveAction(approved);
  };

  const getStepIcon = (type: AgentActionType) => {
    switch (type) {
      case 'search_project':
        return <Search className="w-4 h-4 text-sky-400" />;
      case 'read_file':
        return <BookOpen className="w-4 h-4 text-indigo-400" />;
      case 'analyze_errors':
        return <AlertTriangle className="w-4 h-4 text-amber-400" />;
      case 'plan_changes':
        return <ListOrdered className="w-4 h-4 text-purple-400" />;
      case 'edit_file':
        return <Edit3 className="w-4 h-4 text-amber-400" />;
      case 'create_file':
        return <PlusSquare className="w-4 h-4 text-emerald-400" />;
      case 'delete_file':
        return <Trash2 className="w-4 h-4 text-rose-400" />;
      case 'apply_changes':
        return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
      case 'explain_changes':
        return <HelpCircle className="w-4 h-4 text-cyan-400" />;
      default:
        return <Terminal className="w-4 h-4 text-slate-400" />;
    }
  };

  const getStepBadge = (type: AgentActionType) => {
    const map: Record<AgentActionType, { label: string; color: string }> = {
      search_project: { label: 'SEARCH', color: 'bg-sky-500/10 text-sky-300 border-sky-500/30' },
      read_file: { label: 'READ', color: 'bg-indigo-500/10 text-indigo-300 border-indigo-500/30' },
      analyze_errors: { label: 'ANALYZE', color: 'bg-amber-500/10 text-amber-300 border-amber-500/30' },
      plan_changes: { label: 'PLAN', color: 'bg-purple-500/10 text-purple-300 border-purple-500/30' },
      edit_file: { label: 'EDIT', color: 'bg-amber-500/10 text-amber-300 border-amber-500/30' },
      create_file: { label: 'CREATE', color: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30' },
      delete_file: { label: 'DELETE', color: 'bg-rose-500/10 text-rose-300 border-rose-500/30' },
      apply_changes: { label: 'APPLY', color: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30' },
      explain_changes: { label: 'EXPLAIN', color: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30' },
    };
    return map[type] || { label: 'AGENT', color: 'bg-slate-800 text-slate-300 border-slate-700' };
  };

  return (
    <div className="space-y-4">
      {/* 1. AGENT CONTROL HEADER */}
      <div className="p-4 sm:p-5 rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-md space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
              <Bot className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-slate-100">Autonomous Coding Agent</h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300">
                  Google Gemini 3.8 Flash
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Reads, searches, plans, edits, creates, and safely deletes files with user confirmation.
              </p>
            </div>
          </div>

          {/* Status pill */}
          <div className="flex items-center gap-2">
            {isAgentRunning ? (
              <span className="px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/40 text-amber-400 text-xs font-mono flex items-center gap-1.5 animate-pulse">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Agent Executing...</span>
              </span>
            ) : currentSession?.pendingConfirmation ? (
              <span className="px-2.5 py-1 rounded-full bg-rose-500/10 border border-rose-500/40 text-rose-400 text-xs font-mono flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>Confirmation Required</span>
              </span>
            ) : (
              <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Agent Ready</span>
              </span>
            )}

            {currentSession && !isAgentRunning && (
              <button
                type="button"
                onClick={clearAgentSession}
                title="Clear current agent session"
                className="p-1 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Quick Agent Actions */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <span className="text-[11px] font-mono text-slate-500 mr-1 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-400" />
            <span>Agent Blueprints:</span>
          </span>
          {[
            { label: 'Add dark mode', prompt: 'Add dark mode with interactive toggle.' },
            { label: 'Add user login', prompt: 'Add login modal dialog and authentication state.' },
            { label: 'Modernize design', prompt: 'Change the design with glassmorphic cards and radial glow.' },
            { label: 'Analyze & fix errors', prompt: 'Fix the error, audit runtime boundaries, and add health guard.' },
            { label: 'Delete legacy styles', prompt: 'Delete legacy styles from project.' },
          ].map((item) => (
            <button
              key={item.label}
              type="button"
              disabled={isAgentRunning}
              onClick={() => {
                setPromptInput(item.prompt);
                handleRunAgent(undefined, item.prompt);
              }}
              className="min-h-[28px] px-2.5 py-0.5 rounded-lg border border-slate-800 bg-slate-950 hover:bg-slate-800 hover:border-amber-500/40 text-[11px] text-slate-300 hover:text-amber-300 transition-colors cursor-pointer disabled:opacity-50"
            >
              <span>+ {item.label}</span>
            </button>
          ))}
        </div>

        {/* Input prompt form */}
        <form onSubmit={(e) => handleRunAgent(e)} className="pt-2">
          <div className="relative rounded-xl border border-slate-800 bg-slate-950 focus-within:border-amber-500/70 transition-colors">
            <textarea
              rows={2}
              value={promptInput}
              onChange={(e) => {
                setPromptInput(e.target.value);
                if (errorInput) setErrorInput('');
              }}
              placeholder="Give a task to the Coding Agent (e.g., 'Search for calculateTotal and add square root operation', 'Add dark mode', 'Delete unused styles.css')..."
              disabled={isAgentRunning}
              className="w-full bg-transparent p-3 text-xs sm:text-sm text-slate-100 placeholder-slate-500 resize-none focus:outline-none"
            />
            <div className="p-2 border-t border-slate-800/80 flex items-center justify-between">
              <span className="text-[11px] font-mono text-slate-500">
                Agent will inspect files, search symbols, and plan modifications.
              </span>
              <button
                type="submit"
                disabled={isAgentRunning || !promptInput.trim()}
                className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
              >
                {isAgentRunning ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Executing...</span>
                  </>
                ) : (
                  <>
                    <span>Run Coding Agent</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          </div>
          {errorInput && <p className="text-xs text-rose-400 mt-1">{errorInput}</p>}
        </form>
      </div>

      {/* 2. DESTRUCTIVE CONFIRMATION MODAL / CARD */}
      {currentSession?.pendingConfirmation && (
        <div className="p-5 rounded-2xl border-2 border-rose-500/60 bg-rose-950/20 shadow-2xl backdrop-blur-md space-y-4 animate-in fade-in zoom-in-95 duration-200">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center shrink-0">
              <ShieldAlert className="w-5 h-5 text-rose-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-rose-400">
                  Destructive Action Requires User Confirmation
                </span>
                <span className="text-[10px] font-mono px-2 py-0.2 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  High Impact
                </span>
              </div>
              <h3 className="text-sm font-bold text-slate-100 mt-1">
                Delete File: <code className="text-amber-300 font-mono">{currentSession.pendingConfirmation.targetPath}</code>
              </h3>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                {currentSession.pendingConfirmation.reason}
              </p>
              <div className="mt-2.5 p-2.5 rounded-xl bg-slate-950/80 border border-rose-500/30 text-xs font-mono text-rose-300/90">
                ⚠ {currentSession.pendingConfirmation.impact}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2.5 pt-2 border-t border-rose-500/20">
            <button
              type="button"
              onClick={() => handleConfirm(false)}
              disabled={isAgentRunning}
              className="min-h-[36px] px-4 py-1.5 rounded-xl border border-slate-700 bg-slate-900 hover:bg-slate-800 text-xs font-medium text-slate-200 transition cursor-pointer"
            >
              Reject Action (Keep File)
            </button>
            <button
              type="button"
              onClick={() => handleConfirm(true)}
              disabled={isAgentRunning}
              className="min-h-[36px] px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-lg shadow-rose-900/40 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Approve & Delete File</span>
            </button>
          </div>
        </div>
      )}

      {/* 3. AGENT PROGRESS & ACTIVITY CONSOLE */}
      {currentSession && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 overflow-hidden space-y-0">
          {/* Activity Console Header */}
          <div className="px-4 py-2.5 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <Terminal className="w-3.5 h-3.5 text-amber-400" />
              <span className="font-semibold text-slate-200">Agent Action History</span>
              <span className="text-[11px] font-mono text-slate-500">
                ({currentSession.steps.length} operations)
              </span>
            </div>
            <div className="flex items-center gap-2">
              {currentSession.createdFiles.length > 0 && (
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  +{currentSession.createdFiles.length} Created
                </span>
              )}
              {currentSession.modifiedFiles.length > 0 && (
                <span className="text-[10px] font-mono text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                  ✎ {currentSession.modifiedFiles.length} Modified
                </span>
              )}
              {currentSession.deletedFiles.length > 0 && (
                <span className="text-[10px] font-mono text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
                  ✕ {currentSession.deletedFiles.length} Deleted
                </span>
              )}
              {onNavigateToPreview && (
                <button
                  type="button"
                  onClick={onNavigateToPreview}
                  className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer font-mono"
                >
                  <span>View Preview</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* Steps Timeline */}
          <div className="divide-y divide-slate-800/60 p-2 sm:p-3 space-y-1">
            {currentSession.steps.map((step, idx) => {
              const badge = getStepBadge(step.type);
              const isExpanded = expandedStepId === step.id;

              return (
                <div
                  key={step.id}
                  className="rounded-xl p-3 bg-slate-950/40 hover:bg-slate-900/60 border border-slate-800/40 transition-colors"
                >
                  <div
                    className="flex items-start justify-between gap-3 cursor-pointer select-none"
                    onClick={() => setExpandedStepId(isExpanded ? null : step.id)}
                  >
                    <div className="flex items-start gap-2.5">
                      <div className="mt-0.5 shrink-0">{getStepIcon(step.type)}</div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded border ${badge.color}`}
                          >
                            {badge.label}
                          </span>
                          <span className="text-xs font-semibold text-slate-200">
                            {step.title}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">{step.description}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {step.status === 'completed' && (
                        <span className="text-[11px] font-mono text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Done</span>
                        </span>
                      )}
                      {step.status === 'requires_confirmation' && (
                        <span className="text-[11px] font-mono text-rose-400 flex items-center gap-1">
                          <ShieldAlert className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Confirming</span>
                        </span>
                      )}
                      {step.status === 'skipped' && (
                        <span className="text-[11px] font-mono text-slate-500">Skipped</span>
                      )}
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-slate-500" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-slate-500" />
                      )}
                    </div>
                  </div>

                  {/* Expanded Step Details */}
                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t border-slate-800 text-xs space-y-2">
                      {step.details && (
                        <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 font-mono whitespace-pre-wrap text-[11px]">
                          {step.details}
                        </div>
                      )}

                      {/* Diff Preview if available */}
                      {step.diff && (
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                            <span>Diff Preview: {step.diff.path}</span>
                            {onNavigateToFile && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onNavigateToFile(step.diff!.path);
                                }}
                                className="text-amber-400 hover:underline flex items-center gap-1"
                              >
                                <Code2 className="w-3 h-3" />
                                <span>Open in IDE</span>
                              </button>
                            )}
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px] font-mono">
                            {step.diff.originalSnippet && (
                              <div className="p-2 rounded bg-rose-950/30 border border-rose-900/40 text-rose-300 overflow-x-auto max-h-36">
                                <div className="text-rose-400 font-bold mb-1">- Original:</div>
                                <pre>{step.diff.originalSnippet}</pre>
                              </div>
                            )}
                            {step.diff.modifiedSnippet && (
                              <div className="p-2 rounded bg-emerald-950/30 border border-emerald-900/40 text-emerald-300 overflow-x-auto max-h-36">
                                <div className="text-emerald-400 font-bold mb-1">+ Modified:</div>
                                <pre>{step.diff.modifiedSnippet}</pre>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* 4. AGENT EXPLANATION SUMMARY CARD */}
          {currentSession.explanation && (
            <div className="p-4 bg-slate-950/90 border-t border-slate-800 space-y-2">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-amber-400" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                  Agent Explanation & Architecture Notes
                </h4>
              </div>
              <div className="text-xs text-slate-300 leading-relaxed whitespace-pre-line font-sans">
                {currentSession.explanation}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
