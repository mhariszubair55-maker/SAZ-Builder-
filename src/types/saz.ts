export type AppView =
  | 'dashboard'
  | 'new-project'
  | 'recent-projects'
  | 'templates'
  | 'settings';

export type ProjectStatus = 'Active' | 'Draft' | 'Archived';

export type FrameworkTarget =
  | 'React + TypeScript + Tailwind'
  | 'Next.js App Router'
  | 'Mobile PWA + Offline Sync'
  | 'Express + Full-Stack Node';

export type ArchitectureModule =
  | 'Responsive UI'
  | 'Authentication & RBAC'
  | 'Relational Schema'
  | 'REST & Webhook API'
  | 'Offline Storage'
  | 'Realtime Sync';

export interface ProjectFile {
  id?: string;
  path: string;
  language: string;
  content: string;
  updatedAt?: string;
}

export interface PromptTurn {
  id: string;
  prompt: string;
  timestamp: string;
  summary: string;
  plan?: string[];
}

export interface ProjectSettings {
  version: string;
  buildCommand: string;
  devPort: number;
  mobileFirst: boolean;
  responsiveBreakpoint: '375px' | '390px' | '430px' | '768px' | '100%';
  envVariables: Record<string, string>;
  allowPublicPreview: boolean;
  customHeaders?: Record<string, string>;
  githubRepo?: {
    owner: string;
    repo: string;
    branch: string;
    url: string;
    lastPushedAt?: string;
    lastPulledAt?: string;
  };
}

export interface Project {
  id: string;
  ownerId?: string;
  name: string;
  slug: string;
  summary: string;
  category: string;
  framework: FrameworkTarget;
  modules: ArchitectureModule[];
  status: ProjectStatus;
  updatedAt: string;
  createdAt: string;
  architectureNotes: string;
  previewHtml: string;
  files: ProjectFile[];
  folders?: string[];
  settings: ProjectSettings;
  promptHistory: PromptTurn[];
  starred?: boolean;
}

export interface TemplateBlueprint {
  id: string;
  name: string;
  category: 'SaaS & Operations' | 'Mobile & Touch' | 'FinTech & Ledger' | 'Commerce & Booking' | 'Developer Tools';
  summary: string;
  framework: FrameworkTarget;
  modules: ArchitectureModule[];
  estimatedSetup: string;
  architectureNotes: string;
  defaultPrompt: string;
  previewHtml: string;
  files: ProjectFile[];
  folders?: string[];
  settings?: Partial<ProjectSettings>;
}

export interface WorkspaceSettings {
  workspaceName: string;
  builderHandle: string;
  defaultFramework: FrameworkTarget;
  defaultModules: ArchitectureModule[];
  autoOpenStudioOnBuild: boolean;
  mobilePreviewDefault: boolean;
  codeFormatting: '2-spaces' | '4-spaces';
  strictTypeChecking: boolean;
  telemetryOptIn: boolean;
  themeMode: 'dark' | 'light';
  githubToken?: string;
  githubUser?: {
    login: string;
    avatar_url: string;
    name?: string;
    html_url: string;
  };
}

export interface BuilderEvent {
  type:
    | 'PROJECT_CREATED'
    | 'PROJECT_RENAMED'
    | 'PROJECT_UPDATED'
    | 'PROJECT_DUPLICATED'
    | 'PROJECT_DELETED'
    | 'FILE_CREATED'
    | 'FILE_RENAMED'
    | 'FILE_DELETED'
    | 'FOLDER_CREATED'
    | 'FOLDER_RENAMED'
    | 'FOLDER_DELETED'
    | 'ITEM_MOVED'
    | 'PROMPT_SYNTHESIZED'
    | 'SETTINGS_CHANGED';
  payload: unknown;
  timestamp: string;
}
