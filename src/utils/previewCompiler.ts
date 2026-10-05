/**
 * SAZ Builder - Live Preview Compiler
 * 
 * Assembles and bundles HTML, CSS, and JavaScript files from a SAZ Project
 * into a self-contained, executable web document with runtime error tracking,
 * console interception, and navigation simulation.
 */

import { Project, ProjectFile } from '../types/saz';

export interface CompilationResult {
  html: string;
  diagnostics: string[];
  status: 'ready' | 'warning' | 'error';
  compiledAt: number;
  entryFile: string;
  cssCount: number;
  jsCount: number;
}

export interface PreviewConsoleMessage {
  id: string;
  level: 'log' | 'info' | 'warn' | 'error';
  message: string;
  timestamp: number;
  file?: string;
  line?: number;
  col?: number;
}

/**
 * Normalizes file path for comparison
 */
function cleanPath(p: string): string {
  return p.replace(/^\/+/, '').trim().toLowerCase();
}

/**
 * Compiles a project into a runnable HTML document
 */
export function compileProjectToHtml(
  project: Project,
  routePath: string = '/'
): CompilationResult {
  const startTime = Date.now();
  const diagnostics: string[] = [];
  const files = project.files || [];

  // 1. Locate primary HTML entrypoint
  let entryFile: ProjectFile | null = null;
  const htmlCandidates = ['index.html', 'preview.html', 'src/index.html', 'public/index.html'];

  for (const candidate of htmlCandidates) {
    const found = files.find((f) => cleanPath(f.path) === cleanPath(candidate));
    if (found) {
      entryFile = found;
      break;
    }
  }

  // Fallback: any file ending in .html
  if (!entryFile) {
    entryFile = files.find((f) => f.path.toLowerCase().endsWith('.html')) || null;
  }

  let baseHtml = '';
  let entryFileName = 'index.html';

  if (entryFile && entryFile.content.trim()) {
    baseHtml = entryFile.content;
    entryFileName = entryFile.path;
    diagnostics.push(`Loaded entrypoint: ${entryFile.path}`);
  } else if (project.previewHtml && project.previewHtml.trim()) {
    baseHtml = project.previewHtml;
    entryFileName = 'previewHtml (internal)';
    diagnostics.push('Loaded project previewHtml template');
  } else {
    // Generate default HTML document if no HTML file exists
    baseHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(project.name)}</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-slate-950 text-slate-100 min-h-screen p-6 font-sans">
  <div class="max-w-xl mx-auto space-y-4">
    <div class="border-b border-slate-800 pb-3">
      <h1 class="text-xl font-bold text-amber-400">${escapeHtml(project.name)}</h1>
      <p class="text-xs text-slate-400 mt-1">${escapeHtml(project.summary || 'Project initialized with SAZ Builder.')}</p>
    </div>
    <div class="p-4 rounded-xl border border-slate-800 bg-slate-900/50 text-sm">
      <p class="text-slate-300">Ready for development. Add <code class="text-amber-400 font-mono">index.html</code>, <code class="text-sky-400 font-mono">styles.css</code>, or <code class="text-emerald-400 font-mono">app.js</code> to build your application.</p>
    </div>
  </div>
</body>
</html>`;
    diagnostics.push('Generated fallback HTML scaffold');
  }

  // 2. Discover CSS files
  const cssFiles = files.filter(
    (f) => f.path.toLowerCase().endsWith('.css') && f.content.trim()
  );

  // 3. Discover JS/TS files (pure JS or executable scripts)
  const jsFiles = files.filter(
    (f) =>
      (f.path.toLowerCase().endsWith('.js') ||
        f.path.toLowerCase().endsWith('.mjs')) &&
      f.content.trim()
  );

  // 4. Resolve & inline <link rel="stylesheet"> references
  const inlinedCssPaths = new Set<string>();

  let processedHtml = baseHtml.replace(
    /<link\s+[^>]*rel=["']stylesheet["'][^>]*href=["']([^"']+)["'][^>]*\/?>/gi,
    (match, href) => {
      const targetName = cleanPath(href.split('?')[0]);
      const matched = cssFiles.find((f) => {
        const p = cleanPath(f.path);
        return p === targetName || p.endsWith('/' + targetName) || targetName.endsWith('/' + p);
      });

      if (matched) {
        inlinedCssPaths.add(matched.path);
        diagnostics.push(`Inlined linked stylesheet: ${matched.path}`);
        return `<style data-source="${escapeHtml(matched.path)}">\n/* [SAZ Inlined] ${matched.path} */\n${matched.content}\n</style>`;
      }
      return match;
    }
  );

  // Also check reversed attribute order: href="..." rel="stylesheet"
  processedHtml = processedHtml.replace(
    /<link\s+[^>]*href=["']([^"']+)["'][^>]*rel=["']stylesheet["'][^>]*\/?>/gi,
    (match, href) => {
      const targetName = cleanPath(href.split('?')[0]);
      const matched = cssFiles.find((f) => {
        const p = cleanPath(f.path);
        return p === targetName || p.endsWith('/' + targetName) || targetName.endsWith('/' + p);
      });

      if (matched) {
        inlinedCssPaths.add(matched.path);
        diagnostics.push(`Inlined linked stylesheet: ${matched.path}`);
        return `<style data-source="${escapeHtml(matched.path)}">\n/* [SAZ Inlined] ${matched.path} */\n${matched.content}\n</style>`;
      }
      return match;
    }
  );

  // Inject remaining standalone project CSS files into <head>
  const remainingCss = cssFiles.filter((f) => !inlinedCssPaths.has(f.path));
  if (remainingCss.length > 0) {
    const combinedStyles = remainingCss
      .map((f) => `/* [SAZ Project CSS] ${f.path} */\n${f.content}`)
      .join('\n\n');
    const styleTag = `<style data-saz-bundle="project-css">\n${combinedStyles}\n</style>`;

    if (processedHtml.includes('</head>')) {
      processedHtml = processedHtml.replace('</head>', `${styleTag}\n</head>`);
    } else {
      processedHtml = `${styleTag}\n${processedHtml}`;
    }
    diagnostics.push(`Injected ${remainingCss.length} additional CSS stylesheet(s)`);
  }

  // 5. Resolve & inline <script src="..."> references
  const inlinedJsPaths = new Set<string>();

  processedHtml = processedHtml.replace(
    /<script\s+[^>]*src=["']([^"']+)["'][^>]*>\s*<\/script>/gi,
    (match, src) => {
      // Don't touch external CDNs or absolute http/https URLs
      if (src.startsWith('http://') || src.startsWith('https://') || src.startsWith('//')) {
        return match;
      }

      const targetName = cleanPath(src.split('?')[0]);
      const matched = jsFiles.find((f) => {
        const p = cleanPath(f.path);
        return p === targetName || p.endsWith('/' + targetName) || targetName.endsWith('/' + p);
      });

      if (matched) {
        inlinedJsPaths.add(matched.path);
        diagnostics.push(`Inlined linked script: ${matched.path}`);
        return `<script data-source="${escapeHtml(matched.path)}">\n// [SAZ Inlined] ${matched.path}\n${matched.content}\n</script>`;
      }
      return match;
    }
  );

  // Inject remaining standalone JS files before </body>
  const remainingJs = jsFiles.filter((f) => !inlinedJsPaths.has(f.path));
  if (remainingJs.length > 0) {
    const combinedScripts = remainingJs
      .map((f) => `// [SAZ Project Script] ${f.path}\n${f.content}`)
      .join('\n\n');
    const scriptTag = `<script data-saz-bundle="project-js">\n${combinedScripts}\n</script>`;

    if (processedHtml.includes('</body>')) {
      processedHtml = processedHtml.replace('</body>', `${scriptTag}\n</body>`);
    } else {
      processedHtml = `${processedHtml}\n${scriptTag}`;
    }
    diagnostics.push(`Injected ${remainingJs.length} standalone JavaScript file(s)`);
  }

  // 6. Inject the SAZ Live Preview Runtime Bridge into <head>
  const devPort = project.settings?.devPort || 3000;
  const runtimeBridgeScript = `
<script id="__saz_preview_bridge__">
(function() {
  var origLog = console.log;
  var origWarn = console.warn;
  var origError = console.error;
  var origInfo = console.info;

  function safeSerialize(arg) {
    if (arg === null) return 'null';
    if (arg === undefined) return 'undefined';
    if (typeof arg === 'string') return arg;
    if (typeof arg === 'number' || typeof arg === 'boolean') return String(arg);
    if (arg instanceof Error) return arg.name + ': ' + arg.message + '\\n' + (arg.stack || '');
    try {
      return JSON.stringify(arg, null, 2);
    } catch (e) {
      return Object.prototype.toString.call(arg);
    }
  }

  function broadcast(level, args) {
    try {
      var text = Array.from(args).map(safeSerialize).join(' ');
      window.parent.postMessage({
        type: 'SAZ_PREVIEW_CONSOLE',
        level: level,
        message: text,
        timestamp: Date.now()
      }, '*');
    } catch(e) {}
  }

  console.log = function() { broadcast('log', arguments); origLog.apply(console, arguments); };
  console.warn = function() { broadcast('warn', arguments); origWarn.apply(console, arguments); };
  console.error = function() { broadcast('error', arguments); origError.apply(console, arguments); };
  console.info = function() { broadcast('info', arguments); origInfo.apply(console, arguments); };

  window.addEventListener('error', function(e) {
    var msg = (e && e.message) ? e.message : 'Unknown runtime error';
    var file = e && e.filename ? e.filename : 'script';
    var line = e && e.lineno ? e.lineno : 0;
    var col = e && e.colno ? e.colno : 0;
    
    broadcast('error', [msg + ' (' + file + ':' + line + ':' + col + ')']);
    window.parent.postMessage({
      type: 'SAZ_PREVIEW_RUNTIME_ERROR',
      message: msg,
      file: file,
      line: line,
      col: col,
      timestamp: Date.now()
    }, '*');
  });

  window.addEventListener('unhandledrejection', function(e) {
    var reason = e.reason ? (e.reason.message || String(e.reason)) : 'Unhandled Promise Rejection';
    broadcast('error', ['Unhandled Rejection: ' + reason]);
    window.parent.postMessage({
      type: 'SAZ_PREVIEW_RUNTIME_ERROR',
      message: 'Unhandled Rejection: ' + reason,
      timestamp: Date.now()
    }, '*');
  });

  // Simulated Route & Navigation Watcher
  window.__sazRoutePath = ${JSON.stringify(routePath)};
  
  // Intercept anchor link clicks to avoid breaking iframe sandbox
  document.addEventListener('click', function(e) {
    var target = e.target;
    while (target && target.tagName !== 'A') {
      target = target.parentElement;
    }
    if (target && target.getAttribute('href')) {
      var href = target.getAttribute('href');
      if (href && !href.startsWith('http') && !href.startsWith('mailto:') && !href.startsWith('tel:')) {
        e.preventDefault();
        window.parent.postMessage({
          type: 'SAZ_PREVIEW_ROUTE_CHANGE',
          route: href,
          timestamp: Date.now()
        }, '*');
      }
    }
  }, true);

  // Notify parent container that sandbox document is mounted
  window.addEventListener('DOMContentLoaded', function() {
    window.parent.postMessage({
      type: 'SAZ_PREVIEW_MOUNTED',
      title: document.title || ${JSON.stringify(project.name)},
      port: ${devPort},
      timestamp: Date.now()
    }, '*');
  });
})();
</script>
`;

  if (processedHtml.includes('<head>')) {
    processedHtml = processedHtml.replace('<head>', `<head>\n${runtimeBridgeScript}`);
  } else if (processedHtml.includes('<html>')) {
    processedHtml = processedHtml.replace('<html>', `<html><head>${runtimeBridgeScript}</head>`);
  } else {
    processedHtml = `${runtimeBridgeScript}\n${processedHtml}`;
  }

  const duration = Date.now() - startTime;
  diagnostics.push(`Compilation completed in ${duration}ms`);

  return {
    html: processedHtml,
    diagnostics,
    status: 'ready',
    compiledAt: Date.now(),
    entryFile: entryFileName,
    cssCount: cssFiles.length,
    jsCount: jsFiles.length,
  };
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
