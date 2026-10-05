export interface GitHubUser {
  login: string;
  id: number;
  avatar_url: string;
  html_url: string;
  name: string | null;
  email: string | null;
  bio: string | null;
  public_repos: number;
  total_private_repos?: number;
  created_at?: string;
}

export interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  html_url: string;
  description: string | null;
  default_branch: string;
  updated_at: string;
  stargazers_count: number;
}

export interface GitHubPushOptions {
  token: string;
  owner: string;
  repo: string;
  branch: string;
  commitMessage: string;
  files: { path: string; content: string }[];
  isNewRepo?: boolean;
  isPrivate?: boolean;
  description?: string;
}

export interface GitHubPushResult {
  commitSha: string;
  commitUrl: string;
  repoUrl: string;
  branch: string;
  filesCommitted: number;
  timestamp: string;
}

export interface GitHubPullResult {
  branch: string;
  commitSha: string;
  files: { path: string; language: string; content: string }[];
  updatedCount: number;
  addedCount: number;
  timestamp: string;
}

export interface DeploymentArchitectureInfo {
  provider: 'github-pages' | 'firebase-hosting' | 'vercel' | 'netlify' | 'docker';
  name: string;
  status: 'ready' | 'configured' | 'requires-auth' | 'not-configured';
  description: string;
  configFiles: { filename: string; content: string; description: string }[];
  liveUrl?: string;
  actionsRequired?: string[];
  cliCommand?: string;
}
