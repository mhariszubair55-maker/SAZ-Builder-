import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import Prism from 'prismjs';
import 'prismjs/components/prism-markup';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-jsx';
import 'prismjs/components/prism-tsx';
import 'prismjs/components/prism-json';

import {
  Search,
  Replace,
  Undo2,
  Redo2,
  Save,
  Check,
  AlertCircle,
  X,
  ChevronDown,
  ChevronUp,
  FileCode,
  CheckCircle2,
} from 'lucide-react';

export interface CodeEditorProps {
  filePath: string;
  initialContent: string;
  onSave: (newContent: string) => void;
  readOnly?: boolean;
}

export interface SyntaxDiagnostic {
  line: number;
  column: number;
  message: string;
  severity: 'error' | 'warning';
}

const detectLanguage = (path: string): string => {
  const ext = path.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'tsx':
      return 'tsx';
    case 'jsx':
      return 'jsx';
    case 'ts':
      return 'typescript';
    case 'js':
    case 'mjs':
      return 'javascript';
    case 'json':
      return 'json';
    case 'html':
      return 'html';
    case 'css':
      return 'css';
    default:
      return 'typescript';
  }
};

const getPrismGrammar = (lang: string) => {
  switch (lang) {
    case 'tsx':
      return Prism.languages.tsx || Prism.languages.typescript || Prism.languages.javascript;
    case 'jsx':
      return Prism.languages.jsx || Prism.languages.javascript;
    case 'typescript':
    case 'ts':
      return Prism.languages.typescript || Prism.languages.javascript;
    case 'javascript':
    case 'js':
      return Prism.languages.javascript;
    case 'json':
      return Prism.languages.json;
    case 'html':
      return Prism.languages.markup;
    case 'css':
      return Prism.languages.css;
    default:
      return Prism.languages.typescript || Prism.languages.javascript;
  }
};

// Real-time Syntax Validator for JSON, HTML, JS/TS, React
export const validateSyntax = (code: string, lang: string): SyntaxDiagnostic[] => {
  const diagnostics: SyntaxDiagnostic[] = [];
  if (!code.trim()) return diagnostics;

  if (lang === 'json') {
    try {
      JSON.parse(code);
    } catch (err: any) {
      const msg = err.message || 'Invalid JSON syntax';
      let line = 1;
      let column = 1;
      const posMatch = msg.match(/position\s+(\d+)/i);
      if (posMatch) {
        const pos = parseInt(posMatch[1], 10);
        const prefix = code.slice(0, pos);
        const lines = prefix.split('\n');
        line = lines.length;
        column = lines[lines.length - 1].length + 1;
      } else {
        const lineMatch = msg.match(/line\s+(\d+)/i);
        if (lineMatch) line = parseInt(lineMatch[1], 10);
      }
      diagnostics.push({
        line,
        column,
        message: msg.replace(/at position \d+/, '').trim(),
        severity: 'error',
      });
    }
    return diagnostics;
  }

  // Brackets, parentheses, and braces validation for JS/TS/React/CSS
  const stack: { char: string; line: number; col: number }[] = [];
  const lines = code.split('\n');
  let inString: string | null = null;
  let inBlockComment = false;

  for (let l = 0; l < lines.length; l++) {
    const lineText = lines[l];
    for (let c = 0; c < lineText.length; c++) {
      const ch = lineText[c];
      const next = lineText[c + 1];

      // Handle comments
      if (!inString && !inBlockComment && ch === '/' && next === '/') {
        break; // line comment
      }
      if (!inString && !inBlockComment && ch === '/' && next === '*') {
        inBlockComment = true;
        c++;
        continue;
      }
      if (inBlockComment && ch === '*' && next === '/') {
        inBlockComment = false;
        c++;
        continue;
      }
      if (inBlockComment) continue;

      // Handle strings
      if ((ch === '"' || ch === "'" || ch === '`') && lineText[c - 1] !== '\\') {
        if (!inString) {
          inString = ch;
        } else if (inString === ch) {
          inString = null;
        }
        continue;
      }
      if (inString && inString !== '`') {
        // Single/double quotes cannot span lines in JS/TS without escape
        continue;
      }
      if (inString === '`') continue;

      // Validate braces
      if (ch === '{' || ch === '(' || ch === '[') {
        stack.push({ char: ch, line: l + 1, col: c + 1 });
      } else if (ch === '}' || ch === ')' || ch === ']') {
        const last = stack.pop();
        if (!last) {
          diagnostics.push({
            line: l + 1,
            column: c + 1,
            message: `Unexpected closing token '${ch}'`,
            severity: 'error',
          });
        } else {
          const match =
            (last.char === '{' && ch === '}') ||
            (last.char === '(' && ch === ')') ||
            (last.char === '[' && ch === ']');
          if (!match) {
            diagnostics.push({
              line: l + 1,
              column: c + 1,
              message: `Mismatched closing token: expected '${
                last.char === '{' ? '}' : last.char === '(' ? ')' : ']'
              }' but found '${ch}'`,
              severity: 'error',
            });
          }
        }
      }
    }

    if (inString && inString !== '`') {
      diagnostics.push({
        line: l + 1,
        column: lineText.length,
        message: `Unclosed string literal (${inString})`,
        severity: 'error',
      });
      inString = null;
    }
  }

  // Any remaining unclosed brackets
  while (stack.length > 0) {
    const unclosed = stack.pop()!;
    diagnostics.push({
      line: unclosed.line,
      column: unclosed.col,
      message: `Unclosed '${unclosed.char}' opened here`,
      severity: 'error',
    });
  }

  return diagnostics;
};

