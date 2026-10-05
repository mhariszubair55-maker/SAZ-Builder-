export type ErrorSeverity = 'error' | 'warning' | 'info';
export type ErrorCategory = 'build' | 'runtime' | 'terminal';

export interface ProjectSystemError {
  id: string;
  category: ErrorCategory;
  severity: ErrorSeverity;
  title: string;
  message: string;
  sourceFile?: string;
  line?: number;
  col?: number;
  stack?: string;
  timestamp: number;
  resolved: boolean;
  resolution?: string;
}

export interface TerminalOutputLine {
  id: string;
  type: 'stdout' | 'stderr' | 'system' | 'command' | 'success' | 'error';
  text: string;
  timestamp: number;
  errorId?: string;
}

export interface TerminalExecResponse {
  command: string;
  exitCode: number;
  output: TerminalOutputLine[];
  detectedErrors?: ProjectSystemError[];
  updatedFiles?: { path: string; language: string; content: string }[];
  timestamp: string;
}

export interface FixErrorRequest {
  projectId: string;
  error: {
    id?: string;
    category: ErrorCategory;
    title: string;
    message: string;
    sourceFile?: string;
    line?: number;
    col?: number;
    stack?: string;
  };
  existingProject: {
    id: string;
    name: string;
    slug: string;
    summary: string;
    framework: string;
    modules: string[];
    files: { path: string; language: string; content: string }[];
    previewHtml?: string;
  };
}

export interface FixErrorResponse {
  success: boolean;
  resolution: string;
  explanation: string;
  fixedFiles: { path: string; language: string; content: string }[];
  newPreviewHtml: string;
  terminalLogs: string[];
  resolvedErrorId?: string;
  error?: string;
}
