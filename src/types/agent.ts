export type AgentActionType =
  | 'read_file'
  | 'create_file'
  | 'edit_file'
  | 'delete_file'
  | 'search_project'
  | 'analyze_errors'
  | 'plan_changes'
  | 'apply_changes'
  | 'explain_changes';

export interface AgentStepDiff {
  path: string;
  originalSnippet?: string;
  modifiedSnippet?: string;
  linesAdded?: number;
  linesRemoved?: number;
}

export interface AgentStep {
  id: string;
  type: AgentActionType;
  title: string;
  description: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'requires_confirmation' | 'skipped';
  targetPath?: string;
  details?: string;
  diff?: AgentStepDiff;
  isDestructive?: boolean;
  timestamp: string;
}

export interface DestructiveConfirmation {
  id: string;
  stepId: string;
  type: 'delete_file' | 'overwrite_file';
  targetPath: string;
  reason: string;
  impact: string;
  status: 'pending' | 'approved' | 'rejected';
}

export interface AgentSession {
  id: string;
  projectId: string;
  projectName: string;
  userPrompt: string;
  status: 'idle' | 'running' | 'waiting_confirmation' | 'completed' | 'failed';
  currentActionIndex: number;
  totalActions: number;
  steps: AgentStep[];
  pendingConfirmation?: DestructiveConfirmation;
  explanation?: string;
  createdFiles: string[];
  modifiedFiles: string[];
  deletedFiles: string[];
  startedAt: string;
  completedAt?: string;
}

export interface AgentRunResponse {
  sessionId: string;
  summary: string;
  explanation: string;
  steps: AgentStep[];
  createdFiles: { path: string; language: string; content: string }[];
  modifiedFiles: { path: string; language: string; content: string; originalSnippet?: string }[];
  deletedFiles: string[];
  pendingConfirmation?: DestructiveConfirmation;
  previewHtml?: string;
  error?: string;
}