export const CodeEditor: React.FC<CodeEditorProps> = ({
  filePath,
  initialContent,
  onSave,
  readOnly = false,
}) => {
  const [content, setContent] = useState(initialContent);
  const [isDirty, setIsDirty] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Undo / Redo History Stack
  const [history, setHistory] = useState<string[]>([initialContent]);
  const [historyIndex, setHistoryIndex] = useState(0);

  // Cursor & selection tracking
  const [cursorPos, setCursorPos] = useState({ line: 1, col: 1 });

  // In-Editor Search & Replace
  const [showSearch, setShowSearch] = useState(false);
  const [showReplace, setShowReplace] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [replaceQuery, setReplaceQuery] = useState('');
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);

  // Sync initial content on file switch
  useEffect(() => {
    setContent(initialContent);
    setIsDirty(false);
    setHistory([initialContent]);
    setHistoryIndex(0);
    setSearchQuery('');
    setReplaceQuery('');
  }, [filePath, initialContent]);

  const lang = useMemo(() => detectLanguage(filePath), [filePath]);

  // Syntax diagnostics
  const diagnostics = useMemo(() => {
    return validateSyntax(content, lang);
  }, [content, lang]);

  const errorLines = useMemo(() => {
    return new Set(diagnostics.map((d) => d.line));
  }, [diagnostics]);

  // Refs for synchronized scrolling
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const preRef = useRef<HTMLPreElement>(null);
  const lineGutterRef = useRef<HTMLDivElement>(null);

  // Synchronize textarea scroll to pre and line gutter
  const handleScroll = () => {
    if (!textareaRef.current) return;
    const { scrollTop, scrollLeft } = textareaRef.current;
    if (preRef.current) {
      preRef.current.scrollTop = scrollTop;
      preRef.current.scrollLeft = scrollLeft;
    }
    if (lineGutterRef.current) {
      lineGutterRef.current.scrollTop = scrollTop;
    }
  };

  // Search match positions
  const matches = useMemo(() => {
    if (!searchQuery) return [];
    const results: { index: number; length: number; line: number }[] = [];
    const regexFlags = caseSensitive ? 'g' : 'gi';
    try {
      const escaped = searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escaped, regexFlags);
      let match: RegExpExecArray | null;
      while ((match = regex.exec(content)) !== null) {
        const textBefore = content.slice(0, match.index);
        const line = textBefore.split('\n').length;
        results.push({ index: match.index, length: match[0].length, line });
      }
    } catch {
      // Ignore regex compile errors
    }
    return results;
  }, [content, searchQuery, caseSensitive]);

  // Highlighted code with Prism
  const highlightedCode = useMemo(() => {
    try {
      const grammar = getPrismGrammar(lang);
      return Prism.highlight(content, grammar, lang);
    } catch {
      return content.replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }
  }, [content, lang]);

  // Push new state to history
  const pushHistory = (newVal: string) => {
    setHistory((prev) => {
      const next = prev.slice(0, historyIndex + 1);
      next.push(newVal);
      if (next.length > 50) next.shift();
      return next;
    });
    setHistoryIndex((prev) => Math.min(prev + 1, 49));
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newVal = e.target.value;
    setContent(newVal);
    setIsDirty(true);
    pushHistory(newVal);
  };

  // Undo / Redo handlers
  const handleUndo = () => {
    if (historyIndex > 0) {
      const nextIndex = historyIndex - 1;
      setHistoryIndex(nextIndex);
      setContent(history[nextIndex]);
      setIsDirty(true);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const nextIndex = historyIndex + 1;
      setHistoryIndex(nextIndex);
      setContent(history[nextIndex]);
      setIsDirty(true);
    }
  };

  // Save handler
  const handleSave = useCallback(() => {
    onSave(content);
    setIsDirty(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 1600);
  }, [content, onSave]);

  // Keyboard navigation & shortcuts inside editor
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Save
    if ((e.metaKey || e.ctrlKey) && e.key === 's') {
      e.preventDefault();
      handleSave();
      return;
    }
    // Undo
    if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.key === 'z') {
      e.preventDefault();
      handleUndo();
      return;
    }
    // Redo
    if ((e.metaKey || e.ctrlKey) && (e.shiftKey && e.key === 'z' || e.key === 'y')) {
      e.preventDefault();
      handleRedo();
      return;
    }
    // Search
    if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
      e.preventDefault();
      setShowSearch(true);
      return;
    }
    // Replace
    if ((e.metaKey || e.ctrlKey) && e.key === 'h') {
      e.preventDefault();
      setShowSearch(true);
      setShowReplace(true);
      return;
    }
    // Tab indent support (2 spaces)
    if (e.key === 'Tab') {
      e.preventDefault();
      const ta = textareaRef.current;
      if (!ta) return;
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const next = content.substring(0, start) + '  ' + content.substring(end);
      setContent(next);
      pushHistory(next);
      setIsDirty(true);
      requestAnimationFrame(() => {
        ta.selectionStart = ta.selectionEnd = start + 2;
      });
    }
  };

  const handleSelect = () => {
    const ta = textareaRef.current;
    if (!ta) return;
    const pos = ta.selectionStart;
    const lines = content.slice(0, pos).split('\n');
    setCursorPos({
      line: lines.length,
      col: lines[lines.length - 1].length + 1,
    });
  };

  // Search Navigation
  const goToMatch = (index: number) => {
    if (matches.length === 0) return;
    const safeIndex = (index + matches.length) % matches.length;
    setCurrentMatchIndex(safeIndex);
    const targetMatch = matches[safeIndex];
    if (targetMatch && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(
        targetMatch.index,
        targetMatch.index + targetMatch.length
      );
      // calculate approximate scroll top
      const lineHeight = 24; // 1.5rem
      textareaRef.current.scrollTop = Math.max((targetMatch.line - 5) * lineHeight, 0);
    }
  };

  const handleFindNext = () => goToMatch(currentMatchIndex + 1);
  const handleFindPrev = () => goToMatch(currentMatchIndex - 1);

  // Replace handlers
  const handleReplaceCurrent = () => {
    if (matches.length === 0) return;
    const target = matches[currentMatchIndex];
    if (!target) return;
    const updated =
      content.slice(0, target.index) + replaceQuery + content.slice(target.index + target.length);
    setContent(updated);
    pushHistory(updated);
    setIsDirty(true);
    goToMatch(currentMatchIndex);
  };

  const handleReplaceAll = () => {
    if (matches.length === 0 || !searchQuery) return;
    const regexFlags = caseSensitive ? 'g' : 'gi';
    const escaped = searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escaped, regexFlags);
    const updated = content.replace(regex, replaceQuery);
    setContent(updated);
    pushHistory(updated);
    setIsDirty(true);
    setCurrentMatchIndex(0);
  };

  // Jump to diagnostic error line
  const jumpToLine = (targetLine: number, col: number) => {
    const lines = content.split('\n');
    let charIndex = 0;
    for (let i = 0; i < targetLine - 1 && i < lines.length; i++) {
      charIndex += lines[i].length + 1;
    }
    charIndex += Math.min(col - 1, (lines[targetLine - 1] || '').length);

    if (textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(charIndex, charIndex);
      const lineHeight = 24;
      textareaRef.current.scrollTop = Math.max((targetLine - 5) * lineHeight, 0);
    }
  };

  const totalLines = useMemo(() => {
    return content.split('\n').length;
  }, [content]);

  return (
    <div className="flex flex-col h-full bg-slate-950 border border-slate-800 rounded-xl overflow-hidden font-mono select-none">
      {/* 1. TOP TOOLBAR */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 border-b border-slate-800 bg-slate-900/90 text-xs text-slate-300">
        <div className="flex items-center gap-2">
          <FileCode className="w-4 h-4 text-amber-400 shrink-0" />
          <span className="font-semibold text-slate-200 truncate">{filePath}</span>
          <span aria-hidden="true" className="text-slate-600">·</span>
          <span className="text-[11px] text-amber-400 font-medium uppercase">
            {lang}
          </span>
          {isDirty && (
            <span className="text-[11px] text-amber-400 font-bold" title="Unsaved changes">
              *
            </span>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setShowSearch((v) => !v)}
            title="Search (Cmd+F)"
            className={`min-h-[32px] px-2.5 py-1 rounded-lg text-xs flex items-center gap-1 transition-colors cursor-pointer ${
              showSearch
                ? 'bg-amber-500 text-slate-950 font-semibold'
                : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800'
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Find</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setShowSearch(true);
              setShowReplace((v) => !v);
            }}
            title="Replace (Cmd+H)"
            className={`min-h-[32px] px-2.5 py-1 rounded-lg text-xs flex items-center gap-1 transition-colors cursor-pointer ${
              showReplace
                ? 'bg-amber-500 text-slate-950 font-semibold'
                : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800'
            }`}
          >
            <Replace className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Replace</span>
          </button>

          <div className="h-4 w-px bg-slate-800 mx-1" />

          <button
            type="button"
            onClick={handleUndo}
            disabled={historyIndex <= 0}
            title="Undo (Cmd+Z)"
            className="min-h-[32px] min-w-[32px] p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent transition-colors cursor-pointer flex items-center justify-center"
          >
            <Undo2 className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={handleRedo}
            disabled={historyIndex >= history.length - 1}
            title="Redo (Cmd+Shift+Z)"
            className="min-h-[32px] min-w-[32px] p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent transition-colors cursor-pointer flex items-center justify-center"
          >
            <Redo2 className="w-3.5 h-3.5" />
          </button>

          <div className="h-4 w-px bg-slate-800 mx-1" />

          <button
            type="button"
            onClick={handleSave}
            title="Save to Project (Cmd+S)"
            className="min-h-[32px] px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
          >
            {saveSuccess ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Saved</span>
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" />
                <span>Save {isDirty ? '*' : ''}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 2. IN-EDITOR SEARCH & REPLACE BAR */}
      {showSearch && (
        <div className="p-3 border-b border-slate-800 bg-slate-900/95 space-y-2 text-xs">
          {/* Find Row */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentMatchIndex(0);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (e.shiftKey) handleFindPrev();
                    else handleFindNext();
                  } else if (e.key === 'Escape') {
                    setShowSearch(false);
                  }
                }}
                placeholder="Find in code (Enter / Shift+Enter)..."
                autoFocus
                className="w-full min-h-[32px] pl-8 pr-3 py-1 rounded-lg border border-slate-700 bg-slate-950 font-mono text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="flex items-center gap-1 text-[11px] text-slate-400 font-mono">
              <span>
                {matches.length > 0
                  ? `${currentMatchIndex + 1} of ${matches.length}`
                  : searchQuery
                  ? 'No matches'
                  : '0 matches'}
              </span>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleFindPrev}
                disabled={matches.length === 0}
                title="Previous match (Shift+Enter)"
                className="min-h-[30px] min-w-[30px] rounded border border-slate-800 bg-slate-950 hover:bg-slate-800 disabled:opacity-40 flex items-center justify-center text-slate-300"
              >
                <ChevronUp className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={handleFindNext}
                disabled={matches.length === 0}
                title="Next match (Enter)"
                className="min-h-[30px] min-w-[30px] rounded border border-slate-800 bg-slate-950 hover:bg-slate-800 disabled:opacity-40 flex items-center justify-center text-slate-300"
              >
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setCaseSensitive((v) => !v)}
                title="Match case"
                className={`min-h-[30px] px-2 rounded border text-xs font-semibold ${
                  caseSensitive
                    ? 'border-amber-500 text-amber-400 bg-amber-500/10'
                    : 'border-slate-800 text-slate-400 bg-slate-950 hover:bg-slate-800'
                }`}
              >
                Aa
              </button>
              <button
                type="button"
                onClick={() => setShowSearch(false)}
                title="Close find"
                className="min-h-[30px] min-w-[30px] rounded border border-slate-800 bg-slate-950 hover:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-slate-100"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Replace Row */}
          {showReplace && (
            <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-800/60">
              <div className="relative flex-1 min-w-[180px]">
                <Replace className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={replaceQuery}
                  onChange={(e) => setReplaceQuery(e.target.value)}
                  placeholder="Replace with..."
                  className="w-full min-h-[32px] pl-8 pr-3 py-1 rounded-lg border border-slate-700 bg-slate-950 font-mono text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleReplaceCurrent}
                  disabled={matches.length === 0}
                  className="min-h-[30px] px-3 rounded-lg border border-slate-800 bg-slate-950 hover:bg-slate-800 disabled:opacity-40 text-xs font-medium text-slate-200"
                >
                  Replace
                </button>
                <button
                  type="button"
                  onClick={handleReplaceAll}
                  disabled={matches.length === 0}
                  className="min-h-[30px] px-3 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs disabled:opacity-40"
                >
                  Replace All ({matches.length})
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 3. CODE EDITOR BODY (Gutter + Highlight Overlay + Textarea) */}
      <div className="flex-1 flex overflow-hidden relative bg-slate-950">
        {/* Line Numbers Gutter */}
        <div
          ref={lineGutterRef}
          aria-hidden="true"
          className="w-12 py-3 bg-slate-950 text-slate-600 font-mono text-xs select-none text-right pr-2 border-r border-slate-800/80 overflow-hidden shrink-0"
          style={{ lineHeight: '1.6rem' }}
        >
          {Array.from({ length: Math.max(totalLines, 1) }).map((_, i) => {
            const lineNum = i + 1;
            const hasError = errorLines.has(lineNum);
            return (
              <div
                key={lineNum}
                onClick={() => jumpToLine(lineNum, 1)}
                className={`flex items-center justify-end gap-1 cursor-pointer hover:text-amber-400 ${
                  hasError ? 'text-rose-500 font-bold' : ''
                }`}
                style={{ height: '1.6rem' }}
              >
                {hasError && <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />}
                <span>{lineNum}</span>
              </div>
            );
          })}
        </div>

        {/* Syntax Highlighted Overlay Container */}
        <div className="flex-1 relative overflow-hidden">
          {/* Syntax Highlighted <pre> (positioned directly beneath textarea) */}
          <pre
            ref={preRef}
            aria-hidden="true"
            className="absolute inset-0 p-3 m-0 bg-transparent text-slate-100 font-mono text-xs overflow-auto pointer-events-none whitespace-pre select-none"
            style={{
              lineHeight: '1.6rem',
              tabSize: 2,
              fontFamily: 'var(--font-mono)',
            }}
            dangerouslySetInnerHTML={{
              __html: highlightedCode + '\n',
            }}
          />

          {/* Editable Transparent Textarea (takes keyboard/mouse inputs with visible caret) */}
          <textarea
            ref={textareaRef}
            value={content}
            onChange={handleContentChange}
            onKeyDown={handleKeyDown}
            onSelect={handleSelect}
            onScroll={handleScroll}
            readOnly={readOnly}
            spellCheck={false}
            autoCapitalize="off"
            autoComplete="off"
            autoCorrect="off"
            className="absolute inset-0 p-3 m-0 w-full h-full bg-transparent text-transparent caret-amber-400 font-mono text-xs overflow-auto resize-none focus:outline-none whitespace-pre selection:bg-amber-500/30"
            style={{
              lineHeight: '1.6rem',
              tabSize: 2,
              fontFamily: 'var(--font-mono)',
            }}
          />
        </div>
      </div>

      {/* 4. DIAGNOSTICS & STATUS FOOTER */}
      <div className="px-3 py-1.5 border-t border-slate-800 bg-slate-900/90 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400 select-text">
        {/* Error Indicators */}
        <div className="flex items-center gap-2">
          {diagnostics.length > 0 ? (
            <div className="flex items-center gap-1.5 text-rose-400 font-medium">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>
                {diagnostics.length} {diagnostics.length === 1 ? 'syntax issue' : 'syntax issues'}
              </span>
              <span aria-hidden="true">·</span>
              <button
                type="button"
                onClick={() => jumpToLine(diagnostics[0].line, diagnostics[0].column)}
                className="hover:underline text-rose-300 truncate max-w-[260px] sm:max-w-md text-left"
              >
                Line {diagnostics[0].line}, Col {diagnostics[0].column}: {diagnostics[0].message}
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1 text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              <span>0 syntax errors · {lang.toUpperCase()} Validated</span>
            </div>
          )}
        </div>

        {/* Cursor position and charset */}
        <div className="flex items-center gap-3 font-mono tabular-nums text-slate-500">
          <span>
            Ln {cursorPos.line}, Col {cursorPos.col}
          </span>
          <span aria-hidden="true">·</span>
          <span>{totalLines} lines</span>
          <span aria-hidden="true">·</span>
          <span className="hidden sm:inline">UTF-8</span>
        </div>
      </div>
    </div>
  );
};
