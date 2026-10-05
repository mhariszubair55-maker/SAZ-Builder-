import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  RotateCw,
  Maximize2,
  Minimize2,
  Smartphone,
  Monitor,
  Tablet,
  ArrowLeft,
  ArrowRight,
  Copy,
  Check,
  Terminal,
  AlertCircle,
  AlertTriangle,
  Info,
  X,
  ExternalLink,
  Sparkles,
  Wifi,
  Battery,
  Layers,
  RotateCcw,
  Bot,
} from 'lucide-react';
import { Project } from '../types/saz';
import { useBuilder } from '../context/BuilderContext';
import {
  compileProjectToHtml,
  CompilationResult,
  PreviewConsoleMessage,
} from '../utils/previewCompiler';

interface LivePreviewEngineProps {
  project: Project;
  initialMode?: 'mobile' | 'desktop';
  className?: string;
  onCodeNavigate?: (filePath: string) => void;
  onAgentNavigate?: () => void;
  onTerminalNavigate?: () => void;
}

type DevicePreset = 'iphone15' | 'compact' | 'promax' | 'tablet' | 'desktop1280' | 'fluid';

export const LivePreviewEngine: React.FC<LivePreviewEngineProps> = ({
  project,
  initialMode = 'desktop',
  className = '',
  onCodeNavigate,
  onAgentNavigate,
  onTerminalNavigate,
}) => {
  const { addProjectError, fixErrorWithAI } = useBuilder();
  // Viewport mode: 'mobile' vs 'desktop'
  const [viewportMode, setViewportMode] = useState<'mobile' | 'desktop'>(() => {
    if (project.settings?.mobileFirst) return 'mobile';
    return initialMode;
  });

  // Mobile device presets
  const [mobilePreset, setMobilePreset] = useState<'iphone15' | 'compact' | 'promax'>('iphone15');
  const [mobileOrientation, setMobileOrientation] = useState<'portrait' | 'landscape'>('portrait');

  // Desktop preset
  const [desktopPreset, setDesktopPreset] = useState<'fluid' | 'desktop1280' | 'tablet'>('fluid');

  // Fullscreen state
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Address Bar URL & State
  const devPort = project.settings?.devPort || 3000;
  const [currentPath, setCurrentPath] = useState('/');
  const [pathDraft, setPathDraft] = useState('/');
  const [historyStack, setHistoryStack] = useState<string[]>(['/']);
  const [historyIndex, setHistoryIndex] = useState(0);

  // Iframe refresh & loading
  const [refreshKey, setRefreshKey] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastCompiledAt, setLastCompiledAt] = useState<number>(Date.now());
  const [justUpdatedNotice, setJustUpdatedNotice] = useState(false);

  // Copy notice
  const [copiedUrl, setCopiedUrl] = useState(false);

  // Console Drawer & Messages
  const [isConsoleOpen, setIsConsoleOpen] = useState(false);
  const [consoleFilter, setConsoleFilter] = useState<'all' | 'error' | 'warn' | 'log'>('all');
  const [consoleLogs, setConsoleLogs] = useState<PreviewConsoleMessage[]>([]);
  const [runtimeErrorCount, setRuntimeErrorCount] = useState(0);

  // Compiled HTML Bundle
  const [compilation, setCompilation] = useState<CompilationResult>(() =>
    compileProjectToHtml(project, '/')
  );

  // Re-compile whenever project files or settings change
  useEffect(() => {
    const res = compileProjectToHtml(project, currentPath);
    setCompilation(res);
    setLastCompiledAt(Date.now());
    setJustUpdatedNotice(true);
    const t = setTimeout(() => setJustUpdatedNotice(false), 2200);
    return () => clearTimeout(t);
  }, [project.files, project.previewHtml, project.settings, currentPath]);

  // Synchronize path draft with current path
  useEffect(() => {
    setPathDraft(currentPath);
  }, [currentPath]);

  // Listen to messages from inside the iframe runtime bridge
  useEffect(() => {
    const handleWindowMessage = (event: MessageEvent) => {
      const data = event.data;
      if (!data || typeof data !== 'object') return;

      if (data.type === 'SAZ_PREVIEW_CONSOLE') {
        const msg: PreviewConsoleMessage = {
          id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          level: data.level || 'log',
          message: data.message || '',
          timestamp: data.timestamp || Date.now(),
        };

        setConsoleLogs((prev) => [msg, ...prev.slice(0, 99)]);
        if (data.level === 'error') {
          setRuntimeErrorCount((c) => c + 1);
        }
      } else if (data.type === 'SAZ_PREVIEW_RUNTIME_ERROR') {
        const msg: PreviewConsoleMessage = {
          id: `err-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          level: 'error',
          message: data.message || 'Unknown runtime error',
          timestamp: data.timestamp || Date.now(),
          file: data.file,
          line: data.line,
          col: data.col,
        };
        setConsoleLogs((prev) => [msg, ...prev.slice(0, 99)]);
        setRuntimeErrorCount((c) => c + 1);
        addProjectError({
          category: 'runtime',
          severity: 'error',
          title: `Runtime Error: ${data.file ? data.file.split('/').pop() : 'Preview Engine'}`,
          message: data.message || 'Unknown runtime error in preview',
          sourceFile: data.file,
          line: data.line,
          col: data.col,
        });
      } else if (data.type === 'SAZ_PREVIEW_ROUTE_CHANGE') {
        const newRoute = data.route || '/';
        navigateToRoute(newRoute);
      }
    };

    window.addEventListener('message', handleWindowMessage);
    return () => window.removeEventListener('message', handleWindowMessage);
  }, [historyIndex, historyStack]);

  // Handle Fullscreen Esc key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen]);

  // Navigate to a route
  const navigateToRoute = (rawRoute: string) => {
    let clean = rawRoute.trim();
    if (!clean.startsWith('/') && !clean.startsWith('?') && !clean.startsWith('#')) {
      clean = '/' + clean;
    }
    setCurrentPath(clean);
    setPathDraft(clean);

    // Update history stack
    const nextStack = historyStack.slice(0, historyIndex + 1);
    nextStack.push(clean);
    setHistoryStack(nextStack);
    setHistoryIndex(nextStack.length - 1);
  };

  // Back navigation
  const handleGoBack = () => {
    if (historyIndex > 0) {
      const prevIdx = historyIndex - 1;
      setHistoryIndex(prevIdx);
      const target = historyStack[prevIdx];
      setCurrentPath(target);
      setPathDraft(target);
    }
  };

  // Forward navigation
  const handleGoForward = () => {
    if (historyIndex < historyStack.length - 1) {
      const nextIdx = historyIndex + 1;
      setHistoryIndex(nextIdx);
      const target = historyStack[nextIdx];
      setCurrentPath(target);
      setPathDraft(target);
    }
  };

  // Address Bar Submit
  const handleAddressSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    navigateToRoute(pathDraft);
  };

  // Refresh handler
  const handleRefresh = () => {
    setIsRefreshing(true);
    setRefreshKey((k) => k + 1);
    setTimeout(() => setIsRefreshing(false), 350);
  };

  // Copy Preview URL
  const handleCopyUrl = () => {
    const fullUrl = `http://localhost:${devPort}${currentPath}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 1600);
  };

  // Toggle fullscreen mode
  const handleToggleFullscreen = () => {
    setIsFullscreen((prev) => !prev);
  };

  // Clear console
  const handleClearConsole = () => {
    setConsoleLogs([]);
    setRuntimeErrorCount(0);
  };

  // Filtered console messages
  const filteredConsoleLogs = consoleLogs.filter((log) => {
    if (consoleFilter === 'all') return true;
    return log.level === consoleFilter;
  });

  // Calculate viewport dimensions
  const getViewportDimensions = () => {
    if (viewportMode === 'mobile') {
      let width = 390;
      let height = 844;

      if (mobilePreset === 'compact') {
        width = 375;
        height = 667;
      } else if (mobilePreset === 'promax') {
        width = 430;
        height = 932;
      }

      if (mobileOrientation === 'landscape') {
        return { width: height, height: Math.min(width, 420) };
      }
      return { width, height: Math.min(height, 680) };
    } else {
      // Desktop presets
      if (desktopPreset === 'desktop1280') {
        return { width: 1280, height: 640 };
      } else if (desktopPreset === 'tablet') {
        return { width: 768, height: 640 };
      }
      return { width: '100%', height: 600 };
    }
  };

  const dims = getViewportDimensions();

  return (
    <div
      ref={containerRef}
      className={`flex flex-col bg-slate-950 text-slate-100 rounded-2xl border border-slate-800 overflow-hidden shadow-2xl transition-all duration-200 ${
        isFullscreen
          ? 'fixed inset-0 z-50 rounded-none border-none h-screen w-screen'
          : className
      }`}
      role="region"
      aria-label="Live Preview Engine"
    >
      {/* 1. TOP BROWSER CONTROLS BAR */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 px-3.5 sm:px-4 py-2.5 border-b border-slate-800 bg-slate-900/90 backdrop-blur-md">
        {/* Left: Window Controls + History Nav + Address Bar */}
        <div className="flex items-center gap-2 flex-1 min-w-[280px]">
          {/* Mac-style Window Dots */}
          <div className="hidden sm:flex items-center gap-1.5 mr-1" aria-hidden="true">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80 inline-block" />
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80 inline-block" />
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 inline-block" />
          </div>

          {/* Back & Forward Navigation */}
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              onClick={handleGoBack}
              disabled={historyIndex <= 0}
              title="Go Back"
              className="min-h-[32px] min-w-[32px] p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer disabled:cursor-not-allowed transition-colors flex items-center justify-center"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleGoForward}
              disabled={historyIndex >= historyStack.length - 1}
              title="Go Forward"
              className="min-h-[32px] min-w-[32px] p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer disabled:cursor-not-allowed transition-colors flex items-center justify-center"
            >
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleRefresh}
              title="Refresh Preview (Reset state)"
              className="min-h-[32px] min-w-[32px] p-1.5 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-slate-800 cursor-pointer transition-colors flex items-center justify-center"
            >
              <RotateCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-amber-400' : ''}`} />
            </button>
          </div>

          {/* Interactive Address Bar */}
          <form
            onSubmit={handleAddressSubmit}
            className="flex-1 flex items-center min-w-0 bg-slate-950 border border-slate-800 hover:border-slate-700 focus-within:border-amber-500 rounded-xl px-2.5 py-1 transition-all"
          >
            <span className="text-[11px] font-mono text-slate-500 select-none mr-1.5 hidden sm:inline whitespace-nowrap">
              http://localhost:{devPort}
            </span>
            <input
              type="text"
              value={pathDraft}
              onChange={(e) => setPathDraft(e.target.value)}
              placeholder="/"
              aria-label="Preview URL Route"
              className="w-full bg-transparent font-mono text-xs text-slate-200 placeholder-slate-500 focus:outline-none"
            />
            <button
              type="button"
              onClick={handleCopyUrl}
              title="Copy Preview URL"
              className="min-h-[28px] min-w-[28px] p-1 text-slate-400 hover:text-slate-200 ml-1 rounded flex items-center justify-center cursor-pointer"
            >
              {copiedUrl ? (
                <Check className="w-3 h-3 text-emerald-400" />
              ) : (
                <Copy className="w-3 h-3" />
              )}
            </button>
          </form>
        </div>

        {/* Right: Viewport Controls, Terminal Toggle, Fullscreen */}
        <div className="flex items-center gap-1.5">
          {/* Status Badge */}
          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-[11px] font-mono">
            {runtimeErrorCount > 0 ? (
              <>
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                <span className="text-rose-400 font-semibold">{runtimeErrorCount} Error{runtimeErrorCount > 1 ? 's' : ''}</span>
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
                <span className="text-slate-300">Live · 200 OK</span>
              </>
            )}
            {justUpdatedNotice && (
              <span className="text-amber-400 font-sans text-[10px] ml-1 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                Synced
              </span>
            )}
          </div>

          {/* Viewport Mode Switcher */}
          <div className="flex items-center p-0.5 rounded-xl bg-slate-950 border border-slate-800">
            <button
              type="button"
              onClick={() => setViewportMode('mobile')}
              className={`min-h-[32px] px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 cursor-pointer transition-colors ${
                viewportMode === 'mobile'
                  ? 'bg-amber-500 text-slate-950 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Mobile</span>
            </button>
            <button
              type="button"
              onClick={() => setViewportMode('desktop')}
              className={`min-h-[32px] px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 cursor-pointer transition-colors ${
                viewportMode === 'desktop'
                  ? 'bg-amber-500 text-slate-950 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Monitor className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Desktop</span>
            </button>
          </div>

          {/* Presets and orientation dropdowns depending on mode */}
          {viewportMode === 'mobile' ? (
            <div className="hidden sm:flex items-center gap-1">
              <select
                value={mobilePreset}
                onChange={(e) => setMobilePreset(e.target.value as any)}
                className="min-h-[32px] px-2 py-1 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-slate-300 focus:outline-none cursor-pointer"
              >
                <option value="iphone15">iPhone 15 (390px)</option>
                <option value="compact">Compact (375px)</option>
                <option value="promax">Pro Max (430px)</option>
              </select>
              <button
                type="button"
                onClick={() =>
                  setMobileOrientation((o) => (o === 'portrait' ? 'landscape' : 'portrait'))
                }
                title="Rotate Orientation"
                className="min-h-[32px] px-2 py-1 rounded-lg border border-slate-800 bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-slate-200 text-xs font-mono flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span className="text-[10px] uppercase">{mobileOrientation}</span>
              </button>
            </div>
          ) : (
            <div className="hidden sm:flex items-center gap-1">
              <select
                value={desktopPreset}
                onChange={(e) => setDesktopPreset(e.target.value as any)}
                className="min-h-[32px] px-2 py-1 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-slate-300 focus:outline-none cursor-pointer"
              >
                <option value="fluid">Full Canvas (100%)</option>
                <option value="desktop1280">Laptop 1280px</option>
                <option value="tablet">iPad 768px</option>
              </select>
            </div>
          )}

          {/* Coding Agent Shortcut */}
          {onAgentNavigate && (
            <button
              type="button"
              onClick={onAgentNavigate}
              title="Open Autonomous Coding Agent"
              className="min-h-[32px] px-2.5 py-1 rounded-lg border border-slate-800 bg-slate-950 hover:bg-slate-800 text-slate-300 hover:text-amber-300 text-xs font-mono flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <Bot className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Agent</span>
            </button>
          )}

          {/* Live Console Drawer Toggle */}
          <button
            type="button"
            onClick={() => setIsConsoleOpen((open) => !open)}
            title="Toggle Live Console Drawer"
            className={`min-h-[32px] px-2.5 py-1 rounded-lg border text-xs font-mono flex items-center gap-1.5 cursor-pointer transition-colors ${
              isConsoleOpen
                ? 'bg-slate-800 text-amber-300 border-amber-500/50'
                : runtimeErrorCount > 0
                ? 'bg-rose-950/60 text-rose-300 border-rose-800/80 hover:bg-rose-900/60'
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Console</span>
            {consoleLogs.length > 0 && (
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  runtimeErrorCount > 0
                    ? 'bg-rose-500 text-white'
                    : 'bg-slate-800 text-slate-300'
                }`}
              >
                {consoleLogs.length}
              </span>
            )}
          </button>

          {/* Fullscreen Toggle */}
          <button
            type="button"
            onClick={handleToggleFullscreen}
            title={isFullscreen ? 'Exit Fullscreen (Esc)' : 'Enter Fullscreen'}
            className="min-h-[32px] min-w-[32px] p-1.5 rounded-lg border border-slate-800 bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-slate-100 flex items-center justify-center cursor-pointer transition-colors"
          >
            {isFullscreen ? (
              <Minimize2 className="w-3.5 h-3.5 text-amber-400" />
            ) : (
              <Maximize2 className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>

      {/* 2. MAIN PREVIEW VIEWPORT AREA */}
      <div className="flex-1 bg-slate-950/70 p-3 sm:p-6 overflow-auto flex items-center justify-center relative min-h-[460px]">
        {/* Floating exit fullscreen banner */}
        {isFullscreen && (
          <div className="absolute top-4 right-4 z-40 bg-slate-900/90 border border-slate-700/80 backdrop-blur-md px-3 py-1.5 rounded-xl shadow-2xl flex items-center gap-2">
            <span className="text-xs text-slate-300">Fullscreen Active</span>
            <button
              type="button"
              onClick={handleToggleFullscreen}
              className="text-xs font-semibold px-2 py-0.5 rounded bg-amber-500 text-slate-950 hover:bg-amber-400 cursor-pointer"
            >
              Exit (Esc)
            </button>
          </div>
        )}

        {/* Viewport Frame Container */}
        {viewportMode === 'mobile' ? (
          /* REALISTIC MOBILE DEVICE FRAME */
          <div
            className="transition-all duration-200 rounded-[44px] p-3 bg-slate-900 border-4 border-slate-700/80 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8)] relative flex flex-col items-center"
            style={{
              width: typeof dims.width === 'number' ? `${dims.width}px` : dims.width,
              height: typeof dims.height === 'number' ? `${dims.height}px` : dims.height,
              maxWidth: '100%',
            }}
          >
            {/* Phone Screen Glass Container */}
            <div className="w-full h-full rounded-[34px] overflow-hidden bg-slate-950 border border-slate-800 flex flex-col relative shadow-inner">
              {/* Dynamic Island / Top Bezel Status Bar */}
              <div className="w-full h-10 bg-slate-950 px-6 flex items-center justify-between text-[11px] font-mono text-slate-300 shrink-0 select-none z-10">
                <span className="font-semibold text-slate-200">9:41</span>
                {/* Dynamic Island Pill */}
                <div className="w-20 h-4 bg-slate-900 rounded-full border border-slate-800 mx-auto" />
                <div className="flex items-center gap-1.5 text-slate-400">
                  <Wifi className="w-3 h-3" />
                  <Battery className="w-3.5 h-3.5" />
                </div>
              </div>

              {/* Sandboxed Iframe Output */}
              <div className="flex-1 w-full relative bg-slate-950 overflow-hidden">
                <iframe
                  key={refreshKey}
                  title={`${project.name} Mobile Preview`}
                  srcDoc={compilation.html}
                  className="w-full h-full border-0 block"
                  sandbox="allow-scripts allow-forms allow-modals allow-same-origin"
                />
              </div>

              {/* Bottom Home Indicator Bar */}
              <div className="w-full h-4 bg-slate-950 flex items-center justify-center shrink-0">
                <div className="w-32 h-1 bg-slate-600/60 rounded-full" />
              </div>
            </div>
          </div>
        ) : (
          /* DESKTOP FULL CANVAS / RESPONSIVE FRAME */
          <div
            className="transition-all duration-200 w-full h-full rounded-xl overflow-hidden border border-slate-800 bg-slate-950 shadow-2xl flex flex-col"
            style={{
              maxWidth: typeof dims.width === 'number' ? `${dims.width}px` : dims.width,
              height: typeof dims.height === 'number' ? `${dims.height}px` : dims.height,
            }}
          >
            {/* Desktop Canvas Window Header */}
            <div className="px-4 py-2 bg-slate-900/60 border-b border-slate-800 flex items-center justify-between text-xs text-slate-400 shrink-0 select-none">
              <div className="flex items-center gap-2">
                <span className="font-mono text-amber-400 font-semibold">{project.name}</span>
                <span className="text-slate-600">·</span>
                <span className="text-slate-400">{project.framework}</span>
              </div>
              <div className="text-[11px] font-mono text-slate-500">
                Entry: {compilation.entryFile} ({compilation.cssCount} CSS, {compilation.jsCount} JS)
              </div>
            </div>

            {/* Sandboxed Iframe Output */}
            <div className="flex-1 w-full relative bg-slate-950 overflow-hidden">
              <iframe
                key={refreshKey}
                title={`${project.name} Desktop Canvas Preview`}
                srcDoc={compilation.html}
                className="w-full h-full border-0 block"
                sandbox="allow-scripts allow-forms allow-modals allow-same-origin"
              />
            </div>
          </div>
        )}
      </div>

      {/* 3. COLLAPSIBLE LIVE CONSOLE DRAWER */}
      {isConsoleOpen && (
        <div className="border-t border-slate-800 bg-slate-950 flex flex-col h-56 transition-all duration-200">
          {/* Console Header Bar */}
          <div className="flex items-center justify-between px-4 py-2 border-b border-slate-800/80 bg-slate-900/80 shrink-0">
            <div className="flex items-center gap-2">
              <Terminal className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-xs font-semibold text-slate-200">Sandbox Console</span>
              <span className="text-[11px] font-mono text-slate-500">
                ({consoleLogs.length} events)
              </span>
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1">
              {(['all', 'error', 'warn', 'log'] as const).map((lvl) => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => setConsoleFilter(lvl)}
                  className={`min-h-[26px] px-2 py-0.5 rounded text-[11px] font-mono uppercase cursor-pointer transition-colors ${
                    consoleFilter === lvl
                      ? 'bg-slate-800 text-amber-400 font-semibold'
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  {lvl}
                </button>
              ))}

              <div className="h-4 w-px bg-slate-800 mx-1" />

              {onTerminalNavigate && (
                <button
                  type="button"
                  onClick={onTerminalNavigate}
                  className="text-xs text-amber-400 hover:text-amber-300 px-2 py-0.5 rounded hover:bg-slate-800 cursor-pointer flex items-center gap-1 font-mono"
                >
                  <Terminal className="w-3 h-3" />
                  <span>Open Terminal</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleClearConsole}
                className="text-xs text-slate-400 hover:text-slate-200 px-2 py-0.5 rounded hover:bg-slate-800 cursor-pointer"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={() => setIsConsoleOpen(false)}
                className="text-slate-400 hover:text-slate-200 p-1 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Console Output List */}
          <div className="flex-1 overflow-y-auto p-3 font-mono text-xs space-y-1.5 divide-y divide-slate-900">
            {filteredConsoleLogs.length === 0 ? (
              <div className="text-slate-500 text-xs italic py-4 text-center">
                Console is idle. User interactions, console.log, and runtime events will appear here in real time.
              </div>
            ) : (
              filteredConsoleLogs.map((log) => {
                let badgeClass = 'text-slate-400 bg-slate-800/60';
                let Icon = Info;
                if (log.level === 'error') {
                  badgeClass = 'text-rose-400 bg-rose-950/60 border border-rose-800/40';
                  Icon = AlertCircle;
                } else if (log.level === 'warn') {
                  badgeClass = 'text-amber-400 bg-amber-950/60 border border-amber-800/40';
                  Icon = AlertTriangle;
                }

                return (
                  <div key={log.id} className="pt-1.5 flex items-start gap-2.5">
                    <span className="text-[10px] text-slate-600 shrink-0 pt-0.5">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                    <span
                      className={`text-[10px] uppercase font-bold px-1.5 py-0.2 rounded shrink-0 flex items-center gap-1 ${badgeClass}`}
                    >
                      <Icon className="w-3 h-3" />
                      <span>{log.level}</span>
                    </span>
                    <span
                      className={`break-all flex-1 whitespace-pre-wrap ${
                        log.level === 'error'
                          ? 'text-rose-300 font-medium'
                          : log.level === 'warn'
                          ? 'text-amber-300'
                          : 'text-slate-300'
                      }`}
                    >
                      {log.message}
                    </span>
                    {log.file && (
                      <span className="text-[10px] text-slate-500 shrink-0">
                        {log.file}:{log.line}
                      </span>
                    )}
                    {log.level === 'error' && onTerminalNavigate && (
                      <button
                        type="button"
                        onClick={onTerminalNavigate}
                        title="Open Terminal & Diagnostics to fix with Gemini AI"
                        className="ml-1.5 px-2 py-0.5 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[10px] flex items-center gap-1 shrink-0 cursor-pointer shadow transition"
                      >
                        <Sparkles className="w-2.5 h-2.5" />
                        <span>Fix with AI</span>
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
