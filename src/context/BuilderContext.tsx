import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  AppView,
  ArchitectureModule,
  BuilderEvent,
  FrameworkTarget,
  Project,
  ProjectFile,
  ProjectSettings,
  ProjectStatus,
  TemplateBlueprint,
  WorkspaceSettings,
} from '../types/saz';
import {
  DEFAULT_SETTINGS,
  INITIAL_PROJECTS,
  INITIAL_TEMPLATES,
  createDefaultProjectSettings,
} from '../data/seedData';
import { compileProjectToHtml } from '../utils/previewCompiler';
import { AgentSession, AgentRunResponse } from '../types/agent';
import {
  ProjectSystemError,
  TerminalOutputLine,
  TerminalExecResponse,
  FixErrorResponse,
} from '../types/terminal';
import { useAuth } from './AuthContext';
import {
  saveProjectToFirestore,
  deleteProjectFromFirestore,
  subscribeToUserProjects,
} from '../lib/firebase';
import { downloadProjectZip } from '../utils/zipExport';

const STORAGE_KEYS = {
  PROJECTS: 'saz_builder_projects_v2',
  SETTINGS: 'saz_builder_settings_v2',
};

const generateUniqueProjectId = (): string => {
  const timestamp = Date.now().toString(36);
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  return `proj_${timestamp}_${randomSuffix}`;
};

const normalizePath = (p: string): string => {
  return p
    .trim()
    .replace(/\\/g, '/')
    .replace(/\/+/g, '/')
    .replace(/^\/+/, '')
    .replace(/\/+$/, '');
};

interface SynthesizeOptions {
  prompt: string;
  projectName?: string;
  framework?: FrameworkTarget;
  modules?: ArchitectureModule[];
  category?: string;
  targetProjectId?: string;
}

interface CreateProjectParams {
  name: string;
  summary?: string;
  category?: string;
  framework?: FrameworkTarget;
  modules?: ArchitectureModule[];
  initialFiles?: ProjectFile[];
  initialFolders?: string[];
  settings?: Partial<ProjectSettings>;
}

interface BuilderContextValue {
  activeView: AppView;
  setActiveView: (view: AppView) => void;
  projects: Project[];
  templates: TemplateBlueprint[];
  settings: WorkspaceSettings;
  updateSettings: (partial: Partial<WorkspaceSettings>) => void;
  resetWorkspace: () => void;
  activeStudioProject: Project | null;
  openProjectInStudio: (projectId: string) => void;
  closeStudio: () => void;
  isSynthesizing: boolean;
  synthesisStatus: string;
  synthesizeApp: (options: SynthesizeOptions) => Promise<Project>;
  createProject: (params: CreateProjectParams) => Project;
  createBlankProject: (params: {
    name: string;
    summary: string;
    category: string;
    framework: FrameworkTarget;
    modules: ArchitectureModule[];
  }) => Project;
  createFromTemplate: (template: TemplateBlueprint, customName?: string) => Project;
  renameProject: (projectId: string, newName: string) => void;
  updateProjectStatus: (projectId: string, status: ProjectStatus) => void;
  updateProjectSettings: (projectId: string, partial: Partial<ProjectSettings>) => void;
  toggleProjectStar: (projectId: string) => void;
  duplicateProject: (projectId: string, customName?: string) => Project | null;
  deleteProject: (projectId: string) => void;

  // Real Project File System Operations
  addProjectFile: (projectId: string, filePath: string, language: string, content?: string) => boolean;
  createProjectFolder: (projectId: string, folderPath: string) => boolean;
  renameProjectFile: (projectId: string, oldPath: string, newPath: string) => boolean;
  renameProjectFolder: (projectId: string, oldFolderPath: string, newFolderPath: string) => boolean;
  deleteProjectFile: (projectId: string, filePath: string) => void;
  deleteProjectFolder: (projectId: string, folderPath: string) => void;
  moveProjectItem: (projectId: string, itemPath: string, destinationFolder: string, isFolder: boolean) => boolean;
  updateProjectFile: (projectId: string, filePath: string, newContent: string) => void;
  updateProjectPreviewHtml: (projectId: string, newHtml: string) => void;

  // Real Autonomous Coding Agent State & Handlers
  activeAgentSession: AgentSession | null;
  isAgentRunning: boolean;
  runCodingAgent: (options: {
    projectId: string;
    prompt: string;
    consoleErrors?: string[];
    approvedConfirmationId?: string;
    rejectedConfirmationId?: string;
  }) => Promise<AgentRunResponse>;
  confirmDestructiveAction: (approved: boolean) => Promise<void>;
  clearAgentSession: () => void;

  // Secure Project Terminal & Error System
  projectErrors: ProjectSystemError[];
  terminalHistory: Record<string, TerminalOutputLine[]>;
  executeTerminalCommand: (projectId: string, command: string) => Promise<TerminalExecResponse>;
  fixErrorWithAI: (projectId: string, error: ProjectSystemError) => Promise<FixErrorResponse>;
  addProjectError: (error: Omit<ProjectSystemError, 'id' | 'timestamp' | 'resolved'>) => void;
  clearProjectErrors: (projectId?: string) => void;
  clearTerminal: (projectId: string) => void;

  events: BuilderEvent[];
  prefilledPrompt: string;
  setPrefilledPrompt: (val: string) => void;

  // Professional Export & GitHub / Import Operations
  isExportModalOpen: boolean;
  exportModalProject: Project | null;
  openExportModal: (project?: Project) => void;
  closeExportModal: () => void;
  isImportModalOpen: boolean;
  openImportModal: () => void;
  closeImportModal: () => void;
  downloadProjectZipArchive: (projectId: string) => Promise<void>;
}

const BuilderContext = createContext<BuilderContextValue | null>(null);

export const BuilderProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeView, setActiveView] = useState<AppView>('dashboard');

  const [projects, setProjects] = useState<Project[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.PROJECTS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((p: Project) => {
            // derive existing folder list if not already present
            const folders = p.folders || [];
            const fileFolders = p.files.map((f) => {
              const parts = f.path.split('/');
              parts.pop();
              return parts.join('/');
            }).filter(Boolean);
            const mergedFolders = Array.from(new Set([...folders, ...fileFolders]));
            return {
              ...p,
              folders: mergedFolders,
              settings: p.settings || createDefaultProjectSettings(),
            };
          });
        }
      }
    } catch {
      // Fallback
    }
    return INITIAL_PROJECTS.map((p) => {
      const folders = p.files.map((f) => {
        const parts = f.path.split('/');
        parts.pop();
        return parts.join('/');
      }).filter(Boolean);
      return {
        ...p,
        folders: Array.from(new Set(folders)),
      };
    });
  });

  const [settings, setSettings] = useState<WorkspaceSettings>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      if (saved) {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
      }
    } catch {
      // Fallback
    }
    return DEFAULT_SETTINGS;
  });

  const [activeStudioProjectId, setActiveStudioProjectId] = useState<string | null>(null);
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [synthesisStatus, setSynthesisStatus] = useState('');
  const [events, setEvents] = useState<BuilderEvent[]>([]);
  const [prefilledPrompt, setPrefilledPrompt] = useState('');

  const { currentUser } = useAuth();

  // Real-time Firestore sync: subscribe to projects belonging to authenticated user only
  useEffect(() => {
    if (!currentUser) {
      return;
    }

    let isSubscribed = true;
    const unsubscribe = subscribeToUserProjects(
      currentUser.uid,
      async (cloudProjects) => {
        if (!isSubscribed) return;
        if (cloudProjects.length === 0) {
          // Initialize default projects for this new user in Firestore
          const seeded: Project[] = INITIAL_PROJECTS.map((p) => ({
            ...p,
            ownerId: currentUser.uid,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }));
          setProjects(seeded);
          for (const sp of seeded) {
            try {
              await saveProjectToFirestore(sp, currentUser.uid);
            } catch (err) {
              console.warn('[Firestore] Error saving initial project:', err);
            }
          }
        } else {
          setProjects(cloudProjects);
        }
      },
      (err) => {
        console.warn('[Firestore] Project subscription error:', err);
      }
    );

    return () => {
      isSubscribed = false;
      unsubscribe();
    };
  }, [currentUser]);

  // Persist project changes to Firestore
  const persistProject = useCallback(
    async (proj: Project) => {
      if (currentUser) {
        try {
          await saveProjectToFirestore(proj, currentUser.uid);
        } catch (e) {
          console.warn('[Firestore] Error persisting project:', e);
        }
      }
    },
    [currentUser]
  );

  // Auto-persist debounced changes
  useEffect(() => {
    if (!currentUser || projects.length === 0) return;
    const timer = setTimeout(() => {
      projects.forEach((p) => {
        saveProjectToFirestore(p, currentUser.uid).catch(() => {});
      });
    }, 1500);
    return () => clearTimeout(timer);
  }, [projects, currentUser]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(projects));
    } catch {
      // Ignore quota errors
    }
  }, [projects]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    } catch {
      // Ignore quota errors
    }
  }, [settings]);

  const emitEvent = useCallback((type: BuilderEvent['type'], payload: unknown) => {
    setEvents((prev) => [
      { type, payload, timestamp: new Date().toISOString() },
      ...prev.slice(0, 49),
    ]);
  }, []);

  const updateSettings = useCallback(
    (partial: Partial<WorkspaceSettings>) => {
      setSettings((prev) => {
        const next = { ...prev, ...partial };
        emitEvent('SETTINGS_CHANGED', partial);
        return next;
      });
    },
    [emitEvent]
  );

  const resetWorkspace = useCallback(() => {
    localStorage.removeItem(STORAGE_KEYS.PROJECTS);
    localStorage.removeItem(STORAGE_KEYS.SETTINGS);
    setProjects(INITIAL_PROJECTS);
    setSettings(DEFAULT_SETTINGS);
    setActiveStudioProjectId(null);
  }, []);

  const activeStudioProject =
    projects.find((p) => p.id === activeStudioProjectId) || null;

  const openProjectInStudio = useCallback((projectId: string) => {
    setActiveStudioProjectId(projectId);
  }, []);

  const closeStudio = useCallback(() => {
    setActiveStudioProjectId(null);
  }, []);

  // Export & Import Modal State
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportModalProject, setExportModalProject] = useState<Project | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  const openExportModal = useCallback((project?: Project) => {
    setExportModalProject(project || activeStudioProject || null);
    setIsExportModalOpen(true);
  }, [activeStudioProject]);

  const closeExportModal = useCallback(() => {
    setIsExportModalOpen(false);
    setExportModalProject(null);
  }, []);

  const openImportModal = useCallback(() => {
    setIsImportModalOpen(true);
  }, []);

  const closeImportModal = useCallback(() => {
    setIsImportModalOpen(false);
  }, []);

  const downloadProjectZipArchive = useCallback(async (projectId: string) => {
    const proj = projects.find((p) => p.id === projectId);
    if (!proj) throw new Error('Project not found');
    await downloadProjectZip(proj);
  }, [projects]);

  const renameProject = useCallback(
    (projectId: string, newName: string) => {
      const trimmed = newName.trim();
      if (!trimmed) return;
      const now = new Date().toISOString();
      const slug = trimmed.toLowerCase().replace(/[^a-z0-9]+/g, '-');

      setProjects((prev) =>
        prev.map((p) => {
          if (p.id !== projectId) return p;
          return {
            ...p,
            name: trimmed,
            slug,
            updatedAt: now,
          };
        })
      );
      emitEvent('PROJECT_RENAMED', { projectId, newName: trimmed });
    },
    [emitEvent]
  );

  const updateProjectSettings = useCallback(
    (projectId: string, partial: Partial<ProjectSettings>) => {
      const now = new Date().toISOString();
      setProjects((prev) =>
        prev.map((p) => {
          if (p.id !== projectId) return p;
          return {
            ...p,
            updatedAt: now,
            settings: { ...p.settings, ...partial },
          };
        })
      );
      emitEvent('PROJECT_UPDATED', { projectId, settings: partial });
    },
    [emitEvent]
  );

  const createProject = useCallback(
    (params: CreateProjectParams): Project => {
      const now = new Date().toISOString();
      const uniqueId = generateUniqueProjectId();
      const projectName = params.name.trim() || 'Untitled SAZ App';
      const slug = projectName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const framework = params.framework || settings.defaultFramework;
      const modules = params.modules || settings.defaultModules;
      const category = params.category || 'SaaS & Operations';
      const summary =
        params.summary?.trim() ||
        `Modular ${framework} application with ${modules.join(', ')}.`;

      const projectSettings = createDefaultProjectSettings({
        mobileFirst: settings.mobilePreviewDefault,
        ...params.settings,
      });

      const previewHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${projectName}</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-slate-950 text-slate-100 font-sans min-h-screen p-5">
  <div class="max-w-xl mx-auto space-y-4">
    <header class="border-b border-slate-800 pb-3 flex justify-between items-center">
      <div>
        <div class="text-xs font-mono text-amber-400">${framework}</div>
        <h1 class="text-lg font-bold">${projectName}</h1>
      </div>
      <span class="text-xs font-mono text-emerald-400">Ready</span>
    </header>
    <p class="text-sm text-slate-300">${summary}</p>
    <div class="p-4 rounded-xl border border-slate-800 bg-slate-900/50 text-xs font-mono text-slate-400">
      Mounted capabilities: ${modules.join(' · ')}
    </div>
  </div>
</body>
</html>`;

      const defaultFiles: ProjectFile[] = [
        {
          path: 'index.html',
          language: 'html',
          content: previewHtml,
          updatedAt: now,
        },
        {
          path: 'styles.css',
          language: 'css',
          content: `/* Custom Project Styles */
body {
  font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}
`,
          updatedAt: now,
        },
        {
          path: 'app.js',
          language: 'js',
          content: `// Interactive Application Script
console.info('Application runtime active: ${projectName}');
`,
          updatedAt: now,
        },
        {
          path: 'src/App.tsx',
          language: 'tsx',
          content: `import React, { useState } from 'react';

export default function App() {
  const [active, setActive] = useState(true);

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-6">
      <header className="border-b border-slate-800 pb-4 flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold">${projectName}</h1>
          <p className="text-xs text-slate-400 mt-1">${summary}</p>
        </div>
        <button
          onClick={() => setActive(!active)}
          className="px-3.5 py-1.5 rounded-lg bg-amber-500 text-slate-950 text-xs font-semibold"
        >
          {active ? 'State: Active' : 'State: Paused'}
        </button>
      </header>
    </main>
  );
}
`,
          updatedAt: now,
        },
        {
          path: 'saz.config.json',
          language: 'json',
          content: JSON.stringify(
            {
              id: uniqueId,
              name: projectName,
              slug,
              framework,
              modules,
              settings: projectSettings,
            },
            null,
            2
          ),
          updatedAt: now,
        },
        {
          path: 'src/types.ts',
          language: 'ts',
          content: `export interface AppState {
  id: string;
  name: string;
  createdAt: string;
}
`,
          updatedAt: now,
        },
      ];

      const initialFolders = params.initialFolders || ['src'];

      const newProj: Project = {
        id: uniqueId,
        name: projectName,
        slug,
        summary,
        category,
        framework,
        modules,
        status: 'Active',
        createdAt: now,
        updatedAt: now,
        architectureNotes: `Foundation for ${projectName} initialized with ${modules.join(', ')}.`,
        previewHtml,
        files: params.initialFiles && params.initialFiles.length > 0 ? params.initialFiles : defaultFiles,
        folders: initialFolders,
        settings: projectSettings,
        promptHistory: [
          {
            id: `turn-${Date.now()}`,
            prompt: `Created project: ${projectName}`,
            timestamp: now,
            summary: `Initialized ${projectName} with ${framework}`,
          },
        ],
      };

      setProjects((prev) => [newProj, ...prev]);
      emitEvent('PROJECT_CREATED', { projectId: newProj.id, name: newProj.name });
      if (settings.autoOpenStudioOnBuild) {
        setActiveStudioProjectId(newProj.id);
      }
      return newProj;
    },
    [settings, emitEvent]
  );

  const synthesizeApp = useCallback(
    async (options: SynthesizeOptions): Promise<Project> => {
      const framework = options.framework || settings.defaultFramework;
      const modules = options.modules || settings.defaultModules;
      const existing = options.targetProjectId
        ? projects.find((p) => p.id === options.targetProjectId)
        : undefined;

      setIsSynthesizing(true);
      setSynthesisStatus('1/5: Connecting to Google Gemini AI service...');

      try {
        setSynthesisStatus('2/5: Inspecting project structure & formulating plan...');
        const response = await fetch('/api/saz/synthesize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: options.prompt,
            framework,
            modules,
            existingProject: existing
              ? {
                  id: existing.id,
                  name: existing.name,
                  slug: existing.slug,
                  summary: existing.summary,
                  framework: existing.framework,
                  modules: existing.modules,
                  files: existing.files.map((f) => ({
                    path: f.path,
                    language: f.language,
                    content: f.content,
                  })),
                  previewHtml: existing.previewHtml,
                }
              : undefined,
            existingProjectName: options.projectName || existing?.name,
            existingPreviewHtml: existing?.previewHtml,
          }),
        });

        setSynthesisStatus('3/5: Generating actual code for files...');
        const data = await response.json();
        const now = new Date().toISOString();

        setSynthesisStatus('4/5: Writing files into project filesystem...');
        const planText = Array.isArray(data.plan) && data.plan.length > 0
          ? `\n\nExecution Plan:\n${data.plan.map((s: string, i: number) => `${i + 1}. ${s}`).join('\n')}`
          : '';

        if (existing) {
          const returnedFiles: ProjectFile[] = Array.isArray(data.files) && data.files.length > 0 ? data.files : [];

          // Merge updated files into existing project without recreating from scratch
          const mergedFiles: ProjectFile[] = [...existing.files];
          returnedFiles.forEach((rf) => {
            const idx = mergedFiles.findIndex((f) => f.path === rf.path);
            if (idx >= 0) {
              mergedFiles[idx] = {
                ...mergedFiles[idx],
                content: rf.content,
                language: rf.language || mergedFiles[idx].language,
                updatedAt: now,
              };
            } else {
              mergedFiles.push({
                path: rf.path,
                language: rf.language || 'ts',
                content: rf.content,
                updatedAt: now,
              });
            }
          });

          const updatedFolders = Array.from(
            new Set([
              ...(existing.folders || ['src']),
              ...mergedFiles
                .map((f) => {
                  const parts = f.path.split('/');
                  parts.pop();
                  return parts.join('/');
                })
                .filter(Boolean),
            ])
          );

          const candidateHtml = (data.previewHtml && data.previewHtml.trim()) || existing.previewHtml || '';
          const tempProjForCompilation: Project = {
            ...existing,
            files: mergedFiles,
            previewHtml: candidateHtml,
          };
          const compiledResult = compileProjectToHtml(tempProjForCompilation);
          const finalPreviewHtml = compiledResult.html || candidateHtml;

          const updated: Project = {
            ...existing,
            name: data.name || existing.name,
            summary: data.summary || existing.summary,
            architectureNotes: (data.architectureNotes || existing.architectureNotes) + planText,
            previewHtml: finalPreviewHtml,
            files: mergedFiles,
            folders: updatedFolders,
            updatedAt: now,
            promptHistory: [
              {
                id: `turn-${Date.now()}`,
                prompt: options.prompt,
                timestamp: now,
                summary: data.summary || `Updated application blueprint via Gemini AI: ${options.prompt}`,
                plan: data.plan,
              },
              ...existing.promptHistory,
            ],
          };

          setProjects((prev) => prev.map((p) => (p.id === existing.id ? updated : p)));
          emitEvent('PROMPT_SYNTHESIZED', { projectId: updated.id, prompt: options.prompt });
          setSynthesisStatus('5/5: Compiling & displaying in Live Preview...');
          setActiveStudioProjectId(updated.id);
          return updated;
        } else {
          const uniqueId = generateUniqueProjectId();
          const chosenName = options.projectName?.trim() || data.name || 'SAZ Synthesized App';
          const generatedFiles = Array.isArray(data.files) ? data.files : [];
          const generatedFolders = Array.from(
            new Set(
              generatedFiles.map((f: ProjectFile) => {
                const parts = f.path.split('/');
                parts.pop();
                return parts.join('/');
              }).filter(Boolean)
            )
          ) as string[];

          const candidateHtml = data.previewHtml || '';
          const tempNewProj: Project = {
            id: uniqueId,
            name: chosenName,
            slug: data.slug || chosenName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
            summary: data.summary || options.prompt,
            category: options.category || 'SaaS & Operations',
            framework,
            modules,
            status: 'Active',
            createdAt: now,
            updatedAt: now,
            starred: false,
            architectureNotes:
              (data.architectureNotes ||
                `Modular ${framework} application synthesized with ${modules.join(', ')}.`) + planText,
            previewHtml: candidateHtml,
            files: generatedFiles,
            folders: generatedFolders.length > 0 ? generatedFolders : ['src'],
            settings: createDefaultProjectSettings({
              mobileFirst: settings.mobilePreviewDefault,
            }),
            promptHistory: [],
          };
          const compiledNew = compileProjectToHtml(tempNewProj);
          const finalNewPreviewHtml = compiledNew.html || candidateHtml;

          const newProj: Project = {
            ...tempNewProj,
            previewHtml: finalNewPreviewHtml,
            promptHistory: [
              {
                id: `turn-${Date.now()}`,
                prompt: options.prompt,
                timestamp: now,
                summary: data.summary || 'Initial project synthesis completed.',
                plan: data.plan,
              },
            ],
          };

          setProjects((prev) => [newProj, ...prev]);
          emitEvent('PROJECT_CREATED', { projectId: newProj.id, name: newProj.name });
          setSynthesisStatus('5/5: Compiling & displaying in Live Preview...');
          setActiveStudioProjectId(newProj.id);
          return newProj;
        }
      } finally {
        setIsSynthesizing(false);
        setSynthesisStatus('');
      }
    },
    [projects, settings, emitEvent]
  );

  // Coding Agent State & Handlers
  const [activeAgentSession, setActiveAgentSession] = useState<AgentSession | null>(null);
  const [isAgentRunning, setIsAgentRunning] = useState<boolean>(false);

  const runCodingAgent = useCallback(
    async (options: {
      projectId: string;
      prompt: string;
      consoleErrors?: string[];
      approvedConfirmationId?: string;
      rejectedConfirmationId?: string;
    }): Promise<AgentRunResponse> => {
      const proj = projects.find((p) => p.id === options.projectId);
      if (!proj) {
        throw new Error('Project not found');
      }

      setIsAgentRunning(true);
      const startTime = new Date().toISOString();

      try {
        const response = await fetch('/api/saz/agent-run', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectId: proj.id,
            prompt: options.prompt,
            consoleErrors: options.consoleErrors || [],
            approvedConfirmationId: options.approvedConfirmationId,
            rejectedConfirmationId: options.rejectedConfirmationId,
            existingProject: {
              id: proj.id,
              name: proj.name,
              slug: proj.slug,
              summary: proj.summary,
              framework: proj.framework,
              modules: proj.modules,
              files: proj.files.map((f) => ({
                path: f.path,
                language: f.language,
                content: f.content,
              })),
              previewHtml: proj.previewHtml,
              architectureNotes: proj.architectureNotes,
            },
          }),
        });

        const data: AgentRunResponse = await response.json();
        const now = new Date().toISOString();

        // Merge files into project if any were created/modified/deleted
        let updatedFiles = [...proj.files];

        if (data.deletedFiles && data.deletedFiles.length > 0) {
          const deleteSet = new Set(data.deletedFiles.map((p) => p.toLowerCase()));
          updatedFiles = updatedFiles.filter((f) => !deleteSet.has(f.path.toLowerCase()));
        }

        if (data.modifiedFiles && data.modifiedFiles.length > 0) {
          data.modifiedFiles.forEach((mf) => {
            const idx = updatedFiles.findIndex((f) => f.path.toLowerCase() === mf.path.toLowerCase());
            if (idx >= 0) {
              updatedFiles[idx] = {
                ...updatedFiles[idx],
                content: mf.content,
                language: mf.language || updatedFiles[idx].language,
                updatedAt: now,
              };
            }
          });
        }

        if (data.createdFiles && data.createdFiles.length > 0) {
          data.createdFiles.forEach((cf) => {
            const idx = updatedFiles.findIndex((f) => f.path.toLowerCase() === cf.path.toLowerCase());
            if (idx >= 0) {
              updatedFiles[idx] = {
                ...updatedFiles[idx],
                content: cf.content,
                language: cf.language || updatedFiles[idx].language,
                updatedAt: now,
              };
            } else {
              updatedFiles.push({
                path: cf.path,
                language: cf.language || 'ts',
                content: cf.content,
                updatedAt: now,
              });
            }
          });
        }

        // Recompile live preview if any file changed
        const hasChanges = (data.createdFiles?.length || 0) > 0 || (data.modifiedFiles?.length || 0) > 0 || (data.deletedFiles?.length || 0) > 0;
        let freshPreviewHtml = proj.previewHtml;
        if (hasChanges) {
          const tempProj = { ...proj, files: updatedFiles };
          const compileRes = compileProjectToHtml(tempProj);
          freshPreviewHtml = compileRes.html;

          const updatedProject: Project = {
            ...proj,
            files: updatedFiles,
            previewHtml: freshPreviewHtml,
            updatedAt: now,
            promptHistory: [
              {
                id: `agent-${Date.now()}`,
                prompt: `[Coding Agent] ${options.prompt}`,
                timestamp: now,
                summary: data.summary,
                plan: data.steps.filter((s) => s.type === 'plan_changes').map((s) => s.description),
              },
              ...proj.promptHistory,
            ],
          };

          setProjects((prev) => prev.map((p) => (p.id === proj.id ? updatedProject : p)));
          emitEvent('PROJECT_UPDATED', { projectId: proj.id, prompt: options.prompt });
        }

        const session: AgentSession = {
          id: data.sessionId || `session-${Date.now()}`,
          projectId: proj.id,
          projectName: proj.name,
          userPrompt: options.prompt,
          status: data.pendingConfirmation ? 'waiting_confirmation' : 'completed',
          currentActionIndex: data.steps.length,
          totalActions: data.steps.length,
          steps: data.steps,
          pendingConfirmation: data.pendingConfirmation,
          explanation: data.explanation,
          createdFiles: (data.createdFiles || []).map((f) => f.path),
          modifiedFiles: (data.modifiedFiles || []).map((f) => f.path),
          deletedFiles: data.deletedFiles || [],
          startedAt: startTime,
          completedAt: data.pendingConfirmation ? undefined : now,
        };

        setActiveAgentSession(session);
        return data;
      } finally {
        setIsAgentRunning(false);
      }
    },
    [projects, emitEvent]
  );

  const confirmDestructiveAction = useCallback(
    async (approved: boolean) => {
      if (!activeAgentSession || !activeAgentSession.pendingConfirmation) return;
      const conf = activeAgentSession.pendingConfirmation;

      await runCodingAgent({
        projectId: activeAgentSession.projectId,
        prompt: activeAgentSession.userPrompt,
        approvedConfirmationId: approved ? conf.id : undefined,
        rejectedConfirmationId: !approved ? conf.id : undefined,
      });
    },
    [activeAgentSession, runCodingAgent]
  );

  const clearAgentSession = useCallback(() => {
    setActiveAgentSession(null);
  }, []);

  // Secure Project Terminal & Error State
  const [projectErrors, setProjectErrors] = useState<ProjectSystemError[]>([]);
  const [terminalHistory, setTerminalHistory] = useState<Record<string, TerminalOutputLine[]>>({});

  const addProjectError = useCallback(
    (err: Omit<ProjectSystemError, 'id' | 'timestamp' | 'resolved'>) => {
      const newErr: ProjectSystemError = {
        ...err,
        id: `err-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        timestamp: Date.now(),
        resolved: false,
      };
      setProjectErrors((prev) => [newErr, ...prev.slice(0, 49)]);
    },
    []
  );

  const clearProjectErrors = useCallback((_projectId?: string) => {
    setProjectErrors([]);
  }, []);

  const clearTerminal = useCallback((projId: string) => {
    setTerminalHistory((prev) => ({
      ...prev,
      [projId]: [],
    }));
  }, []);

  const executeTerminalCommand = useCallback(
    async (projId: string, cmd: string): Promise<TerminalExecResponse> => {
      const proj = projects.find((p) => p.id === projId);
      if (!proj) {
        throw new Error('Project not found');
      }

      const res = await fetch('/api/saz/terminal-exec', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          command: cmd,
          existingProject: {
            id: proj.id,
            name: proj.name,
            slug: proj.slug,
            summary: proj.summary,
            framework: proj.framework,
            modules: proj.modules,
            files: proj.files.map((f) => ({
              path: f.path,
              language: f.language,
              content: f.content,
            })),
            previewHtml: proj.previewHtml,
          },
        }),
      });

      const data: TerminalExecResponse = await res.json();

      // Append terminal output
      setTerminalHistory((prev) => {
        const current = prev[projId] || [];
        return {
          ...prev,
          [projId]: [...current, ...data.output].slice(-200),
        };
      });

      // If files were updated (e.g., dependencies installed via npm install)
      if (data.updatedFiles && data.updatedFiles.length > 0) {
        const now = new Date().toISOString();
        const mergedFiles = [...proj.files];
        data.updatedFiles.forEach((uf) => {
          const idx = mergedFiles.findIndex((f) => f.path.toLowerCase() === uf.path.toLowerCase());
          if (idx >= 0) {
            mergedFiles[idx] = { ...mergedFiles[idx], content: uf.content, language: uf.language, updatedAt: now };
          } else {
            mergedFiles.push({ path: uf.path, language: uf.language, content: uf.content, updatedAt: now });
          }
        });
        setProjects((prev) => prev.map((p) => (p.id === proj.id ? { ...p, files: mergedFiles, updatedAt: now } : p)));
      }

      // If build errors were detected, register them
      if (data.detectedErrors && data.detectedErrors.length > 0) {
        data.detectedErrors.forEach((de) => {
          setProjectErrors((prev) => [de, ...prev.filter((e) => e.id !== de.id)]);
        });
      }

      return data;
    },
    [projects]
  );

  const fixErrorWithAI = useCallback(
    async (projId: string, errorToFix: ProjectSystemError): Promise<FixErrorResponse> => {
      const proj = projects.find((p) => p.id === projId);
      if (!proj) {
        throw new Error('Project not found');
      }

      const res = await fetch('/api/saz/fix-error', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: proj.id,
          error: errorToFix,
          existingProject: {
            id: proj.id,
            name: proj.name,
            slug: proj.slug,
            summary: proj.summary,
            framework: proj.framework,
            modules: proj.modules,
            files: proj.files.map((f) => ({
              path: f.path,
              language: f.language,
              content: f.content,
            })),
            previewHtml: proj.previewHtml,
          },
        }),
      });

      const data: FixErrorResponse = await res.json();

      if (data.success && data.fixedFiles && data.fixedFiles.length > 0) {
        const now = new Date().toISOString();

        // Update project files
        const mergedFiles: ProjectFile[] = [...proj.files];
        data.fixedFiles.forEach((ff) => {
          const idx = mergedFiles.findIndex((f) => f.path.toLowerCase() === ff.path.toLowerCase());
          if (idx >= 0) {
            mergedFiles[idx] = {
              ...mergedFiles[idx],
              content: ff.content,
              language: ff.language || mergedFiles[idx].language,
              updatedAt: now,
            };
          } else {
            mergedFiles.push({
              path: ff.path,
              language: ff.language || 'ts',
              content: ff.content,
              updatedAt: now,
            });
          }
        });

        // Recompile live preview
        const tempProj = { ...proj, files: mergedFiles };
        const compiled = compileProjectToHtml(tempProj);
        const finalPreview = data.newPreviewHtml && data.newPreviewHtml.trim() ? data.newPreviewHtml : compiled.html;

        const updatedProj: Project = {
          ...proj,
          files: mergedFiles,
          previewHtml: finalPreview,
          updatedAt: now,
          promptHistory: [
            {
              id: `fix-${Date.now()}`,
              prompt: `Fix with AI: ${errorToFix.title}`,
              timestamp: now,
              summary: data.resolution || `Repaired ${errorToFix.title}`,
            },
            ...proj.promptHistory,
          ],
        };

        setProjects((prev) => prev.map((p) => (p.id === proj.id ? updatedProj : p)));
        emitEvent('PROJECT_UPDATED', { projectId: proj.id, fix: errorToFix.title });

        // Mark error as resolved
        setProjectErrors((prev) =>
          prev.map((e) => (e.id === errorToFix.id ? { ...e, resolved: true, resolution: data.resolution } : e))
        );

        // Append to terminal history
        setTerminalHistory((prev) => {
          const current = prev[projId] || [];
          const newLines: TerminalOutputLine[] = [
            {
              id: `ai-fix-head-${Date.now()}`,
              type: 'system',
              text: `[Fix with AI] Resolved: ${errorToFix.title}`,
              timestamp: Date.now(),
            },
            ...data.terminalLogs.map((log, i) => ({
              id: `ai-fix-log-${Date.now()}-${i}`,
              type: 'success' as const,
              text: log,
              timestamp: Date.now() + i,
            })),
          ];
          return {
            ...prev,
            [projId]: [...current, ...newLines].slice(-200),
          };
        });
      }

      return data;
    },
    [projects, emitEvent]
  );

  const createBlankProject = useCallback(
    (params: {
      name: string;
      summary: string;
      category: string;
      framework: FrameworkTarget;
      modules: ArchitectureModule[];
    }): Project => {
      return createProject({
        name: params.name,
        summary: params.summary,
        category: params.category,
        framework: params.framework,
        modules: params.modules,
      });
    },
    [createProject]
  );

  const createFromTemplate = useCallback(
    (template: TemplateBlueprint, customName?: string): Project => {
      const now = new Date().toISOString();
      const uniqueId = generateUniqueProjectId();
      const projectName = customName?.trim() || template.name;
      const slug = `${projectName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now().toString().slice(-4)}`;

      const folders = Array.from(
        new Set(
          template.files.map((f) => {
            const parts = f.path.split('/');
            parts.pop();
            return parts.join('/');
          }).filter(Boolean)
        )
      );

      const newProj: Project = {
        id: uniqueId,
        name: projectName,
        slug,
        summary: template.summary,
        category: template.category,
        framework: template.framework,
        modules: [...template.modules],
        status: 'Active',
        createdAt: now,
        updatedAt: now,
        architectureNotes: template.architectureNotes,
        previewHtml: template.previewHtml,
        files: template.files.map((f) => ({ ...f, updatedAt: now })),
        folders,
        settings: createDefaultProjectSettings(template.settings),
        promptHistory: [
          {
            id: `turn-${Date.now()}`,
            prompt: `Instantiated from template: ${template.name}`,
            timestamp: now,
            summary: template.summary,
          },
        ],
      };

      setProjects((prev) => [newProj, ...prev]);
      emitEvent('PROJECT_CREATED', { projectId: newProj.id, templateId: template.id });
      setActiveStudioProjectId(newProj.id);
      return newProj;
    },
    [emitEvent]
  );

  const updateProjectStatus = useCallback(
    (projectId: string, status: ProjectStatus) => {
      const now = new Date().toISOString();
      setProjects((prev) =>
        prev.map((p) => (p.id === projectId ? { ...p, status, updatedAt: now } : p))
      );
      emitEvent('PROJECT_UPDATED', { projectId, status });
    },
    [emitEvent]
  );

  const toggleProjectStar = useCallback((projectId: string) => {
    setProjects((prev) =>
      prev.map((p) => (p.id === projectId ? { ...p, starred: !p.starred } : p))
    );
  }, []);

  const duplicateProject = useCallback(
    (projectId: string, customName?: string): Project | null => {
      const source = projects.find((p) => p.id === projectId);
      if (!source) return null;
      const now = new Date().toISOString();
      const uniqueId = generateUniqueProjectId();
      const copyName = customName?.trim() || `${source.name} (Copy)`;
      const copySlug = `${source.slug}-copy-${Date.now().toString().slice(-4)}`;

      const clonedFiles: ProjectFile[] = source.files.map((f) => ({
        ...f,
        updatedAt: now,
      }));

      const clonedSettings: ProjectSettings = {
        ...source.settings,
        envVariables: { ...source.settings.envVariables },
        customHeaders: source.settings.customHeaders ? { ...source.settings.customHeaders } : undefined,
      };

      const copy: Project = {
        ...source,
        id: uniqueId,
        name: copyName,
        slug: copySlug,
        createdAt: now,
        updatedAt: now,
        files: clonedFiles,
        folders: source.folders ? [...source.folders] : ['src'],
        settings: clonedSettings,
        promptHistory: [
          {
            id: `turn-${Date.now()}`,
            prompt: `Duplicated from ${source.name}`,
            timestamp: now,
            summary: `Created independent duplicate with unique ID ${uniqueId}.`,
          },
          ...source.promptHistory,
        ],
      };

      setProjects((prev) => [copy, ...prev]);
      emitEvent('PROJECT_DUPLICATED', { projectId: copy.id, sourceId: source.id });
      return copy;
    },
    [projects, emitEvent]
  );

  const deleteProject = useCallback(
    (projectId: string) => {
      setProjects((prev) => prev.filter((p) => p.id !== projectId));
      if (activeStudioProjectId === projectId) {
        setActiveStudioProjectId(null);
      }
      if (currentUser) {
        deleteProjectFromFirestore(projectId, currentUser.uid).catch((err) => {
          console.warn('[Firestore] Error deleting project:', err);
        });
      }
      emitEvent('PROJECT_DELETED', { projectId });
    },
    [activeStudioProjectId, emitEvent, currentUser]
  );

  // REAL PROJECT FILE SYSTEM IMPLEMENTATION
  const addProjectFile = useCallback(
    (projectId: string, filePath: string, language: string, content = ''): boolean => {
      const cleanPath = normalizePath(filePath);
      if (!cleanPath) return false;

      const now = new Date().toISOString();
      let succeeded = false;

      setProjects((prev) =>
        prev.map((p) => {
          if (p.id !== projectId) return p;
          if (p.files.some((f) => f.path === cleanPath)) return p;

          // register parent folders
          const parts = cleanPath.split('/');
          parts.pop();
          const parentFolder = parts.join('/');
          const updatedFolders = p.folders ? [...p.folders] : [];
          if (parentFolder && !updatedFolders.includes(parentFolder)) {
            updatedFolders.push(parentFolder);
          }

          const newFile: ProjectFile = {
            path: cleanPath,
            language: language || 'ts',
            content,
            updatedAt: now,
          };
          succeeded = true;
          return {
            ...p,
            updatedAt: now,
            files: [...p.files, newFile],
            folders: updatedFolders,
          };
        })
      );

      if (succeeded) {
        emitEvent('FILE_CREATED', { projectId, filePath: cleanPath });
      }
      return succeeded;
    },
    [emitEvent]
  );

  const createProjectFolder = useCallback(
    (projectId: string, folderPath: string): boolean => {
      const cleanPath = normalizePath(folderPath);
      if (!cleanPath) return false;

      const now = new Date().toISOString();
      let succeeded = false;

      setProjects((prev) =>
        prev.map((p) => {
          if (p.id !== projectId) return p;
          const currentFolders = p.folders || [];
          if (currentFolders.includes(cleanPath)) return p;

          succeeded = true;
          return {
            ...p,
            updatedAt: now,
            folders: [...currentFolders, cleanPath],
          };
        })
      );

      if (succeeded) {
        emitEvent('FOLDER_CREATED', { projectId, folderPath: cleanPath });
      }
      return succeeded;
    },
    [emitEvent]
  );

  const renameProjectFile = useCallback(
    (projectId: string, oldPath: string, newPath: string): boolean => {
      const cleanOld = normalizePath(oldPath);
      const cleanNew = normalizePath(newPath);
      if (!cleanNew || cleanNew === cleanOld) return false;

      const now = new Date().toISOString();
      let succeeded = false;

      setProjects((prev) =>
        prev.map((p) => {
          if (p.id !== projectId) return p;
          if (p.files.some((f) => f.path === cleanNew)) return p; // collision

          const parts = cleanNew.split('/');
          parts.pop();
          const newParent = parts.join('/');
          const updatedFolders = p.folders ? [...p.folders] : [];
          if (newParent && !updatedFolders.includes(newParent)) {
            updatedFolders.push(newParent);
          }

          succeeded = true;
          return {
            ...p,
            updatedAt: now,
            files: p.files.map((f) => (f.path === cleanOld ? { ...f, path: cleanNew, updatedAt: now } : f)),
            folders: updatedFolders,
          };
        })
      );

      if (succeeded) {
        emitEvent('FILE_RENAMED', { projectId, oldPath: cleanOld, newPath: cleanNew });
      }
      return succeeded;
    },
    [emitEvent]
  );

  const renameProjectFolder = useCallback(
    (projectId: string, oldFolderPath: string, newFolderPath: string): boolean => {
      const cleanOld = normalizePath(oldFolderPath);
      const cleanNew = normalizePath(newFolderPath);
      if (!cleanNew || cleanNew === cleanOld) return false;

      const now = new Date().toISOString();
      let succeeded = false;

      setProjects((prev) =>
        prev.map((p) => {
          if (p.id !== projectId) return p;

          // rename matching files
          const updatedFiles = p.files.map((f) => {
            if (f.path === cleanOld || f.path.startsWith(cleanOld + '/')) {
              const rel = f.path.slice(cleanOld.length);
              return {
                ...f,
                path: `${cleanNew}${rel}`,
                updatedAt: now,
              };
            }
            return f;
          });

          // rename matching folder entries
          const updatedFolders = (p.folders || []).map((folder) => {
            if (folder === cleanOld) return cleanNew;
            if (folder.startsWith(cleanOld + '/')) {
              const rel = folder.slice(cleanOld.length);
              return `${cleanNew}${rel}`;
            }
            return folder;
          });

          if (!updatedFolders.includes(cleanNew)) {
            updatedFolders.push(cleanNew);
          }

          succeeded = true;
          return {
            ...p,
            updatedAt: now,
            files: updatedFiles,
            folders: Array.from(new Set(updatedFolders)),
          };
        })
      );

      if (succeeded) {
        emitEvent('FOLDER_RENAMED', { projectId, oldFolderPath: cleanOld, newFolderPath: cleanNew });
      }
      return succeeded;
    },
    [emitEvent]
  );

  const deleteProjectFile = useCallback(
    (projectId: string, filePath: string) => {
      const cleanPath = normalizePath(filePath);
      const now = new Date().toISOString();

      setProjects((prev) =>
        prev.map((p) => {
          if (p.id !== projectId) return p;
          return {
            ...p,
            updatedAt: now,
            files: p.files.filter((f) => f.path !== cleanPath),
          };
        })
      );
      emitEvent('FILE_DELETED', { projectId, filePath: cleanPath });
    },
    [emitEvent]
  );

  const deleteProjectFolder = useCallback(
    (projectId: string, folderPath: string) => {
      const cleanPath = normalizePath(folderPath);
      const now = new Date().toISOString();

      setProjects((prev) =>
        prev.map((p) => {
          if (p.id !== projectId) return p;

          // remove all files inside this folder
          const remainingFiles = p.files.filter(
            (f) => f.path !== cleanPath && !f.path.startsWith(cleanPath + '/')
          );

          // remove this folder and subfolders
          const remainingFolders = (p.folders || []).filter(
            (f) => f !== cleanPath && !f.startsWith(cleanPath + '/')
          );

          return {
            ...p,
            updatedAt: now,
            files: remainingFiles,
            folders: remainingFolders,
          };
        })
      );
      emitEvent('FOLDER_DELETED', { projectId, folderPath: cleanPath });
    },
    [emitEvent]
  );

  const moveProjectItem = useCallback(
    (
      projectId: string,
      itemPath: string,
      destinationFolder: string,
      isFolder: boolean
    ): boolean => {
      const cleanItem = normalizePath(itemPath);
      const cleanDest = normalizePath(destinationFolder);
      const now = new Date().toISOString();

      let succeeded = false;

      setProjects((prev) =>
        prev.map((p) => {
          if (p.id !== projectId) return p;

          if (!isFolder) {
            // Moving a single file
            const file = p.files.find((f) => f.path === cleanItem);
            if (!file) return p;

            const fileName = cleanItem.split('/').pop() || cleanItem;
            const targetPath = cleanDest ? `${cleanDest}/${fileName}` : fileName;

            if (p.files.some((f) => f.path === targetPath && f.path !== cleanItem)) {
              return p; // target file already exists
            }

            const updatedFolders = p.folders ? [...p.folders] : [];
            if (cleanDest && !updatedFolders.includes(cleanDest)) {
              updatedFolders.push(cleanDest);
            }

            succeeded = true;
            return {
              ...p,
              updatedAt: now,
              files: p.files.map((f) =>
                f.path === cleanItem ? { ...f, path: targetPath, updatedAt: now } : f
              ),
              folders: updatedFolders,
            };
          } else {
            // Moving a folder and its children
            if (cleanDest === cleanItem || cleanDest.startsWith(cleanItem + '/')) {
              return p; // cannot move a folder into itself
            }

            const folderBaseName = cleanItem.split('/').pop() || cleanItem;
            const newFolderPath = cleanDest ? `${cleanDest}/${folderBaseName}` : folderBaseName;

            const updatedFiles = p.files.map((f) => {
              if (f.path.startsWith(cleanItem + '/')) {
                const sub = f.path.slice(cleanItem.length);
                return {
                  ...f,
                  path: `${newFolderPath}${sub}`,
                  updatedAt: now,
                };
              }
              return f;
            });

            const updatedFolders = (p.folders || []).map((folder) => {
              if (folder === cleanItem) return newFolderPath;
              if (folder.startsWith(cleanItem + '/')) {
                const sub = folder.slice(cleanItem.length);
                return `${newFolderPath}${sub}`;
              }
              return folder;
            });

            if (cleanDest && !updatedFolders.includes(cleanDest)) {
              updatedFolders.push(cleanDest);
            }
            if (!updatedFolders.includes(newFolderPath)) {
              updatedFolders.push(newFolderPath);
            }

            succeeded = true;
            return {
              ...p,
              updatedAt: now,
              files: updatedFiles,
              folders: Array.from(new Set(updatedFolders)),
            };
          }
        })
      );

      if (succeeded) {
        emitEvent('ITEM_MOVED', { projectId, itemPath: cleanItem, destinationFolder: cleanDest });
      }
      return succeeded;
    },
    [emitEvent]
  );

  const updateProjectFile = useCallback(
    (projectId: string, filePath: string, newContent: string) => {
      const cleanPath = normalizePath(filePath);
      const now = new Date().toISOString();
      setProjects((prev) =>
        prev.map((p) => {
          if (p.id !== projectId) return p;
          const updatedFiles = p.files.map((f) =>
            f.path === cleanPath ? { ...f, content: newContent, updatedAt: now } : f
          );
          const tempProj = { ...p, files: updatedFiles, updatedAt: now };
          // If code that affects web output changed, automatically re-compile preview
          const compiled = compileProjectToHtml(tempProj);
          return {
            ...tempProj,
            previewHtml: compiled.html,
          };
        })
      );
    },
    []
  );

  const updateProjectPreviewHtml = useCallback((projectId: string, newHtml: string) => {
    const now = new Date().toISOString();
    setProjects((prev) =>
      prev.map((p) => {
        if (p.id !== projectId) return p;
        // Sync to index.html or preview.html if present in project files
        let hasHtml = false;
        const updatedFiles = p.files.map((f) => {
          if (f.path === 'index.html' || f.path === 'preview.html') {
            hasHtml = true;
            return { ...f, content: newHtml, updatedAt: now };
          }
          return f;
        });

        // If no HTML file was present, add index.html
        const finalFiles = hasHtml
          ? updatedFiles
          : [...updatedFiles, { path: 'index.html', language: 'html', content: newHtml, updatedAt: now }];

        return { ...p, previewHtml: newHtml, files: finalFiles, updatedAt: now };
      })
    );
  }, []);

  return (
    <BuilderContext.Provider
      value={{
        activeView,
        setActiveView,
        projects,
        templates: INITIAL_TEMPLATES,
        settings,
        updateSettings,
        resetWorkspace,
        activeStudioProject,
        openProjectInStudio,
        closeStudio,
        isSynthesizing,
        synthesisStatus,
        synthesizeApp,
        createProject,
        createBlankProject,
        createFromTemplate,
        renameProject,
        updateProjectStatus,
        updateProjectSettings,
        toggleProjectStar,
        duplicateProject,
        deleteProject,
        addProjectFile,
        createProjectFolder,
        renameProjectFile,
        renameProjectFolder,
        deleteProjectFile,
        deleteProjectFolder,
        moveProjectItem,
        updateProjectFile,
        updateProjectPreviewHtml,
        activeAgentSession,
        isAgentRunning,
        runCodingAgent,
        confirmDestructiveAction,
        clearAgentSession,
        projectErrors,
        terminalHistory,
        executeTerminalCommand,
        fixErrorWithAI,
        addProjectError,
        clearProjectErrors,
        clearTerminal,
        events,
        prefilledPrompt,
        setPrefilledPrompt,
        isExportModalOpen,
        exportModalProject,
        openExportModal,
        closeExportModal,
        isImportModalOpen,
        openImportModal,
        closeImportModal,
        downloadProjectZipArchive,
      }}
    >
      {children}
    </BuilderContext.Provider>
  );
};

export const useBuilder = (): BuilderContextValue => {
  const ctx = useContext(BuilderContext);
  if (!ctx) {
    throw new Error('useBuilder must be used within a BuilderProvider');
  }
  return ctx;
};
